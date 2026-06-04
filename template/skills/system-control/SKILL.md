---
name: system-control
description: Use for system settings, processes, services, registry (Windows), launchctl (macOS), systemd (Linux), networking, hardware, scheduled tasks, installs, cleanup, or system administration.
---

# System Control

Detect the operating system and use the appropriate commands and tools.

## Platform-specific commands

### Windows (PowerShell)
Use PowerShell 5.1-compatible commands. Quote paths. Prefer read/diagnose before modifying.
- Processes: `Get-Process`, `Stop-Process -Id <pid> -Force`, `Start-Process <exe>`
- Services: `Get-Service`, `Start-Service`, `Stop-Service`, `Restart-Service`, `Set-Service`
- Network: `Get-NetAdapter`, `Get-NetIPAddress`, `Get-DnsClientServerAddress`, `netstat -ano`
- Registry: `Get-ItemProperty`, `Set-ItemProperty`, `New-Item`
- Tasks: `Get-ScheduledTask`, `Register-ScheduledTask`, `Start-ScheduledTask`, `Unregister-ScheduledTask`
- Hardware: `Get-CimInstance Win32_ComputerSystem`, `Win32_Processor`, `Win32_PhysicalMemory`, `Win32_VideoController`
- Power: `powercfg /list`, `powercfg /batteryreport`

### macOS (bash/zsh)
- Processes: `ps aux`, `top`, `kill`, `pkill`
- Services: `launchctl list`, `launchctl load/unload path/to/plist`
- Network: `networksetup -listallnetworkservices`, `ifconfig`, `scutil --dns`
- Disk: `diskutil list`, `df -h`, `du -sh *`, `mdls` (file metadata)
- Software: `softwareupdate --list`, `brew list`, `brew install`
- System: `system_profiler SPHardwareDataType`, `sw_vers`, `defaults read`

### Linux (bash)
- Processes: `ps aux`, `top`, `htop`, `kill`, `pkill`
- Services: `systemctl`, `journalctl -u <service>`, `systemctl enable/disable`
- Network: `ip addr`, `ip route`, `ss -tlnp`, `nmcli`, `netstat`
- Disk: `df -h`, `du -sh`, `lsblk`, `fdisk -l`, `mount`
- Packages: `apt list --installed`, `apt install/remove` (Debian), `dnf list installed` (RHEL), `pacman -Q` (Arch)
- Logs: `journalctl`, `tail -f /var/log/syslog`, `dmesg`

## Safety
- Always warn before destructive/high-risk actions: deletion, formatting, service disabling, firewall changes
- For file creation, verify the parent path first
- Prefer user-scope changes unless admin/system-scope is required
- On Unix, use `sudo` only when necessary; on Windows, run as Admin only when needed
