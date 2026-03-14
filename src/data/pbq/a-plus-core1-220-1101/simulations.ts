import type { SimulationScenario } from "../types";

export const aPlusCore1Simulations: SimulationScenario[] = [
  /* ================================================================ */
  /*  1. PC Hardware Troubleshooting                                   */
  /* ================================================================ */
  {
    type: "simulation",
    id: "aplus-core1-sim-post-failure",
    title: "PC Hardware Troubleshooting",
    briefing:
      "A user reports that their desktop PC will not start. When the power button is pressed, the system powers on (fans spin, LEDs illuminate) but nothing appears on the monitor. The technician on site reports hearing a series of beep codes from the system speaker and has documented their observations. You must analyse the evidence, identify the failed component, and select the appropriate resolution steps.",
    domain_number: "5.0",
    domain_title: "Hardware and Network Troubleshooting",
    estimatedMinutes: 10,
    tasks: [
      /* ── Task 1 ── */
      {
        id: "aplus-core1-sim-post-failure-t1",
        title: "Task 1 — Symptom Analysis",
        instructions:
          "Review the beep code table and the technician's notes below. Use this evidence to answer the questions about what the beep codes indicate and which subsystem is implicated.",
        evidence: [
          {
            label: "AMI BIOS Beep Code Reference",
            content: [
              "1 beep   : DRAM refresh failure",
              "2 beeps  : Parity circuit failure",
              "3 beeps  : Base 64K RAM failure",
              "4 beeps  : System timer failure",
              "5 beeps  : Processor failure",
              "6 beeps  : Keyboard controller / gate A20 failure",
              "7 beeps  : Virtual mode exception error",
              "8 beeps  : Display memory read/write failure",
              "9 beeps  : ROM BIOS checksum failure",
              "1L+3S    : Memory not installed / incompatible",
              "1L+8S    : Display or video card not detected",
            ].join("\n"),
          },
          {
            label: "Technician On-Site Notes",
            content: [
              "Time: 09:14",
              "System: Custom desktop, Z690 motherboard, Intel Core i7-12700K",
              "Observation: Power button pressed — fans spin up, CPU cooler active, RGB LEDs on.",
              "Monitor: No signal detected. Monitor tested with a separate known-good PC — monitor confirmed working.",
              "Beep pattern: 1 long beep followed by 8 short beeps (1L+8S) repeated twice.",
              "GPU: NVIDIA RTX 3070 seated in PCIe x16 slot. No visible damage.",
              "Display cable: HDMI cable connects GPU to monitor.",
              "Additional: No POST screen, no BIOS splash. Power LED is solid amber on the motherboard.",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "aplus-core1-sim-post-failure-t1-f1",
            label: "What does the 1L+8S beep code indicate?",
            options: [
              "RAM failure — memory not seated or incompatible",
              "Display memory read/write failure or display/video card not detected",
              "Processor failure — CPU not functioning",
              "System timer failure on the motherboard",
              "ROM BIOS checksum failure — corrupted firmware",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-post-failure-t1-f2",
            label: "Which subsystem is most likely responsible for the no-display symptom in this scenario?",
            options: [
              "System memory (RAM)",
              "CPU or socket",
              "GPU / display adapter",
              "Power supply unit",
              "Motherboard northbridge",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-post-failure-t1-f3",
            label: "The solid amber power LED on the motherboard typically indicates what condition?",
            options: [
              "The system is in normal S0 (on) state",
              "Standby power is present but a POST fault has been detected",
              "The CPU is overheating and throttling",
              "The CMOS battery is depleted and needs replacement",
              "The system is in S3 (sleep) state",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "The AMI BIOS 1L+8S beep pattern specifically maps to 'display or video card not detected.' The monitor was independently verified as working, so the fault lies in the GPU or its connection. A solid amber power LED on modern Intel platform motherboards is a POST error indicator, signalling that hardware initialisation failed — it does not indicate normal operation.",
      },

      /* ── Task 2 ── */
      {
        id: "aplus-core1-sim-post-failure-t2",
        title: "Task 2 — Component Identification",
        instructions:
          "Based on your symptom analysis, identify the most likely failed component and confirm which diagnostic steps would be appropriate at this stage.",
        fields: [
          {
            type: "dropdown",
            id: "aplus-core1-sim-post-failure-t2-f1",
            label: "What is the most likely failed or misconfigured component causing this POST failure?",
            options: [
              "DDR5 RAM module — incompatible speed rating",
              "CPU — bent pin in the LGA socket",
              "GPU — not fully seated in the PCIe x16 slot or PCIe power connectors disconnected",
              "CMOS battery — discharged, causing BIOS settings loss",
              "Hard drive — SATA cable not connected",
            ],
            correctIndex: 2,
          },
          {
            type: "select-many",
            id: "aplus-core1-sim-post-failure-t2-f2",
            label: "Select ALL valid diagnostic steps the technician should perform before replacing the GPU. (Select all that apply)",
            options: [
              "Reseat the GPU firmly in the PCIe x16 slot and ensure the retention clip locks",
              "Verify all PCIe 8-pin / 6+2-pin power connectors are fully connected to the GPU",
              "Test with a known-good replacement GPU from another system",
              "Use the motherboard's integrated graphics output (if available) to confirm BIOS posts",
              "Re-flash the GPU VBIOS from a USB drive",
              "Remove the CMOS battery for 30 seconds to clear settings, then retest",
              "Replace the hard drive with a new NVMe SSD",
            ],
            correctIndices: [0, 1, 2, 3],
          },
        ],
        explanation:
          "The beep code and absence of display with a working monitor point directly to the GPU. Before replacing it, a technician should always reseat the card, verify power connections, and test with a substitute GPU to confirm the diagnosis. Using the motherboard's integrated display output (if the CPU supports it) allows the BIOS to be accessed and rules out motherboard video circuitry failure. Re-flashing the VBIOS or replacing the storage drive are not relevant diagnostics at the POST stage.",
      },

      /* ── Task 3 ── */
      {
        id: "aplus-core1-sim-post-failure-t3",
        title: "Task 3 — Resolution",
        instructions:
          "The technician has reseated the GPU and confirmed all power connectors are attached, but the system still does not POST. A replacement GPU has been sourced. Identify the correct resolution steps and confirm the proper order of follow-up actions after the repair.",
        fields: [
          {
            type: "dropdown",
            id: "aplus-core1-sim-post-failure-t3-f1",
            label: "After installing the replacement GPU and confirming the system POSTs successfully, what is the FIRST driver-related action?",
            options: [
              "Download the GPU driver from the manufacturer's website and install immediately",
              "Boot into Safe Mode and uninstall the old GPU driver using DDU (Display Driver Uninstaller) before installing the new driver",
              "Use Windows Device Manager to update the driver automatically via Windows Update",
              "No driver action is needed — Windows will use a generic VGA driver indefinitely",
              "Roll back the existing driver to the previous version",
            ],
            correctIndex: 1,
          },
          {
            type: "select-many",
            id: "aplus-core1-sim-post-failure-t3-f2",
            label: "Select ALL items that should be documented in the service record for this repair. (Select all that apply)",
            options: [
              "The beep code observed and its interpretation",
              "Diagnostic steps performed (reseat, power check, substitute GPU test)",
              "The faulty component identified and replaced (GPU make/model)",
              "Date and time of the repair",
              "The user's login password used to verify Windows boot",
              "Driver version installed post-repair",
              "System serial number and asset tag",
            ],
            correctIndices: [0, 1, 2, 3, 5, 6],
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-post-failure-t3-f3",
            label: "After completing the repair and verifying full functionality, what is the final step of the CompTIA troubleshooting methodology?",
            options: [
              "Test the theory to determine the cause",
              "Establish a plan of action",
              "Implement preventive measures and verify full system functionality",
              "Document findings, actions, and outcomes",
              "Educate the end user on how to prevent future GPU failures",
            ],
            correctIndex: 3,
          },
        ],
        explanation:
          "When replacing a GPU, using DDU in Safe Mode ensures no remnants of the old driver conflict with the new hardware. The user's password must never be recorded in a service document — it is sensitive credential information. The final step of the CompTIA 7-step troubleshooting methodology is always documentation of findings, actions, and outcomes, which must occur after functionality has been verified.",
      },
    ],
    explanation:
      "POST failures indicated by beep codes are a core A+ diagnostic skill. The 1L+8S AMI beep code is a well-defined signal for display/GPU detection failure. The troubleshooting process follows the CompTIA methodology: identify (beep code analysis), theorise (GPU fault), test (reseat, power check, substitute), implement (replace GPU), verify (POST and Windows boot confirmed), and document. Never record user credentials in service documentation.",
  },

  /* ================================================================ */
  /*  2. SOHO Network Setup                                            */
  /* ================================================================ */
  {
    type: "simulation",
    id: "aplus-core1-sim-soho-network",
    title: "SOHO Network Setup",
    briefing:
      "You are setting up the network for a small office of 8 employees. The ISP has provisioned a cable modem with a public IP address. You must configure a SOHO router/firewall with DHCP, set up a secure wireless network, and configure a port forwarding rule to allow external RDP access to the office server. The router's web administration interface is accessible at 192.168.1.1.",
    domain_number: "2.0",
    domain_title: "Networking",
    estimatedMinutes: 10,
    tasks: [
      /* ── Task 1 ── */
      {
        id: "aplus-core1-sim-soho-network-t1",
        title: "Task 1 — Router & DHCP Configuration",
        instructions:
          "Configure the router's LAN interface and DHCP server settings. The office requires a Class C private network. Reserve the address range 192.168.1.1–192.168.1.19 for static assignments (servers, printers, and the router itself). DHCP should serve the remaining usable host addresses.",
        evidence: [
          {
            label: "Network Requirements Document",
            content: [
              "LAN Subnet      : 192.168.1.0/24",
              "Router (gateway): 192.168.1.1",
              "DNS servers     : 8.8.8.8 (primary), 8.8.4.4 (secondary)",
              "Static range    : 192.168.1.1  – 192.168.1.19  (excluded from DHCP)",
              "DHCP pool       : 192.168.1.20 – 192.168.1.254",
              "DHCP lease time : 24 hours",
              "Server (RDP)    : 192.168.1.10 (static)",
              "WAN IP (ISP)    : 203.0.113.45 (assigned by ISP)",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "text",
            id: "aplus-core1-sim-soho-network-t1-f1",
            label: "Enter the correct default gateway IP address that client workstations should be assigned by DHCP.",
            acceptedValues: ["192.168.1.1"],
            placeholder: "x.x.x.x",
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-soho-network-t1-f2",
            label: "What is the correct DHCP pool start address according to the requirements document?",
            options: [
              "192.168.1.1",
              "192.168.1.10",
              "192.168.1.20",
              "192.168.1.100",
              "192.168.1.2",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-soho-network-t1-f3",
            label: "The subnet mask for a /24 network is:",
            options: [
              "255.255.0.0",
              "255.255.255.0",
              "255.255.255.128",
              "255.255.255.192",
              "255.0.0.0",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-soho-network-t1-f4",
            label: "Which address class and type does 192.168.1.0/24 belong to?",
            options: [
              "Class A — public routable",
              "Class B — private (RFC 1918)",
              "Class C — private (RFC 1918)",
              "Class C — public routable",
              "APIPA — link-local",
            ],
            correctIndex: 2,
          },
        ],
        explanation:
          "192.168.1.0/24 is a Class C private address space defined in RFC 1918. The /24 prefix maps to a subnet mask of 255.255.255.0, providing 254 usable host addresses (.1–.254). The DHCP pool must begin at .20 as .1–.19 are reserved for static assignments. The default gateway pushed to DHCP clients is the router's LAN IP: 192.168.1.1.",
      },

      /* ── Task 2 ── */
      {
        id: "aplus-core1-sim-soho-network-t2",
        title: "Task 2 — Wireless Network Configuration",
        instructions:
          "Configure the SOHO router's wireless radio. The office requires a dual-band access point. Apply security settings that meet current best-practice standards for a small business.",
        fields: [
          {
            type: "text",
            id: "aplus-core1-sim-soho-network-t2-f1",
            label: "Enter the SSID (network name) that will be broadcast for the office wireless network. Use the format: OfficeNet-[YourInitials] — for this exam enter exactly: OfficeNet-HQ",
            acceptedValues: ["OfficeNet-HQ", "officenet-hq", "OFFICENET-HQ"],
            placeholder: "Enter SSID",
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-soho-network-t2-f2",
            label: "Which wireless security protocol should be selected for a new SOHO deployment in 2024?",
            options: [
              "WEP (Wired Equivalent Privacy)",
              "WPA (Wi-Fi Protected Access — TKIP)",
              "WPA2-Personal (AES-CCMP)",
              "WPA3-Personal (SAE)",
              "Open / No encryption",
            ],
            correctIndex: 3,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-soho-network-t2-f3",
            label: "Which 802.11 standard provides the best throughput on the 5 GHz band for this office?",
            options: [
              "802.11b (Wi-Fi 1)",
              "802.11g (Wi-Fi 3)",
              "802.11n (Wi-Fi 4)",
              "802.11ac (Wi-Fi 5)",
              "802.11a",
            ],
            correctIndex: 3,
          },
          {
            type: "select-many",
            id: "aplus-core1-sim-soho-network-t2-f4",
            label: "Select ALL wireless security best practices that should be applied to this SOHO router. (Select all that apply)",
            options: [
              "Change the default admin username and password on the router",
              "Disable WPS (Wi-Fi Protected Setup) on the router",
              "Enable SSID broadcast so users can find the network",
              "Use a strong passphrase of at least 12 characters for the wireless password",
              "Enable remote management over the WAN interface for convenience",
              "Keep the router firmware updated",
              "Segment the guest network from the office LAN using VLAN or separate SSID",
            ],
            correctIndices: [0, 1, 3, 5, 6],
          },
        ],
        explanation:
          "WPA3-Personal (SAE) is the current best-practice wireless security standard, replacing WPA2. 802.11ac (Wi-Fi 5) delivers the highest throughput on the 5 GHz band across commonly available hardware. SSID broadcast is left enabled for usability; hiding the SSID provides no real security benefit. WPS must be disabled as it is vulnerable to brute-force PIN attacks. Remote WAN management should never be enabled on a SOHO router as it exposes the admin interface to the internet.",
      },

      /* ── Task 3 ── */
      {
        id: "aplus-core1-sim-soho-network-t3",
        title: "Task 3 — Port Forwarding & Connectivity Verification",
        instructions:
          "The office manager needs to access the Windows server (192.168.1.10) via Remote Desktop from home. Configure the correct port forwarding rule on the router, then answer the connectivity verification questions.",
        evidence: [
          {
            label: "Current Port Forwarding Table (before your change)",
            content: [
              "Rule  Protocol  Ext. Port  Int. IP        Int. Port  Enabled",
              "----  --------  ---------  -------------  ---------  -------",
              "1     TCP       80         192.168.1.10   80         Yes     (HTTP server)",
              "2     TCP       443        192.168.1.10   443        Yes     (HTTPS server)",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "aplus-core1-sim-soho-network-t3-f1",
            label: "Which external port must be forwarded to enable Remote Desktop Protocol (RDP) access to the server?",
            options: [
              "Port 22 (SSH)",
              "Port 80 (HTTP)",
              "Port 443 (HTTPS)",
              "Port 3389 (RDP)",
              "Port 8080 (HTTP alternate)",
            ],
            correctIndex: 3,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-soho-network-t3-f2",
            label: "The office manager will use the public WAN IP to connect via RDP from home. What is the public IP address they must connect to?",
            options: [
              "192.168.1.1",
              "192.168.1.10",
              "10.0.0.1",
              "203.0.113.45",
              "172.16.0.1",
            ],
            correctIndex: 3,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-soho-network-t3-f3",
            label: "After adding the port forwarding rule, the manager still cannot connect. A ping to 203.0.113.45 succeeds. What is the MOST likely cause?",
            options: [
              "The server's NIC is faulty and needs replacement",
              "Windows Firewall on the server is blocking inbound RDP (TCP 3389)",
              "The router's DHCP server is handing out incorrect DNS addresses",
              "The cable modem needs to be rebooted",
              "The manager's home ISP is blocking all outbound traffic",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "RDP uses TCP port 3389. Port forwarding maps the router's public WAN IP (203.0.113.45) port 3389 to the internal server at 192.168.1.10:3389. Public RFC 5737 documentation addresses (203.0.113.0/24) are used here as the example WAN IP. If the router rule is correct but RDP still fails, the next layer to check is the Windows Firewall on the server itself — it must have an inbound rule permitting TCP 3389.",
      },
    ],
    explanation:
      "SOHO network setup covers DHCP configuration, wireless security, and NAT port forwarding — all high-frequency A+ Core 1 topics. Key memorisation points: 192.168.x.x = RFC 1918 Class C private; /24 = 255.255.255.0; RDP = TCP 3389; WPA3 replaces WPA2 as best practice; WPS must be disabled; remote WAN management must be disabled. Port forwarding translates an external public IP:port to an internal private IP:port through NAT.",
  },

  /* ================================================================ */
  /*  3. Printer Configuration & Troubleshooting                      */
  /* ================================================================ */
  {
    type: "simulation",
    id: "aplus-core1-sim-printer",
    title: "Printer Configuration & Troubleshooting",
    briefing:
      "A new HP LaserJet MFP has been installed in the office. It has been connected to the network switch and assigned the static IP address 192.168.1.50 via the printer's control panel. You must add it as a network printer on a Windows 11 workstation and then diagnose print quality issues reported by users.",
    domain_number: "3.0",
    domain_title: "Hardware",
    estimatedMinutes: 8,
    tasks: [
      /* ── Task 1 ── */
      {
        id: "aplus-core1-sim-printer-t1",
        title: "Task 1 — Network Printer Setup",
        instructions:
          "Add the network printer to the Windows 11 workstation. Use the correct port type, IP address, and driver selection to ensure the printer operates correctly.",
        evidence: [
          {
            label: "Printer Network Configuration Page (printed from control panel)",
            content: [
              "Model       : HP LaserJet MFP M428fdw",
              "IP Address  : 192.168.1.50",
              "Subnet Mask : 255.255.255.0",
              "Gateway     : 192.168.1.1",
              "MAC Address : A4:5D:36:1F:22:BB",
              "Protocols   : TCP/IP (LPD/RAW), IPP, AirPrint, WSD",
              "Port 9100   : Enabled (RAW printing)",
              "Port 631    : Enabled (IPP)",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "aplus-core1-sim-printer-t1-f1",
            label: "When manually adding a network printer in Windows using 'Add a printer by IP address or hostname', which port type should be selected for direct IP printing via port 9100?",
            options: [
              "Standard TCP/IP Port (RAW or LPR)",
              "WSD (Web Services for Devices) port",
              "USB virtual port",
              "IPP (Internet Printing Protocol) port only",
              "Bluetooth pairing port",
            ],
            correctIndex: 0,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-printer-t1-f2",
            label: "Which driver type should be installed for full feature access (scanning, fax, toner levels) on this HP MFP?",
            options: [
              "Generic / Text Only driver",
              "Microsoft IPP Class Driver (inbox)",
              "PCL6 or PS manufacturer driver downloaded from HP's website",
              "USB composite device driver",
              "WSD auto-detected driver only",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-printer-t1-f3",
            label: "A colleague with a MacBook needs to print to the same printer without installing a driver manually. Which protocol enables driverless printing on macOS?",
            options: [
              "LPD (Line Printer Daemon) over port 515",
              "SMB (Server Message Block) shared printer",
              "AirPrint over IPP/IPPS",
              "RAW printing over port 9100",
              "Bluetooth Personal Area Network (PAN)",
            ],
            correctIndex: 2,
          },
        ],
        explanation:
          "For Windows network printer setup, a Standard TCP/IP Port (RAW, port 9100) provides the most reliable direct-IP connection and is the standard method on the A+ exam. A manufacturer PCL6 or PostScript driver is needed for full MFP feature access; inbox Microsoft drivers provide basic printing only. AirPrint uses IPP/IPPS over port 631 and requires no additional driver installation on Apple devices — it is the correct choice for macOS and iOS clients.",
      },

      /* ── Task 2 ── */
      {
        id: "aplus-core1-sim-printer-t2",
        title: "Task 2 — Print Quality Troubleshooting",
        instructions:
          "Users have reported three different print quality issues. Review the symptom descriptions and match each symptom to its most likely defective laser printer component.",
        evidence: [
          {
            label: "Print Quality Complaint Log",
            content: [
              "Issue #1 — User: J. Martinez",
              "  Symptom: Light, faded text and images across the entire page. Increasing print",
              "  density in settings gives slight improvement but does not fully resolve the issue.",
              "",
              "Issue #2 — User: P. Singh",
              "  Symptom: Vertical black streaks running the full length of every page.",
              "  Appears on all documents regardless of content. More prominent at page edges.",
              "",
              "Issue #3 — User: T. Okafor",
              "  Symptom: A ghost image of the previous page appears faintly offset on the",
              "  current page (ghosting). The ghost appears approximately 94 mm below the",
              "  original image, which matches the drum circumference.",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "aplus-core1-sim-printer-t2-f1",
            label: "Issue #1 — Faded, light print across the entire page is MOST likely caused by:",
            options: [
              "Fuser assembly — insufficient heat to bond toner to paper",
              "Toner cartridge — low toner level or faulty toner cartridge",
              "Transfer roller — not applying sufficient charge to attract toner to paper",
              "Imaging drum — scratched drum surface causing uneven exposure",
              "Primary charge roller — overcharging the drum surface",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-printer-t2-f2",
            label: "Issue #2 — Consistent vertical black streaks the full length of every page are MOST likely caused by:",
            options: [
              "Fuser assembly — fuser roller is cracked or damaged",
              "Toner cartridge — toner is leaking from a crack in the cartridge",
              "Transfer belt — belt is misaligned",
              "Imaging drum — drum is scratched or damaged, causing toner to adhere in that line",
              "Paper — damp or low-quality media creating a static charge",
            ],
            correctIndex: 3,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-printer-t2-f3",
            label: "Issue #3 — Ghosting (faint repeat image offset by the drum circumference) is MOST likely caused by:",
            options: [
              "Toner cartridge — toner not adhering properly due to low charge",
              "Fuser assembly — fuser is not reaching operating temperature",
              "Imaging drum — drum is not cleaning properly and retaining residual toner",
              "Paper feed rollers — double-feeding sheets",
              "High-voltage power supply — providing inconsistent voltage to the corona wire",
            ],
            correctIndex: 2,
          },
        ],
        explanation:
          "Laser printer print quality symptoms map to specific components: faded/light print indicates low toner or a weak toner cartridge. Vertical black streaks along the full page length indicate a scratched or damaged imaging drum — a groove in the drum surface prevents that line from being properly discharged, so toner continuously adheres. Ghosting with an offset equal to the drum circumference is the definitive symptom of drum cleaning failure — the cleaning blade is not removing all residual toner from the drum after each rotation, and that residual toner transfers onto the next page.",
      },
    ],
    explanation:
      "Printer configuration and troubleshooting are explicitly tested on A+ Core 1. The three core print quality defects — faded output (toner), vertical streaks (drum), and ghosting (drum cleaning/fuser) — are classic exam questions. For network printing, Standard TCP/IP (RAW/port 9100) is the Windows method; AirPrint/IPP is the macOS/iOS driverless method. Always install manufacturer drivers for MFP functionality beyond basic printing.",
  },

  /* ================================================================ */
  /*  4. Laptop Display Troubleshooting                               */
  /* ================================================================ */
  {
    type: "simulation",
    id: "aplus-core1-sim-laptop-display",
    title: "Laptop Display Troubleshooting",
    briefing:
      "A user reports that their laptop screen is very dim and barely visible. They can see content on the screen if they hold a torch close to it. The laptop is a 15-inch model running Windows 11. When connected to an external HDMI monitor, the external display works perfectly at full brightness.",
    domain_number: "5.0",
    domain_title: "Hardware and Network Troubleshooting",
    estimatedMinutes: 8,
    tasks: [
      /* ── Task 1 ── */
      {
        id: "aplus-core1-sim-laptop-display-t1",
        title: "Task 1 — Diagnose the Display Issue",
        instructions:
          "Review the technician's test results and the symptom description to identify the most likely cause of the dim display. Answer the diagnostic questions.",
        evidence: [
          {
            label: "Technician Diagnostic Test Results",
            content: [
              "Test 1: Brightness keys (Fn+F5/F6) — No change to screen brightness.",
              "Test 2: Windows Display Settings slider — No change to screen brightness.",
              "Test 3: HDMI external monitor — Full image, full brightness, no issues.",
              "Test 4: Torch close to screen — Content is visible; LCD panel itself is functioning.",
              "Test 5: LCD built-in test (Fn+D at boot) — Screen shows test pattern, extremely dim.",
              "Test 6: Opened lid sensor — Screen brightens very slightly when lid sensor bypassed.",
              "Test 7: GPU stress test on external monitor — No artefacts, GPU functioning correctly.",
              "Battery charge: 78%. AC adapter connected.",
              "OS: Windows 11 22H2. Display drivers up to date.",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "aplus-core1-sim-laptop-display-t1-f1",
            label: "The fact that content is visible by torch light but not visible under normal conditions indicates which component is faulty?",
            options: [
              "LCD panel — the liquid crystal matrix has failed",
              "GPU — the video processor is not sending a signal to the internal panel",
              "Display backlight (CCFL lamp or LED backlight array)",
              "Motherboard — the LVDS or eDP display connector has failed",
              "Screen digitiser — the touch sensor is interfering with the display signal",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-laptop-display-t1-f2",
            label: "The external HDMI monitor works correctly. What does this confirm about the GPU?",
            options: [
              "The GPU is faulty — external monitors use a separate chip",
              "The GPU is functioning correctly — the fault is isolated to the internal display path",
              "The GPU driver is corrupt and must be reinstalled",
              "The GPU is overheating and throttling to the internal display only",
              "The GPU VBIOS needs to be updated to support the internal panel",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "aplus-core1-sim-laptop-display-t1-f3",
            label: "On older CCFL-backlit laptops, a separate component converts DC voltage from the motherboard to the high-frequency AC voltage required by the CCFL lamp. What is this component called?",
            options: [
              "GPU voltage regulator module (VRM)",
              "LCD inverter board",
              "LVDS cable",
              "Panel driver IC",
              "PWM controller",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "If content is visible by torch light, the LCD panel itself is producing an image — the backlight has failed, not the LCD matrix. Because the external monitor works, the GPU and its drivers are confirmed functional; the fault is in the internal display backlight circuit. On CCFL-backlit laptops, the inverter board converts low-voltage DC to the high-voltage AC required by the CCFL tube — a failed inverter is the most common cause of dim or dark laptop screens on older hardware. On modern laptops, the LED backlight driver circuit on the motherboard or the LED strip itself is the equivalent failure point.",
      },

      /* ── Task 2 ── */
      {
        id: "aplus-core1-sim-laptop-display-t2",
        title: "Task 2 — Identify Component & Plan Repair",
        instructions:
          "Identify which specific component requires replacement and select all of the correct steps for completing the repair safely.",
        fields: [
          {
            type: "dropdown",
            id: "aplus-core1-sim-laptop-display-t2-f1",
            label: "The laptop model uses an LED backlight (no CCFL). Which component is MOST likely the cause of the LED backlight failure?",
            options: [
              "LCD panel — the entire display assembly must be replaced",
              "GPU — the backlight PWM output from the GPU has failed",
              "LED backlight driver circuit (on motherboard) or the LED strip within the display",
              "CMOS battery — low voltage is causing the backlight to dim",
              "RAM — insufficient memory is causing display degradation",
            ],
            correctIndex: 2,
          },
          {
            type: "select-many",
            id: "aplus-core1-sim-laptop-display-t2-f2",
            label: "Select ALL steps that are correct when replacing a laptop display assembly. (Select all that apply)",
            options: [
              "Power off the laptop and remove the battery before beginning disassembly",
              "Disconnect AC power and use an anti-static wrist strap or touch a grounded metal surface",
              "Document screw locations and sizes using a screw mat or labelled tape",
              "Use a plastic spudger to open the display bezel — avoid metal tools that can scratch",
              "Discharge the laptop by holding the power button for 10 seconds after removing the battery",
              "Use WD-40 to lubricate the hinge screws if they are stiff",
              "Reconnect and test the new display before fully reassembling the bezel",
            ],
            correctIndices: [0, 1, 2, 3, 4, 6],
          },
          {
            type: "zone-placement",
            id: "aplus-core1-sim-laptop-display-t2-f3",
            label: "Place each display-related component into the correct category based on its location in the laptop.",
            items: [
              "LCD panel (IPS/TN screen)",
              "LED backlight strip",
              "eDP (Embedded DisplayPort) cable",
              "GPU display controller",
              "Webcam module",
              "LCD inverter board (CCFL laptops)",
              "Backlight driver IC",
            ],
            zones: ["Display Lid Assembly", "Motherboard / Main Board"],
            correctZones: [0, 0, 0, 1, 0, 0, 1],
          },
        ],
        explanation:
          "On LED-backlit laptops, backlight failure is caused by either the LED strip within the display lid or the backlight driver IC on the motherboard (which controls LED current and PWM dimming). Safe laptop disassembly always requires powering off, removing the battery, disconnecting AC, and using ESD protection. A plastic spudger prevents cosmetic damage. WD-40 must never be used on laptop components — it is not a precision lubricant and damages plastics. Testing before reassembly saves significant rework time. The eDP cable, webcam, LCD panel, LED strips, and inverter board (on CCFL models) are all located in the display lid assembly; the GPU and backlight driver IC are on the motherboard.",
      },
    ],
    explanation:
      "Laptop display troubleshooting is a dedicated A+ Core 1 competency. The key diagnostic insight is: image visible by torch = backlight failure, not LCD failure. Working external monitor = GPU is functional. The repair path then depends on whether the laptop uses CCFL (inverter board) or LED (driver IC or LED strip) backlighting. Safe disassembly ESD practices — battery removal, grounding, plastic tools — are tested alongside the hardware diagnosis.",
  },
];
