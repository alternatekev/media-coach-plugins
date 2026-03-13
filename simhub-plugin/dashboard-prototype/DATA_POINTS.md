# Dashboard Data Points — Validated SimHub Properties

All properties below are confirmed available through SimHub's DataCorePlugin, the K10 Media Coach plugin's AttachDelegate properties, or iRacing Extra Properties plugin.

## K10 Media Coach Plugin Properties (Custom)
| Property | Type | Source |
|---|---|---|
| `K10MediaCoach.Plugin.CommentaryText` | string | Full commentary prompt |
| `K10MediaCoach.Plugin.CommentaryVisible` | int (0/1) | Show/hide banner |
| `K10MediaCoach.Plugin.CommentaryTopicTitle` | string | Event name ("Close Battle") |
| `K10MediaCoach.Plugin.CommentaryCategory` | string | Category + sentiment label |
| `K10MediaCoach.Plugin.CommentarySentimentColor` | string | #AARRGGBB overlay color |
| `K10MediaCoach.Plugin.CommentaryTextColor` | string | #AARRGGBB text color |
| `K10MediaCoach.Plugin.CommentarySeverity` | int (0-5) | Severity level |
| `K10MediaCoach.Plugin.CurrentFlagState` | string | "green", "yellow", "red", etc. |
| `K10MediaCoach.Plugin.NearestCarDistance` | double (0-1) | Proximity fraction |

## Core Telemetry (DataCorePlugin.GameData)
| Property | Dashboard Use | Type |
|---|---|---|
| `SpeedKmh` / `SpeedMph` | Speed display | float |
| `Rpms` | Tachometer | int |
| `Gear` | Gear indicator | string |
| `Throttle` | Pedal histogram | float 0-1 |
| `Brake` | Pedal histogram | float 0-1 |
| `Clutch` | Pedal histogram | float 0-1 |
| `Fuel` | Fuel bar + stats | float (liters) |
| `TyreTempFL/FR/RL/RR` | Tyre temp grid | float (°F in iRacing) |
| `TyreWearFrontLeft/Right, RearLeft/Right` | Tyre wear | float 0-1 (1=new) |
| `CurrentLapTime` | Lap timer | TimeSpan |
| `LastLapTime` | Last lap display | TimeSpan |
| `BestLapTime` | Best lap display | TimeSpan |

## iRacing Raw Telemetry (DataCorePlugin.GameRawData.Telemetry)
| Property | Dashboard Use | Type |
|---|---|---|
| `PlayerCarClassPosition` | Position number | int |
| `Lap` | Lap counter | int |
| `LapDeltaToSessionBestLap` | Delta display | float (seconds) |
| `SessionFlags` | Flag state (bitfield) | int |
| `LatAccel` | G-force display | float |
| `LongAccel` | G-force display | float |
| `SteeringWheelTorque` | FFB monitoring | float (Nm) |
| `YawRate` | Spin detection | float (rad/s) |

## Calculated / Extended Properties
| Property | Dashboard Use | Source |
|---|---|---|
| Fuel average consumption | Fuel stats | Dahl Design / custom calc |
| Estimated laps remaining | Fuel bar | Dahl Design / custom calc |
| Suggested pit lap | Fuel overlay | Custom calc (fuel / avg per lap) |
| RPM redline % | Tachometer fill | `Rpms / MaxRpm` |
| Live delta (session best) | Delta display | `PersistantTrackerPlugin.SessionBestLiveDeltaSeconds` |

## Opponent Data (iRacing Extra Properties Plugin Required)
| Property | Dashboard Use | Source |
|---|---|---|
| Nearest ahead name | Gap panel | TelemetrySnapshot.NearestAheadName |
| Nearest ahead iRating | Gap panel | TelemetrySnapshot.NearestAheadRating |
| Nearest behind name | Gap panel | TelemetrySnapshot.NearestBehindName |
| Nearest behind iRating | Gap panel | TelemetrySnapshot.NearestBehindRating |
| Gap to car ahead (seconds) | Gap panel | Computed from track position delta |
| Gap to car behind (seconds) | Gap panel | Computed from track position delta |

## Driver Profile (Limited Availability)
| Property | Dashboard Use | Notes |
|---|---|---|
| iRating | Rating block | Available via iRacing Extra Properties; may need session-start snapshot |
| Safety Rating | Rating block | Limited telemetry exposure; may require web API or manual entry |
| iRating delta | Rating change | Computed: current - session start |

## Track Map Data
| Property | Dashboard Use | Source |
|---|---|---|
| `TrackPositionPct` | Player dot position | TelemetrySnapshot (0-1 fraction) |
| `CarIdxLapDistPct[]` | Opponent dots | iRacing raw telemetry (array, all cars) |
| Track outline coords | Map path | Recorded from first lap or pre-built lookup |

## Notes
- **Color format**: SimHub dashboards use #AARRGGBB (alpha-first 8-digit hex). Plugin already normalizes this.
- **Pedal histograms**: Built by buffering last N frames of Throttle/Brake/Clutch values and rendering as bar heights.
- **Fuel pit suggestion**: `ceil(remainingLaps * avgConsumption / tankCapacity)` mapped to upcoming lap number.
- **iRating/SR**: Not reliably available through live telemetry alone. Best approach: read at session start via iRacing results API or manual config, then compute delta from incident count changes.
