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
];
