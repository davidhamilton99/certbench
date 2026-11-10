import type { ReferenceTable } from "../types";

export const windowsCommands: ReferenceTable = {
  id: "windows-commands",
  title: "Windows Commands",
  description: "The Windows command-line tools on the CompTIA A+ 220-1202 exam.",
  columnHeaders: [
    { key: "command", label: "Command", mono: true },
    { key: "type", label: "Shell" },
    { key: "purpose", label: "Purpose" },
    { key: "example", label: "Example / Key Flags" },
  ],
  entries: [
    // Navigation
    { columns: { command: "cd", type: "CMD", purpose: "Change the current directory", example: "cd C:\\Users — go to a folder; cd .. — up one level; cd \\ — to the root of the drive" } },
    { columns: { command: "dir", type: "CMD", purpose: "List the files and folders in a directory", example: "dir — current folder; dir /a — include hidden and system files; dir /s — include subfolders" } },

    // Network
    { columns: { command: "ipconfig", type: "CMD", purpose: "Display IP configuration for all adapters", example: "ipconfig /all — full details; ipconfig /release — release DHCP; ipconfig /renew — renew DHCP; ipconfig /flushdns" } },
    { columns: { command: "ping", type: "CMD", purpose: "Test connectivity to a host by sending ICMP echo requests", example: "ping 8.8.8.8 — test external; ping -t hostname — continuous ping until stopped" } },
    { columns: { command: "tracert", type: "CMD", purpose: "Trace the route packets take to a destination; shows each hop", example: "tracert google.com — shows latency at each router hop" } },
    { columns: { command: "pathping", type: "CMD", purpose: "Combines ping and tracert; shows packet loss at each hop over time", example: "pathping google.com — more detailed than tracert alone" } },
    { columns: { command: "netstat", type: "CMD", purpose: "Display active TCP connections, listening ports, and statistics", example: "netstat -an — all connections and ports; netstat -b — show executable per connection" } },
    { columns: { command: "nslookup", type: "CMD", purpose: "Query DNS servers to resolve hostnames and IP addresses", example: "nslookup google.com — forward lookup; nslookup 8.8.8.8 — reverse lookup" } },
    { columns: { command: "net use", type: "CMD", purpose: "Map, display, or disconnect network drives and shared resources", example: "net use Z: \\\\server\\share — map drive; net use * /delete — disconnect all" } },

    // Disk management
    { columns: { command: "chkdsk", type: "CMD", purpose: "Check disk for file system errors and bad sectors", example: "chkdsk C: /f — fix errors; chkdsk C: /r — locate bad sectors and recover data (requires reboot)" } },
    { columns: { command: "format", type: "CMD", purpose: "Format a disk or partition with a specified file system", example: "format D: /fs:NTFS /q — quick format drive D with NTFS" } },
    { columns: { command: "diskpart", type: "CMD", purpose: "Manage disks, partitions, and volumes interactively", example: "diskpart → list disk → select disk 0 → clean → create partition primary → format fs=ntfs quick" } },

    // File management
    { columns: { command: "md", type: "CMD", purpose: "Create a new directory", example: "md C:\\Projects\\NewFolder — creates directory and any missing parents (mkdir also works)" } },
    { columns: { command: "rmdir", type: "CMD", purpose: "Remove a directory (must be empty, or use /s)", example: "rmdir /s /q C:\\OldFolder — remove directory and all contents silently (rd also works)" } },
    { columns: { command: "robocopy", type: "CMD", purpose: "Robust file copy — resumes failed transfers, mirrors directories", example: "robocopy C:\\src D:\\dst /mir — mirror (deletes dest files not in src); /z — restartable mode" } },

    // Informational
    { columns: { command: "hostname", type: "CMD", purpose: "Display the current computer's hostname", example: "hostname — no flags needed; useful in scripts" } },
    { columns: { command: "net user", type: "CMD", purpose: "Manage local user accounts — create, modify, delete, view", example: "net user — list users; net user admin * — change admin password; net user bob /add" } },
    { columns: { command: "winver", type: "CMD", purpose: "Show the Windows version and build number", example: "winver — opens the About Windows box: edition, version (e.g. 23H2) and OS build" } },
    { columns: { command: "whoami", type: "CMD", purpose: "Show which user account you're signed in as", example: "whoami — domain\\user; whoami /groups — group memberships; whoami /priv — privileges" } },
    { columns: { command: "/?", type: "CMD", purpose: "Show a command's help (syntax and switches), typed after the command's name", example: "ipconfig /? — every ipconfig switch; robocopy /? — robocopy's options" } },

    // OS management
    { columns: { command: "gpupdate", type: "CMD", purpose: "Refresh Group Policy settings immediately", example: "gpupdate /force — re-applies all policies even if unchanged" } },
    { columns: { command: "gpresult", type: "CMD", purpose: "Display the Resultant Set of Policy (RSoP) applied to the computer/user", example: "gpresult /r — summary; gpresult /h report.html — HTML report" } },
    { columns: { command: "sfc", type: "CMD (Admin)", purpose: "System File Checker — scan and repair corrupted Windows system files", example: "sfc /scannow — must run as Administrator; scans protected files and restores from cache" } },
  ],
};
