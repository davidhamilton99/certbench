import type { ReferenceTable } from "../types";

export const portsProtocols: ReferenceTable = {
  id: "ports-protocols",
  title: "Ports & Protocols",
  description: "The ports and protocols on the CompTIA A+ 220-1201 exam.",
  columnHeaders: [
    { key: "port", label: "Port", mono: true },
    { key: "protocol", label: "Protocol" },
    { key: "service", label: "Service / Use" },
    { key: "transport", label: "Transport" },
  ],
  entries: [
    { columns: { port: "20/21", protocol: "FTP", service: "File Transfer Protocol (data/control)", transport: "TCP" } },
    { columns: { port: "22", protocol: "SSH", service: "Secure Shell — encrypted remote access", transport: "TCP" } },
    { columns: { port: "23", protocol: "Telnet", service: "Unencrypted remote access (insecure, legacy)", transport: "TCP" } },
    { columns: { port: "25", protocol: "SMTP", service: "Simple Mail Transfer Protocol — outbound email", transport: "TCP" } },
    { columns: { port: "53", protocol: "DNS", service: "Domain Name System — hostname to IP resolution", transport: "TCP/UDP" } },
    { columns: { port: "67/68", protocol: "DHCP", service: "Dynamic Host Configuration Protocol (server/client)", transport: "UDP" } },
    { columns: { port: "80", protocol: "HTTP", service: "Hypertext Transfer Protocol — unencrypted web", transport: "TCP" } },
    { columns: { port: "110", protocol: "POP3", service: "Post Office Protocol v3 — retrieve/delete email", transport: "TCP" } },
    { columns: { port: "137-139", protocol: "NetBIOS/NetBT", service: "NetBIOS over TCP/IP — name, datagram and session services for legacy Windows networking", transport: "TCP/UDP" } },
    { columns: { port: "143", protocol: "IMAP", service: "Internet Message Access Protocol — sync email on server", transport: "TCP" } },
    { columns: { port: "389", protocol: "LDAP", service: "Lightweight Directory Access Protocol", transport: "TCP" } },
    { columns: { port: "443", protocol: "HTTPS", service: "HTTP Secure over TLS/SSL", transport: "TCP" } },
    { columns: { port: "445", protocol: "SMB", service: "Server Message Block (CIFS) — Windows file and printer sharing", transport: "TCP" } },
    { columns: { port: "3389", protocol: "RDP", service: "Remote Desktop Protocol — Windows remote GUI", transport: "TCP" } },
  ],
};
