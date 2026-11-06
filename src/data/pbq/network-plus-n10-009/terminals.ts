import type { TerminalScenario } from "../types";

/**
 * Terminal (interactive shell) PBQs for Network+ (N10-009). Domain 5.0 Network
 * Troubleshooting — working a connectivity problem at the command line is the
 * core exam skill and the core job. The host is synthetic; addresses are in the
 * RFC 1918 private ranges and times are illustrative.
 */
export const networkPlusTerminals: TerminalScenario[] = [
  {
    type: "terminal",
    id: "net-term-no-internet-ws14",
    title: "Workstation can't reach the internet",
    briefing:
      "Ticket NET-2208: the user on ws-14 says \"no internet\" but the machine is on and files load from the share. You have a shell on the box. Work the command line to find why it can't get out, then report your three findings. Start with cat readme.txt, or type help.",
    domain_number: "5.0",
    domain_title: "Network Troubleshooting",
    user: "tech",
    host: "ws-14",
    cwd: "/home/tech",
    dirs: {
      "/home/tech": { "readme.txt": "file" },
      "/etc": { network: "dir", "resolv.conf": "file", hostname: "file" },
      "/etc/network": { interfaces: "file" },
    },
    files: {
      "/home/tech/readme.txt": [
        { text: "NET-2208  ws-14: user reports no internet. Share drive still works.", tone: "muted" },
        { text: "You have a shell on the box. Find and report:", tone: "muted" },
        { text: "  1. the host's own network (CIDR)" },
        { text: "  2. the setting that is misconfigured" },
        { text: "  3. the gateway address the host should be using" },
        { text: "Good first looks: ip addr, ip route, ping 8.8.8.8, ping the gateway, nslookup, cat /etc/network/interfaces.", tone: "muted" },
      ],
      "/etc/network/interfaces": [
        { text: "auto eth0", tone: "muted" },
        { text: "iface eth0 inet static", tone: "muted" },
        { text: "    address 192.168.10.44", tone: "muted" },
        { text: "    netmask 255.255.255.0", tone: "muted" },
        { text: "    gateway 192.168.1.1", tone: "red" },
        { text: "    dns-nameservers 192.168.10.53", tone: "muted" },
      ],
      "/etc/resolv.conf": [
        { text: "nameserver 192.168.10.53", tone: "muted" },
        { text: "search corp.local", tone: "muted" },
      ],
      "/etc/hostname": [{ text: "ws-14" }],
    },
    commands: [
      {
        match: ["ip addr", "ip a", "ip address", "ifconfig", "ip addr show"],
        output: [
          { text: "1: lo: <LOOPBACK,UP> mtu 65536", tone: "muted" },
          { text: "    inet 127.0.0.1/8 scope host lo", tone: "muted" },
          { text: "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP", tone: "muted" },
          { text: "    link/ether 52:54:00:a1:7c:14 brd ff:ff:ff:ff:ff:ff", tone: "muted" },
          { text: "    inet 192.168.10.44/24 brd 192.168.10.255 scope global eth0", tone: "cyan" },
        ],
      },
      {
        match: ["ip route", "ip r", "route -n", "netstat -rn", "ip route show"],
        output: [
          { text: "default via 192.168.1.1 dev eth0", tone: "red" },
          { text: "192.168.10.0/24 dev eth0 proto kernel scope link src 192.168.10.44", tone: "muted" },
        ],
      },
      {
        match: ["ping 8.8.8.8", "ping -c4 8.8.8.8", "ping -c 4 8.8.8.8", "ping google", "ping 8.8.8.8 -c4"],
        output: [
          { text: "PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.", tone: "muted" },
          { text: "From 192.168.10.44 icmp_seq=1 Destination Host Unreachable", tone: "red" },
          { text: "From 192.168.10.44 icmp_seq=2 Destination Host Unreachable", tone: "red" },
          { text: "--- 8.8.8.8 ping statistics ---", tone: "muted" },
          { text: "4 packets transmitted, 0 received, +2 errors, 100% packet loss", tone: "red" },
        ],
      },
      {
        match: ["ping 192.168.1.1", "ping -c4 192.168.1.1", "ping -c 4 192.168.1.1", "ping gateway", "ping the gateway"],
        output: [
          { text: "PING 192.168.1.1 (192.168.1.1) 56(84) bytes of data.", tone: "muted" },
          { text: "From 192.168.10.44 icmp_seq=1 Destination Host Unreachable", tone: "red" },
          { text: "--- 192.168.1.1 ping statistics ---", tone: "muted" },
          { text: "3 packets transmitted, 0 received, 100% packet loss", tone: "red" },
        ],
      },
      {
        match: ["ping 192.168.10.1", "ping -c4 192.168.10.1", "ping -c 4 192.168.10.1"],
        output: [
          { text: "PING 192.168.10.1 (192.168.10.1) 56(84) bytes of data.", tone: "muted" },
          { text: "64 bytes from 192.168.10.1: icmp_seq=1 ttl=64 time=0.42 ms", tone: "green" },
          { text: "64 bytes from 192.168.10.1: icmp_seq=2 ttl=64 time=0.39 ms", tone: "green" },
          { text: "--- 192.168.10.1 ping statistics ---", tone: "muted" },
          { text: "3 packets transmitted, 3 received, 0% packet loss", tone: "green" },
        ],
      },
      {
        match: ["nslookup example.com", "dig example.com", "nslookup", "host example.com"],
        output: [
          { text: "Server:   192.168.10.53", tone: "muted" },
          { text: "Address:  192.168.10.53#53", tone: "muted" },
          { text: "", tone: "muted" },
          { text: "Non-authoritative answer:", tone: "muted" },
          { text: "Name:   example.com", tone: "green" },
          { text: "Address: 93.184.216.34", tone: "green" },
        ],
      },
    ],
    findings: [
      {
        id: "network",
        label: "Host's own network (CIDR)",
        placeholder: "e.g. 10.0.0.0/24",
        accept: ["192.168.10.0/24", "192.168.10.0 /24"],
        explanation:
          "ip addr shows the host at 192.168.10.44/24 and ip route confirms the on-link network 192.168.10.0/24 — a /24, so every address from 192.168.10.1 to .254 is local.",
      },
      {
        id: "setting",
        label: "Misconfigured setting",
        placeholder: "which setting is wrong",
        accept: ["default gateway", "gateway", "default route", "the default gateway", "defaultgateway"],
        explanation:
          "The default gateway is 192.168.1.1 — that address is on 192.168.1.0/24, not the host's 192.168.10.0/24, so the host can't even ARP it (ping to it is 'Destination Host Unreachable'). With no reachable gateway, anything off-subnet — like 8.8.8.8 — fails. The share works because it's on the local /24.",
      },
      {
        id: "gateway",
        label: "Gateway the host should use",
        placeholder: "gateway IP",
        accept: ["192.168.10.1"],
        explanation:
          "192.168.10.1 is on the host's own /24 and answers ping (0% loss) — that's the router for this subnet. Setting the default gateway to 192.168.10.1 restores the path to the internet.",
      },
    ],
    solvedTitle: "Solved — you found the fault.",
    explanation:
      "ws-14 has a valid address on 192.168.10.0/24 and a DNS server on the same subnet (192.168.10.53), so name resolution works and nslookup resolves fine — DNS is a red herring. The fault is the default gateway: it's set to 192.168.1.1, which isn't on the host's subnet, so the host can't reach it (ping is 'Destination Host Unreachable') and has no route off the LAN — ping to 8.8.8.8 is 100% loss. The real gateway for this subnet, 192.168.10.1, answers. Fix: change the gateway in /etc/network/interfaces to 192.168.10.1 and restart networking; off-subnet and internet traffic come back.",
    estimatedMinutes: 5,
  },
];
