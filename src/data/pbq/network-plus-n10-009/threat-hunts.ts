import type { ThreatHuntScenario } from "../types";

/**
 * Threat Hunt scenarios for Network+ (N10-009). Domain 4.0 Network
 * Security — reading firewall/flow logs to spot reconnaissance and
 * unauthorized activity. Logs are realistic but synthetic.
 */
export const networkPlusThreatHunts: ThreatHuntScenario[] = [
  {
    type: "threat-hunt",
    id: "net-hunt-port-scan",
    title: "Unusual traffic on the perimeter firewall",
    briefing:
      "The perimeter firewall logged a spike from one external host just before business hours. Flag every entry that is part of the suspicious activity, then identify what the host is doing. Normal allowed traffic is mixed in.",
    domain_number: "4.0",
    domain_title: "Network Security",
    logSource: "fw-edge-01 · /var/log/firewall (times UTC)",
    lines: [
      {
        text: "07:58:01 ALLOW TCP 10.0.2.15:52140 -> 93.184.216.34:443 (established)",
        malicious: false,
        note: "An internal host reaching an external HTTPS site — normal outbound.",
      },
      {
        text: "07:59:12 DENY  TCP 45.33.12.8:61000 -> 203.0.113.5:22 (SYN)",
        malicious: true,
        note: "External host probing SSH (22) — the first port in the sweep.",
      },
      {
        text: "07:59:12 DENY  TCP 45.33.12.8:61001 -> 203.0.113.5:23 (SYN)",
        malicious: true,
        note: "Same source, next port (23/Telnet), same second — automated scanning.",
      },
      {
        text: "07:59:12 DENY  TCP 45.33.12.8:61002 -> 203.0.113.5:25 (SYN)",
        malicious: true,
        note: "Port 25 next — sequential ports from one source is a port scan.",
      },
      {
        text: "07:59:13 DENY  TCP 45.33.12.8:61003 -> 203.0.113.5:80 (SYN)",
        malicious: true,
        note: "Port 80 — the sweep continues across well-known ports.",
      },
      {
        text: "07:59:13 ALLOW UDP 10.0.2.20:5353 -> 224.0.0.251:5353 (mDNS)",
        malicious: false,
        note: "Internal multicast DNS — ordinary LAN chatter.",
      },
      {
        text: "07:59:13 DENY  TCP 45.33.12.8:61004 -> 203.0.113.5:443 (SYN)",
        malicious: true,
        note: "Port 443 — still the same scanning host walking the port list.",
      },
      {
        text: "07:59:14 DENY  TCP 45.33.12.8:61005 -> 203.0.113.5:3389 (SYN)",
        malicious: true,
        note: "RDP (3389) — probing for remote-access services to target next.",
      },
      {
        text: "08:00:44 ALLOW TCP 10.0.2.31:49820 -> 140.82.112.3:443 (established)",
        malicious: false,
        note: "Another normal internal HTTPS session — benign.",
      },
      {
        text: "08:01:02 ALLOW TCP 203.0.113.5:443 -> 198.51.100.60:52233 (established)",
        malicious: false,
        note: "A legitimate inbound HTTPS session to the web server — allowed and expected.",
      },
    ],
    question: "What is the external host 45.33.12.8 doing?",
    options: [
      "Launching a SYN-flood denial-of-service against the web server",
      "Performing a port scan to enumerate open services for a later attack",
      "Establishing a normal VPN tunnel that the firewall misclassified",
      "Exfiltrating data from an already-compromised internal host",
    ],
    correctOption: 1,
    explanation:
      "One external source (45.33.12.8) sends single SYN packets to a sequence of well-known ports — 22, 23, 25, 80, 443, 3389 — against one target within a couple of seconds, all denied. Sequential ports from a single host is the signature of a port scan (reconnaissance): the attacker is mapping which services are open to plan a later attack. It isn't a SYN flood (that hammers ONE port with huge volume to exhaust resources, not one packet per port), it isn't a VPN (those establish, these are all denied SYNs), and it isn't exfiltration (traffic is inbound probes, not data leaving). Response: the firewall already denied it, but block/monitor the source, confirm no ports actually respond, and watch for follow-up from the same IP.",
    estimatedMinutes: 4,
  },
  {
    type: "threat-hunt",
    id: "net-hunt-rogue-dhcp",
    title: "Users on VLAN 10 lost internet",
    briefing:
      "Several users on VLAN 10 report they can't reach the internet, and one got a certificate warning on a banking site. You check the access switch's DHCP snooping log. Flag every entry that shows the problem, then identify what's happening. Normal DHCP activity is mixed in.",
    domain_number: "4.0",
    domain_title: "Network Security",
    logSource: "sw-access-3 · DHCP snooping log · VLAN 10",
    lines: [
      {
        text: "08:41 DHCPDISCOVER from 3c:52:82:a1:0e:44 on Gi0/6",
        malicious: false,
        note: "A client asking for an address — normal start of a DHCP lease.",
      },
      {
        text: "08:41 DHCPOFFER 10.10.10.51 from 10.10.10.1 (trusted uplink Gi0/1) gw=10.10.10.1 dns=10.10.10.2",
        malicious: false,
        note: "The authorized server offering a lease with the correct gateway and DNS — benign.",
      },
      {
        text: "08:41 DHCPOFFER 10.10.10.51 from 10.10.10.66 on UNTRUSTED port Gi0/14 gw=10.10.10.66 dns=45.33.9.9",
        malicious: true,
        note: "A second, unauthorized server offering itself as the gateway with an external DNS — the rogue.",
      },
      {
        text: "08:41 DHCPACK client 3c:52:82:a1:0e:44 took lease from 10.10.10.66 gw=10.10.10.66",
        malicious: true,
        note: "The client accepted the rogue lease — its traffic now routes through the attacker.",
      },
      {
        text: "08:42 DHCPREQUEST from 5a:11:9f:22:71:e0 on Gi0/8",
        malicious: false,
        note: "Another client requesting an address — routine.",
      },
      {
        text: "08:42 DHCPOFFER 10.10.10.52 from 10.10.10.66 on UNTRUSTED port Gi0/14 gw=10.10.10.66 dns=45.33.9.9",
        malicious: true,
        note: "The rogue server offering again to a different client — same untrusted port and bad gateway/DNS.",
      },
      {
        text: "08:42 DHCPACK 10.10.10.53 from 10.10.10.1 (trusted uplink Gi0/1) gw=10.10.10.1",
        malicious: false,
        note: "A client that got a correct lease from the real server — benign.",
      },
      {
        text: "08:43 DHCP snooping: rate limit OK on Gi0/1 (trusted)",
        malicious: false,
        note: "Health message for the legitimate uplink — noise.",
      },
      {
        text: "08:43 WARNING two active DHCP servers seen on VLAN 10: 10.10.10.1 and 10.10.10.66",
        malicious: true,
        note: "The smoking gun: a second DHCP server exists on the VLAN where there should be one.",
      },
    ],
    question: "What is happening on VLAN 10?",
    options: [
      "DHCP starvation exhausting the address pool",
      "A rogue DHCP server handing out a malicious gateway and DNS (on-path attack)",
      "A duplicate IP conflict caused by a misconfigured static host",
      "Normal DHCP failover between two authorized servers",
    ],
    correctOption: 1,
    explanation:
      "An unauthorized DHCP server (10.10.10.66, on an untrusted access port) is answering DHCP requests faster than or alongside the real server (10.10.10.1), handing clients a gateway of itself and an external DNS (45.33.9.9). Clients that accept its lease route all traffic through the attacker — an on-path (man-in-the-middle) position, which explains the certificate warning on the banking site. It isn't DHCP starvation (that floods DISCOVERs to drain the pool; here the rogue is OFFERING, not exhausting), not a static IP conflict, and not failover (a second server on an untrusted port is unauthorized, not redundant). Fix: DHCP snooping caught it — mark only the real uplink trusted so offers from access ports are dropped, then physically locate and remove 10.10.10.66.",
    estimatedMinutes: 4,
  },
];
