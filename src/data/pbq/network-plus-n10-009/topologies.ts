import type { TopologyScenario } from "../types";

export const networkPlusTopologies: TopologyScenario[] = [
  /* ================================================================ */
  /*  1. VLAN Configuration & Trunk Setup                              */
  /* ================================================================ */
  {
    type: "topology",
    id: "np-topo-vlan-trunk",
    title: "VLAN Configuration & Inter-Switch Trunking",
    briefing:
      "Brightline Manufacturing has expanded their office with a new access switch (SW-Access2). Hosts connected to SW-Access2 cannot communicate with hosts on the same VLAN connected to SW-Access1. The network engineer suspects a trunking or VLAN misconfiguration between the switches. Review the topology, identify the misconfigured devices, and fix the VLAN/trunk setup. Engineering is on VLAN 100 (10.10.100.0/24), Sales is on VLAN 200 (10.10.200.0/24), and Management is on VLAN 300 (10.10.30.0/24). Do not modify devices that are already correctly configured.",
    domain_number: "2.0",
    domain_title: "Network Implementation",
    diagramTitle: "Brightline Manufacturing — LAN Topology",
    estimatedMinutes: 12,
    devices: [
      {
        id: "router-core",
        type: "router",
        label: "R-Core",
        position: { x: 50, y: 10 },
        preConfigured: true,
        fields: [],
        explanation:
          "The core router is correctly configured with sub-interfaces for inter-VLAN routing on all three VLANs.",
      },
      {
        id: "sw-dist",
        type: "switch",
        label: "SW-Dist",
        position: { x: 50, y: 32 },
        preConfigured: true,
        currentConfig:
          "interface Gi0/1\n description Uplink to R-Core\n switchport mode trunk\n switchport trunk allowed vlan 100,200,300\n!\ninterface Gi0/2\n switchport mode trunk\n!\ninterface Gi0/3\n switchport mode trunk",
        fields: [],
        explanation:
          "The distribution switch trunk to the core router is correctly configured as a trunk port allowing all VLANs.",
      },
      {
        id: "sw-access1",
        type: "switch",
        label: "SW-Access1",
        position: { x: 25, y: 55 },
        preConfigured: true,
        fields: [],
        explanation:
          "SW-Access1 is correctly configured with proper VLAN assignments and an active trunk link to the distribution switch.",
      },
      {
        id: "sw-access2",
        type: "switch",
        label: "SW-Access2",
        position: { x: 75, y: 55 },
        preConfigured: false,
        currentConfig:
          "interface Gi0/1\n description Uplink to SW-Dist\n switchport mode access\n switchport access vlan 1\n!\ninterface Fa0/1\n switchport mode access\n switchport access vlan 1\n!\ninterface Fa0/2\n switchport mode access\n switchport access vlan 200\n!\nvlan 200\n name Sales",
        fields: [
          {
            type: "cli",
            id: "sw-access2-trunk",
            label:
              "Configure the uplink port (Gi0/1) as a trunk and allow the required VLANs",
            prompt: "SW-Access2(config)#",
            acceptedSequences: [
              [
                "interface gi0/1",
                "switchport mode trunk",
                "switchport trunk allowed vlan 100,200,300",
              ],
              [
                "interface gi0/1",
                "switchport mode trunk",
                "switchport trunk allowed vlan all",
              ],
              [
                "interface gigabitethernet0/1",
                "switchport mode trunk",
                "switchport trunk allowed vlan 100,200,300",
              ],
            ],
            hint: "The uplink is set to access mode on VLAN 1 instead of trunk mode. Configure it as a trunk allowing VLANs 100, 200, and 300.",
          },
          {
            type: "cli",
            id: "sw-access2-vlan-create",
            label:
              "Create the missing VLANs and assign Fa0/1 to the Engineering VLAN",
            prompt: "SW-Access2(config)#",
            acceptedSequences: [
              [
                "vlan 100",
                "name Engineering",
                "vlan 300",
                "name Management",
                "interface fa0/1",
                "switchport access vlan 100",
              ],
              [
                "vlan 100",
                "name engineering",
                "vlan 300",
                "name management",
                "interface fa0/1",
                "switchport access vlan 100",
              ],
            ],
            hint: "VLANs 100 (Engineering) and 300 (Management) don't exist on this switch. Create them and assign Fa0/1 to VLAN 100.",
          },
        ],
        explanation:
          "SW-Access2 had three issues: (1) the uplink to the distribution switch was set to access mode instead of trunk mode, (2) VLANs 100 and 300 were not created on the switch, and (3) Fa0/1 was on the default VLAN 1 instead of VLAN 100 (Engineering).",
      },
      {
        id: "pc-eng1",
        type: "pc",
        label: "PC-Eng1",
        position: { x: 12, y: 82 },
        preConfigured: true,
        fields: [],
        explanation:
          "Engineering workstation on SW-Access1 is correctly assigned to VLAN 100.",
      },
      {
        id: "pc-eng2",
        type: "pc",
        label: "PC-Eng2",
        position: { x: 62, y: 82 },
        preConfigured: true,
        fields: [],
        explanation:
          "Engineering workstation on SW-Access2 — once the switch is fixed, this PC will reach VLAN 100.",
      },
      {
        id: "pc-sales",
        type: "pc",
        label: "PC-Sales",
        position: { x: 88, y: 82 },
        preConfigured: true,
        fields: [],
        explanation:
          "Sales workstation is correctly assigned to VLAN 200 on SW-Access2.",
      },
    ],
    connections: [
      { from: "router-core", to: "sw-dist", label: "Gi0/1 (trunk)" },
      { from: "sw-dist", to: "sw-access1", label: "Gi0/2 (trunk)" },
      { from: "sw-dist", to: "sw-access2", label: "Gi0/3 (trunk)" },
      { from: "sw-access1", to: "pc-eng1", label: "Fa0/1 (VLAN 100)" },
      { from: "sw-access2", to: "pc-eng2", label: "Fa0/1" },
      { from: "sw-access2", to: "pc-sales", label: "Fa0/2 (VLAN 200)" },
    ],
    explanation:
      "When adding a new access switch, you must configure the uplink as a trunk port, create all required VLANs on the local switch, and assign access ports to the correct VLANs. The distribution switch and existing access switch were already correct — the only issues were on the new SW-Access2.",
  },

  /* ================================================================ */
  /*  2. IP Addressing & Default Gateway Troubleshooting               */
  /* ================================================================ */
  {
    type: "topology",
    id: "np-topo-ip-addressing",
    title: "IP Addressing & Connectivity Troubleshooting",
    briefing:
      "Crestview Media's new branch office has intermittent connectivity issues. Some workstations cannot reach the internet while others work fine. The ISP has assigned the WAN block 203.0.113.0/30 and the branch uses 10.20.1.0/24 internally. Review each device's IP configuration, identify the errors, and fix only the misconfigured devices.",
    domain_number: "1.0",
    domain_title: "Networking Fundamentals",
    diagramTitle: "Crestview Media — Branch Office",
    estimatedMinutes: 10,
    devices: [
      {
        id: "isp-cloud",
        type: "cloud",
        label: "ISP",
        position: { x: 50, y: 8 },
        preConfigured: true,
        currentConfig:
          "ISP Gateway: 203.0.113.1\nSubnet: 203.0.113.0/30\nCustomer-assigned WAN IP: 203.0.113.2",
        fields: [],
        explanation:
          "ISP connection is correctly configured with 203.0.113.1/30 as the gateway.",
      },
      {
        id: "branch-router",
        type: "router",
        label: "R-Branch",
        position: { x: 50, y: 28 },
        preConfigured: false,
        currentConfig:
          "interface Gi0/0 (WAN)\n ip address 203.0.113.2 255.255.255.252\n!\ninterface Gi0/1 (LAN)\n ip address 10.20.1.1 255.255.255.0\n!\nip route 0.0.0.0 0.0.0.0 203.0.113.3",
        fields: [
          {
            type: "text",
            id: "router-default-gw",
            label: "Default route next-hop (currently set to 203.0.113.3 — correct it if wrong)",
            acceptedValues: ["203.0.113.1"],
            placeholder: "Enter the correct next-hop IP",
          },
        ],
        explanation:
          "The branch router had an incorrect default route pointing to 203.0.113.3, which doesn't exist in the /30 WAN subnet (203.0.113.0/30 has usable IPs .1 and .2 only). The correct ISP gateway is 203.0.113.1.",
      },
      {
        id: "branch-switch",
        type: "switch",
        label: "SW-Branch",
        position: { x: 50, y: 52 },
        preConfigured: true,
        fields: [],
        explanation:
          "The branch switch is a Layer 2 switch correctly forwarding traffic. No IP configuration needed.",
      },
      {
        id: "pc-office1",
        type: "pc",
        label: "PC-Office1",
        position: { x: 18, y: 78 },
        preConfigured: true,
        currentConfig:
          "IP Address: 10.20.1.10\nSubnet Mask: 255.255.255.0\nDefault Gateway: 10.20.1.1",
        fields: [],
        explanation:
          "PC-Office1 is correctly configured with IP 10.20.1.10, mask 255.255.255.0, and gateway 10.20.1.1.",
      },
      {
        id: "pc-office2",
        type: "pc",
        label: "PC-Office2",
        position: { x: 50, y: 78 },
        preConfigured: false,
        currentConfig:
          "IP Address: 10.20.1.20\nSubnet Mask: 255.255.255.0\nDefault Gateway: 10.20.1.2",
        fields: [
          {
            type: "text",
            id: "pc2-gw-fix",
            label: "Correct the default gateway (currently 10.20.1.2)",
            acceptedValues: ["10.20.1.1"],
            placeholder: "Enter the correct gateway IP",
          },
        ],
        explanation:
          "PC-Office2 had its default gateway set to 10.20.1.2 instead of the router's LAN interface at 10.20.1.1.",
      },
      {
        id: "pc-office3",
        type: "pc",
        label: "PC-Office3",
        position: { x: 82, y: 78 },
        preConfigured: false,
        currentConfig:
          "IP Address: 10.20.2.30\nSubnet Mask: 255.255.255.0\nDefault Gateway: 10.20.1.1",
        fields: [
          {
            type: "text",
            id: "pc3-ip-fix",
            label: "Correct the IP address (currently 10.20.2.30)",
            acceptedValues: ["10.20.1.30"],
            placeholder: "Enter the correct IP address",
          },
        ],
        explanation:
          "PC-Office3 had an IP address on the wrong subnet (10.20.2.30 instead of 10.20.1.30). The office subnet is 10.20.1.0/24.",
      },
    ],
    connections: [
      { from: "isp-cloud", to: "branch-router", label: "WAN (203.0.113.0/30)" },
      { from: "branch-router", to: "branch-switch", label: "Gi0/1 (LAN)" },
      { from: "branch-switch", to: "pc-office1", label: "Fa0/1" },
      { from: "branch-switch", to: "pc-office2", label: "Fa0/2" },
      { from: "branch-switch", to: "pc-office3", label: "Fa0/3" },
    ],
    explanation:
      "IP connectivity troubleshooting requires verifying three things on every device: correct IP address (right subnet), correct subnet mask, and correct default gateway. The router had a wrong default route next-hop, PC-Office2 had a wrong gateway, and PC-Office3 had an IP on the wrong subnet. PC-Office1 and the switch were correctly configured.",
  },

  /* ================================================================ */
  /*  3. Wireless AP & Channel Troubleshooting                         */
  /* ================================================================ */
  {
    type: "topology",
    id: "np-topo-wireless-channels",
    title: "Wireless Channel & AP Configuration",
    briefing:
      "Summit Events is setting up Wi-Fi for a conference center. Attendees are reporting slow speeds and frequent disconnections in the main hall. A site survey shows severe co-channel interference between APs. The three APs in the main hall area must use non-overlapping 2.4 GHz channels (1, 6, 11) and appropriate power levels. The controller and uplink switch are already configured. Identify which APs need channel changes and fix them.",
    domain_number: "2.0",
    domain_title: "Network Implementation",
    diagramTitle: "Summit Events — Conference Center Wireless",
    estimatedMinutes: 8,
    devices: [
      {
        id: "wlc-summit",
        type: "server",
        label: "WLC",
        position: { x: 50, y: 10 },
        preConfigured: true,
        fields: [],
        explanation:
          "The wireless LAN controller is correctly configured and managing all APs.",
      },
      {
        id: "sw-poe",
        type: "switch",
        label: "SW-PoE",
        position: { x: 50, y: 32 },
        preConfigured: true,
        fields: [],
        explanation:
          "The PoE switch is correctly powering and connecting all APs.",
      },
      {
        id: "ap-hall-left",
        type: "access-point",
        label: "AP-Hall-L",
        position: { x: 18, y: 60 },
        preConfigured: true,
        currentConfig:
          "Radio: 2.4 GHz\nChannel: 1\nTx Power: Medium\nSSID: Summit-Event\nBand Steering: Disabled",
        fields: [],
        explanation:
          "AP-Hall-L is correctly set to Channel 1, a non-overlapping 2.4 GHz channel.",
      },
      {
        id: "ap-hall-center",
        type: "access-point",
        label: "AP-Hall-C",
        position: { x: 50, y: 60 },
        preConfigured: false,
        currentConfig:
          "Radio: 2.4 GHz\nChannel: 1\nTx Power: High\nSSID: Summit-Event\nBand Steering: Disabled",
        fields: [
          {
            type: "dropdown",
            id: "ap-c-channel",
            label: "2.4 GHz Channel (currently Channel 1 — same as AP-Hall-L)",
            options: ["Channel 1", "Channel 3", "Channel 6", "Channel 9", "Channel 11"],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "ap-c-power",
            label: "Transmit Power",
            options: ["Low", "Medium", "High"],
            correctIndex: 1,
          },
        ],
        explanation:
          "AP-Hall-C was on Channel 1, causing co-channel interference with AP-Hall-L. It should use Channel 6 (the middle non-overlapping channel). Power should be Medium to reduce overlap with adjacent APs in the hall.",
      },
      {
        id: "ap-hall-right",
        type: "access-point",
        label: "AP-Hall-R",
        position: { x: 82, y: 60 },
        preConfigured: false,
        currentConfig:
          "Radio: 2.4 GHz\nChannel: 3\nTx Power: High\nSSID: Summit-Event\nBand Steering: Disabled",
        fields: [
          {
            type: "dropdown",
            id: "ap-r-channel",
            label: "2.4 GHz Channel (currently Channel 3 — overlapping channel)",
            options: ["Channel 1", "Channel 3", "Channel 6", "Channel 9", "Channel 11"],
            correctIndex: 4,
          },
          {
            type: "dropdown",
            id: "ap-r-power",
            label: "Transmit Power",
            options: ["Low", "Medium", "High"],
            correctIndex: 1,
          },
        ],
        explanation:
          "AP-Hall-R was on Channel 3, which overlaps with both Channel 1 and Channel 6. It should use Channel 11 (the third non-overlapping channel). Power should be Medium to match the hall coverage plan.",
      },
    ],
    connections: [
      { from: "wlc-summit", to: "sw-poe", label: "Mgmt" },
      { from: "sw-poe", to: "ap-hall-left", label: "PoE" },
      { from: "sw-poe", to: "ap-hall-center", label: "PoE" },
      { from: "sw-poe", to: "ap-hall-right", label: "PoE" },
    ],
    explanation:
      "In 2.4 GHz Wi-Fi, only channels 1, 6, and 11 are non-overlapping. Using any other channels (like 3 or 9) creates co-channel interference with adjacent APs. When multiple APs cover the same area, each should be on a different non-overlapping channel with appropriate power levels to minimize cell overlap. AP-Hall-L was already correct on Channel 1; AP-Hall-C needed Channel 6 and AP-Hall-R needed Channel 11.",
  },
];
