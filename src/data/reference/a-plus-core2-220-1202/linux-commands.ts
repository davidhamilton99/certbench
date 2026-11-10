import type { ReferenceTable } from "../types";

export const linuxCommands: ReferenceTable = {
  id: "linux-commands",
  title: "Linux CLI Reference",
  description: "The Linux command-line tools on the CompTIA A+ 220-1202 exam.",
  columnHeaders: [
    { key: "command", label: "Command", mono: true },
    { key: "purpose", label: "Purpose" },
    { key: "syntax", label: "Syntax", mono: true },
    { key: "example", label: "Example / Key Flags" },
  ],
  entries: [
    // File management
    { columns: { command: "ls", purpose: "List directory contents", syntax: "ls [options] [path]", example: "ls -la — long format including hidden files; ls -lh — human-readable sizes" } },
    { columns: { command: "pwd", purpose: "Print current working directory (full path)", syntax: "pwd", example: "pwd — outputs e.g. /home/alice/documents" } },
    { columns: { command: "mv", purpose: "Move or rename files and directories", syntax: "mv src dst", example: "mv old.txt new.txt — rename; mv file.txt /var/www/ — move to new location" } },
    { columns: { command: "cp", purpose: "Copy files or directories", syntax: "cp [options] src dst", example: "cp file.txt /tmp/ — copy file; cp -r dir/ /backup/ — copy directory recursively" } },
    { columns: { command: "rm", purpose: "Remove files or directories", syntax: "rm [options] file", example: "rm file.txt — delete file; rm -r dir/ — delete directory recursively; rm -rf — force (no prompt)" } },
    { columns: { command: "chmod", purpose: "Change file or directory permissions (read/write/execute)", syntax: "chmod [mode] file", example: "chmod 755 script.sh — rwxr-xr-x; chmod +x file — add execute; chmod u=rw,go=r file" } },
    { columns: { command: "chown", purpose: "Change file owner and group", syntax: "chown [user]:[group] file", example: "chown alice:developers file.txt — change owner and group; chown -R alice /var/www — recursive" } },
    { columns: { command: "grep", purpose: "Search text using patterns (regular expressions)", syntax: "grep [options] pattern file", example: "grep -i 'error' /var/log/syslog — case-insensitive; grep -r 'TODO' /src/ — recursive search" } },
    { columns: { command: "find", purpose: "Search for files and directories by name, type, size, or date", syntax: "find [path] [options]", example: "find / -name '*.log' — find all .log files; find /home -mtime -7 — modified in last 7 days" } },

    // Filesystem management
    { columns: { command: "fsck", purpose: "Check and repair a Linux file system", syntax: "fsck [options] device", example: "fsck /dev/sdb1 — check a partition (unmount it first); fsck -y — repair without asking" } },
    { columns: { command: "mount", purpose: "Attach a drive, partition or share to a directory", syntax: "mount [device] [directory]", example: "mount /dev/sdb1 /mnt/usb — mount a USB drive; mount on its own lists mounts; /etc/fstab lists those mounted at boot" } },

    // Administrative
    { columns: { command: "su", purpose: "Switch to another user account", syntax: "su [username]", example: "su - bob — switch to bob with their environment; su - (no user) — switch to root" } },
    { columns: { command: "sudo", purpose: "Execute a command as another user (typically root)", syntax: "sudo [command]", example: "sudo apt update — run apt as root; sudo -i — open root shell; sudo -l — list allowed commands" } },

    // Package management
    { columns: { command: "apt", purpose: "Debian/Ubuntu package manager — install, update, remove packages", syntax: "apt [command] [package]", example: "apt install nmap — install a package; apt update — refresh package lists; apt upgrade — upgrade all (apt-get is the older front end)" } },
    { columns: { command: "dnf", purpose: "Red Hat/Fedora package manager — install, update, remove packages", syntax: "dnf [command] [package]", example: "dnf install httpd — install Apache; dnf upgrade — update all packages (dnf replaced yum)" } },

    // Network
    { columns: { command: "ip", purpose: "Show and configure network interfaces, addresses and routes", syntax: "ip [object] [command]", example: "ip addr — interfaces and their addresses; ip route — routing table (ip replaced ifconfig)" } },
    { columns: { command: "ping", purpose: "Test network connectivity to a host via ICMP echo", syntax: "ping [options] host", example: "ping 8.8.8.8 — test external; ping -c 4 google.com — send exactly 4 packets" } },
    { columns: { command: "curl", purpose: "Transfer data to or from a URL — download files, test web services", syntax: "curl [options] URL", example: "curl -O https://example.com/file.zip — download a file; curl -I https://example.com — response headers only" } },
    { columns: { command: "dig", purpose: "Query DNS servers for a name's records", syntax: "dig [name] [type]", example: "dig example.com — A record; dig example.com MX — mail servers; dig @8.8.8.8 example.com — ask a specific server" } },
    { columns: { command: "traceroute", purpose: "Show each router hop on the path to a host", syntax: "traceroute host", example: "traceroute example.com — the Linux counterpart of Windows tracert" } },

    // Informational
    { columns: { command: "man", purpose: "Display the manual page for any command", syntax: "man [command]", example: "man ls — view ls manual; man -k keyword — search manual pages; q to quit" } },
    { columns: { command: "cat", purpose: "Display file contents or concatenate files", syntax: "cat [options] file", example: "cat /etc/hosts — print file; cat file1 file2 > combined — concatenate files" } },
    { columns: { command: "top", purpose: "Real-time interactive process viewer — updates every few seconds", syntax: "top", example: "top — launch; q = quit; k = kill process by PID; M = sort by memory; P = sort by CPU" } },
    { columns: { command: "ps", purpose: "Display currently running processes", syntax: "ps [options]", example: "ps aux — all processes with details (user, PID, CPU, command); ps -ef — full format" } },
    { columns: { command: "du", purpose: "Estimate file and directory disk usage", syntax: "du [options] [path]", example: "du -sh /var/log — total size of /var/log; du -sh * — size of each item in current directory" } },
    { columns: { command: "df", purpose: "Report file system disk space usage", syntax: "df [options]", example: "df -h — human-readable (GB/MB); df -h /home — check specific mount point" } },

    // Text editors
    { columns: { command: "nano", purpose: "Simple terminal text editor — beginner friendly", syntax: "nano [file]", example: "nano /etc/hosts — edit hosts file; Ctrl+O save; Ctrl+X exit; Ctrl+W search" } },
  ],
};
