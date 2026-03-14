import type { SimulationScenario } from "../types";

export const securityPlusSimulations: SimulationScenario[] = [
  /* ================================================================ */
  /*  1. Firewall ACL Configuration                                    */
  /* ================================================================ */
  {
    type: "simulation",
    id: "firewall-acl-configuration",
    title: "Firewall ACL Configuration",
    briefing:
      "Acme Corp has deployed a web server in the DMZ (10.10.10.0/24) that must accept HTTPS traffic from the internet. The internal database server at 192.168.1.100 must only accept MySQL connections from the DMZ web server. You have been tasked with configuring the perimeter firewall and the internal segment firewall to enforce least-privilege access while maintaining business functionality.",
    domain_number: "3.0",
    domain_title: "Security Architecture",
    tasks: [
      {
        id: "fw-task-inbound",
        title: "Inbound Rules",
        instructions:
          "Configure the perimeter firewall inbound ACL to allow legitimate HTTPS traffic to the DMZ web server (10.10.10.50) from any internet source, and explicitly deny all other inbound traffic. For each rule field, select the correct value.",
        fields: [
          {
            type: "dropdown",
            id: "inbound-rule1-src",
            label: "Rule 1 — Source",
            options: ["Any", "10.10.10.0/24", "192.168.1.0/24", "203.0.113.0/24"],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "inbound-rule1-dest",
            label: "Rule 1 — Destination",
            options: ["Any", "10.10.10.50", "192.168.1.100", "0.0.0.0/0"],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "inbound-rule1-port",
            label: "Rule 1 — Destination Port",
            options: ["80 (HTTP)", "443 (HTTPS)", "3306 (MySQL)", "22 (SSH)", "Any"],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "inbound-rule1-action",
            label: "Rule 1 — Action",
            options: ["Permit", "Deny", "Log Only", "Redirect"],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "inbound-rule2-src",
            label: "Rule 2 (Implicit Deny) — Source",
            options: ["Any", "10.10.10.0/24", "192.168.1.0/24"],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "inbound-rule2-dest",
            label: "Rule 2 (Implicit Deny) — Destination",
            options: ["Any", "10.10.10.50", "192.168.1.100"],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "inbound-rule2-action",
            label: "Rule 2 (Implicit Deny) — Action",
            options: ["Permit", "Deny", "Log Only"],
            correctIndex: 1,
          },
        ],
        explanation:
          "Rule 1 permits HTTPS (TCP 443) from Any source to the specific web server IP 10.10.10.50. The implicit deny-all rule (Rule 2) with source Any, destination Any, action Deny enforces the principle that everything not explicitly permitted is blocked. This is the foundation of least-privilege firewall design.",
      },
      {
        id: "fw-task-dmz-internal",
        title: "DMZ-to-Internal Rules",
        instructions:
          "Configure the internal segment firewall ACL that controls traffic between the DMZ (10.10.10.0/24) and the internal network (192.168.1.0/24). The DMZ web server must reach the database on port 3306. No other DMZ-to-internal traffic should be permitted.",
        fields: [
          {
            type: "dropdown",
            id: "dmzint-rule1-src",
            label: "Rule 1 — Source",
            options: ["Any", "10.10.10.50", "10.10.10.0/24", "192.168.1.0/24"],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "dmzint-rule1-dest",
            label: "Rule 1 — Destination",
            options: ["Any", "192.168.1.100", "192.168.1.0/24", "10.10.10.50"],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "dmzint-rule1-port",
            label: "Rule 1 — Destination Port",
            options: ["80 (HTTP)", "443 (HTTPS)", "3306 (MySQL)", "1433 (MSSQL)", "Any"],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "dmzint-rule1-action",
            label: "Rule 1 — Action",
            options: ["Permit", "Deny", "Log Only"],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "dmzint-rule2-src",
            label: "Rule 2 (Block remaining DMZ) — Source",
            options: ["Any", "10.10.10.0/24", "192.168.1.0/24", "10.10.10.50"],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "dmzint-rule2-dest",
            label: "Rule 2 (Block remaining DMZ) — Destination",
            options: ["Any", "192.168.1.0/24", "192.168.1.100"],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "dmzint-rule2-action",
            label: "Rule 2 (Block remaining DMZ) — Action",
            options: ["Permit", "Deny", "Log Only"],
            correctIndex: 1,
          },
        ],
        explanation:
          "The correct rule permits traffic from exactly 10.10.10.50 (the specific web server host, not the whole DMZ subnet) to 192.168.1.100 on port 3306 only. The second rule denies all remaining 10.10.10.0/24-to-192.168.1.0/24 traffic. Using the specific host IP rather than the subnet is critical: if the web server is compromised, other DMZ hosts cannot pivot to the internal database.",
      },
      {
        id: "fw-task-verify",
        title: "Verify Configuration",
        instructions:
          "Review the final ACL summary output below and answer the verification questions to confirm the configuration is correct and secure.",
        evidence: [
          {
            label: "Perimeter Firewall — Inbound ACL (interface: outside)",
            content: `Rule  Seq  Src              Dst              Port       Proto  Action
----  ---  ---------------  ---------------  ---------  -----  ------
1     10   Any              10.10.10.50      443        TCP    PERMIT
2     20   Any              Any              Any        Any    DENY

Implicit deny statistics: 0 packets matched (ACL evaluated top-down)
Last config change: 2026-03-14 08:42:11 UTC by admin`,
          },
          {
            label: "Internal Segment Firewall — DMZ-to-Internal ACL",
            content: `Rule  Seq  Src              Dst              Port       Proto  Action
----  ---  ---------------  ---------------  ---------  -----  ------
1     10   10.10.10.50      192.168.1.100    3306       TCP    PERMIT
2     20   10.10.10.0/24    192.168.1.0/24   Any        Any    DENY

Hit counters (last 1 hour): Rule 1: 1,842 hits | Rule 2: 0 hits`,
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "verify-implicit-deny",
            label: "Does the perimeter ACL implement implicit deny-all?",
            options: [
              "Yes — Rule 2 explicitly denies Any-to-Any traffic",
              "No — there is no deny rule; the firewall defaults to permit",
              "Yes — the firewall hardware automatically adds implicit deny without needing a rule",
              "No — implicit deny only applies to inbound traffic on inside interfaces",
            ],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "verify-least-privilege",
            label: "Which firewall rule best demonstrates the principle of least privilege?",
            options: [
              "Perimeter Rule 1: allowing HTTPS from Any to the web server",
              "Internal Rule 1: allowing MySQL only from the specific web server host to the specific DB host",
              "Internal Rule 2: denying all other DMZ-to-internal traffic",
              "Perimeter Rule 2: the implicit deny-all rule",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "verify-segmentation",
            label: "What security architecture principle do the DMZ firewall rules enforce?",
            options: [
              "Defence in depth through network segmentation",
              "Zero trust by requiring MFA for all connections",
              "Data loss prevention via content inspection",
              "Non-repudiation through traffic logging",
            ],
            correctIndex: 0,
          },
        ],
        explanation:
          "The ACL summary confirms correct configuration. Implicit deny is achieved by an explicit deny-all rule in rule position 20, ensuring no traffic is permitted by default. The internal firewall's Rule 1 is the strongest example of least privilege: it restricts the source to a single host (/32 equivalent), a single destination host, a single port, and a single protocol. The overall design demonstrates network segmentation as a defence-in-depth control — even if the DMZ web server is fully compromised, the attacker cannot reach any internal host other than the database, and cannot use any port other than 3306.",
      },
    ],
    explanation:
      "Firewall ACL configuration is a fundamental Security Architecture skill tested heavily on SY0-701. Key principles: (1) Implicit deny — every ACL must end in a deny-all or the device must be configured to deny by default; everything not explicitly permitted is blocked. (2) Least privilege — rules should use the most specific source and destination possible (host IPs rather than subnets where feasible). (3) Network segmentation — placing internet-facing servers in a DMZ and controlling DMZ-to-internal traffic with a separate internal firewall limits the blast radius of a compromise. The order of ACL rules matters: rules are evaluated top-down and the first match wins.",
    estimatedMinutes: 12,
  },

  /* ================================================================ */
  /*  2. Security Incident Log Analysis                                */
  /* ================================================================ */
  {
    type: "simulation",
    id: "security-incident-log-analysis",
    title: "Security Incident Log Analysis",
    briefing:
      "Your SOC SIEM has fired an alert for host WEB-PROD-01 (172.16.10.20), a Linux web server. The alert correlates an unusually high authentication failure rate with a subsequent successful root login from an external IP address. You have been tasked with analysing the available evidence, identifying the attack type, confirming the extent of compromise, and recommending remediation actions.",
    domain_number: "4.0",
    domain_title: "Security Operations",
    tasks: [
      {
        id: "incident-task-authlog",
        title: "Auth Log Analysis",
        instructions:
          "Analyse the auth.log excerpt from WEB-PROD-01 and answer the questions below to identify the attack and its outcome.",
        evidence: [
          {
            label: "/var/log/auth.log (last 500 lines, filtered for SSH events)",
            content: `Mar 14 02:11:03 WEB-PROD-01 sshd[8821]: Failed password for root from 203.0.113.45 port 51234 ssh2
Mar 14 02:11:04 WEB-PROD-01 sshd[8822]: Failed password for root from 203.0.113.45 port 51235 ssh2
Mar 14 02:11:05 WEB-PROD-01 sshd[8823]: Failed password for root from 203.0.113.45 port 51236 ssh2
[... 844 similar lines omitted — total 847 failed attempts over 14 minutes ...]
Mar 14 02:25:19 WEB-PROD-01 sshd[9671]: Failed password for root from 203.0.113.45 port 52081 ssh2
Mar 14 02:25:21 WEB-PROD-01 sshd[9672]: Accepted password for root from 203.0.113.45 port 52082 ssh2
Mar 14 02:25:21 WEB-PROD-01 sshd[9672]: pam_unix(sshd:session): session opened for user root by (uid=0)
Mar 14 02:25:22 WEB-PROD-01 sudo[9701]: root : TTY=pts/1 ; PWD=/ ; USER=root ; COMMAND=/bin/bash`,
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "auth-attack-type",
            label: "What type of attack does the auth.log evidence indicate?",
            options: [
              "Credential stuffing — replaying breached username/password pairs",
              "Brute-force password attack — systematically trying passwords against one account",
              "Pass-the-hash — authenticating with a captured NTLM hash",
              "Password spraying — trying one common password across many accounts",
              "Kerberoasting — requesting and offline-cracking service tickets",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "auth-login-success",
            label: "Was the attack ultimately successful?",
            options: [
              "No — all 847 attempts failed and the attacker gave up",
              "Yes — the attacker gained access as root after 847 failed attempts",
              "Partial — the attacker gained access as a low-privilege user only",
              "Unknown — the log does not contain enough information to determine outcome",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "auth-compromised-account",
            label: "Which account was compromised?",
            options: ["www-data", "ubuntu", "root", "sshd", "admin"],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "auth-preventive-control",
            label: "Which control, if enabled, would most effectively have prevented this attack?",
            options: [
              "Enabling verbose SSH logging",
              "Disabling root login via SSH (PermitRootLogin no) and enforcing key-based authentication",
              "Rotating SSH host keys weekly",
              "Enabling SFTP-only mode on the SSH daemon",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "The log shows 847 sequential failed password attempts for the root account from a single IP (203.0.113.45), followed by a successful authentication — a classic brute-force attack. The attack succeeded, granting the attacker an interactive root session (uid=0). The most effective preventive control would have been disabling password-based root SSH login entirely: with PermitRootLogin prohibit-password, the attacker could only authenticate with a pre-authorised public key, making brute-force attacks against this vector impossible.",
      },
      {
        id: "incident-task-netstat",
        title: "Network Connections",
        instructions:
          "Review the netstat output captured from WEB-PROD-01 immediately after the SOC alert fired. Identify the suspicious network activity.",
        evidence: [
          {
            label: "netstat -tulnp (captured 2026-03-14 02:26:05 UTC)",
            content: `Proto  Recv-Q  Send-Q  Local Address         Foreign Address       State        PID/Program
tcp    0       0       0.0.0.0:22            0.0.0.0:*             LISTEN       1023/sshd
tcp    0       0       0.0.0.0:80            0.0.0.0:*             LISTEN       1187/apache2
tcp    0       0       0.0.0.0:443           0.0.0.0:*             LISTEN       1187/apache2
tcp    0       0       0.0.0.0:4444          0.0.0.0:*             LISTEN       9815/nc
tcp    0       0       172.16.10.20:4444     203.0.113.45:61337    ESTABLISHED  9815/nc
tcp    0       0       172.16.10.20:22       203.0.113.45:52082    ESTABLISHED  9672/sshd: root
tcp    0       0       172.16.10.20:80       10.0.0.1:54321        ESTABLISHED  1187/apache2`,
          },
          {
            label: "ps aux | grep 9815",
            content: `root      9815  0.0  0.0   6084   916 pts/1    S    02:25   0:00 nc -lvp 4444`,
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "netstat-suspicious-port",
            label: "Which listening port is most suspicious?",
            options: ["22 (sshd)", "80 (apache2)", "443 (apache2)", "4444 (nc)"],
            correctIndex: 3,
          },
          {
            type: "dropdown",
            id: "netstat-tool",
            label: "What tool has the attacker deployed on the server?",
            options: [
              "Metasploit meterpreter reverse shell",
              "netcat (nc) — a raw TCP utility commonly used to create backdoor listeners",
              "nmap — a network scanning tool",
              "tcpdump — a packet capture utility",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "netstat-attacker-ip",
            label: "What is the attacker's IP address?",
            options: ["172.16.10.20", "10.0.0.1", "203.0.113.45", "0.0.0.0"],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "netstat-shell-type",
            label: "Based on the nc command flags (-lvp 4444), what type of shell has been established?",
            options: [
              "Reverse shell — attacker's machine connected outbound to the victim",
              "Bind shell — attacker's machine connected inbound to a listener on the victim",
              "Web shell — a PHP/ASP script executing OS commands via HTTP",
              "SSH tunnel — an encrypted forwarding channel",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "Port 4444 is a well-known attacker-preferred port with no legitimate business use on a web server. The process listing reveals 'nc -lvp 4444' (netcat listening verbosely on port 4444), a bind shell: the netcat process listens on the local port and the attacker connects inbound from 203.0.113.45:61337 to obtain an interactive shell. This is the same attacker IP seen in the brute-force log. The attacker has established persistence through a bind shell running as root.",
      },
      {
        id: "incident-task-remediation",
        title: "Remediation",
        instructions:
          "Based on your analysis, select all appropriate immediate remediation steps. Be careful — some options would destroy forensic evidence or worsen the situation.",
        fields: [
          {
            type: "select-many",
            id: "remediation-steps",
            label: "Select ALL correct immediate remediation actions (choose all that apply):",
            options: [
              "Isolate WEB-PROD-01 from the network immediately (null-route or VLAN quarantine)",
              "Kill the nc process (PID 9815) on the compromised server",
              "Reboot WEB-PROD-01 to clear the attacker's session",
              "Change the root password on WEB-PROD-01",
              "Block source IP 203.0.113.45 at the perimeter firewall",
              "Disable root SSH login (set PermitRootLogin no in sshd_config)",
              "Take a forensic image of the server's disk before making further changes",
              "Delete /var/log/auth.log to prevent the attacker from covering tracks",
              "Notify the incident response team and open a formal incident ticket",
            ],
            correctIndices: [0, 1, 3, 4, 5, 6, 8],
          },
        ],
        explanation:
          "Correct actions: (1) Network isolation stops ongoing attacker access and prevents lateral movement. (2) Killing the nc bind shell removes the backdoor. (3) Changing the root password invalidates the compromised credential. (4) Blocking the attacker IP at the perimeter prevents reconnection attempts. (5) Disabling root SSH login closes the attack vector for future attempts. (6) Taking a forensic image before further remediation preserves evidence for investigation and potential legal action. (7) Notifying the IR team initiates the formal response process. Wrong: Rebooting is premature — volatile memory evidence (running processes, network connections) would be lost. Deleting auth.log would destroy primary evidence of the attack and could constitute obstruction.",
      },
    ],
    explanation:
      "This scenario covers SY0-701 Domain 4.0 Security Operations skills: log analysis, indicator-of-compromise identification, and incident response. Key takeaways: brute-force attacks against SSH succeed when password authentication is enabled for root — SSH key-only authentication eliminates this vector entirely. Netcat bind shells are a common post-exploitation technique due to netcat's near-universal availability on Linux systems. Proper incident response requires evidence preservation before remediation — forensic images must be taken before rebooting or modifying the system. Isolate first, then investigate, then remediate.",
    estimatedMinutes: 10,
  },

  /* ================================================================ */
  /*  3. Wireless Access Point Configuration                           */
  /* ================================================================ */
  {
    type: "simulation",
    id: "wireless-ap-configuration",
    title: "Wireless Access Point Configuration",
    briefing:
      "You are configuring a new Cisco Catalyst 9120 access point for the corporate office. The network requires WPA3-Enterprise security with 802.1X authentication backed by a RADIUS server, operating on the 5 GHz band. A client has also reported a certificate error when connecting; you must identify the root cause from the client error log.",
    domain_number: "3.0",
    domain_title: "Security Architecture",
    tasks: [
      {
        id: "wifi-task-ssid",
        title: "SSID & Security",
        instructions:
          "Configure the primary SSID and its security settings. The SSID for the corporate wireless network must be 'CORP-SECURE' and must use WPA3-Enterprise with AES-CCMP encryption and 802.1X authentication.",
        fields: [
          {
            type: "text",
            id: "wifi-ssid-value",
            label: "SSID Name",
            acceptedValues: ["CORP-SECURE"],
            placeholder: "Enter SSID exactly as specified",
          },
          {
            type: "dropdown",
            id: "wifi-security-mode",
            label: "Security Mode",
            options: [
              "Open (no authentication)",
              "WEP",
              "WPA-Personal (WPA-PSK)",
              "WPA2-Personal (WPA2-PSK)",
              "WPA2-Enterprise (802.1X)",
              "WPA3-Personal (SAE)",
              "WPA3-Enterprise (802.1X)",
            ],
            correctIndex: 6,
          },
          {
            type: "dropdown",
            id: "wifi-encryption",
            label: "Encryption Cipher",
            options: [
              "WEP-40 (RC4)",
              "WEP-104 (RC4)",
              "TKIP",
              "AES-CCMP (AES)",
              "AES-GCMP-256",
              "TKIP + AES (mixed mode)",
            ],
            correctIndex: 3,
          },
          {
            type: "dropdown",
            id: "wifi-auth-type",
            label: "Authentication Method",
            options: [
              "Pre-Shared Key (PSK)",
              "802.1X / EAP (RADIUS)",
              "MAC address filtering",
              "Captive portal with LDAP",
              "Certificate-only (no RADIUS)",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "wifi-pmf",
            label: "Protected Management Frames (802.11w)",
            options: [
              "Disabled",
              "Optional (clients may or may not use PMF)",
              "Required (mandatory for all clients)",
            ],
            correctIndex: 2,
          },
        ],
        explanation:
          "WPA3-Enterprise mandates AES-CCMP (AES) encryption — TKIP is explicitly prohibited. Authentication must use 802.1X/EAP with a RADIUS backend; PSK is only valid for WPA3-Personal (SAE). WPA3-Enterprise also requires Protected Management Frames (PMF/802.11w) to be set to Required, preventing management frame spoofing attacks such as deauthentication floods. Selecting AES-GCMP-256 is valid for WPA3-Enterprise 192-bit mode but the standard deployment uses AES-CCMP.",
      },
      {
        id: "wifi-task-network",
        title: "Network Settings",
        instructions:
          "Configure the RF and VLAN settings for the corporate SSID. The corporate network uses VLAN 10 for wireless clients. Select the optimal frequency band and channel width for a high-density enterprise environment.",
        fields: [
          {
            type: "dropdown",
            id: "wifi-band",
            label: "Frequency Band",
            options: [
              "2.4 GHz only",
              "5 GHz only",
              "6 GHz only",
              "2.4 GHz and 5 GHz (dual-band)",
              "5 GHz and 6 GHz (dual-band)",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "wifi-channel-width",
            label: "Channel Width",
            options: ["20 MHz", "40 MHz", "80 MHz", "160 MHz"],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "wifi-vlan",
            label: "Client VLAN Assignment",
            options: ["VLAN 1 (native/untagged)", "VLAN 10", "VLAN 20", "VLAN 100", "No VLAN (flat network)"],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "wifi-radius-port",
            label: "RADIUS Authentication Port",
            options: ["1812", "1813", "1645", "1646", "3389", "389"],
            correctIndex: 0,
          },
        ],
        explanation:
          "The 5 GHz band is preferred for enterprise deployments: more non-overlapping channels (25 vs 3 in 2.4 GHz), less interference from consumer devices and neighbouring SSIDs, and higher throughput. 80 MHz channel width balances throughput with co-channel interference — 160 MHz is typically too aggressive in dense deployments. VLAN 10 isolates wireless clients from other network segments. RADIUS authentication uses UDP port 1812 (standardised by RFC 2865); port 1813 is for RADIUS accounting.",
      },
      {
        id: "wifi-task-troubleshoot",
        title: "Troubleshoot Client",
        instructions:
          "A user reports they cannot connect to CORP-SECURE. Review the Windows wireless client event log below and identify the root cause.",
        evidence: [
          {
            label: "Windows Event Log — WLAN-AutoConfig (Event ID 8001 / 8003)",
            content: `[2026-03-14 09:14:32] WLAN AutoConfig — Event 8003
  Network Name (SSID): CORP-SECURE
  Interface GUID: {a1b2c3d4-...}
  Reason Code: 0x0003 (Authentication failed)
  Error: The server certificate received during 802.1X authentication does not
         match the expected root CA.
  Expected Root CA: CN=CorpRootCA, O=Acme Corp, C=US
  Received certificate chain:
    [0] CN=RADIUS-01.acme.internal (expired: 2026-03-12)
    [1] CN=CorpIntermediateCA
    [2] CN=CorpRootCA

[2026-03-14 09:14:33] WLAN AutoConfig — Event 8001
  WLAN connection attempt failed.
  SSID: CORP-SECURE
  Authentication: WPA3-Enterprise
  Client will not retry for 60 seconds.`,
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "wifi-trouble-rootcause",
            label: "What is the root cause of the authentication failure?",
            options: [
              "The client's wireless adapter does not support WPA3-Enterprise",
              "The RADIUS server's certificate has expired",
              "The client's root CA trust store does not contain CorpRootCA",
              "The SSID name is case-sensitive and the client is connecting to 'corp-secure'",
              "The RADIUS server is unreachable on port 1812",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "wifi-trouble-fix",
            label: "What is the correct remediation for this issue?",
            options: [
              "Reinstall the wireless adapter driver on the client device",
              "Change the SSID to a name without special characters",
              "Renew the RADIUS server's certificate from CorpIntermediateCA before the current expiry",
              "Switch the AP to WPA2-Enterprise to improve compatibility",
              "Disable certificate validation on the client supplicant profile",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "wifi-trouble-security-risk",
            label: "Why is option 5 (disabling certificate validation) a serious security risk?",
            options: [
              "It causes the client to use a weaker encryption cipher",
              "It allows any RADIUS server — including a rogue AP's fake RADIUS — to authenticate the client, enabling credential theft via evil twin attacks",
              "It prevents the client from negotiating PMF",
              "It downgrades the connection to WPA2-Personal",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "The event log clearly shows the RADIUS server certificate (CN=RADIUS-01.acme.internal) expired on 2026-03-12 — two days before this event. The client's 802.1X supplicant correctly rejected the expired certificate, causing authentication to fail. The fix is to renew the certificate. Disabling certificate validation would resolve the immediate symptom but create a critical vulnerability: without certificate validation, any device advertising the CORP-SECURE SSID with any RADIUS server could harvest domain credentials — the foundation of an evil twin / rogue AP attack.",
      },
    ],
    explanation:
      "Wireless security configuration is a core SY0-701 Domain 3.0 topic. Key points: WPA3-Enterprise uses 802.1X/EAP with RADIUS, requires AES-CCMP encryption and mandatory PMF (802.11w). The 5 GHz band provides better enterprise performance. RADIUS uses UDP/1812 for authentication and UDP/1813 for accounting. Certificate validation in 802.1X is critical — the mutual authentication process prevents evil twin attacks by ensuring the client validates the RADIUS server's certificate before transmitting credentials. An expired RADIUS certificate will always cause 802.1X authentication failures, and the correct fix is always certificate renewal, never disabling validation.",
    estimatedMinutes: 10,
  },

  /* ================================================================ */
  /*  4. Email Security Configuration                                  */
  /* ================================================================ */
  {
    type: "simulation",
    id: "email-security-configuration",
    title: "Email Security Configuration",
    briefing:
      "Acme Corp (acme-corp.com) has been experiencing phishing campaigns impersonating its domain. You have been tasked with configuring SPF, DKIM, and DMARC DNS records to authenticate outbound email and protect against spoofing. You will also analyse a suspicious inbound email to identify phishing indicators.",
    domain_number: "3.0",
    domain_title: "Security Architecture",
    tasks: [
      {
        id: "email-task-dns",
        title: "DNS Records",
        instructions:
          "Configure the SPF, DKIM, and DMARC DNS records for acme-corp.com. Acme Corp's authorised mail server is mail.acme-corp.com (203.0.113.10). Only that server is authorised to send email on behalf of acme-corp.com. The DMARC policy should quarantine emails that fail authentication.",
        fields: [
          {
            type: "text",
            id: "email-spf-record",
            label: "SPF TXT Record value (for acme-corp.com)",
            acceptedValues: [
              "v=spf1 mx a:mail.acme-corp.com -all",
              "v=spf1 a:mail.acme-corp.com -all",
              "v=spf1 ip4:203.0.113.10 -all",
              "v=spf1 include:mail.acme-corp.com -all",
            ],
            placeholder: 'e.g. v=spf1 ... -all',
          },
          {
            type: "dropdown",
            id: "email-spf-qualifier",
            label: "What does the '-all' qualifier in the SPF record mean?",
            options: [
              "Softfail — emails from unlisted servers should be marked as suspicious but still delivered (~all)",
              "Fail — emails from servers not listed in the SPF record should be rejected or marked as spam",
              "Neutral — no policy assertion is made about unlisted senders",
              "Pass — all servers not listed are implicitly permitted",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "email-dkim-keysize",
            label: "Minimum recommended DKIM RSA key size for new deployments",
            options: ["512 bits", "768 bits", "1024 bits", "2048 bits", "4096 bits"],
            correctIndex: 3,
          },
          {
            type: "text",
            id: "email-dmarc-record",
            label: "DMARC TXT Record value (for _dmarc.acme-corp.com) — quarantine policy, reports to security@acme-corp.com",
            acceptedValues: [
              "v=DMARC1; p=quarantine; rua=mailto:security@acme-corp.com",
              "v=DMARC1; p=quarantine; rua=mailto:security@acme-corp.com;",
              "v=DMARC1; p=quarantine; rua=mailto:security@acme-corp.com; pct=100",
            ],
            placeholder: 'v=DMARC1; p=...; rua=...',
          },
          {
            type: "dropdown",
            id: "email-dmarc-policy-reject",
            label: "When should a DMARC policy be changed from 'quarantine' to 'reject'?",
            options: [
              "Immediately — reject is always the correct starting policy",
              "After monitoring DMARC aggregate reports (rua) to confirm no legitimate mail is failing authentication",
              "Only after enabling DKIM — DMARC reject requires DKIM to be configured",
              "After 90 days, regardless of report analysis",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "SPF (Sender Policy Framework) uses a TXT record at the domain apex listing authorised sending IPs or hostnames. The '-all' qualifier instructs receiving MTAs to reject mail from unlisted servers. DKIM uses RSA key pairs — 2048 bits is the current minimum recommended size (1024-bit keys are deprecated). The DMARC record is placed at _dmarc.acme-corp.com and specifies policy (none/quarantine/reject) and reporting addresses. The correct deployment sequence is: SPF → DKIM → DMARC with p=none (monitoring) → p=quarantine → p=reject, reviewing aggregate reports at each stage to prevent blocking legitimate mail flows.",
      },
      {
        id: "email-task-phishing",
        title: "Phishing Analysis",
        instructions:
          "A user forwarded a suspicious email to the security team. Analyse the email headers and body excerpt below and identify all phishing indicators.",
        evidence: [
          {
            label: "Raw Email Headers (suspicious message)",
            content: `From: IT Support <support@acme-c0rp.com>
To: jsmith@acme-corp.com
Subject: URGENT: Your account will be suspended in 24 hours
Date: Thu, 14 Mar 2026 03:17:42 +0000
Message-ID: <20260314031742.GA12345@mail.acme-c0rp.com>
Received: from mail.acme-c0rp.com (185.220.101.47) by mx1.acme-corp.com
X-Mailer: PHPMailer 5.2.9
X-Originating-IP: 185.220.101.47
Return-Path: <bounce@acme-c0rp.com>
DKIM-Signature: v=1; a=rsa-sha256; d=acme-c0rp.com; ...
Authentication-Results: mx1.acme-corp.com;
  dkim=pass (acme-c0rp.com)
  spf=pass (acme-c0rp.com: 185.220.101.47 is permitted)
  dmarc=fail (p=quarantine) header.from=acme-c0rp.com

Body excerpt:
  Dear John,
  Your corporate account has been flagged for unusual activity.
  Click here to verify your identity immediately:
  http://acme-corp-login.185.220.101.47.xn--e1afmapc.com/verify
  Failure to verify within 24 hours will result in account suspension.
  -- IT Support Team, Acme Corp`,
          },
        ],
        fields: [
          {
            type: "select-many",
            id: "phishing-indicators",
            label: "Select ALL phishing indicators present in this email (choose all that apply):",
            options: [
              "Lookalike sender domain: acme-c0rp.com (zero instead of letter 'o')",
              "Urgency language: 'URGENT', 'suspended in 24 hours', 'immediately'",
              "DMARC failure: the message failed DMARC despite passing DKIM and SPF for the spoofed domain",
              "Suspicious hyperlink: URL uses the attacker's IP in the domain path rather than a legitimate hostname",
              "Sent via PHPMailer 5.2.9 — a vulnerable, outdated mail library",
              "Originating IP 185.220.101.47 does not belong to Acme Corp infrastructure",
              "Message-ID domain matches the spoofed domain, not the legitimate company domain",
              "The email was received at 03:17 UTC — outside business hours",
            ],
            correctIndices: [0, 1, 2, 3, 5, 6],
          },
        ],
        explanation:
          "Confirmed phishing indicators: (1) Homograph/lookalike domain 'acme-c0rp.com' uses the digit zero to impersonate 'acme-corp.com'. (2) Urgency language is a standard social engineering technique. (3) DMARC fail: even though DKIM and SPF pass for acme-c0rp.com, the legitimate domain's DMARC policy quarantines mail that fails its own alignment check — this is exactly what DMARC is designed to detect. (4) The hyperlink embeds the attacker's IP in a subdomain path — a common URL obfuscation technique. (5) Originating IP 185.220.101.47 is not Acme Corp infrastructure. (6) The Message-ID references the spoofed domain. Non-indicators: PHPMailer version alone is not a phishing indicator (many legitimate senders use it); sending time outside business hours is suspicious but not definitive.",
      },
    ],
    explanation:
      "Email authentication protocols are tested in SY0-701 Domain 3.0. SPF authorises sending IPs at the DNS level. DKIM cryptographically signs message content using a private key; receivers verify with the public key published in DNS. DMARC ties SPF and DKIM together and specifies a policy for handling failures — critically, DMARC also requires domain alignment (the From: header domain must match the SPF/DKIM authenticated domain), which defeats lookalike domain spoofing. Deploy in none→quarantine→reject order with aggregate report monitoring at each stage.",
    estimatedMinutes: 8,
  },

  /* ================================================================ */
  /*  5. Vulnerability Assessment & Remediation                        */
  /* ================================================================ */
  {
    type: "simulation",
    id: "vulnerability-assessment-remediation",
    title: "Vulnerability Assessment & Remediation",
    briefing:
      "Your organisation ran an authenticated vulnerability scan against the production web application server WEBAPP-PROD-01 (Ubuntu 22.04 LTS, Apache 2.4.52, OpenSSL 1.1.1, PHP 8.0.15). The scan identified multiple vulnerabilities. You must classify their severity, prioritise remediation, and select the correct remediation steps.",
    domain_number: "4.0",
    domain_title: "Security Operations",
    tasks: [
      {
        id: "vuln-task-scan",
        title: "Scan Results",
        instructions:
          "Review the vulnerability scan output below and classify each finding's CVSS severity band.",
        evidence: [
          {
            label: "Nessus Scan Report — WEBAPP-PROD-01 — 2026-03-14",
            content: `Plugin ID  CVE              CVSS v3  Score  Title
---------  ---------------  -------  -----  -----------------------------------------
179834     CVE-2024-38428   9.8      Crit   OpenSSL: Remote code execution via crafted TLS
                                            ClientHello message (pre-auth, no interaction)
182011     CVE-2024-31080   8.1      High   Apache httpd: mod_proxy heap use-after-free
                                            (requires proxy module enabled)
176422     CVE-2023-3824    9.0      Crit   PHP: Stack buffer overflow in PHAR parsing
                                            (file upload, remote code execution)
183504     CVE-2024-27982   5.3      Med    Node.js: HTTP/2 continuation flood (DoS)
                                            [Informational — Node.js not installed]
180219     CVE-2024-2961    7.3      High   glibc: iconv buffer overflow (PHP stream
                                            wrappers, potential RCE via crafted input)
177631     CVE-2024-21626   6.4      Med    runC: container escape (only if using Docker)
                                            [Informational — Docker not installed]
181005     CVE-2024-38477   7.5      High   Apache httpd: mod_rewrite NULL-pointer deref
                                            (DoS via crafted HTTP request)`,
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "vuln-critical-count",
            label: "How many CRITICAL severity vulnerabilities (CVSS 9.0–10.0) are present on this host?",
            options: ["0", "1", "2", "3", "4"],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "vuln-highest-cvss",
            label: "Which CVE has the highest CVSS v3 score?",
            options: [
              "CVE-2024-38428 (OpenSSL RCE, 9.8)",
              "CVE-2023-3824 (PHP PHAR overflow, 9.0)",
              "CVE-2024-31080 (Apache mod_proxy UAF, 8.1)",
              "CVE-2024-38477 (Apache mod_rewrite DoS, 7.5)",
              "CVE-2024-2961 (glibc iconv, 7.3)",
            ],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "vuln-informational",
            label: "Which findings can be EXCLUDED from the remediation plan because the affected software is not installed?",
            options: [
              "CVE-2024-38428 and CVE-2023-3824",
              "CVE-2024-27982 and CVE-2024-21626",
              "CVE-2024-31080 and CVE-2024-38477",
              "CVE-2024-2961 and CVE-2024-21626",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "vuln-attack-vector",
            label: "CVE-2024-38428 (OpenSSL) requires no authentication and no user interaction. What is this CVSS attack vector classification?",
            options: [
              "Local (AV:L) — requires local access to the system",
              "Adjacent (AV:A) — requires access to the same network segment",
              "Network (AV:N) — exploitable remotely over the network",
              "Physical (AV:P) — requires physical access to the device",
            ],
            correctIndex: 2,
          },
        ],
        explanation:
          "Two vulnerabilities score CVSS 9.0 or above: CVE-2024-38428 (9.8) and CVE-2023-3824 (9.0). CVE-2024-38428 has the highest score at 9.8. CVE-2024-27982 (Node.js) and CVE-2024-21626 (runC/Docker) are marked Informational — neither Node.js nor Docker is installed, so these findings do not represent actual exposure on this host and should be excluded from the remediation backlog. A CVSS AV:N (network-accessible), AC:L (low complexity), PR:N (no privileges), UI:N (no user interaction) score of 9.8 represents a critical, remotely exploitable vulnerability requiring immediate attention.",
      },
      {
        id: "vuln-task-priority",
        title: "Risk Prioritisation",
        instructions:
          "Assign each applicable vulnerability (excluding informational findings) to the correct remediation priority tier. Consider CVSS score, exploitability, and business impact.",
        fields: [
          {
            type: "zone-placement",
            id: "vuln-priority-zones",
            label: "Drag each CVE to its correct remediation priority tier:",
            items: [
              "CVE-2024-38428 — OpenSSL RCE (CVSS 9.8, pre-auth, network)",
              "CVE-2023-3824 — PHP PHAR RCE (CVSS 9.0, file upload required)",
              "CVE-2024-31080 — Apache mod_proxy UAF (CVSS 8.1, proxy required)",
              "CVE-2024-2961 — glibc iconv overflow (CVSS 7.3, PHP streams)",
              "CVE-2024-38477 — Apache mod_rewrite DoS (CVSS 7.5, no RCE)",
            ],
            zones: [
              "P1 — Critical: Patch within 24 hours",
              "P2 — High: Patch within 7 days",
              "P3 — Medium: Patch within 30 days",
            ],
            correctZones: [0, 0, 1, 2, 1],
          },
        ],
        explanation:
          "CVE-2024-38428 (OpenSSL 9.8, unauthenticated network RCE) and CVE-2023-3824 (PHP 9.0, RCE via file upload) are both P1 Critical — they allow remote code execution and affect the production web server directly. CVE-2024-31080 (Apache mod_proxy UAF, 8.1) and CVE-2024-38477 (Apache mod_rewrite DoS, 7.5) are P2 High — significant but the mod_proxy finding requires the proxy module to be enabled, and the DoS does not allow code execution. CVE-2024-2961 (glibc iconv, 7.3) is P3 Medium — exploitation requires specific PHP stream wrapper conditions and is chained through application code, making exploitation more complex.",
      },
      {
        id: "vuln-task-remediation",
        title: "Remediation Plan",
        instructions:
          "Select all correct remediation actions for the vulnerabilities identified on WEBAPP-PROD-01. Consider both immediate technical fixes and process improvements.",
        fields: [
          {
            type: "select-many",
            id: "vuln-remediation-actions",
            label: "Select ALL correct remediation actions (choose all that apply):",
            options: [
              "Upgrade OpenSSL to the latest patched version (3.x branch or distro security update)",
              "Upgrade PHP from 8.0.15 to the latest 8.3.x release (8.0 is end-of-life)",
              "Disable Apache mod_proxy if reverse proxy functionality is not required",
              "Disable Apache mod_rewrite to mitigate CVE-2024-38477",
              "Apply Ubuntu security updates: apt-get update && apt-get upgrade",
              "Enable web application firewall (WAF) virtual patching as a compensating control while patches are applied",
              "Scan again after patching to confirm all findings are resolved",
              "Delete the vulnerability scan report to prevent it from being stolen",
              "Upgrade glibc to the version containing the CVE-2024-2961 fix",
              "Accept the risk on CVE-2024-27982 and CVE-2024-21626 since the affected software is not installed",
            ],
            correctIndices: [0, 1, 2, 4, 5, 6, 8, 9],
          },
        ],
        explanation:
          "Correct actions: Patching OpenSSL, PHP (8.0 is EOL — no further security patches will be released), and glibc addresses the software vulnerabilities directly. Disabling mod_proxy eliminates the attack surface for CVE-2024-31080 if the feature is unused. Applying distro-level security updates handles multiple findings efficiently. WAF virtual patching provides compensating control during the patching window for production systems. Post-patch scanning confirms remediation. Accepting risk on CVE-2024-27982 and CVE-2024-21626 is correct — the software is not present, so there is no actual exposure. Wrong: Disabling mod_rewrite would likely break the web application (most PHP applications rely on it for URL routing) and is not the correct fix — patching Apache is. Deleting the scan report destroys evidence and violates audit trail requirements.",
      },
    ],
    explanation:
      "Vulnerability assessment and remediation is tested throughout SY0-701 Domain 4.0. Key concepts: CVSS v3 scores range 0–10; Critical is 9.0–10.0, High is 7.0–8.9, Medium is 4.0–6.9. Severity must be considered alongside context: exploitability (network vs local), whether dependent software is installed, and whether compensating controls exist. Informational findings where software is not installed represent no actual risk. Prioritisation frameworks (P1/P2/P3) translate CVSS scores into actionable timelines. Always validate remediation with a follow-up scan. End-of-life software (PHP 8.0, OpenSSL 1.1.1) should be upgraded regardless of specific CVEs since no future patches will be issued.",
    estimatedMinutes: 10,
  },
];
