import type { PbqScenario } from "../types";

export const networkPlusScenarios: PbqScenario[] = [
  /* ================================================================ */
  /*  ORDERING SCENARIOS                                               */
  /* ================================================================ */
  {
    type: "ordering",
    id: "osi-model-layers",
    title: "OSI Model Layers",
    description:
      "Arrange the seven OSI model layers in the correct order from Layer 1 (bottom) to Layer 7 (top).",
    domain_number: "1.0",
    domain_title: "Networking Concepts",
    items: [
      "Physical",
      "Data Link",
      "Network",
      "Transport",
      "Session",
      "Presentation",
      "Application",
    ],
    correct_order: [0, 1, 2, 3, 4, 5, 6],
    explanation:
      "The OSI model layers from bottom to top are: Physical (Layer 1) → Data Link (Layer 2) → Network (Layer 3) → Transport (Layer 4) → Session (Layer 5) → Presentation (Layer 6) → Application (Layer 7). A common mnemonic is 'Please Do Not Throw Sausage Pizza Away'. Data encapsulation adds headers at each layer going down; decapsulation removes them going up.",
  },
  {
    type: "ordering",
    id: "troubleshooting-methodology",
    title: "CompTIA Network Troubleshooting Methodology",
    description:
      "Arrange the CompTIA seven-step network troubleshooting methodology in the correct order.",
    domain_number: "5.0",
    domain_title: "Network Troubleshooting",
    items: [
      "Identify the problem",
      "Establish a theory of probable cause",
      "Test the theory to determine the cause",
      "Establish a plan of action to resolve the problem",
      "Implement the solution or escalate",
      "Verify full system functionality and implement preventive measures",
      "Document findings, actions, and outcomes",
    ],
    correct_order: [0, 1, 2, 3, 4, 5, 6],
    explanation:
      "CompTIA's seven-step troubleshooting process mirrors the scientific method applied to networking. The process begins with gathering information (Identify), forming a hypothesis (Theory), then validating it (Test). Once the cause is known, a plan is created, implemented, and the fix is verified before documenting everything. Documentation is always the final step and is critical for future reference.",
  },
  {
    type: "ordering",
    id: "t568b-pin-order",
    title: "T568B Wiring Standard — Pin Order",
    description:
      "Arrange the T568B colour pairs in the correct pin order from Pin 1 to Pin 8.",
    domain_number: "1.0",
    domain_title: "Networking Concepts",
    items: [
      "White/Orange",
      "Orange",
      "White/Green",
      "Blue",
      "White/Blue",
      "Green",
      "White/Brown",
      "Brown",
    ],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7],
    explanation:
      "T568B pin order (1–8): White/Orange, Orange, White/Green, Blue, White/Blue, Green, White/Brown, Brown. Pins 1 & 2 (Orange pair) carry TX+ and TX−; Pins 3 & 6 (Green pair) carry RX+ and RX−. T568B is the most common standard used in North America. T568A swaps the orange and green pairs, and a crossover cable uses T568A on one end and T568B on the other.",
  },
  {
    type: "ordering",
    id: "dhcp-dora-process",
    title: "DHCP DORA Process",
    description:
      "Arrange the four DHCP message exchanges in the correct order for a client obtaining an IP address.",
    domain_number: "3.0",
    domain_title: "Network Operations",
    items: [
      "DHCP Discover — client broadcasts to locate a DHCP server",
      "DHCP Offer — server responds with an available IP address",
      "DHCP Request — client broadcasts acceptance of the offered address",
      "DHCP Acknowledge — server confirms the lease to the client",
    ],
    correct_order: [0, 1, 2, 3],
    explanation:
      "DHCP uses the DORA process: Discover (client broadcasts on UDP 67 to find a server), Offer (server proposes an IP and lease options), Request (client broadcasts which offer it accepts, allowing other servers to retract theirs), and Acknowledge (server confirms the lease). Discover and Request are broadcasts; Offer and Acknowledge are unicasts (or broadcasts, depending on the client flag). The lease also carries DNS servers, default gateway, and subnet mask.",
  },

  /* ================================================================ */
  /*  MATCHING SCENARIOS                                               */
  /* ================================================================ */
  {
    type: "matching",
    id: "np-ports-to-services",
    title: "Match Port Numbers to Protocols",
    description:
      "Match each well-known port number to its corresponding network protocol or service.",
    domain_number: "1.0",
    domain_title: "Networking Concepts",
    left: ["20 / 21", "69", "161", "445", "3306", "5060"],
    right: [
      "FTP (Data / Control)",
      "TFTP",
      "SNMP",
      "SMB / CIFS",
      "MySQL",
      "SIP",
    ],
    correct_map: [0, 1, 2, 3, 4, 5],
    explanation:
      "Ports 20/21 = FTP (20 for data transfer, 21 for control commands). Port 69 = TFTP (Trivial File Transfer Protocol, UDP). Port 161 = SNMP (UDP, used for network device polling). Port 445 = SMB/CIFS (Windows file sharing, direct over TCP). Port 3306 = MySQL database. Port 5060 = SIP (Session Initiation Protocol for VoIP, UDP/TCP). These ports are all testable on N10-009.",
  },
  {
    type: "matching",
    id: "cable-types-to-speeds",
    title: "Match Cable Types to Maximum Speeds",
    description:
      "Match each cable or fibre type to its maximum rated throughput.",
    domain_number: "1.0",
    domain_title: "Networking Concepts",
    left: [
      "Cat 5e",
      "Cat 6",
      "Cat 6a",
      "Cat 7",
      "Single-mode fibre (SMF)",
      "Multimode fibre (MMF)",
    ],
    right: [
      "1 Gbps (up to 100 m)",
      "1 Gbps (up to 55 m) / 10 Gbps (up to 55 m)",
      "10 Gbps (up to 100 m)",
      "10 Gbps (up to 100 m, fully shielded)",
      "100 Gbps+ over long distances (kilometres)",
      "10 Gbps (up to ~550 m at OM4)",
    ],
    correct_map: [0, 1, 2, 3, 4, 5],
    explanation:
      "Cat 5e supports 1 Gbps to 100 m. Cat 6 supports 1 Gbps to 100 m and 10 Gbps to 55 m. Cat 6a extends 10 Gbps to the full 100 m run. Cat 7 also achieves 10 Gbps to 100 m but uses GG45 or TERA connectors and full shielding. Single-mode fibre (8.3 µm core) supports 100 Gbps+ over kilometres. Multimode fibre (50/62.5 µm core) is lower cost and used within buildings up to ~550 m (OM4).",
  },
  {
    type: "matching",
    id: "wireless-standards-to-speeds",
    title: "Match 802.11 Standards to Maximum Throughput",
    description:
      "Match each IEEE 802.11 wireless standard to its maximum theoretical throughput.",
    domain_number: "2.0",
    domain_title: "Network Implementation",
    left: [
      "802.11a",
      "802.11b",
      "802.11g",
      "802.11n (Wi-Fi 4)",
      "802.11ac (Wi-Fi 5)",
      "802.11ax (Wi-Fi 6)",
    ],
    right: [
      "54 Mbps (5 GHz)",
      "11 Mbps (2.4 GHz)",
      "54 Mbps (2.4 GHz)",
      "600 Mbps (2.4 / 5 GHz)",
      "3.5 Gbps (5 GHz)",
      "9.6 Gbps (2.4 / 5 / 6 GHz)",
    ],
    correct_map: [0, 1, 2, 3, 4, 5],
    explanation:
      "802.11a and 802.11g both top out at 54 Mbps, but a uses 5 GHz and g uses 2.4 GHz. 802.11b was the first mass-market standard at 11 Mbps. 802.11n (Wi-Fi 4) introduced MIMO for up to 600 Mbps on both bands. 802.11ac (Wi-Fi 5) operates only on 5 GHz with MU-MIMO for up to 3.5 Gbps. 802.11ax (Wi-Fi 6) adds OFDMA and BSS Colouring for up to 9.6 Gbps across 2.4, 5, and 6 GHz bands.",
  },
  {
    type: "matching",
    id: "devices-to-osi-layers",
    title: "Match Network Devices to OSI Layers",
    description:
      "Match each network device to the primary OSI layer at which it operates.",
    domain_number: "1.0",
    domain_title: "Networking Concepts",
    left: ["Hub", "Switch", "Router", "Firewall", "Wireless Access Point"],
    right: [
      "Layer 1 — Physical",
      "Layer 2 — Data Link",
      "Layer 3 — Network",
      "Layer 3–7 — Network to Application",
      "Layer 2 — Data Link",
    ],
    correct_map: [0, 1, 2, 3, 4],
    explanation:
      "Hubs are Layer 1 repeaters that broadcast all frames to every port. Switches operate at Layer 2, forwarding frames using MAC address tables. Routers operate at Layer 3, making forwarding decisions using IP addresses. Firewalls can operate from Layer 3 (packet filtering) through Layer 7 (application-aware). Wireless Access Points operate at Layer 2, bridging the 802.11 wireless medium to the wired Ethernet segment.",
  },

  /* ================================================================ */
  /*  CATEGORIZATION SCENARIOS                                         */
  /* ================================================================ */
  {
    type: "categorization",
    id: "tcp-vs-udp-protocols",
    title: "TCP vs UDP — Protocol Classification",
    description:
      "Sort each protocol into the correct transport category based on whether it uses TCP, UDP, or both.",
    domain_number: "1.0",
    domain_title: "Networking Concepts",
    categories: ["TCP", "UDP", "Both TCP and UDP"],
    items: [
      { text: "HTTP (port 80)", category: 0 },
      { text: "DHCP (ports 67/68)", category: 1 },
      { text: "TFTP (port 69)", category: 1 },
      { text: "FTP (ports 20/21)", category: 0 },
      { text: "DNS (port 53)", category: 2 },
      { text: "SNMP (port 161)", category: 1 },
      { text: "SSH (port 22)", category: 0 },
      { text: "RDP (port 3389)", category: 0 },
      { text: "NTP (port 123)", category: 1 },
      { text: "SIP (port 5060)", category: 2 },
    ],
    explanation:
      "TCP is used where reliability and ordered delivery matter: HTTP, FTP, SSH, and RDP all require TCP. UDP is used for speed-sensitive or broadcast-based protocols: DHCP, TFTP, SNMP, and NTP all use UDP exclusively. DNS uses UDP for standard queries (faster, smaller responses) but falls back to TCP for large responses and zone transfers. SIP uses UDP for most VoIP signalling but supports TCP for reliability when required.",
  },
  {
    type: "categorization",
    id: "routing-protocol-types",
    title: "Routing Protocol Classification",
    description:
      "Sort each routing protocol into the correct category based on its algorithm type.",
    domain_number: "2.0",
    domain_title: "Network Implementation",
    categories: ["Distance Vector", "Link State", "Hybrid / Path Vector"],
    items: [
      { text: "RIPv1", category: 0 },
      { text: "RIPv2", category: 0 },
      { text: "OSPF", category: 1 },
      { text: "IS-IS", category: 1 },
      { text: "EIGRP", category: 2 },
      { text: "BGP", category: 2 },
    ],
    explanation:
      "Distance Vector protocols (RIPv1, RIPv2) advertise routing tables to neighbours and use hop count as the metric, suffering from slow convergence. Link State protocols (OSPF, IS-IS) build a complete topology map using LSAs/LSPs and run Dijkstra's SPF algorithm, enabling faster convergence. EIGRP is Cisco's hybrid protocol using a composite metric (bandwidth, delay). BGP is an Exterior Gateway Protocol using path attributes (AS-PATH, LOCAL_PREF) and is classified as a Path Vector protocol.",
  },
  {
    type: "categorization",
    id: "network-topology-characteristics",
    title: "Network Topology Classification",
    description:
      "Sort each characteristic or description into the network topology it best describes.",
    domain_number: "2.0",
    domain_title: "Network Implementation",
    categories: ["Star", "Mesh", "Bus", "Ring"],
    items: [
      { text: "All devices connect to a central switch or hub", category: 0 },
      { text: "Single cable failure takes down the entire segment", category: 2 },
      { text: "Every node has a dedicated link to every other node", category: 1 },
      { text: "Data travels in one direction around a loop", category: 3 },
      { text: "Most common LAN topology used today", category: 0 },
      { text: "Highest fault tolerance; used in WAN core networks", category: 1 },
      { text: "Uses terminators at each end of the backbone", category: 2 },
      { text: "Token passing controls media access", category: 3 },
      { text: "Central point of failure at the hub or switch", category: 0 },
      { text: "Partial variant reduces cost while improving redundancy", category: 1 },
    ],
    explanation:
      "Star topology centralises connections at a switch or hub — the most common LAN design, but the switch is a single point of failure. Bus topology uses a single shared backbone cable with terminators; any break disrupts all traffic. Mesh topology provides dedicated point-to-point links between nodes, offering maximum redundancy (full mesh) or balanced cost/redundancy (partial mesh) — commonly used in WAN cores. Ring topology passes data around a loop using token passing (e.g., Token Ring, FDDI); a break disrupts the ring unless dual-ring redundancy is used.",
  },
  {
    type: "categorization",
    id: "cloud-service-model-responsibilities",
    title: "Cloud Service Model — Customer Responsibilities",
    description:
      "Sort each responsibility to the cloud service model where the CUSTOMER owns that responsibility.",
    domain_number: "4.0",
    domain_title: "Network Security",
    categories: ["IaaS Customer", "PaaS Customer", "SaaS Customer"],
    items: [
      { text: "Operating system installation and patching", category: 0 },
      { text: "Virtual network and firewall configuration", category: 0 },
      { text: "Application code and logic security", category: 1 },
      { text: "Runtime and middleware configuration", category: 1 },
      { text: "User identity and access management", category: 2 },
      { text: "Client-side endpoint security", category: 2 },
      { text: "Storage volume management and encryption", category: 0 },
      { text: "Database schema and data security", category: 1 },
      { text: "Data classification and handling policies", category: 2 },
    ],
    explanation:
      "In IaaS, the customer manages everything above the hypervisor: OS, storage volumes, and virtual networking. In PaaS, the provider manages the OS and infrastructure; the customer is responsible for their application code, runtime configuration, and database design. In SaaS, the provider manages nearly everything; the customer retains responsibility for user access management, data classification, and client endpoint security. Understanding the shared responsibility model is essential for cloud security on N10-009.",
  },

  /* ================================================================ */
  /*  DOMAIN 5.0 — Network Troubleshooting                            */
  /* ================================================================ */
  {
    type: "categorization",
    id: "np-symptoms-to-network-layer",
    title: "Classify Network Symptoms by OSI Layer",
    description:
      "Sort each network symptom into the OSI layer where the root cause most likely exists.",
    domain_number: "5.0",
    domain_title: "Network Troubleshooting",
    categories: [
      "Layer 1 — Physical",
      "Layer 2 — Data Link",
      "Layer 3 — Network",
      "Layer 7 — Application",
    ],
    items: [
      { text: "Cable tester shows intermittent signal loss", category: 0 },
      { text: "Link light on switch port is not illuminated", category: 0 },
      { text: "Speed/duplex mismatch causing late collisions", category: 1 },
      { text: "MAC address table overflow on the switch", category: 1 },
      { text: "Incorrect subnet mask prevents inter-VLAN routing", category: 2 },
      { text: "TTL exceeded — traceroute shows a routing loop", category: 2 },
      { text: "HTTPS certificate name mismatch error in browser", category: 3 },
      { text: "DNS resolves but web page returns HTTP 503", category: 3 },
    ],
    explanation:
      "Physical layer issues involve cables, connectors, and link signals. Data Link problems include duplex mismatches and MAC table issues. Network layer symptoms relate to IP addressing, subnetting, and routing. Application layer issues involve protocols that the end user directly interacts with, such as HTTP errors and certificate validation. Troubleshooting bottom-up (Layer 1 first) is the most efficient strategy.",
  },
];
