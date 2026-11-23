import type { ReferenceTable } from "../types";

export const osiModel: ReferenceTable = {
  id: "osi-model",
  title: "OSI model",
  description: "This table sets out the seven layers of the OSI model for the Network+ N10-009 exam with the function, the protocols, the devices and the troubleshooting focus of each layer.",
  columnHeaders: [
    { key: "layer", label: "Layer", mono: true },
    { key: "name", label: "Name" },
    { key: "function", label: "Function" },
    { key: "protocols", label: "Protocols / standards" },
    { key: "devices", label: "Devices" },
    { key: "troubleshooting", label: "Troubleshooting" },
  ],
  entries: [
    { columns: { layer: "7", name: "Application", function: "End-user network services and application APIs", protocols: "HTTP, HTTPS, FTP, SMTP, DNS, SNMP, SSH, LDAP, IMAP, POP3", devices: "Firewall (L7 / NGFW), proxy server, load balancer", troubleshooting: "Check app config, DNS resolution, verify service is running" } },
    { columns: { layer: "6", name: "Presentation", function: "Data formatting, encryption, compression, encoding", protocols: "TLS/SSL, JPEG, MPEG, ASCII, Unicode, XDR", devices: "None", troubleshooting: "Check certificate validity, encoding mismatches, codec issues" } },
    { columns: { layer: "5", name: "Session", function: "Session establishment, maintenance, and teardown", protocols: "NetBIOS, RPC, PPTP, L2TP, SIP (setup phase)", devices: "None", troubleshooting: "Check for session timeouts, authentication failures, NAT issues" } },
    { columns: { layer: "4", name: "Transport", function: "Reliable delivery, segmentation, flow control, port addressing", protocols: "TCP, UDP, TLS (transport layer)", devices: "Firewall (stateful), load balancer", troubleshooting: "netstat: check open ports and connections; verify firewall rules" } },
    { columns: { layer: "3", name: "Network", function: "Logical (IP) addressing and routing between networks", protocols: "IP (v4/v6), ICMP, OSPF, EIGRP, BGP, RIP, IPSec", devices: "Router, Layer 3 switch, multilayer switch", troubleshooting: "ping (ICMP echo), tracert/traceroute, route, show ip route" } },
    { columns: { layer: "2", name: "Data Link", function: "MAC addressing, frame delivery on local segment, error detection", protocols: "Ethernet (802.3), Wi-Fi (802.11), STP, ARP, PPP, VLAN (802.1Q)", devices: "Switch, bridge, wireless access point (WAP)", troubleshooting: "show mac address-table (check the switch's MAC table), arp -a (check a host's ARP cache), check duplex/speed" } },
    { columns: { layer: "1", name: "Physical", function: "Bit transmission over physical media: voltage, signaling, topology", protocols: "Ethernet (physical layer), DSL, RS-232, 802.11 (radio), Bluetooth", devices: "Hub, repeater, media converter, cables, NIC, transceiver", troubleshooting: "Check cable, link lights, show interface (err-disabled, CRC errors)" } },
  ],
};
