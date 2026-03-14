import type { SimulationScenario } from "../types";

export const networkPlusSimulations: SimulationScenario[] = [
  /* ================================================================ */
  /*  SIMULATION 1 — IP Subnet Planning                                */
  /* ================================================================ */
  {
    type: "simulation",
    id: "np-sim-ip-subnet-planning",
    title: "IP Subnet Planning",
    briefing:
      "Your company has been assigned the 192.168.10.0/24 address block. The network architect has asked you to divide it into four subnets that satisfy the following host requirements: Engineering (50 hosts), Sales (25 hosts), Management (10 hosts), and Guest (10 hosts). You must choose the smallest subnet that fits each requirement, assign network addresses in order from largest to smallest subnet starting at 192.168.10.0, and verify the design before implementation.",
    domain_number: "1.0",
    domain_title: "Networking Concepts",
    estimatedMinutes: 12,
    tasks: [
      /* ── Task 1: Subnet Calculation ─────────────────────────────── */
      {
        id: "np-sim-subnet-t1",
        title: "Task 1 — Subnet Calculation",
        instructions:
          "Using the 192.168.10.0/24 block, select the correct subnet mask for each department and enter the corresponding network address. Allocate subnets in order from largest to smallest, starting at 192.168.10.0.",
        fields: [
          {
            type: "dropdown",
            id: "np-sim-subnet-t1-eng-mask",
            label: "Engineering subnet mask (needs 50 hosts)",
            options: [
              "255.255.255.0 (/24)",
              "255.255.255.128 (/25)",
              "255.255.255.192 (/26)",
              "255.255.255.224 (/27)",
              "255.255.255.240 (/28)",
            ],
            correctIndex: 2,
          },
          {
            type: "text",
            id: "np-sim-subnet-t1-eng-net",
            label: "Engineering network address",
            acceptedValues: ["192.168.10.0", "192.168.10.0/26"],
            placeholder: "e.g. 192.168.10.0",
          },
          {
            type: "dropdown",
            id: "np-sim-subnet-t1-sales-mask",
            label: "Sales subnet mask (needs 25 hosts)",
            options: [
              "255.255.255.128 (/25)",
              "255.255.255.192 (/26)",
              "255.255.255.224 (/27)",
              "255.255.255.240 (/28)",
              "255.255.255.248 (/29)",
            ],
            correctIndex: 2,
          },
          {
            type: "text",
            id: "np-sim-subnet-t1-sales-net",
            label: "Sales network address",
            acceptedValues: ["192.168.10.64", "192.168.10.64/27"],
            placeholder: "e.g. 192.168.10.64",
          },
          {
            type: "dropdown",
            id: "np-sim-subnet-t1-mgmt-mask",
            label: "Management subnet mask (needs 10 hosts)",
            options: [
              "255.255.255.192 (/26)",
              "255.255.255.224 (/27)",
              "255.255.255.240 (/28)",
              "255.255.255.248 (/29)",
              "255.255.255.252 (/30)",
            ],
            correctIndex: 2,
          },
          {
            type: "text",
            id: "np-sim-subnet-t1-mgmt-net",
            label: "Management network address",
            acceptedValues: ["192.168.10.96", "192.168.10.96/28"],
            placeholder: "e.g. 192.168.10.96",
          },
          {
            type: "dropdown",
            id: "np-sim-subnet-t1-guest-mask",
            label: "Guest subnet mask (needs 10 hosts)",
            options: [
              "255.255.255.192 (/26)",
              "255.255.255.224 (/27)",
              "255.255.255.240 (/28)",
              "255.255.255.248 (/29)",
              "255.255.255.252 (/30)",
            ],
            correctIndex: 2,
          },
          {
            type: "text",
            id: "np-sim-subnet-t1-guest-net",
            label: "Guest network address",
            acceptedValues: ["192.168.10.112", "192.168.10.112/28"],
            placeholder: "e.g. 192.168.10.112",
          },
        ],
        explanation:
          "A /26 provides 62 usable hosts (64 − 2), fitting Engineering (50). A /27 provides 30 usable hosts (32 − 2), fitting Sales (25). A /28 provides 14 usable hosts (16 − 2), fitting both Management and Guest (10 each). Allocating largest-first from 192.168.10.0: Engineering = 192.168.10.0/26 (ends at .63), Sales = 192.168.10.64/27 (ends at .95), Management = 192.168.10.96/28 (ends at .111), Guest = 192.168.10.112/28 (ends at .127).",
      },

      /* ── Task 2: IP Assignment ──────────────────────────────────── */
      {
        id: "np-sim-subnet-t2",
        title: "Task 2 — IP Assignment",
        instructions:
          "For each subnet, enter the default gateway address (the first usable host address, conventionally assigned to the router interface) and the last usable host address.",
        fields: [
          {
            type: "text",
            id: "np-sim-subnet-t2-eng-gw",
            label: "Engineering default gateway",
            acceptedValues: ["192.168.10.1"],
            placeholder: "e.g. 192.168.10.1",
          },
          {
            type: "text",
            id: "np-sim-subnet-t2-eng-last",
            label: "Engineering last usable host",
            acceptedValues: ["192.168.10.62"],
            placeholder: "e.g. 192.168.10.62",
          },
          {
            type: "text",
            id: "np-sim-subnet-t2-sales-gw",
            label: "Sales default gateway",
            acceptedValues: ["192.168.10.65"],
            placeholder: "e.g. 192.168.10.65",
          },
          {
            type: "text",
            id: "np-sim-subnet-t2-sales-last",
            label: "Sales last usable host",
            acceptedValues: ["192.168.10.94"],
            placeholder: "e.g. 192.168.10.94",
          },
          {
            type: "text",
            id: "np-sim-subnet-t2-mgmt-gw",
            label: "Management default gateway",
            acceptedValues: ["192.168.10.97"],
            placeholder: "e.g. 192.168.10.97",
          },
          {
            type: "text",
            id: "np-sim-subnet-t2-mgmt-last",
            label: "Management last usable host",
            acceptedValues: ["192.168.10.110"],
            placeholder: "e.g. 192.168.10.110",
          },
          {
            type: "text",
            id: "np-sim-subnet-t2-guest-gw",
            label: "Guest default gateway",
            acceptedValues: ["192.168.10.113"],
            placeholder: "e.g. 192.168.10.113",
          },
          {
            type: "text",
            id: "np-sim-subnet-t2-guest-last",
            label: "Guest last usable host",
            acceptedValues: ["192.168.10.126"],
            placeholder: "e.g. 192.168.10.126",
          },
        ],
        explanation:
          "The first usable host is the network address + 1; the last usable host is the broadcast address − 1. Engineering (/26): gateway = .1, last host = .62, broadcast = .63. Sales (/27): gateway = .65, last host = .94, broadcast = .95. Management (/28): gateway = .97, last host = .110, broadcast = .111. Guest (/28): gateway = .113, last host = .126, broadcast = .127.",
      },

      /* ── Task 3: Verify Design ──────────────────────────────────── */
      {
        id: "np-sim-subnet-t3",
        title: "Task 3 — Verify Design",
        instructions:
          "Answer the following verification questions about the completed subnet design to confirm it is correct before deployment.",
        fields: [
          {
            type: "dropdown",
            id: "np-sim-subnet-t3-eng-hosts",
            label: "How many usable host addresses are in the Engineering /26 subnet?",
            options: ["60", "62", "64", "126", "254"],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "np-sim-subnet-t3-sales-hosts",
            label: "How many usable host addresses are in the Sales /27 subnet?",
            options: ["14", "28", "30", "32", "62"],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "np-sim-subnet-t3-reach",
            label:
              "Can host 192.168.10.50 (Engineering) communicate directly with host 192.168.10.80 (Sales) without routing?",
            options: [
              "Yes — they share the same /24 supernet",
              "No — they are in different /26 subnets",
              "No — they are in different subnets and require a router",
              "Yes — both addresses fall within 192.168.10.0/25",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "np-sim-subnet-t3-broadcast",
            label: "What is the broadcast address for the Guest subnet (192.168.10.112/28)?",
            options: [
              "192.168.10.119",
              "192.168.10.123",
              "192.168.10.126",
              "192.168.10.127",
              "192.168.10.128",
            ],
            correctIndex: 3,
          },
          {
            type: "dropdown",
            id: "np-sim-subnet-t3-waste",
            label:
              "After allocating all four subnets, what is the first unallocated (available) address in the 192.168.10.0/24 block?",
            options: [
              "192.168.10.112",
              "192.168.10.127",
              "192.168.10.128",
              "192.168.10.192",
              "192.168.10.255",
            ],
            correctIndex: 2,
          },
        ],
        explanation:
          "A /26 has 2^6 = 64 addresses; subtract network and broadcast = 62 usable. A /27 has 2^5 = 32 addresses; 30 usable. Hosts in different subnets cannot communicate at Layer 2 — a router (Layer 3) is required. The Guest /28 block 192.168.10.112–127 has broadcast .127. The four subnets consume .0–.127; the first unallocated address is 192.168.10.128, leaving .128–.255 (a full /25) available for future growth.",
      },
    ],
    explanation:
      "Variable-Length Subnet Masking (VLSM) lets you carve a large block into subnets sized precisely for each segment, conserving address space. The golden rules: (1) choose the smallest prefix that provides enough usable hosts (2^n − 2 ≥ required), (2) allocate largest subnets first to keep boundaries aligned, (3) the usable range is always network+1 through broadcast−1. This technique is essential on any routed network and is a core N10-009 exam topic.",
  },

  /* ================================================================ */
  /*  SIMULATION 2 — Switch VLAN Configuration                         */
  /* ================================================================ */
  {
    type: "simulation",
    id: "np-sim-vlan-config",
    title: "Switch VLAN Configuration",
    briefing:
      "You are the network administrator for a small office. A new Cisco Catalyst 2960 switch has been installed and must be segmented into three VLANs: Data (VLAN 10) for workstations on Fa0/1–Fa0/16, Voice (VLAN 20) for IP phones on Fa0/17–Fa0/20, and Management (VLAN 99) for the switch management interface on Fa0/21–Fa0/24. Fa0/24 must also carry all VLANs as a trunk to the upstream router. Complete the configuration tasks in order.",
    domain_number: "2.0",
    domain_title: "Network Implementation",
    estimatedMinutes: 10,
    tasks: [
      /* ── Task 1: VLAN Creation ──────────────────────────────────── */
      {
        id: "np-sim-vlan-t1",
        title: "Task 1 — VLAN Creation",
        instructions:
          "Enter the correct VLAN IDs and names as they should be configured in the switch VLAN database. Names are case-sensitive; use the values shown in the briefing.",
        evidence: [
          {
            label: "Current VLAN Table (show vlan brief)",
            content: `VLAN  Name                Status    Ports
----  ------------------- --------- ------------------------
1     default             active    Fa0/1-24, Gi0/1-2
1002  fddi-default        act/unsup
1003  token-ring-default  act/unsup
1004  fddinet-default     act/unsup
1005  trnet-default       act/unsup`,
          },
        ],
        fields: [
          {
            type: "text",
            id: "np-sim-vlan-t1-data-id",
            label: "Data VLAN ID",
            acceptedValues: ["10", "vlan 10", "VLAN 10"],
            placeholder: "e.g. 10",
          },
          {
            type: "text",
            id: "np-sim-vlan-t1-data-name",
            label: "Data VLAN name",
            acceptedValues: ["Data", "DATA"],
            placeholder: "e.g. Data",
          },
          {
            type: "text",
            id: "np-sim-vlan-t1-voice-id",
            label: "Voice VLAN ID",
            acceptedValues: ["20", "vlan 20", "VLAN 20"],
            placeholder: "e.g. 20",
          },
          {
            type: "text",
            id: "np-sim-vlan-t1-voice-name",
            label: "Voice VLAN name",
            acceptedValues: ["Voice", "VOICE"],
            placeholder: "e.g. Voice",
          },
          {
            type: "text",
            id: "np-sim-vlan-t1-mgmt-id",
            label: "Management VLAN ID",
            acceptedValues: ["99", "vlan 99", "VLAN 99"],
            placeholder: "e.g. 99",
          },
          {
            type: "text",
            id: "np-sim-vlan-t1-mgmt-name",
            label: "Management VLAN name",
            acceptedValues: ["Management", "MANAGEMENT"],
            placeholder: "e.g. Management",
          },
        ],
        explanation:
          "VLANs are created in global configuration mode with 'vlan <id>' followed by 'name <name>'. VLAN 1 is the default and should not be used for production traffic. VLAN 1002–1005 are reserved for legacy technologies. Using a dedicated Management VLAN (99 here) isolates switch administration traffic from user data, improving security.",
      },

      /* ── Task 2: Port Assignment ────────────────────────────────── */
      {
        id: "np-sim-vlan-t2",
        title: "Task 2 — Port Assignment",
        instructions:
          "Assign each switch port range to the correct VLAN by dragging the port labels into the appropriate VLAN zones. Fa0/24 will be configured as a trunk in the next task — assign it to Management for now.",
        evidence: [
          {
            label: "Desired Port-to-VLAN Mapping",
            content: `Port Range    VLAN    Purpose
----------    ----    ------------------
Fa0/1-16      10      Data (workstations)
Fa0/17-20     20      Voice (IP phones)
Fa0/21-24     99      Management / Trunk`,
          },
        ],
        fields: [
          {
            type: "zone-placement",
            id: "np-sim-vlan-t2-ports",
            label: "Assign port ranges to VLANs",
            items: [
              "Fa0/1–Fa0/8",
              "Fa0/9–Fa0/16",
              "Fa0/17–Fa0/20",
              "Fa0/21–Fa0/24",
            ],
            zones: ["VLAN 10 — Data", "VLAN 20 — Voice", "VLAN 99 — Management"],
            correctZones: [0, 0, 1, 2],
          },
          {
            type: "dropdown",
            id: "np-sim-vlan-t2-mode",
            label: "What switchport mode should be applied to Fa0/1–Fa0/23 (access ports)?",
            options: [
              "switchport mode trunk",
              "switchport mode access",
              "switchport mode dynamic desirable",
              "switchport mode dynamic auto",
              "switchport nonegotiate",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "np-sim-vlan-t2-voice-cmd",
            label:
              "Which additional command assigns VLAN 20 as the voice VLAN on Fa0/17–Fa0/20 (alongside the data VLAN)?",
            options: [
              "switchport access vlan 20",
              "switchport voice vlan 20",
              "switchport trunk allowed vlan add 20",
              "vlan 20 voice",
              "switchport priority extend cos 5",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "Access ports belong to exactly one data VLAN (configured with 'switchport access vlan <id>') and optionally a voice VLAN ('switchport voice vlan <id>'). The voice VLAN command causes the switch to tag voice traffic with VLAN 20 and apply appropriate QoS, while untagged data traffic uses the data VLAN. Setting ports to static access mode ('switchport mode access') prevents Dynamic Trunking Protocol (DTP) negotiation attempts.",
      },

      /* ── Task 3: Trunk Configuration ────────────────────────────── */
      {
        id: "np-sim-vlan-t3",
        title: "Task 3 — Trunk Configuration",
        instructions:
          "Configure Fa0/24 as an 802.1Q trunk port to carry all three VLANs to the upstream router. Select the correct value for each trunk parameter.",
        evidence: [
          {
            label: "Current Fa0/24 interface status (show interfaces Fa0/24 switchport)",
            content: `Name: Fa0/24
Switchport: Enabled
Administrative Mode: dynamic auto
Operational Mode: static access
Administrative Trunking Encapsulation: dot1q
Operational Trunking Encapsulation: native
Negotiation of Trunking: On
Access Mode VLAN: 99 (Management)
Trunking Native Mode VLAN: 1 (default)
Administrative Native VLAN tagging: disabled
Voice VLAN: none
Administrative private-vlan host-association: none
Administrative private-vlan mapping: none
Administrative private-vlan trunk native VLAN: none
Trunking VLANs Enabled: ALL`,
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "np-sim-vlan-t3-encap",
            label: "Trunk encapsulation type for Fa0/24",
            options: [
              "ISL (Cisco proprietary)",
              "802.1Q (dot1q)",
              "802.1ad (QinQ)",
              "No encapsulation required on 2960",
              "PPP",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "np-sim-vlan-t3-native",
            label: "Which VLAN should be set as the native VLAN on the trunk?",
            options: [
              "VLAN 1 (default — leave unchanged)",
              "VLAN 10 (Data)",
              "VLAN 20 (Voice)",
              "VLAN 99 (Management)",
              "Any unused VLAN, e.g. VLAN 999",
            ],
            correctIndex: 4,
          },
          {
            type: "dropdown",
            id: "np-sim-vlan-t3-allowed",
            label: "Which VLANs should be explicitly allowed on the Fa0/24 trunk?",
            options: [
              "All VLANs (1–4094) — leave as default",
              "VLAN 10 only",
              "VLANs 10, 20, 99",
              "VLANs 10, 20, 99, and 1",
              "VLANs 1, 10, 20, 99, 1002–1005",
            ],
            correctIndex: 2,
          },
          {
            type: "select-many",
            id: "np-sim-vlan-t3-security",
            label:
              "Select ALL security best practices that should be applied to this trunk port (select all that apply)",
            options: [
              "Disable DTP negotiation with 'switchport nonegotiate'",
              "Set native VLAN to an unused VLAN to prevent VLAN hopping",
              "Enable PortFast on the trunk port",
              "Explicitly restrict allowed VLANs with 'switchport trunk allowed vlan'",
              "Enable BPDU Guard on the trunk port",
              "Shut down unused VLANs with 'no vlan <id>'",
            ],
            correctIndices: [0, 1, 3],
          },
        ],
        explanation:
          "Cisco 2960 switches support 802.1Q encapsulation only (no ISL). Best practice is to change the native VLAN from the default VLAN 1 to an unused VLAN (such as 999) to prevent VLAN hopping attacks, where an attacker crafts double-tagged 802.1Q frames to reach a different VLAN. Explicitly restricting allowed VLANs reduces attack surface. Disabling DTP ('switchport nonegotiate') prevents a rogue device from negotiating a trunk. PortFast and BPDU Guard are for edge access ports, not trunks.",
      },
    ],
    explanation:
      "VLANs are a fundamental Layer 2 segmentation technology. Access ports carry traffic for a single VLAN; trunk ports carry multiple VLANs tagged with 802.1Q headers. Security hardening of trunks — changing the native VLAN, restricting allowed VLANs, and disabling DTP — is a mandatory step in any production deployment. The Management VLAN should always be separate from user data VLANs so that administrative access remains available even during network incidents.",
  },

  /* ================================================================ */
  /*  SIMULATION 3 — Wireless Network Troubleshooting                  */
  /* ================================================================ */
  {
    type: "simulation",
    id: "np-sim-wireless-troubleshoot",
    title: "Wireless Network Troubleshooting",
    briefing:
      "Users in Conference Room B report intermittent Wi-Fi disconnections throughout the day. The room is served by AP-CR-B (a Cisco AIR-AP2802I). A wireless site survey was performed and the raw data is available. Your task is to diagnose the issue, identify the root cause, and select the correct remediation settings for the access point.",
    domain_number: "5.0",
    domain_title: "Network Troubleshooting",
    estimatedMinutes: 10,
    tasks: [
      /* ── Task 1: Diagnose Issue ──────────────────────────────────── */
      {
        id: "np-sim-wireless-t1",
        title: "Task 1 — Diagnose the Issue",
        instructions:
          "Review the wireless survey data and AP configuration below. Answer the diagnostic questions to characterise the problem.",
        evidence: [
          {
            label: "Wireless Survey — Conference Room B (2.4 GHz band)",
            content: `SSID              BSSID              Channel  Signal (dBm)  Channel Width
----------------  -----------------  -------  ------------  -------------
CorpNet           00:1A:2B:3C:4D:5E  6        -52           20 MHz        <- AP-CR-B
CorpNet           00:1A:2B:3C:4D:5F  6        -58           20 MHz        <- AP-LOBBY
NeighborCo-WiFi   AA:BB:CC:DD:EE:01  6        -64           20 MHz
NETGEAR-Guest     AA:BB:CC:DD:EE:02  11       -70           20 MHz
CorpNet           00:1A:2B:3C:4D:60  1        -75           20 MHz        <- AP-SALES`,
          },
          {
            label: "iwconfig output (client laptop in Conference Room B)",
            content: `wlan0     IEEE 802.11  ESSID:"CorpNet"
          Mode:Managed  Frequency:2.437 GHz  Access Point: 00:1A:2B:3C:4D:5E
          Bit Rate=54 Mb/s   Tx-Power=20 dBm
          Retry short limit:7   RTS thr:off   Fragment thr:off
          Power Management:on
          Link Quality=42/70  Signal level=-68 dBm  Noise level=-85 dBm
          Rx invalid nwid:0  Rx invalid crypt:0  Rx invalid frag:0
          Tx excessive retries:1847  Invalid misc:23  Missed beacon:312`,
          },
          {
            label: "AP-CR-B Current Configuration",
            content: `AP Name       : AP-CR-B
Location      : Conference Room B
Radio 0 (2.4 GHz)
  Channel     : 6 (Auto)
  Channel Width: 20 MHz
  Tx Power    : 100% (23 dBm)
  Client Count: 18
Radio 1 (5 GHz)
  Channel     : 36
  Channel Width: 80 MHz
  Tx Power    : 100%
  Client Count: 2`,
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "np-sim-wireless-t1-overlap",
            label:
              "How many access points (including AP-CR-B) are transmitting on channel 6 in or near Conference Room B?",
            options: ["1", "2", "3", "4", "5"],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "np-sim-wireless-t1-interference-type",
            label:
              "What type of interference is occurring between AP-CR-B and AP-LOBBY on channel 6?",
            options: [
              "Adjacent-channel interference",
              "Co-channel interference",
              "Non-overlapping channel conflict",
              "Bluetooth interference",
              "Microwave interference",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "np-sim-wireless-t1-retries",
            label:
              "The iwconfig output shows 'Tx excessive retries: 1847'. What does this indicate?",
            options: [
              "The AP is overloaded with too many clients on the 5 GHz radio",
              "The client is experiencing high frame collision and re-transmission, consistent with interference",
              "The client's NIC driver needs updating",
              "The SSID passphrase is incorrect",
              "The DHCP lease is expiring too frequently",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "np-sim-wireless-t1-snr",
            label:
              "Given Signal level = −68 dBm and Noise level = −85 dBm, what is the Signal-to-Noise Ratio (SNR)?",
            options: ["17 dB", "23 dB", "68 dB", "85 dB", "153 dB"],
            correctIndex: 0,
          },
        ],
        explanation:
          "Co-channel interference (CCI) occurs when two or more APs share the same channel — they must contend for the medium using CSMA/CA, dramatically reducing effective throughput. The survey shows three APs on channel 6 (AP-CR-B, AP-LOBBY, and NeighborCo-WiFi). The high Tx retry count (1847) confirms the client is struggling to deliver frames cleanly. SNR = Signal − Noise = −68 − (−85) = 17 dB; anything below 20 dB indicates a poor link quality that will cause retries and disconnections.",
      },

      /* ── Task 2: Identify Root Cause ────────────────────────────── */
      {
        id: "np-sim-wireless-t2",
        title: "Task 2 — Identify Root Cause",
        instructions:
          "Based on your diagnosis, identify the primary and contributing root causes of the intermittent connectivity.",
        fields: [
          {
            type: "dropdown",
            id: "np-sim-wireless-t2-primary-cause",
            label: "What is the PRIMARY root cause of the connectivity issue?",
            options: [
              "Weak signal — AP-CR-B is too far from the conference room",
              "Co-channel interference from AP-LOBBY and NeighborCo-WiFi on channel 6",
              "Incorrect WPA2 security settings on AP-CR-B",
              "Excessive client count on the 5 GHz radio",
              "Client Power Management causing the adapter to sleep",
            ],
            correctIndex: 1,
          },
          {
            type: "select-many",
            id: "np-sim-wireless-t2-contributing",
            label:
              "Select ALL contributing factors that are worsening the situation (select all that apply)",
            options: [
              "AP-CR-B transmit power is at maximum (23 dBm), increasing its interference radius",
              "18 clients are associated to the 2.4 GHz radio, creating high contention",
              "Almost all clients remain on 2.4 GHz despite a 5 GHz radio being available",
              "The 5 GHz radio is only serving 2 clients",
              "The SSID is broadcasting on both bands with the same name, so client band-steering is not occurring effectively",
              "Channel width is set to 40 MHz, reducing the number of non-overlapping channels",
            ],
            correctIndices: [0, 1, 2, 3, 4],
          },
          {
            type: "dropdown",
            id: "np-sim-wireless-t2-channels-24",
            label:
              "How many non-overlapping 20 MHz channels exist in the 2.4 GHz band in North America?",
            options: ["1", "2", "3", "4", "11"],
            correctIndex: 2,
          },
        ],
        explanation:
          "In the 2.4 GHz band, only channels 1, 6, and 11 are non-overlapping (20 MHz wide) in North America. Having three APs on channel 6 creates maximum CCI. High Tx power widens the area over which AP-CR-B causes interference to AP-LOBBY, and vice versa. With 18 clients on 2.4 GHz and only 2 on 5 GHz, the dual-band radio is being underused — likely because clients are defaulting to 2.4 GHz on association.",
      },

      /* ── Task 3: Implement Fix ──────────────────────────────────── */
      {
        id: "np-sim-wireless-t3",
        title: "Task 3 — Implement the Fix",
        instructions:
          "Select the correct corrective AP settings to resolve the co-channel interference and improve overall wireless performance in Conference Room B.",
        fields: [
          {
            type: "dropdown",
            id: "np-sim-wireless-t3-channel",
            label:
              "Which 2.4 GHz channel should AP-CR-B be changed to in order to eliminate overlap with AP-LOBBY (ch 6) and AP-SALES (ch 1)?",
            options: [
              "Channel 1",
              "Channel 4",
              "Channel 6",
              "Channel 11",
              "Channel 13",
            ],
            correctIndex: 3,
          },
          {
            type: "dropdown",
            id: "np-sim-wireless-t3-power",
            label:
              "To reduce the interference radius of AP-CR-B, what should be done with its transmit power?",
            options: [
              "Increase to maximum to overpower the interference",
              "Leave at 100% — power has no effect on CCI",
              "Reduce to a level that covers only Conference Room B (e.g. 25–50%)",
              "Set to 0% to disable the 2.4 GHz radio entirely",
              "Enable automatic power control and set maximum to 100%",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "np-sim-wireless-t3-band-steering",
            label:
              "Which AP feature should be enabled to push capable clients onto the 5 GHz radio and reduce 2.4 GHz congestion?",
            options: [
              "WMM (Wi-Fi Multimedia)",
              "BSS Coloring",
              "Band steering (also called client load balancing or 802.11k/v steering)",
              "Beamforming",
              "MU-MIMO",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "np-sim-wireless-t3-width",
            label:
              "Should the 2.4 GHz channel width be changed from 20 MHz to 40 MHz for higher throughput in this environment?",
            options: [
              "Yes — 40 MHz doubles throughput and should always be used",
              "No — 40 MHz in 2.4 GHz consumes nearly the entire band and worsens interference for all neighbours",
              "Yes — but only if the neighbouring APs also use 40 MHz",
              "Yes — channel width only affects 5 GHz, not 2.4 GHz",
              "No — 40 MHz is not supported on 2.4 GHz",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "The correct remediation: change AP-CR-B to channel 11 (the only remaining non-overlapping channel; AP-SALES is on 1, AP-LOBBY on 6), reduce Tx power to minimise the interference footprint, and enable band steering to offload capable clients to the less-congested 5 GHz radio. Using 40 MHz channel width in 2.4 GHz is strongly discouraged in dense environments because it occupies channels 1–9 or 3–11, leaving no room for non-overlapping APs and worsening CCI for all nearby devices.",
      },
    ],
    explanation:
      "Wireless troubleshooting requires systematic use of site survey data, client statistics, and AP configuration. The three primary causes of poor Wi-Fi performance are: insufficient signal (low RSSI), excessive interference (CCI or ACI), and client density (too many devices per AP). The fixes follow directly from the diagnosis: change channels to use non-overlapping assignments, reduce power to limit interference radius, and enable features (band steering, load balancing) to distribute clients across available radios and channels.",
  },

  /* ================================================================ */
  /*  SIMULATION 4 — Network Troubleshooting with Commands             */
  /* ================================================================ */
  {
    type: "simulation",
    id: "np-sim-cmd-troubleshoot",
    title: "Network Troubleshooting with Commands",
    briefing:
      "A user at workstation WS-ACCT-04 (IP: 10.10.1.55, subnet: 10.10.1.0/24, gateway: 10.10.1.1) reports they cannot open any external websites (e.g. https://www.example.com) but can communicate normally with other machines on the local network. You have remote access to the workstation and have captured the command output shown in each task. Identify and fix the problem.",
    domain_number: "5.0",
    domain_title: "Network Troubleshooting",
    estimatedMinutes: 10,
    tasks: [
      /* ── Task 1: Diagnose Connectivity ──────────────────────────── */
      {
        id: "np-sim-cmd-t1",
        title: "Task 1 — Diagnose Connectivity",
        instructions:
          "Review the ping and traceroute output captured from WS-ACCT-04. Answer the questions to identify where in the path connectivity breaks down.",
        evidence: [
          {
            label: "ping 10.10.1.1 (default gateway)",
            content: `Pinging 10.10.1.1 with 32 bytes of data:
Reply from 10.10.1.1: bytes=32 time=1ms TTL=64
Reply from 10.10.1.1: bytes=32 time=1ms TTL=64
Reply from 10.10.1.1: bytes=32 time=1ms TTL=64
Reply from 10.10.1.1: bytes=32 time=1ms TTL=64

Ping statistics for 10.10.1.1:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`,
          },
          {
            label: "ping 8.8.8.8 (Google Public DNS)",
            content: `Pinging 8.8.8.8 with 32 bytes of data:
Request timed out.
Request timed out.
Request timed out.
Request timed out.

Ping statistics for 8.8.8.8:
    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)`,
          },
          {
            label: "tracert 8.8.8.8",
            content: `Tracing route to 8.8.8.8 over a maximum of 30 hops:

  1    1 ms    1 ms    1 ms   10.10.1.1
  2    *        *        *     Request timed out.
  3    *        *        *     Request timed out.
  4    *        *        *     Request timed out.
  5    *        *        *     Request timed out.
  6    *        *        *     Request timed out.
  7    *        *        *     Request timed out.
  8    *        *        *     Request timed out.

Trace complete.`,
          },
          {
            label: "ipconfig /all (WS-ACCT-04)",
            content: `Windows IP Configuration

   Host Name . . . . . . . . . . . . : WS-ACCT-04
   Primary Dns Suffix  . . . . . . . : corp.internal
   Node Type . . . . . . . . . . . . : Hybrid
   IP Routing Enabled. . . . . . . . : No
   WINS Proxy Enabled. . . . . . . . : No
   DNS Suffix Search List. . . . . . : corp.internal

Ethernet adapter Ethernet0:
   Connection-specific DNS Suffix  . : corp.internal
   IPv4 Address. . . . . . . . . . . : 10.10.1.55
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 10.10.1.1
   DNS Servers . . . . . . . . . . . : 10.10.1.254
                                       10.10.1.253`,
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "np-sim-cmd-t1-gateway-reach",
            label: "Is WS-ACCT-04 able to reach its default gateway?",
            options: [
              "No — all pings to the gateway failed",
              "Yes — all pings to 10.10.1.1 succeeded",
              "Partially — intermittent packet loss to the gateway",
              "Cannot determine from the output provided",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "np-sim-cmd-t1-failure-point",
            label: "Based on the tracert output, at which hop does routing to 8.8.8.8 fail?",
            options: [
              "Hop 1 — the default gateway (10.10.1.1) is not responding",
              "Hop 2 — immediately after the default gateway",
              "Hop 4 — somewhere in the ISP core",
              "Hop 8 — just before Google's network",
              "The destination (8.8.8.8) is rejecting all probes",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "np-sim-cmd-t1-layer",
            label:
              "The workstation can reach 10.10.1.1 but not 8.8.8.8. Which layer of the OSI model is most likely involved in this failure?",
            options: [
              "Layer 1 — Physical (cable unplugged)",
              "Layer 2 — Data Link (MAC address issue)",
              "Layer 3 — Network (routing or gateway issue beyond the local router)",
              "Layer 4 — Transport (TCP/UDP port blocked)",
              "Layer 7 — Application (browser misconfiguration)",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "np-sim-cmd-t1-dns-server",
            label: "What DNS servers are currently configured on WS-ACCT-04?",
            options: [
              "8.8.8.8 and 8.8.4.4 (Google Public DNS)",
              "10.10.1.1 and 10.10.1.2 (gateway and secondary gateway)",
              "10.10.1.254 and 10.10.1.253 (internal DNS servers)",
              "192.168.1.1 (ISP provided)",
              "No DNS server is configured",
            ],
            correctIndex: 2,
          },
        ],
        explanation:
          "The ping and traceroute results tell a clear story: Layer 2 and the local gateway are healthy (hop 1 replies). Routing fails immediately beyond the gateway (hop 2 onwards). This is a Layer 3 issue — either the upstream router has lost its default route, the WAN link is down, or NAT/PAT is misconfigured. The DNS servers listed (10.10.1.254 and .253) are internal — they must be able to forward to external resolvers or they will also fail for external hostnames.",
      },

      /* ── Task 2: Analyse DNS ────────────────────────────────────── */
      {
        id: "np-sim-cmd-t2",
        title: "Task 2 — Analyse DNS",
        instructions:
          "Review the nslookup output and DNS-related command results captured from WS-ACCT-04. Identify the DNS failure mode.",
        evidence: [
          {
            label: "nslookup www.example.com (using default DNS 10.10.1.254)",
            content: `Server:  dns1.corp.internal
Address:  10.10.1.254

DNS request timed out.
    timeout was 2 seconds.
DNS request timed out.
    timeout was 2 seconds.
*** dns1.corp.internal can't find www.example.com: Server failed`,
          },
          {
            label: "nslookup www.example.com 8.8.8.8 (testing with Google DNS directly)",
            content: `Server:  dns.google
Address:  8.8.8.8

*** dns.google can't find www.example.com: No response from server`,
          },
          {
            label: "nslookup intranet.corp.internal (internal hostname)",
            content: `Server:  dns1.corp.internal
Address:  10.10.1.254

Name:    intranet.corp.internal
Address:  10.10.2.100`,
          },
          {
            label: "ping dns1.corp.internal (10.10.1.254)",
            content: `Pinging 10.10.1.254 with 32 bytes of data:
Reply from 10.10.1.254: bytes=32 time=2ms TTL=128
Reply from 10.10.1.254: bytes=32 time=1ms TTL=128
Reply from 10.10.1.254: bytes=32 time=2ms TTL=128
Reply from 10.10.1.254: bytes=32 time=1ms TTL=128

Ping statistics for 10.10.1.254:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`,
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "np-sim-cmd-t2-dns-reachable",
            label: "Is the internal DNS server (10.10.1.254) reachable from WS-ACCT-04?",
            options: [
              "No — all pings to 10.10.1.254 timed out",
              "Yes — ping succeeds, but DNS queries for external names fail",
              "Yes — DNS is fully functional for all names",
              "Cannot determine from the output",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "np-sim-cmd-t2-internal-dns",
            label:
              "Can the internal DNS server resolve internal hostnames (e.g. intranet.corp.internal)?",
            options: [
              "No — the internal DNS server is completely non-functional",
              "Yes — internal resolution works; only external forwarding fails",
              "Yes — but only for A records, not CNAME records",
              "Cannot determine — no internal lookup was tested",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "np-sim-cmd-t2-failure-reason",
            label:
              "Why does 'nslookup www.example.com 8.8.8.8' also fail, even though 8.8.8.8 is a valid public resolver?",
            options: [
              "8.8.8.8 does not exist — it is a private address",
              "The workstation has a firewall rule blocking DNS on port 53",
              "The query to 8.8.8.8 times out because there is no route to 8.8.8.8 from this network — confirming an upstream routing/WAN issue",
              "The nslookup tool does not support specifying an alternative DNS server",
              "8.8.8.8 requires a VPN to access",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "np-sim-cmd-t2-root-cause",
            label:
              "Combining all evidence, what is the most likely single root cause of both the connectivity and DNS failure?",
            options: [
              "The internal DNS server is misconfigured — it is forwarding to the wrong upstream resolver",
              "WS-ACCT-04 has an incorrect default gateway configured",
              "The upstream router (10.10.1.1) has lost its WAN connection or default route, so no traffic can exit the local network",
              "WS-ACCT-04 has a corrupted TCP/IP stack",
              "The ISP DNS servers are under a DDoS attack",
            ],
            correctIndex: 2,
          },
        ],
        explanation:
          "The DNS analysis confirms the root cause is upstream, not on the workstation or DNS server. The internal DNS server is reachable and resolves internal names correctly — it is the DNS forwarding to the internet that fails, because the forwarder queries external resolvers via the same broken WAN path. The direct query to 8.8.8.8 also fails for the same reason (no route to internet). This converges on a single root cause: the WAN link or default route on the gateway router (10.10.1.1) has failed.",
      },

      /* ── Task 3: Fix the Issue ──────────────────────────────────── */
      {
        id: "np-sim-cmd-t3",
        title: "Task 3 — Fix the Issue",
        instructions:
          "The network team has confirmed the upstream router had a misconfigured static default route. The WAN interface is up but the route was deleted during a maintenance window. Select the correct remediation steps and DNS configuration.",
        evidence: [
          {
            label: "Router show ip route (current routing table on 10.10.1.1)",
            content: `Gateway of last resort is not set

      10.0.0.0/8 is variably subnetted, 4 subnets, 2 masks
C        10.10.1.0/24 is directly connected, GigabitEthernet0/0
L        10.10.1.1/32 is directly connected, GigabitEthernet0/0
C        10.10.2.0/24 is directly connected, GigabitEthernet0/1
L        10.10.2.1/32 is directly connected, GigabitEthernet0/1
C        203.0.113.0/30 is directly connected, GigabitEthernet0/2
L        203.0.113.1/32 is directly connected, GigabitEthernet0/2`,
          },
          {
            label: "Router WAN interface details",
            content: `GigabitEthernet0/2 — WAN (ISP)
  IP Address : 203.0.113.1/30
  ISP Gateway: 203.0.113.2
  Status     : up/up`,
          },
        ],
        fields: [
          {
            type: "select-many",
            id: "np-sim-cmd-t3-fix-steps",
            label:
              "Select ALL steps required to restore internet connectivity (select all that apply)",
            options: [
              "Add a static default route on the router: ip route 0.0.0.0 0.0.0.0 203.0.113.2",
              "Reboot WS-ACCT-04 to refresh the IP configuration",
              "Change the DNS servers on WS-ACCT-04 to 8.8.8.8 and 8.8.4.4 permanently",
              "Verify the default route is present in the routing table after adding it",
              "Test connectivity from WS-ACCT-04 to 8.8.8.8 after the route is restored",
              "Replace the gateway router — it is faulty",
              "Flush the DNS resolver cache on WS-ACCT-04 with ipconfig /flushdns",
            ],
            correctIndices: [0, 3, 4, 6],
          },
          {
            type: "text",
            id: "np-sim-cmd-t3-default-route",
            label:
              "Enter the correct IOS command to add the missing default route on the router (full command as typed in privileged exec mode)",
            acceptedValues: [
              "ip route 0.0.0.0 0.0.0.0 203.0.113.2",
              "ip route 0.0.0.0 0.0.0.0 203.0.113.2 1",
            ],
            placeholder: "ip route ...",
          },
          {
            type: "dropdown",
            id: "np-sim-cmd-t3-dns-action",
            label:
              "After restoring the default route, should the workstation's DNS servers be changed from the internal servers to Google (8.8.8.8)?",
            options: [
              "Yes — internal DNS servers should never be used for external resolution",
              "No — the internal DNS servers will resume forwarding to external resolvers once the route is restored; no change to WS-ACCT-04 is needed",
              "Yes — 8.8.8.8 is always faster than internal DNS servers",
              "No — but only if the internal DNS servers are updated to forward to 1.1.1.1 instead of 8.8.8.8",
              "Yes — the internal DNS servers should be decommissioned",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "np-sim-cmd-t3-prevent-recurrence",
            label:
              "Which configuration change on the router would prevent this type of accidental route deletion in the future?",
            options: [
              "Enable OSPF to dynamically learn the default route from the ISP",
              "Configure the static default route as a permanent route that is not removed when the interface goes down",
              "Save the running configuration to startup-config ('copy running-config startup-config') immediately after making changes",
              "Use 'ip route 0.0.0.0 0.0.0.0 Null0' as a backup route",
              "Configure the WAN interface as a loopback interface",
            ],
            correctIndex: 2,
          },
        ],
        explanation:
          "The root cause was a missing default route ('Gateway of last resort is not set'). The fix is to re-add 'ip route 0.0.0.0 0.0.0.0 203.0.113.2' — a static default route pointing to the ISP gateway. After restoration, the internal DNS servers will automatically resume forwarding external queries; there is no need to reconfigure workstations. Flushing the DNS cache (ipconfig /flushdns) clears any negative cache entries (SERVFAIL responses cached during the outage) so the client immediately retries. Most importantly, 'copy running-config startup-config' must be run after every configuration change so the route survives a reload — the original deletion likely occurred because a previous config was reloaded without being saved.",
      },
    ],
    explanation:
      "This scenario demonstrates the CompTIA recommended troubleshooting methodology applied to a real outage: identify the problem (no internet), establish a theory (upstream failure), test the theory (ping gateway — OK; ping 8.8.8.8 — fail; tracert — drops at hop 2), isolate the cause (missing default route on router), implement the fix (re-add static route), and verify (test connectivity from workstation). Key commands to know for the N10-009 exam: ping, tracert/traceroute, nslookup/dig, ipconfig /all, ipconfig /flushdns, and show ip route on Cisco IOS.",
  },
];
