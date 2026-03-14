import type { PbqScenario } from "../types";

export const aPlusCore1Scenarios: PbqScenario[] = [
  /* ================================================================ */
  /*  ORDERING SCENARIOS                                               */
  /* ================================================================ */
  {
    type: "ordering",
    id: "aplus-core1-troubleshooting-methodology",
    title: "CompTIA Troubleshooting Methodology",
    description:
      "Arrange the seven steps of the CompTIA troubleshooting methodology in the correct order.",
    domain_number: "5.0",
    domain_title: "Hardware and Network Troubleshooting",
    items: [
      "Identify the problem",
      "Establish a theory of probable cause",
      "Test the theory to determine the cause",
      "Establish a plan of action to resolve the problem",
      "Implement the solution or escalate as necessary",
      "Verify full system functionality and implement preventive measures",
      "Document findings, actions, and outcomes",
    ],
    correct_order: [0, 1, 2, 3, 4, 5, 6],
    explanation:
      "The CompTIA 7-step troubleshooting methodology always begins with identifying the problem by gathering information and questioning the user. Theories are formed and tested before a plan is created and the solution implemented. Full functionality is verified and preventive measures applied before the final step of documenting all findings and outcomes.",
  },
  {
    type: "ordering",
    id: "aplus-core1-laser-printer-process",
    title: "Laser Printer Imaging Process",
    description:
      "Arrange the steps of the laser printer electrophotographic imaging process in the correct order.",
    domain_number: "3.0",
    domain_title: "Hardware",
    items: [
      "Processing",
      "Charging",
      "Exposing",
      "Developing",
      "Transferring",
      "Fusing",
      "Cleaning",
    ],
    correct_order: [0, 1, 2, 3, 4, 5, 6],
    explanation:
      "The laser printer process starts with Processing (RIP converts data to a bitmap), then Charging (drum surface is given a uniform negative charge). The laser Exposes the drum to discharge specific areas, then toner Develops onto those areas. The image is Transferred to paper via a positive charge, Fused permanently by heat and pressure, and finally the drum is Cleaned of residual toner before the next cycle.",
  },
  {
    type: "ordering",
    id: "aplus-core1-boot-sequence",
    title: "PC Boot Sequence",
    description:
      "Arrange the stages of a standard PC boot sequence in the correct order.",
    domain_number: "5.0",
    domain_title: "Hardware and Network Troubleshooting",
    items: [
      "Power-On Self-Test (POST)",
      "BIOS/UEFI initialises hardware",
      "MBR/GPT partition table is read",
      "Bootloader executes",
      "OS kernel loads into memory",
      "User login prompt displayed",
    ],
    correct_order: [0, 1, 2, 3, 4, 5],
    explanation:
      "On power-on, POST runs first to verify hardware integrity, then BIOS/UEFI initialises and enumerates hardware devices. The firmware reads the MBR or GPT to locate the active partition, hands control to the bootloader (e.g. GRUB or Windows Boot Manager), which loads the OS kernel into memory. Once the kernel has initialised all drivers and services, the login prompt is presented to the user.",
  },
  {
    type: "ordering",
    id: "aplus-core1-pc-build-order",
    title: "PC Assembly Order",
    description:
      "Arrange the steps for assembling a new desktop PC in the correct order.",
    domain_number: "3.0",
    domain_title: "Hardware",
    items: [
      "Install CPU into motherboard socket",
      "Mount CPU cooler",
      "Install RAM in appropriate slots",
      "Mount motherboard in the case",
      "Connect power supply cables to motherboard",
      "Install storage drives",
      "Connect data and front-panel cables",
      "Install GPU in PCIe slot",
    ],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7],
    explanation:
      "It is easiest to install the CPU, cooler, and RAM on the motherboard before mounting it in the case. The motherboard is then secured in the chassis and power supply cables connected. Storage drives are installed next, followed by all data and front-panel cable connections. The GPU is installed last so it does not obstruct cable routing and other component access during the build.",
  },

  /* ================================================================ */
  /*  MATCHING SCENARIOS                                               */
  /* ================================================================ */
  {
    type: "matching",
    id: "aplus-core1-ports-to-services",
    title: "Match Ports to Services",
    description:
      "Match each well-known port number to its corresponding network service or protocol.",
    domain_number: "2.0",
    domain_title: "Networking",
    left: ["22", "25", "53", "80", "110", "143", "443", "3389"],
    right: [
      "SSH (Secure Shell)",
      "SMTP (Simple Mail Transfer Protocol)",
      "DNS (Domain Name System)",
      "HTTP (Hypertext Transfer Protocol)",
      "POP3 (Post Office Protocol v3)",
      "IMAP (Internet Message Access Protocol)",
      "HTTPS (HTTP over TLS)",
      "RDP (Remote Desktop Protocol)",
    ],
    correct_map: [0, 1, 2, 3, 4, 5, 6, 7],
    explanation:
      "Port 22 = SSH, 25 = SMTP, 53 = DNS, 80 = HTTP, 110 = POP3, 143 = IMAP, 443 = HTTPS, 3389 = RDP. These are all CompTIA A+ exam-required port numbers. POP3 and IMAP are both email retrieval protocols — POP3 downloads and removes mail from the server whereas IMAP keeps mail on the server and synchronises across devices.",
  },
  {
    type: "matching",
    id: "aplus-core1-cable-speeds",
    title: "Match Cable Types to Maximum Speeds",
    description:
      "Match each network cable type to its maximum rated throughput and distance capability.",
    domain_number: "2.0",
    domain_title: "Networking",
    left: ["Cat 5e", "Cat 6", "Cat 6a", "Single-mode fibre", "Multimode fibre", "RG-6 coax"],
    right: [
      "1 Gbps up to 100 m",
      "10 Gbps up to 55 m",
      "10 Gbps up to 100 m",
      "100 Gbps+ over many kilometres",
      "10 Gbps up to 550 m (OM4)",
      "Used for cable TV and broadband up to ~1 Gbps",
    ],
    correct_map: [0, 1, 2, 3, 4, 5],
    explanation:
      "Cat 5e supports 1 Gbps to 100 m. Cat 6 supports 10 Gbps but only to 55 m due to alien crosstalk; Cat 6a eliminates this with thicker shielding, reaching 10 Gbps at the full 100 m. Single-mode fibre uses a laser and tiny core for very long-distance high-bandwidth links. Multimode fibre uses an LED and larger core for shorter campus runs. RG-6 coaxial cable carries DOCSIS cable broadband signals.",
  },
  {
    type: "matching",
    id: "aplus-core1-connector-types",
    title: "Match Connector Types to Their Uses",
    description:
      "Match each connector type to its primary use or device association.",
    domain_number: "3.0",
    domain_title: "Hardware",
    left: ["USB-A", "USB-C", "RJ-45", "RJ-11", "LC", "SC", "F-type"],
    right: [
      "Standard host-side USB connector on PCs and chargers",
      "Reversible connector for modern devices, supports USB 3.x, Thunderbolt, and power",
      "8-position 8-contact connector for Ethernet networking",
      "6-position 2-contact connector for analogue telephone lines",
      "Small-form-factor fibre connector with a latch, used in SFP modules",
      "Square snap-in fibre connector, common in older networking installations",
      "Threaded coaxial connector for cable TV and broadband modems",
    ],
    correct_map: [0, 1, 2, 3, 4, 5, 6],
    explanation:
      "USB-A is the rectangular host connector; USB-C is the smaller oval reversible connector increasingly used for everything from data to video to power. RJ-45 terminates Ethernet cables (8 wires) while RJ-11 terminates phone lines (2-4 wires). LC connectors are small form-factor fibre connectors used in high-density SFP ports; SC connectors are the larger square push-pull type. The F-type threaded connector is used on coaxial cable for TV distribution and DOCSIS broadband.",
  },
  {
    type: "matching",
    id: "aplus-core1-raid-levels",
    title: "Match RAID Levels to Descriptions",
    description:
      "Match each RAID level to its correct description of how data is stored and protected.",
    domain_number: "3.0",
    domain_title: "Hardware",
    left: ["RAID 0", "RAID 1", "RAID 5", "RAID 10"],
    right: [
      "Striping only — maximum performance and capacity, no fault tolerance",
      "Mirroring only — full redundancy, 50% usable capacity, requires 2 drives",
      "Striping with distributed parity — fault tolerance with 1 drive loss, requires minimum 3 drives",
      "Stripe of mirrors — high performance and redundancy, requires minimum 4 drives",
    ],
    correct_map: [0, 1, 2, 3],
    explanation:
      "RAID 0 stripes data across drives for performance but has zero redundancy — any single drive failure loses all data. RAID 1 mirrors data identically across two drives, surviving one drive failure. RAID 5 distributes parity across all drives in the array, allowing recovery from one drive failure while using n-1 drives of usable space. RAID 10 (1+0) combines mirroring and striping for both speed and redundancy but requires at least four drives.",
  },

  /* ================================================================ */
  /*  CATEGORIZATION SCENARIOS                                         */
  /* ================================================================ */
  {
    type: "categorization",
    id: "aplus-core1-display-connectors",
    title: "Classify Display Connectors by Signal Type",
    description:
      "Sort each display connector into the correct category based on whether it carries a digital signal, an analogue signal, or both.",
    domain_number: "3.0",
    domain_title: "Hardware",
    categories: ["Digital Only", "Analog Only", "Both Digital and Analog"],
    items: [
      { text: "HDMI", category: 0 },
      { text: "DisplayPort", category: 0 },
      { text: "Thunderbolt (video)", category: 0 },
      { text: "DVI-D", category: 0 },
      { text: "VGA (DE-15)", category: 1 },
      { text: "DVI-A", category: 1 },
      { text: "DVI-I", category: 2 },
    ],
    explanation:
      "HDMI, DisplayPort, Thunderbolt, and DVI-D carry only digital signals. VGA (DE-15) is a purely analogue interface and was the standard before digital displays became common. DVI-A carries only the analogue signal path of the DVI standard. DVI-I (Integrated) includes both the digital and analogue pins, making it the only DVI variant that supports both signal types from a single connector.",
  },
  {
    type: "categorization",
    id: "aplus-core1-wireless-standards",
    title: "Classify Wi-Fi Standards by Frequency Band",
    description:
      "Sort each 802.11 Wi-Fi standard into the correct frequency band category.",
    domain_number: "2.0",
    domain_title: "Networking",
    categories: ["2.4 GHz Only", "5 GHz Only", "Dual Band (2.4 GHz and 5 GHz)"],
    items: [
      { text: "802.11b", category: 0 },
      { text: "802.11g", category: 0 },
      { text: "802.11a", category: 1 },
      { text: "802.11n (Wi-Fi 4)", category: 2 },
      { text: "802.11ac (Wi-Fi 5)", category: 1 },
      { text: "802.11ax (Wi-Fi 6/6E)", category: 2 },
    ],
    explanation:
      "802.11b and 802.11g operate exclusively on the 2.4 GHz band. 802.11a was the first 5 GHz standard (1999) and operates only at 5 GHz; 802.11ac (Wi-Fi 5) also operates only on 5 GHz. 802.11n (Wi-Fi 4) was the first dual-band standard, and 802.11ax (Wi-Fi 6) is also dual-band — with Wi-Fi 6E extending further into the 6 GHz band on capable hardware.",
  },
  {
    type: "categorization",
    id: "aplus-core1-cloud-service-models",
    title: "Classify Cloud Service Model Responsibilities",
    description:
      "Sort each item into the cloud service model where the CUSTOMER bears primary responsibility for it.",
    domain_number: "4.0",
    domain_title: "Virtualization and Cloud Computing",
    categories: ["IaaS", "PaaS", "SaaS"],
    items: [
      { text: "Operating system installation and patching", category: 0 },
      { text: "Virtual network configuration", category: 0 },
      { text: "Storage volume management", category: 0 },
      { text: "Application code development and security", category: 1 },
      { text: "Database schema and query design", category: 1 },
      { text: "Runtime environment configuration", category: 1 },
      { text: "User provisioning and access management", category: 2 },
      { text: "Data input and classification", category: 2 },
      { text: "Client device and browser security", category: 2 },
    ],
    explanation:
      "In IaaS (e.g. AWS EC2), the customer manages OS, virtual networking, and storage volumes; the provider manages physical hardware and the hypervisor. In PaaS (e.g. Heroku, Azure App Service), the customer manages their application code, database design, and runtime configuration; the provider handles OS and middleware. In SaaS (e.g. Microsoft 365), the customer is only responsible for user accounts, data they create, and client-side security.",
  },
  {
    type: "categorization",
    id: "aplus-core1-storage-interfaces",
    title: "Classify Storage Interfaces by Use Case",
    description:
      "Sort each storage interface into the correct category based on whether it is used internally, externally, or both.",
    domain_number: "3.0",
    domain_title: "Hardware",
    categories: ["Internal Only", "External Only", "Both Internal and External"],
    items: [
      { text: "SATA (Serial ATA)", category: 0 },
      { text: "NVMe M.2", category: 0 },
      { text: "PCIe add-in card storage", category: 0 },
      { text: "eSATA", category: 1 },
      { text: "USB 3.0", category: 1 },
      { text: "Thunderbolt", category: 2 },
    ],
    explanation:
      "SATA, NVMe M.2, and PCIe slots are all internal interfaces found on motherboards with no external connector standard for storage. eSATA (external SATA) was designed specifically for external drives and is not used internally. USB 3.0 is used exclusively for external peripherals and storage in a PC context. Thunderbolt is unique as it connects to internal GPU/PCIe infrastructure while also serving as an external port for storage enclosures and docks.",
  },
];
