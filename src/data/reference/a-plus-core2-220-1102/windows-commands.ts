import type { ReferenceTable } from "../types";

export const windowsCommands: ReferenceTable = {
  id: "windows-commands",
  title: "Windows Commands (CMD & PowerShell)",
  description: "Command-line tools tested on the CompTIA A+ 220-1102 exam, covering CMD and PowerShell.",
  columnHeaders: [
    { key: "command", label: "Command", mono: true },
    { key: "type", label: "Shell" },
    { key: "purpose", label: "Purpose" },
    { key: "example", label: "Example / Key Flags" },
  ],
  entries: [
    // Network
    { columns: { command: "ipconfig", type: "CMD", purpose: "Display IP configuration for all adapters", example: "ipconfig /all — full details; ipconfig /release — release DHCP; ipconfig /renew — renew DHCP; ipconfig /flushdns" } },
    { columns: { command: "ping", type: "CMD", purpose: "Test connectivity to a host by sending ICMP echo requests", example: "ping 8.8.8.8 — test external; ping -t hostname — continuous ping until stopped" } },
    { columns: { command: "tracert", type: "CMD", purpose: "Trace the route packets take to a destination; shows each hop", example: "tracert google.com — shows latency at each router hop" } },
    { columns: { command: "pathping", type: "CMD", purpose: "Combines ping and tracert; shows packet loss at each hop over time", example: "pathping google.com — more detailed than tracert alone" } },
    { columns: { command: "netstat", type: "CMD", purpose: "Display active TCP connections, listening ports, and statistics", example: "netstat -an — all connections and ports; netstat -b — show executable per connection" } },
    { columns: { command: "nslookup", type: "CMD", purpose: "Query DNS servers to resolve hostnames and IP addresses", example: "nslookup google.com — forward lookup; nslookup 8.8.8.8 — reverse lookup" } },
    { columns: { command: "hostname", type: "CMD", purpose: "Display the current computer's hostname", example: "hostname — no flags needed; useful in scripts" } },
    { columns: { command: "net use", type: "CMD", purpose: "Map, display, or disconnect network drives and shared resources", example: "net use Z: \\\\server\\share — map drive; net use * /delete — disconnect all" } },
    { columns: { command: "net user", type: "CMD", purpose: "Manage local user accounts — create, modify, delete, view", example: "net user — list users; net user admin * — change admin password; net user bob /add" } },
    // Disk / File System
    { columns: { command: "chkdsk", type: "CMD", purpose: "Check disk for file system errors and bad sectors", example: "chkdsk C: /f — fix errors; chkdsk C: /r — locate bad sectors and recover data (requires reboot)" } },
    { columns: { command: "diskpart", type: "CMD", purpose: "Manage disks, partitions, and volumes interactively", example: "diskpart → list disk → select disk 0 → clean → create partition primary → format fs=ntfs quick" } },
    { columns: { command: "format", type: "CMD", purpose: "Format a disk or partition with a specified file system", example: "format D: /fs:NTFS /q — quick format drive D with NTFS" } },
    { columns: { command: "sfc", type: "CMD (Admin)", purpose: "System File Checker — scan and repair corrupted Windows system files", example: "sfc /scannow — must run as Administrator; scans protected files and restores from cache" } },
    // File management
    { columns: { command: "xcopy", type: "CMD", purpose: "Copy files and directory trees (more powerful than copy)", example: "xcopy C:\\src D:\\dst /s /e /h — copy subdirs, empty dirs, and hidden files" } },
    { columns: { command: "robocopy", type: "CMD", purpose: "Robust file copy — resumes failed transfers, mirrors directories", example: "robocopy C:\\src D:\\dst /mir — mirror (deletes dest files not in src); /z — restartable mode" } },
    { columns: { command: "md / mkdir", type: "CMD", purpose: "Create a new directory", example: "md C:\\Projects\\NewFolder — creates directory and any missing parents" } },
    { columns: { command: "rd / rmdir", type: "CMD", purpose: "Remove a directory (must be empty, or use /s)", example: "rd /s /q C:\\OldFolder — remove directory and all contents silently" } },
    // System
    { columns: { command: "gpupdate", type: "CMD", purpose: "Refresh Group Policy settings immediately", example: "gpupdate /force — re-applies all policies even if unchanged" } },
    { columns: { command: "gpresult", type: "CMD", purpose: "Display the Resultant Set of Policy (RSoP) applied to the computer/user", example: "gpresult /r — summary; gpresult /h report.html — HTML report" } },
    { columns: { command: "shutdown", type: "CMD", purpose: "Shut down, restart, or log off the computer", example: "shutdown /s /t 0 — immediate shutdown; shutdown /r /t 0 — restart; shutdown /a — abort scheduled" } },
    { columns: { command: "tasklist", type: "CMD", purpose: "Display all running processes and their PIDs", example: "tasklist — list all; tasklist /fi \"imagename eq chrome.exe\" — filter by name" } },
    { columns: { command: "taskkill", type: "CMD", purpose: "Terminate a running process by PID or name", example: "taskkill /pid 1234 /f — force kill PID 1234; taskkill /im notepad.exe /f" } },
    { columns: { command: "bootrec", type: "CMD (WinRE)", purpose: "Repair Windows boot configuration (run from Recovery Environment)", example: "bootrec /fixmbr — fix MBR; /fixboot — fix boot sector; /rebuildbcd — rebuild BCD store" } },
    // PowerShell
    { columns: { command: "Get-Help", type: "PowerShell", purpose: "Display help for any cmdlet — equivalent to man pages", example: "Get-Help Get-Process -Full; Get-Help *network* — search for related cmdlets" } },
    { columns: { command: "Get-Command", type: "PowerShell", purpose: "List available cmdlets, functions, aliases, and scripts", example: "Get-Command *service* — find all service-related cmdlets" } },
    { columns: { command: "Set-ExecutionPolicy", type: "PowerShell (Admin)", purpose: "Control whether scripts are allowed to run on the system", example: "Set-ExecutionPolicy RemoteSigned — allow local scripts; Restricted = no scripts (default)" } },
    { columns: { command: "Get-Process", type: "PowerShell", purpose: "List running processes — similar to tasklist", example: "Get-Process chrome — filter by name; Get-Process | Sort-Object CPU -Descending" } },
    { columns: { command: "Get-Service", type: "PowerShell", purpose: "List Windows services and their status", example: "Get-Service — all services; Get-Service -Name wuauserv — Windows Update service status" } },
    { columns: { command: "New-Item", type: "PowerShell", purpose: "Create a new file, directory, registry key, or other item", example: "New-Item -Path C:\\Temp -Name test.txt -ItemType File" } },
    { columns: { command: "Pipeline ( | )", type: "PowerShell", purpose: "Pass output of one cmdlet as input to the next", example: "Get-Process | Where-Object {$_.CPU -gt 100} | Select-Object Name, CPU | Sort-Object CPU" } },
  ],
};
