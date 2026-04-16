using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO.Ports;
using System.Linq;
using System.Management;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using Newtonsoft.Json;

namespace RaceCorProDrive.Plugin.Engine.Moza
{
    /// <summary>
    /// Manages discovery, connection, polling, and command dispatch to all connected
    /// Moza racing hardware over CDC ACM serial ports. Completely bypasses Pit House.
    ///
    /// Lifecycle:
    ///   1. Start() — begins discovery scan and polling on a background thread
    ///   2. Poll loop — every 2 seconds, reads registered settings from all connected devices
    ///   3. WriteSetting() — queues a write command for the next poll cycle
    ///   4. Stop() — shuts down background threads and closes all serial ports
    ///
    /// Thread safety: all public methods are safe to call from any thread.
    /// Serial port access is synchronized per-device via SemaphoreSlim.
    /// </summary>
    public class MozaSerialManager : IDisposable
    {
        // ── Configuration ─────────────────────────────────────────────
        private const int BaudRate = 115200;
        private const int DataBits = 8;
        private const StopBits SerialStopBits = StopBits.One;
        private const Parity SerialParity = Parity.None;
        private const int ReadTimeoutMs = 500;
        private const int WriteTimeoutMs = 500;
        private const int PollIntervalMs = 2000;
        private const int DiscoveryIntervalMs = 10000;
        private const int ReadBufferSize = 256;

        // ── State ─────────────────────────────────────────────────────
        private readonly ConcurrentDictionary<string, MozaDevice> _devices = new ConcurrentDictionary<string, MozaDevice>();
        private readonly ConcurrentDictionary<string, SerialPort> _ports = new ConcurrentDictionary<string, SerialPort>();
        private readonly ConcurrentDictionary<string, SemaphoreSlim> _portLocks = new ConcurrentDictionary<string, SemaphoreSlim>();
        private readonly ConcurrentQueue<WriteCommand> _writeQueue = new ConcurrentQueue<WriteCommand>();

        private Thread _pollThread;
        private volatile bool _running;
        private DateTime _lastDiscovery = DateTime.MinValue;

        // ── Logging callback (injected by Plugin.cs) ──────────────────
        private readonly Action<string> _logInfo;
        private readonly Action<string> _logWarn;

        /// <summary>True if at least one Moza device is connected and responsive.</summary>
        public bool IsConnected => _devices.Values.Any(d => d.IsConnected);

        /// <summary>Number of currently connected devices.</summary>
        public int DeviceCount => _devices.Values.Count(d => d.IsConnected);

        /// <summary>All discovered devices (connected and disconnected).</summary>
        public IReadOnlyList<MozaDevice> Devices => _devices.Values.ToList().AsReadOnly();

        /// <summary>First connected wheelbase, or null.</summary>
        public MozaDevice Wheelbase => _devices.Values.FirstOrDefault(d =>
            d.DeviceType == MozaDeviceRegistry.MozaDeviceType.Wheelbase && d.IsConnected);

        /// <summary>First connected pedals, or null.</summary>
        public MozaDevice Pedals => _devices.Values.FirstOrDefault(d =>
            d.DeviceType == MozaDeviceRegistry.MozaDeviceType.Pedals && d.IsConnected);

        /// <summary>First connected handbrake, or null.</summary>
        public MozaDevice Handbrake => _devices.Values.FirstOrDefault(d =>
            d.DeviceType == MozaDeviceRegistry.MozaDeviceType.Handbrake && d.IsConnected);

        /// <summary>First connected shifter, or null.</summary>
        public MozaDevice Shifter => _devices.Values.FirstOrDefault(d =>
            d.DeviceType == MozaDeviceRegistry.MozaDeviceType.Shifter && d.IsConnected);

        /// <summary>First connected dashboard, or null.</summary>
        public MozaDevice Dashboard => _devices.Values.FirstOrDefault(d =>
            d.DeviceType == MozaDeviceRegistry.MozaDeviceType.Dashboard && d.IsConnected);

        /// <summary>First connected steering wheel, or null.</summary>
        public MozaDevice SteeringWheel => _devices.Values.FirstOrDefault(d =>
            d.DeviceType == MozaDeviceRegistry.MozaDeviceType.SteeringWheel && d.IsConnected);

        /// <summary>Warning message if Pit House is detected running (serial port conflict).</summary>
        public string PitHouseWarning { get; private set; } = "";

        // ═══════════════════════════════════════════════════════════════
        //  CONSTRUCTION & LIFECYCLE
        // ═══════════════════════════════════════════════════════════════

        public MozaSerialManager(Action<string> logInfo = null, Action<string> logWarn = null)
        {
            _logInfo = logInfo ?? (_ => { });
            _logWarn = logWarn ?? (_ => { });
        }

        /// <summary>
        /// Starts the background discovery and polling thread.
        /// Safe to call multiple times (no-op if already running).
        /// </summary>
        public void Start()
        {
            if (_running) return;
            _running = true;

            _pollThread = new Thread(PollLoop)
            {
                Name = "MozaSerialPoll",
                IsBackground = true,
                Priority = ThreadPriority.BelowNormal
            };
            _pollThread.Start();

            _logInfo("[MozaSerial] Background polling started");
        }

        /// <summary>
        /// Stops the background thread and closes all serial ports.
        /// </summary>
        public void Stop()
        {
            _running = false;
            _pollThread?.Join(3000);
            CloseAllPorts();
            _logInfo("[MozaSerial] Stopped");
        }

        public void Dispose()
        {
            Stop();
            foreach (var sem in _portLocks.Values)
                sem.Dispose();
        }

        // ═══════════════════════════════════════════════════════════════
        //  PUBLIC API — WRITE SETTINGS
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Queues a single-byte write command to a device for the next poll cycle.
        /// </summary>
        public void WriteSetting(byte deviceId, byte commandId, byte value)
        {
            _writeQueue.Enqueue(new WriteCommand
            {
                DeviceId = deviceId,
                Packet = MozaPacketBuilder.BuildWritePacket(deviceId, commandId, value)
            });
        }

        /// <summary>
        /// Queues a 16-bit write command to a device for the next poll cycle.
        /// </summary>
        public void WriteSetting16(byte deviceId, byte commandId, ushort value)
        {
            _writeQueue.Enqueue(new WriteCommand
            {
                DeviceId = deviceId,
                Packet = MozaPacketBuilder.BuildWritePacket(deviceId, commandId, value)
            });
        }

        /// <summary>
        /// Force an immediate re-discovery of serial ports.
        /// </summary>
        public void ForceRediscovery()
        {
            _lastDiscovery = DateTime.MinValue;
        }

        /// <summary>
        /// Force an immediate re-poll of all device settings.
        /// </summary>
        public void ForceRefresh()
        {
            foreach (var device in _devices.Values.Where(d => d.IsConnected))
                device.LastPollTime = DateTime.MinValue;
        }

        // ═══════════════════════════════════════════════════════════════
        //  HTTP API — JSON RESPONSES
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Returns a JSON array of all connected devices with type, port, and status.
        /// </summary>
        public string GetDeviceListJson()
        {
            var list = _devices.Values.Select(d => new
            {
                type = d.DeviceType.ToString(),
                subType = d.SubType,
                port = d.PortName,
                connected = d.IsConnected,
                displayName = d.DisplayName,
                usbDescription = d.UsbDescription
            });
            return JsonConvert.SerializeObject(list);
        }

        /// <summary>
        /// Returns the wheelbase settings as a JSON object, or null JSON if not connected.
        /// </summary>
        public string GetWheelbaseSettingsJson()
        {
            var wb = Wheelbase?.WheelbaseSettings;
            if (wb == null || !wb.HasData) return "null";
            return JsonConvert.SerializeObject(wb);
        }

        /// <summary>
        /// Returns pedal settings as a JSON object, or null JSON if not connected.
        /// </summary>
        public string GetPedalSettingsJson()
        {
            var p = Pedals?.PedalSettings;
            if (p == null || !p.HasData) return "null";
            return JsonConvert.SerializeObject(p);
        }

        /// <summary>
        /// Returns handbrake settings as a JSON object, or null JSON if not connected.
        /// </summary>
        public string GetHandbrakeSettingsJson()
        {
            var h = Handbrake?.HandbrakeSettings;
            if (h == null || !h.HasData) return "null";
            return JsonConvert.SerializeObject(h);
        }

        /// <summary>
        /// Returns shifter settings as a JSON object, or null JSON if not connected.
        /// </summary>
        public string GetShifterSettingsJson()
        {
            var s = Shifter?.ShifterSettings;
            if (s == null || !s.HasData) return "null";
            return JsonConvert.SerializeObject(s);
        }

        /// <summary>
        /// Returns dashboard settings as a JSON object, or null JSON if not connected.
        /// </summary>
        public string GetDashboardSettingsJson()
        {
            var d = Dashboard?.DashboardSettings;
            if (d == null || !d.HasData) return "null";
            return JsonConvert.SerializeObject(d);
        }

        /// <summary>
        /// Returns steering wheel settings as a JSON object, or null JSON if not connected.
        /// </summary>
        public string GetWheelSettingsJson()
        {
            var w = SteeringWheel?.WheelSettings;
            if (w == null || !w.HasData) return "null";
            return JsonConvert.SerializeObject(w);
        }

        // ═══════════════════════════════════════════════════════════════
        //  MAIN POLL LOOP (background thread)
        // ═══════════════════════════════════════════════════════════════

        private void PollLoop()
        {
            while (_running)
            {
                try
                {
                    // Periodic discovery
                    if ((DateTime.UtcNow - _lastDiscovery).TotalMilliseconds >= DiscoveryIntervalMs)
                    {
                        DiscoverDevices();
                        _lastDiscovery = DateTime.UtcNow;
                    }

                    // Process queued writes
                    ProcessWriteQueue();

                    // Poll all connected devices
                    foreach (var device in _devices.Values.Where(d => d.IsConnected))
                    {
                        if ((DateTime.UtcNow - device.LastPollTime).TotalMilliseconds >= PollIntervalMs)
                        {
                            PollDevice(device);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logWarn($"[MozaSerial] Poll loop error: {ex.Message}");
                }

                Thread.Sleep(200); // Check interval — much faster than poll interval
            }
        }

        // ═══════════════════════════════════════════════════════════════
        //  DEVICE DISCOVERY
        // ═══════════════════════════════════════════════════════════════

        private void DiscoverDevices()
        {
            try
            {
                CheckForPitHouse();

                var portNames = SerialPort.GetPortNames();
                if (portNames == null || portNames.Length == 0) return;

                // Query WMI for USB serial device descriptions
                var portDescriptions = GetUsbSerialDescriptions();

                foreach (var portName in portNames)
                {
                    // Skip already-known ports
                    if (_devices.ContainsKey(portName)) continue;

                    // Try to match against Moza USB patterns
                    string description = "";
                    if (portDescriptions.TryGetValue(portName, out string desc))
                        description = desc;

                    var match = ClassifyDevice(description);
                    if (match == null) continue;

                    var device = new MozaDevice(
                        portName,
                        match.Value.type,
                        MozaDeviceRegistry.GetDeviceId(match.Value.type),
                        match.Value.subType)
                    {
                        UsbDescription = description
                    };

                    if (TryOpenPort(device))
                    {
                        _devices[portName] = device;
                        _logInfo($"[MozaSerial] Discovered: {device.DisplayName} ({description})");
                    }
                }
            }
            catch (Exception ex)
            {
                _logWarn($"[MozaSerial] Discovery error: {ex.Message}");
            }
        }

        /// <summary>
        /// Queries WMI Win32_PnPEntity for USB serial port descriptions.
        /// Returns a dictionary of COM port name → description string.
        /// </summary>
        private Dictionary<string, string> GetUsbSerialDescriptions()
        {
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            try
            {
                using (var searcher = new ManagementObjectSearcher(
                    "SELECT Name, Description, Manufacturer FROM Win32_PnPEntity WHERE Name LIKE '%(COM%'"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        string name = obj["Name"]?.ToString() ?? "";
                        string desc = obj["Description"]?.ToString() ?? "";
                        string manufacturer = obj["Manufacturer"]?.ToString() ?? "";

                        // Extract COM port number from name like "Gudsen MOZA R9 Base (COM3)"
                        var comMatch = Regex.Match(name, @"\(COM(\d+)\)");
                        if (comMatch.Success)
                        {
                            string portName = "COM" + comMatch.Groups[1].Value;
                            // Combine all available info for pattern matching
                            string fullDesc = $"{manufacturer} {name} {desc}".Trim();
                            result[portName] = fullDesc;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logWarn($"[MozaSerial] WMI query failed: {ex.Message}");
            }

            return result;
        }

        /// <summary>
        /// Matches a USB description string against known Moza device patterns.
        /// </summary>
        private static (MozaDeviceRegistry.MozaDeviceType type, string subType)? ClassifyDevice(string description)
        {
            if (string.IsNullOrEmpty(description)) return null;

            foreach (var pattern in MozaDeviceRegistry.UsbPatterns)
            {
                if (pattern.Pattern.IsMatch(description))
                {
                    // Skip the generic fallback pattern for "Unknown" — only use it if nothing else matched
                    if (pattern.DeviceType == MozaDeviceRegistry.MozaDeviceType.Unknown)
                        continue;

                    return (pattern.DeviceType, pattern.SubType ?? "");
                }
            }

            // Check generic Gudsen/Moza fallback
            var fallback = MozaDeviceRegistry.UsbPatterns
                .FirstOrDefault(p => p.DeviceType == MozaDeviceRegistry.MozaDeviceType.Unknown);
            if (fallback != null && fallback.Pattern.IsMatch(description))
                return (MozaDeviceRegistry.MozaDeviceType.Unknown, "");

            return null;
        }

        /// <summary>
        /// Checks if Pit House is running (serial port conflict warning).
        /// </summary>
        private void CheckForPitHouse()
        {
            try
            {
                var processes = System.Diagnostics.Process.GetProcessesByName("PitHouse");
                if (processes.Length > 0)
                {
                    PitHouseWarning = "Moza Pit House is running — it may hold serial ports open, preventing direct hardware access.";
                    _logWarn($"[MozaSerial] {PitHouseWarning}");
                }
                else
                {
                    PitHouseWarning = "";
                }

                foreach (var p in processes)
                    p.Dispose();
            }
            catch { /* ignore — process enumeration can fail */ }
        }

        // ═══════════════════════════════════════════════════════════════
        //  SERIAL PORT MANAGEMENT
        // ═══════════════════════════════════════════════════════════════

        private bool TryOpenPort(MozaDevice device)
        {
            try
            {
                var port = new SerialPort(device.PortName, BaudRate, SerialParity, DataBits, SerialStopBits)
                {
                    ReadTimeout = ReadTimeoutMs,
                    WriteTimeout = WriteTimeoutMs,
                    Handshake = Handshake.None
                };

                port.Open();
                port.DiscardInBuffer();
                port.DiscardOutBuffer();

                _ports[device.PortName] = port;
                _portLocks[device.PortName] = new SemaphoreSlim(1, 1);
                device.IsConnected = true;

                return true;
            }
            catch (Exception ex)
            {
                _logWarn($"[MozaSerial] Failed to open {device.PortName}: {ex.Message}");
                return false;
            }
        }

        private void ClosePort(string portName)
        {
            if (_ports.TryRemove(portName, out var port))
            {
                try { port.Close(); } catch { }
                try { port.Dispose(); } catch { }
            }

            if (_devices.TryGetValue(portName, out var device))
                device.IsConnected = false;
        }

        private void CloseAllPorts()
        {
            foreach (var portName in _ports.Keys.ToList())
                ClosePort(portName);
        }

        // ═══════════════════════════════════════════════════════════════
        //  POLLING — READ DEVICE SETTINGS
        // ═══════════════════════════════════════════════════════════════

        private void PollDevice(MozaDevice device)
        {
            byte[][] commands = GetPollCommands(device);
            if (commands == null || commands.Length == 0)
            {
                device.RecordSuccess(); // Nothing to poll but device exists
                return;
            }

            foreach (var packet in commands)
            {
                byte[] response = SendAndReceive(device.PortName, packet);
                if (response == null)
                {
                    if (device.RecordFailure())
                    {
                        _logWarn($"[MozaSerial] {device.DisplayName} disconnected after {MozaDevice.MaxFailures} failures");
                        ClosePort(device.PortName);
                    }
                    return; // Stop polling this device on failure
                }

                // Parse and apply responses
                var parsed = MozaResponseParser.ParseResponses(response);
                foreach (var resp in parsed)
                {
                    ApplyResponse(device, resp);
                }
            }

            device.RecordSuccess();
        }

        /// <summary>
        /// Builds the set of read-request packets for a device based on its type.
        /// </summary>
        private byte[][] GetPollCommands(MozaDevice device)
        {
            switch (device.DeviceType)
            {
                case MozaDeviceRegistry.MozaDeviceType.Wheelbase:
                    return BuildReadPackets(MozaDeviceRegistry.DeviceWheelbase,
                        MozaDeviceRegistry.WheelbaseCmd.PollCommands,
                        MozaDeviceRegistry.WheelbaseCmd.TwoByteCommands);

                case MozaDeviceRegistry.MozaDeviceType.Pedals:
                    return BuildPedalReadPackets();

                case MozaDeviceRegistry.MozaDeviceType.Handbrake:
                    return BuildReadPackets(MozaDeviceRegistry.DeviceHandbrake,
                        MozaDeviceRegistry.HandbrakeCmd.PollCommands,
                        MozaDeviceRegistry.HandbrakeCmd.TwoByteCommands);

                case MozaDeviceRegistry.MozaDeviceType.Shifter:
                    return BuildReadPackets(MozaDeviceRegistry.DeviceShifter,
                        MozaDeviceRegistry.ShifterCmd.PollCommands, null);

                case MozaDeviceRegistry.MozaDeviceType.Dashboard:
                    return BuildReadPackets(MozaDeviceRegistry.DeviceDashboard,
                        MozaDeviceRegistry.DashboardCmd.PollCommands, null);

                case MozaDeviceRegistry.MozaDeviceType.SteeringWheel:
                    // Poll both primary (0x15) and extended (0x17)
                    var primary = BuildReadPackets(MozaDeviceRegistry.DeviceSteeringWheelPrimary,
                        MozaDeviceRegistry.WheelCmd.PrimaryPollCommands, null);
                    var extended = BuildReadPackets(MozaDeviceRegistry.DeviceSteeringWheelExtended,
                        MozaDeviceRegistry.WheelCmd.ExtendedPollCommands, null);
                    var combined = new byte[primary.Length + extended.Length][];
                    primary.CopyTo(combined, 0);
                    extended.CopyTo(combined, primary.Length);
                    return combined;

                default:
                    return null;
            }
        }

        private byte[][] BuildReadPackets(byte deviceId, byte[] commands, byte[] twoByteCommands)
        {
            var packets = new List<byte[]>();
            foreach (var cmd in commands)
            {
                packets.Add(MozaPacketBuilder.BuildReadPacket(deviceId, cmd));
            }
            // Also poll 2-byte commands
            if (twoByteCommands != null)
            {
                foreach (var cmd in twoByteCommands)
                {
                    packets.Add(MozaPacketBuilder.BuildReadPacket(deviceId, cmd));
                }
            }
            return packets.ToArray();
        }

        private byte[][] BuildPedalReadPackets()
        {
            var packets = new List<byte[]>();
            foreach (var axis in new[] { MozaDeviceRegistry.PedalAxis.Throttle, MozaDeviceRegistry.PedalAxis.Brake, MozaDeviceRegistry.PedalAxis.Clutch })
            {
                // Single-byte settings
                var singleByteOffsets = new byte[]
                {
                    MozaDeviceRegistry.PedalCmd.Deadzone,
                    MozaDeviceRegistry.PedalCmd.CurveY1, MozaDeviceRegistry.PedalCmd.CurveY2,
                    MozaDeviceRegistry.PedalCmd.CurveY3, MozaDeviceRegistry.PedalCmd.CurveY4,
                    MozaDeviceRegistry.PedalCmd.CurveY5, MozaDeviceRegistry.PedalCmd.HidSource
                };
                foreach (var offset in singleByteOffsets)
                {
                    byte cmd = MozaDeviceRegistry.PedalCmd.GetCommand(axis, offset);
                    packets.Add(MozaPacketBuilder.BuildReadPacket(MozaDeviceRegistry.DevicePedals, cmd));
                }

                // Two-byte settings (calibration)
                foreach (var offset in MozaDeviceRegistry.PedalCmd.TwoByteOffsets)
                {
                    byte cmd = MozaDeviceRegistry.PedalCmd.GetCommand(axis, offset);
                    packets.Add(MozaPacketBuilder.BuildReadPacket(MozaDeviceRegistry.DevicePedals, cmd));
                }
            }
            return packets.ToArray();
        }

        // ═══════════════════════════════════════════════════════════════
        //  RESPONSE HANDLING
        // ═══════════════════════════════════════════════════════════════

        private void ApplyResponse(MozaDevice device, MozaResponse response)
        {
            if (!response.IsReadResponse) return;
            if (response.CommandAndPayload == null || response.CommandAndPayload.Length < 2) return;

            byte commandId = MozaResponseParser.GetCommandId(response);
            bool isTwoByte = MozaDeviceRegistry.IsTwoByteCommand(device.DeviceId, commandId);

            int value;
            if (isTwoByte)
            {
                if (response.CommandAndPayload.Length < 3) return;
                value = MozaResponseParser.GetValueUInt16(response);
            }
            else
            {
                value = MozaResponseParser.GetValueByte(response);
            }

            switch (device.DeviceType)
            {
                case MozaDeviceRegistry.MozaDeviceType.Wheelbase:
                    device.WheelbaseSettings?.ApplyValue(commandId, value);
                    break;
                case MozaDeviceRegistry.MozaDeviceType.Pedals:
                    device.PedalSettings?.ApplyValue(commandId, value);
                    break;
                case MozaDeviceRegistry.MozaDeviceType.Handbrake:
                    device.HandbrakeSettings?.ApplyValue(commandId, value);
                    break;
                case MozaDeviceRegistry.MozaDeviceType.Shifter:
                    device.ShifterSettings?.ApplyValue(commandId, value);
                    break;
                case MozaDeviceRegistry.MozaDeviceType.Dashboard:
                    device.DashboardSettings?.ApplyValue(commandId, value);
                    break;
                case MozaDeviceRegistry.MozaDeviceType.SteeringWheel:
                    // Route to primary or extended based on response device ID
                    if (response.DeviceId == MozaDeviceRegistry.DeviceSteeringWheelPrimary)
                        device.WheelSettings?.ApplyPrimaryValue(commandId, value);
                    else if (response.DeviceId == MozaDeviceRegistry.DeviceSteeringWheelExtended)
                        device.WheelSettings?.ApplyExtendedValue(commandId, value);
                    break;
            }
        }

        // ═══════════════════════════════════════════════════════════════
        //  WRITE QUEUE PROCESSING
        // ═══════════════════════════════════════════════════════════════

        private void ProcessWriteQueue()
        {
            int processed = 0;
            while (_writeQueue.TryDequeue(out var cmd) && processed < 20)
            {
                // Find the port for this device ID
                var device = _devices.Values.FirstOrDefault(d =>
                    d.DeviceId == cmd.DeviceId && d.IsConnected);

                if (device != null)
                {
                    SendPacket(device.PortName, cmd.Packet);
                }
                processed++;
            }
        }

        // ═══════════════════════════════════════════════════════════════
        //  SERIAL I/O (thread-safe per port)
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Sends a packet and reads the response, with per-port locking.
        /// Returns the raw response bytes, or null on failure.
        /// </summary>
        private byte[] SendAndReceive(string portName, byte[] packet)
        {
            if (!_ports.TryGetValue(portName, out var port)) return null;
            if (!_portLocks.TryGetValue(portName, out var semaphore)) return null;

            if (!semaphore.Wait(WriteTimeoutMs)) return null;
            try
            {
                if (!port.IsOpen) return null;

                port.DiscardInBuffer();
                port.Write(packet, 0, packet.Length);

                // Wait briefly for response
                Thread.Sleep(50);

                int available = port.BytesToRead;
                if (available <= 0) return null;

                byte[] buffer = new byte[Math.Min(available, ReadBufferSize)];
                int read = port.Read(buffer, 0, buffer.Length);
                if (read <= 0) return null;

                if (read < buffer.Length)
                    Array.Resize(ref buffer, read);
                return buffer;
            }
            catch (TimeoutException)
            {
                return null;
            }
            catch (System.IO.IOException)
            {
                return null; // Port disconnected
            }
            catch (InvalidOperationException)
            {
                return null; // Port closed
            }
            finally
            {
                semaphore.Release();
            }
        }

        /// <summary>
        /// Sends a packet without waiting for a response (for write commands).
        /// </summary>
        private void SendPacket(string portName, byte[] packet)
        {
            if (!_ports.TryGetValue(portName, out var port)) return;
            if (!_portLocks.TryGetValue(portName, out var semaphore)) return;

            if (!semaphore.Wait(WriteTimeoutMs)) return;
            try
            {
                if (port.IsOpen)
                    port.Write(packet, 0, packet.Length);
            }
            catch (Exception ex)
            {
                _logWarn($"[MozaSerial] Write error on {portName}: {ex.Message}");
            }
            finally
            {
                semaphore.Release();
            }
        }

        // ═══════════════════════════════════════════════════════════════
        //  SUMMARY FOR MAIN POLL RESPONSE
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Appends Moza summary properties to the main HTTP poll response StringBuilder.
        /// Uses the same Jp() pattern as Plugin.cs.
        /// </summary>
        public void AppendPollSummary(StringBuilder sb, Action<StringBuilder, string, int> jpInt, Action<StringBuilder, string, string> jpStr)
        {
            jpInt(sb, "MozaConnected", IsConnected ? 1 : 0);
            jpInt(sb, "MozaDeviceCount", DeviceCount);

            var wb = Wheelbase;
            jpInt(sb, "MozaWheelbaseConnected", wb != null ? 1 : 0);
            jpInt(sb, "MozaPedalsConnected", Pedals != null ? 1 : 0);
            jpInt(sb, "MozaHandbrakeConnected", Handbrake != null ? 1 : 0);
            jpInt(sb, "MozaShifterConnected", Shifter != null ? 1 : 0);
            jpInt(sb, "MozaDashboardConnected", Dashboard != null ? 1 : 0);
            jpInt(sb, "MozaWheelConnected", SteeringWheel != null ? 1 : 0);

            if (wb?.WheelbaseSettings != null && wb.WheelbaseSettings.HasData)
            {
                jpInt(sb, "MozaWheelbaseFFBStrength", wb.WheelbaseSettings.FfbStrength);
                jpInt(sb, "MozaWheelbaseRotationRange", wb.WheelbaseSettings.RotationRange);
                jpStr(sb, "MozaWheelbaseModel", wb.WheelbaseSettings.Model ?? "");
            }

            if (!string.IsNullOrEmpty(PitHouseWarning))
            {
                jpStr(sb, "MozaPitHouseWarning", PitHouseWarning.Replace("\"", "\\\""));
            }
        }

        // ── Internal write command struct ─────────────────────────────
        private struct WriteCommand
        {
            public byte DeviceId;
            public byte[] Packet;
        }
    }
}
