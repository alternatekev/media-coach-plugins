# SimHub Reference DLLs

These DLLs are needed to compile the K10 Media Broadcaster plugin. They come from
your SimHub installation directory (`C:\Program Files (x86)\SimHub\`).

## Required files

Copy these 5 files into this directory:

| File                     | Purpose                        |
|--------------------------|--------------------------------|
| `GameReaderCommon.dll`   | Telemetry data types           |
| `SimHub.Plugins.dll`     | Plugin interfaces & attributes |
| `SimHub.Logging.dll`     | Logging facade                 |
| `log4net.dll`            | Logging implementation         |
| `Newtonsoft.Json.dll`    | JSON serialization             |

## How to get them

**From your Parallels VM or a Windows machine with SimHub installed:**

```bash
# From the Mac, if Parallels shared folders are set up:
cp "/Volumes/[C] Windows/Program Files (x86)/SimHub/"*.dll lib/simhub-refs/

# Or manually copy these 5 DLLs from the SimHub install folder.
```

## Important

These DLLs are **not** redistributable and must **not** be committed to git.
They are listed in `.gitignore`.
