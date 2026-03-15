import type { TopologyScenario } from "../types";

export const securityPlusTopologies: TopologyScenario[] = [
  /* ================================================================ */
  /*  1. Network Segmentation & Firewall ACL Fix                       */
  /* ================================================================ */
  {
    type: "topology",
    id: "sp-topo-network-segmentation",
    title: "Network Segmentation & Firewall Rules",
    briefing:
      "Apex Financial has reported unauthorized traffic between their guest wireless network and the internal server VLAN. You have been asked to review the network topology, identify misconfigured devices, and correct the segmentation issues. The guest network (VLAN 50, 10.0.50.0/24) must be isolated from the server VLAN (VLAN 10, 10.0.10.0/24). Do not modify devices that are already configured correctly.",
    domain_number: "3.0",
    domain_title: "Security Architecture",
    diagramTitle: "Apex Financial — Corporate Network",
    estimatedMinutes: 12,
    devices: [
      {
        id: "cloud-isp",
        type: "cloud",
        label: "Internet",
        position: { x: 50, y: 8 },
        preConfigured: true,
        fields: [],
        explanation:
          "The internet connection is correctly configured and requires no changes.",
      },
      {
        id: "fw-perimeter",
        type: "firewall",
        label: "FW-Perimeter",
        position: { x: 50, y: 28 },
        preConfigured: false,
        currentConfig:
          "interface Gi0/0\n ip address 10.0.1.1 255.255.255.0\n!\naccess-list 101 permit ip 10.0.50.0 0.0.0.255 10.0.10.0 0.0.0.255\naccess-list 101 permit ip any any",
        fields: [
          {
            type: "dropdown",
            id: "fw-acl-action",
            label: "What should be done with the permit rule for guest-to-server traffic?",
            options: [
              "Replace it with a deny rule",
              "Keep it but add logging",
              "Move it below the permit-any",
              "No change needed",
            ],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "fw-acl-deny-target",
            label: "Which traffic should the deny rule block?",
            options: [
              "10.0.50.0/24 → 10.0.10.0/24 (guest to server)",
              "10.0.10.0/24 → 10.0.50.0/24 (server to guest)",
              "All traffic from 10.0.50.0/24",
              "All traffic to 10.0.10.0/24",
            ],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "fw-acl-order",
            label: "Where should the deny rule be placed relative to the permit-any?",
            options: [
              "Before the permit-any statement",
              "After the permit-any statement",
              "Order does not matter",
            ],
            correctIndex: 0,
          },
        ],
        explanation:
          "The firewall had a permit rule allowing VLAN 50 (guest) to reach VLAN 10 (servers). The fix removes that permit and replaces it with an explicit deny before the permit-any statement.",
      },
      {
        id: "core-sw1",
        type: "switch",
        label: "Core-SW1",
        position: { x: 50, y: 52 },
        preConfigured: false,
        currentConfig:
          "interface vlan 50\n ip address 10.0.50.1 255.255.255.0\n!\ninterface vlan 10\n ip address 10.0.10.1 255.255.255.0\n!\nip routing",
        fields: [
          {
            type: "dropdown",
            id: "core-sw1-acl-direction",
            label: "Apply ACL to VLAN 50 interface — direction",
            options: ["Inbound (in)", "Outbound (out)"],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "core-sw1-acl-type",
            label: "Which ACL type is required to match both source AND destination?",
            options: [
              "Standard ACL (1–99) — matches source only",
              "Extended ACL (100–199) — matches source and destination",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "core-sw1-acl-deny",
            label: "What traffic should the ACL deny?",
            options: [
              "From 10.0.50.0/24 to 10.0.10.0/24",
              "From 10.0.10.0/24 to 10.0.50.0/24",
              "All traffic on VLAN 50",
              "All traffic to 10.0.10.0/24 from any source",
            ],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "core-sw1-acl-interface",
            label: "Which interface should the ACL be applied to?",
            options: [
              "Interface VLAN 50 (guest SVI)",
              "Interface VLAN 10 (server SVI)",
              "Interface VLAN 20 (workstation SVI)",
              "Interface Gi0/1 (uplink to firewall)",
            ],
            correctIndex: 0,
          },
        ],
        explanation:
          "The core switch needed an extended ACL applied inbound on the VLAN 50 SVI to prevent guest traffic from being routed to the server VLAN. An extended ACL (100+) is required because standard ACLs can only match source addresses. The ACL denies traffic from 10.0.50.0/24 to 10.0.10.0/24 and permits all other traffic.",
      },
      {
        id: "ap-guest",
        type: "access-point",
        label: "AP-Guest",
        position: { x: 18, y: 78 },
        preConfigured: true,
        currentConfig:
          "SSID: Guest-Apex\nVLAN: 50\nSecurity: WPA3-Personal\nChannel: Auto",
        fields: [],
        explanation:
          "The guest AP is correctly assigned to VLAN 50. No change needed.",
      },
      {
        id: "srv-db",
        type: "server",
        label: "DB-Server",
        position: { x: 82, y: 78 },
        preConfigured: true,
        currentConfig:
          "IP Address: 10.0.10.100\nSubnet Mask: 255.255.255.0\nDefault Gateway: 10.0.10.1\nVLAN: 10",
        fields: [],
        explanation:
          "The database server is correctly configured on VLAN 10 with appropriate IP settings.",
      },
      {
        id: "pc-workstation",
        type: "pc",
        label: "Workstation-1",
        position: { x: 50, y: 88 },
        preConfigured: true,
        currentConfig:
          "IP Address: 10.0.20.15\nSubnet Mask: 255.255.255.0\nDefault Gateway: 10.0.20.1\nVLAN: 20",
        fields: [],
        explanation:
          "The workstation is correctly configured on VLAN 20. No changes needed.",
      },
    ],
    connections: [
      { from: "cloud-isp", to: "fw-perimeter", label: "WAN" },
      { from: "fw-perimeter", to: "core-sw1", label: "Gi0/1" },
      { from: "core-sw1", to: "ap-guest", label: "Fa0/10 (VLAN 50)" },
      { from: "core-sw1", to: "srv-db", label: "Fa0/1 (VLAN 10)" },
      { from: "core-sw1", to: "pc-workstation", label: "Fa0/20 (VLAN 20)" },
    ],
    explanation:
      "Network segmentation requires both Layer 3 ACLs and proper VLAN isolation. The firewall had an overly permissive ACL allowing guest-to-server traffic. The core switch also needed an ACL on the VLAN 50 SVI. The guest AP, database server, and workstation were already correctly configured — identifying which devices need changes and which to leave alone is a key exam skill.",
  },

  /* ================================================================ */
  /*  2. Wireless Security Misconfiguration                            */
  /* ================================================================ */
  {
    type: "topology",
    id: "sp-topo-wireless-security",
    title: "Wireless Network Security Audit",
    briefing:
      "A penetration test at Meridian Healthcare revealed that the corporate wireless network is vulnerable to deauthentication attacks and a rogue AP was detected. You must review the wireless infrastructure, identify misconfigured components, and apply the correct security settings. The corporate SSID should use WPA3-Enterprise with 802.1X authentication via the RADIUS server. The guest SSID should use WPA3-Personal with a PSK. Do not modify devices that are already correctly configured.",
    domain_number: "3.0",
    domain_title: "Security Architecture",
    diagramTitle: "Meridian Healthcare — Wireless Infrastructure",
    estimatedMinutes: 10,
    devices: [
      {
        id: "wlc",
        type: "server",
        label: "WLC-1",
        position: { x: 50, y: 12 },
        preConfigured: false,
        currentConfig:
          "SSID: Corp-Meridian\n  Security: WPA2-Personal\n  PMF: Disabled\n  Auth: PSK\n\nSSID: Guest-Meridian\n  Security: WPA3-Personal\n  PMF: Required\n  Auth: PSK",
        fields: [
          {
            type: "dropdown",
            id: "wlc-corp-security",
            label: "Corporate SSID — Security Protocol",
            options: ["WPA2-Personal", "WPA2-Enterprise", "WPA3-Personal", "WPA3-Enterprise"],
            correctIndex: 3,
          },
          {
            type: "dropdown",
            id: "wlc-corp-auth",
            label: "Corporate SSID — Authentication Method",
            options: ["PSK", "802.1X (RADIUS)", "Open", "SAE"],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "wlc-corp-pmf",
            label: "Corporate SSID — Protected Management Frames (PMF)",
            options: ["Disabled", "Optional", "Required"],
            correctIndex: 2,
          },
        ],
        explanation:
          "The wireless LAN controller had the corporate SSID set to WPA2-Personal, which is vulnerable to offline dictionary attacks and provides no per-user authentication. WPA3-Enterprise with 802.1X provides individual credentials via RADIUS and protects against deauth attacks when PMF is required.",
      },
      {
        id: "radius-srv",
        type: "server",
        label: "RADIUS",
        position: { x: 82, y: 12 },
        preConfigured: true,
        currentConfig:
          "Authentication: EAP-TLS\nCertificate: Valid (expires 2027-01-15)\nClients: WLC-1 (shared secret configured)\nUser DB: Active Directory (LDAPS)",
        fields: [],
        explanation:
          "The RADIUS server is correctly configured with user certificates and EAP-TLS settings.",
      },
      {
        id: "sw-distribution",
        type: "switch",
        label: "Dist-SW1",
        position: { x: 50, y: 40 },
        preConfigured: true,
        currentConfig:
          "interface Gi0/1\n switchport mode trunk\n switchport trunk allowed vlan 10,20,50\n!\ninterface Gi0/2\n switchport mode trunk\n!\ninterface Gi0/3\n switchport mode trunk",
        fields: [],
        explanation:
          "The distribution switch is correctly configured with proper VLAN trunking to the APs.",
      },
      {
        id: "ap-floor1",
        type: "access-point",
        label: "AP-Floor1",
        position: { x: 25, y: 68 },
        preConfigured: true,
        currentConfig:
          "Mode: Local (FlexConnect)\nRogue Detection: Enabled — Alert Only\nSSIDs: Corp-Meridian, Guest-Meridian",
        fields: [],
        explanation:
          "AP-Floor1 is correctly set to Local mode for normal client connectivity.",
      },
      {
        id: "ap-floor2",
        type: "access-point",
        label: "AP-Floor2",
        position: { x: 50, y: 68 },
        preConfigured: false,
        currentConfig:
          "Mode: Monitor\nRogue Detection: Disabled\nSSIDs: Corp-Meridian, Guest-Meridian",
        fields: [
          {
            type: "dropdown",
            id: "ap2-mode",
            label: "AP Operation Mode",
            options: ["Local (FlexConnect)", "Monitor", "Rogue Detector", "Sniffer"],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "ap2-rogue-detection",
            label: "Rogue AP Detection",
            options: ["Disabled", "Enabled — Alert Only", "Enabled — Auto-Contain"],
            correctIndex: 1,
          },
        ],
        explanation:
          "AP-Floor2 needed its operation mode set to Local and rogue AP detection enabled. Auto-contain should generally be avoided in healthcare due to potential interference with medical devices — alert-only is the correct choice.",
      },
      {
        id: "ap-floor3",
        type: "access-point",
        label: "AP-Floor3",
        position: { x: 75, y: 68 },
        preConfigured: true,
        currentConfig:
          "Mode: Local (FlexConnect)\nRogue Detection: Enabled — Alert Only\nSSIDs: Corp-Meridian, Guest-Meridian",
        fields: [],
        explanation:
          "AP-Floor3 is correctly configured with no changes needed.",
      },
    ],
    connections: [
      { from: "wlc", to: "radius-srv", label: "RADIUS" },
      { from: "wlc", to: "sw-distribution", label: "Mgmt" },
      { from: "sw-distribution", to: "ap-floor1", label: "Gi0/1" },
      { from: "sw-distribution", to: "ap-floor2", label: "Gi0/2" },
      { from: "sw-distribution", to: "ap-floor3", label: "Gi0/3" },
    ],
    explanation:
      "Wireless security in an enterprise environment requires WPA3-Enterprise with 802.1X for corporate access, Protected Management Frames to prevent deauthentication attacks, and rogue AP detection. The WLC and AP-Floor2 needed configuration changes, while the RADIUS server, distribution switch, and other APs were already correctly configured.",
  },

  /* ================================================================ */
  /*  3. DMZ Web Server Hardening                                      */
  /* ================================================================ */
  {
    type: "topology",
    id: "sp-topo-dmz-hardening",
    title: "DMZ Web Server Hardening",
    briefing:
      "Sterling Corp's public-facing web application was recently compromised via an SQL injection attack. A forensic review found that the web server in the DMZ had direct database access to the internal network and was running unnecessary services. You must review the topology, harden the DMZ configuration, and ensure proper network segmentation between the DMZ (172.16.1.0/24), internal network (192.168.1.0/24), and the internet. Fix only the devices that require changes.",
    domain_number: "3.0",
    domain_title: "Security Architecture",
    diagramTitle: "Sterling Corp — DMZ Architecture",
    estimatedMinutes: 14,
    devices: [
      {
        id: "internet",
        type: "cloud",
        label: "Internet",
        position: { x: 50, y: 6 },
        preConfigured: true,
        fields: [],
        explanation: "The internet connection requires no changes.",
      },
      {
        id: "fw-external",
        type: "firewall",
        label: "FW-External",
        position: { x: 50, y: 24 },
        preConfigured: false,
        currentConfig:
          "access-list OUTSIDE-IN permit tcp any host 172.16.1.10 eq 443\naccess-list OUTSIDE-IN permit tcp any host 172.16.1.10 eq 80\naccess-list OUTSIDE-IN permit tcp any host 172.16.1.10 eq 22\naccess-list OUTSIDE-IN permit icmp any any",
        fields: [
          {
            type: "select-many",
            id: "fw-ext-allowed-ports",
            label:
              "Which inbound services should be permitted from the internet to the DMZ web server? (Select all that apply)",
            options: [
              "HTTPS (TCP 443)",
              "HTTP (TCP 80)",
              "SSH (TCP 22)",
              "ICMP (ping)",
              "DNS (UDP 53)",
            ],
            correctIndices: [0],
          },
          {
            type: "dropdown",
            id: "fw-ext-default-action",
            label: "What should the ACL's default (final) action be for unmatched traffic?",
            options: [
              "Deny all (implicit deny)",
              "Permit all",
              "Log and permit",
              "Drop and log",
            ],
            correctIndex: 0,
          },
        ],
        explanation:
          "The external firewall was allowing HTTP (unencrypted), SSH (management access from internet), and ICMP (information disclosure) from the internet. Only HTTPS should be permitted to the DMZ web server from external sources.",
      },
      {
        id: "web-server",
        type: "server",
        label: "Web-Server",
        position: { x: 30, y: 50 },
        preConfigured: false,
        currentConfig:
          "IP Address: 172.16.1.10\nRunning Services:\n  Nginx (HTTPS, TCP 443)\n  Apache (HTTP, TCP 80)\n  SSH (TCP 22)\n  FTP (TCP 21)\n  MySQL (TCP 3306)\n  SNMP (UDP 161)\nDB Connection: Direct → 192.168.1.100:3306",
        fields: [
          {
            type: "select-many",
            id: "web-srv-services",
            label:
              "Which services should be running on the web server? (Select all that apply)",
            options: [
              "HTTPS (Nginx/Apache)",
              "SSH (for admin access from jump box)",
              "FTP (file uploads)",
              "Telnet (legacy management)",
              "SNMP (monitoring)",
              "MySQL (local database)",
            ],
            correctIndices: [0, 1],
          },
          {
            type: "dropdown",
            id: "web-srv-db-access",
            label: "Database connectivity method",
            options: [
              "Direct connection to internal DB server",
              "Via application proxy/API in the internal zone",
              "Local database on the web server",
              "No database needed",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "The web server should only run HTTPS and SSH (for secure admin access via a jump box). FTP, Telnet, SNMP, and local MySQL are unnecessary attack surfaces. Database access must go through an application proxy in the internal zone — never direct from DMZ to the internal database.",
      },
      {
        id: "fw-internal",
        type: "firewall",
        label: "FW-Internal",
        position: { x: 50, y: 75 },
        preConfigured: true,
        currentConfig:
          "Default Policy: Deny all, allow specific\naccess-list INSIDE-DMZ permit tcp host 172.16.1.10 host 192.168.1.50 eq 8443\naccess-list INSIDE-DMZ deny ip any any log",
        fields: [],
        explanation:
          "The internal firewall correctly uses a deny-all default policy with specific allow rules for the application proxy.",
      },
      {
        id: "db-server",
        type: "server",
        label: "DB-Server",
        position: { x: 30, y: 92 },
        preConfigured: true,
        currentConfig:
          "IP Address: 192.168.1.100\nSubnet Mask: 255.255.255.0\nService: MySQL (TCP 3306)\nListening: 127.0.0.1, 192.168.1.100",
        fields: [],
        explanation:
          "The database server is correctly isolated in the internal zone.",
      },
      {
        id: "app-proxy",
        type: "server",
        label: "App-Proxy",
        position: { x: 70, y: 92 },
        preConfigured: true,
        currentConfig:
          "IP Address: 192.168.1.50\nService: Reverse Proxy (TCP 8443)\nUpstream: DB-Server:3306\nTLS: Enabled (mutual auth)",
        fields: [],
        explanation:
          "The application proxy correctly mediates database requests from the DMZ web server.",
      },
    ],
    connections: [
      { from: "internet", to: "fw-external", label: "WAN" },
      { from: "fw-external", to: "web-server", label: "DMZ" },
      { from: "fw-external", to: "fw-internal", label: "Trunk" },
      { from: "web-server", to: "fw-internal", label: "API" },
      { from: "fw-internal", to: "db-server", label: "Internal" },
      { from: "fw-internal", to: "app-proxy", label: "Internal" },
    ],
    explanation:
      "DMZ hardening follows the principle of least privilege: only required services should run on public-facing servers, and DMZ hosts should never have direct access to internal resources. The external firewall was overly permissive, the web server was running unnecessary services and had direct DB access. The internal firewall, database server, and application proxy were already correctly configured.",
  },
];
