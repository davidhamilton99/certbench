import type { ReferenceTable } from "../types";

export const osiModel: ReferenceTable = {
  id: "osi-model",
  title: "OSI Model",
  description: "The 7-layer OSI model with protocols, devices, and security controls at each layer.",
  columnHeaders: [
    { key: "layer", label: "Layer", mono: true },
    { key: "name", label: "Name" },
    { key: "function", label: "Function" },
    { key: "protocols", label: "Protocols / Standards" },
    { key: "devices", label: "Devices" },
    { key: "attacks", label: "Attacks at This Layer" },
  ],
  entries: [
    { columns: { layer: "7", name: "Application", function: "End-user services, APIs, and application data", protocols: "HTTP, HTTPS, FTP, SMTP, DNS, SNMP, SSH, LDAP", devices: "Firewall (L7), WAF, proxy", attacks: "XSS, SQL injection, phishing, buffer overflow" } },
    { columns: { layer: "6", name: "Presentation", function: "Data translation, encryption, compression", protocols: "TLS/SSL, JPEG, ASCII, MPEG", devices: "—", attacks: "SSL stripping, certificate spoofing" } },
    { columns: { layer: "5", name: "Session", function: "Session establishment, maintenance, teardown", protocols: "NetBIOS, RPC, PPTP, L2TP", devices: "—", attacks: "Session hijacking, replay attacks" } },
    { columns: { layer: "4", name: "Transport", function: "Reliable data transfer, segmentation, flow control", protocols: "TCP, UDP, TLS", devices: "Firewall (stateful)", attacks: "SYN flood, port scanning" } },
    { columns: { layer: "3", name: "Network", function: "Logical addressing, routing between networks", protocols: "IP, ICMP, IPSec, OSPF, BGP", devices: "Router, L3 switch", attacks: "IP spoofing, DDoS, routing attacks" } },
    { columns: { layer: "2", name: "Data Link", function: "MAC addressing, frame delivery on local network", protocols: "Ethernet, 802.11 (Wi-Fi), ARP, STP, PPP", devices: "Switch, bridge, WAP", attacks: "ARP spoofing, MAC flooding, VLAN hopping" } },
    { columns: { layer: "1", name: "Physical", function: "Bit transmission over physical media", protocols: "Ethernet (physical), DSL, USB, Bluetooth", devices: "Hub, repeater, cables, NIC", attacks: "Wiretapping, jamming, cable cutting" } },
  ],
};
