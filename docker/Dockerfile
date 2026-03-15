# ═══════════════════════════════════════════════════════════════════════
# K10 Media Coach — cross-platform build container
#
# Builds the SimHub plugin DLL on macOS/Linux using the .NET 8 SDK
# with .NET Framework 4.8 reference assemblies from NuGet.
#
# Usage:
#   docker compose build
#   docker compose run --rm build
# ═══════════════════════════════════════════════════════════════════════

FROM mcr.microsoft.com/dotnet/sdk:8.0

# Install mono-devel for reference assemblies that may be needed
# for .NET Framework 4.8 WPF types (PresentationCore, etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        mono-devel \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# Copy NuGet config if present, then restore (layer cache)
COPY simhub-plugin/plugin/K10MediaCoach.Plugin/K10MediaCoach.Plugin.csproj \
     /src/simhub-plugin/plugin/K10MediaCoach.Plugin/

# Pre-restore to cache NuGet packages
RUN dotnet restore \
    /src/simhub-plugin/plugin/K10MediaCoach.Plugin/K10MediaCoach.Plugin.csproj \
    /p:CrossPlatformBuild=true \
    /p:SIMHUB_PATH=/src/lib/simhub-refs/ \
    || true

# Copy vendored SimHub reference DLLs
COPY lib/simhub-refs/ /src/lib/simhub-refs/

# Copy full source
COPY simhub-plugin/ /src/simhub-plugin/

# Default: build the plugin
CMD ["dotnet", "build", \
     "/src/simhub-plugin/plugin/K10MediaCoach.Plugin/K10MediaCoach.Plugin.csproj", \
     "/p:CrossPlatformBuild=true", \
     "/p:SIMHUB_PATH=/src/lib/simhub-refs/", \
     "/p:OutputPath=/out/", \
     "-c", "Release", \
     "-v", "normal"]
