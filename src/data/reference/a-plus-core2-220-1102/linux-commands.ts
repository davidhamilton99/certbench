import type { ReferenceTable } from "../types";

export const linuxCommands: ReferenceTable = {
  id: "linux-commands",
  title: "Linux CLI Reference",
  description: "Essential Linux command-line tools and syntax for the CompTIA A+ 220-1102 exam.",
  columnHeaders: [
    { key: "command", label: "Command", mono: true },
    { key: "purpose", label: "Purpose" },
    { key: "syntax", label: "Syntax", mono: true },
    { key: "example", label: "Example / Key Flags" },
  ],
  entries: [
    // File system navigation
    { columns: { command: "ls", purpose: "List directory contents", syntax: "ls [options] [path]", example: "ls -la — long format including hidden files; ls -lh — human-readable sizes" } },
    { columns: { command: "cd", purpose: "Change current working directory", syntax: "cd [path]", example: "cd /home/user — absolute path; cd .. — up one level; cd ~ — home directory" } },
    { columns: { command: "pwd", purpose: "Print current working directory (full path)", syntax: "pwd", example: "pwd — outputs e.g. /home/alice/documents" } },
    // Directory management
    { columns: { command: "mkdir", purpose: "Create a new directory", syntax: "mkdir [options] dirname", example: "mkdir -p /opt/myapp/logs — create directory and all parents as needed" } },
    { columns: { command: "rmdir", purpose: "Remove an empty directory", syntax: "rmdir dirname", example: "rmdir /tmp/emptydir — fails if directory contains files; use rm -r for non-empty" } },
    // File management
    { columns: { command: "rm", purpose: "Remove files or directories", syntax: "rm [options] file", example: "rm file.txt — delete file; rm -r dir/ — delete directory recursively; rm -rf — force (no prompt)" } },
    { columns: { command: "cp", purpose: "Copy files or directories", syntax: "cp [options] src dst", example: "cp file.txt /tmp/ — copy file; cp -r dir/ /backup/ — copy directory recursively" } },
    { columns: { command: "mv", purpose: "Move or rename files and directories", syntax: "mv src dst", example: "mv old.txt new.txt — rename; mv file.txt /var/www/ — move to new location" } },
    // File viewing
    { columns: { command: "cat", purpose: "Display file contents or concatenate files", syntax: "cat [options] file", example: "cat /etc/hosts — print file; cat file1 file2 > combined — concatenate files" } },
    { columns: { command: "grep", purpose: "Search text using patterns (regular expressions)", syntax: "grep [options] pattern file", example: "grep -i 'error' /var/log/syslog — case-insensitive; grep -r 'TODO' /src/ — recursive search" } },
    { columns: { command: "find", purpose: "Search for files and directories by name, type, size, or date", syntax: "find [path] [options]", example: "find / -name '*.log' — find all .log files; find /home -mtime -7 — modified in last 7 days" } },
    // Permissions
    { columns: { command: "chmod", purpose: "Change file or directory permissions (read/write/execute)", syntax: "chmod [mode] file", example: "chmod 755 script.sh — rwxr-xr-x; chmod +x file — add execute; chmod u=rw,go=r file" } },
    { columns: { command: "chown", purpose: "Change file owner and group", syntax: "chown [user]:[group] file", example: "chown alice:developers file.txt — change owner and group; chown -R alice /var/www — recursive" } },
    // Privilege escalation
    { columns: { command: "sudo", purpose: "Execute a command as another user (typically root)", syntax: "sudo [command]", example: "sudo apt-get update — run apt as root; sudo -i — open root shell; sudo -l — list allowed commands" } },
    { columns: { command: "su", purpose: "Switch to another user account", syntax: "su [username]", example: "su - bob — switch to bob with their environment; su - (no user) — switch to root" } },
    // Package management
    { columns: { command: "apt-get / apt", purpose: "Debian/Ubuntu package manager — install, update, remove packages", syntax: "apt-get [command] [package]", example: "apt-get install nmap — install package; apt-get update — refresh repos; apt-get upgrade — upgrade all" } },
    { columns: { command: "yum / dnf", purpose: "Red Hat/CentOS/Fedora package manager", syntax: "yum [command] [package]", example: "yum install httpd — install Apache; dnf update — update all packages (dnf is modern replacement for yum)" } },
    // Text editors
    { columns: { command: "nano", purpose: "Simple terminal text editor — beginner friendly", syntax: "nano [file]", example: "nano /etc/hosts — edit hosts file; Ctrl+O save; Ctrl+X exit; Ctrl+W search" } },
    { columns: { command: "vi / vim", purpose: "Powerful terminal text editor — modal editing", syntax: "vi [file]", example: "vi file.txt — open; i = insert mode; Esc = normal mode; :w = save; :q = quit; :wq = save and quit" } },
    // Help
    { columns: { command: "man", purpose: "Display the manual page for any command", syntax: "man [command]", example: "man ls — view ls manual; man -k keyword — search manual pages; q to quit" } },
    // Disk usage
    { columns: { command: "df", purpose: "Report file system disk space usage", syntax: "df [options]", example: "df -h — human-readable (GB/MB); df -h /home — check specific mount point" } },
    { columns: { command: "du", purpose: "Estimate file and directory disk usage", syntax: "du [options] [path]", example: "du -sh /var/log — total size of /var/log; du -sh * — size of each item in current directory" } },
    // Process management
    { columns: { command: "ps", purpose: "Display currently running processes", syntax: "ps [options]", example: "ps aux — all processes with details (user, PID, CPU, command); ps -ef — full format" } },
    { columns: { command: "top", purpose: "Real-time interactive process viewer — updates every few seconds", syntax: "top", example: "top — launch; q = quit; k = kill process by PID; M = sort by memory; P = sort by CPU" } },
    { columns: { command: "kill", purpose: "Send a signal to a process, typically to terminate it", syntax: "kill [signal] PID", example: "kill 1234 — send SIGTERM (graceful); kill -9 1234 — SIGKILL (force terminate); killall chrome" } },
    // Networking
    { columns: { command: "ifconfig / ip", purpose: "Display or configure network interface settings", syntax: "ifconfig [interface] / ip addr", example: "ifconfig eth0 — show eth0 config; ip addr show — modern equivalent; ip route show — routing table" } },
    { columns: { command: "ping", purpose: "Test network connectivity to a host via ICMP echo", syntax: "ping [options] host", example: "ping 8.8.8.8 — test external; ping -c 4 google.com — send exactly 4 packets" } },
    { columns: { command: "ssh", purpose: "Securely connect to a remote host over an encrypted tunnel", syntax: "ssh [user@]host [-p port]", example: "ssh alice@192.168.1.10 — connect as alice; ssh -p 2222 server — use non-default port" } },
    // Archiving
    { columns: { command: "tar", purpose: "Archive and compress files (tape archive)", syntax: "tar [options] archive files", example: "tar -czf backup.tar.gz /data — create gzip archive; tar -xzf backup.tar.gz — extract; -t = list contents" } },
    // User management
    { columns: { command: "passwd", purpose: "Change a user account password", syntax: "passwd [username]", example: "passwd — change own password; sudo passwd bob — change bob's password (requires sudo)" } },
  ],
};
