import type { ThreatHuntScenario } from "../types";

/**
 * Threat Hunt scenarios for A+ Core 2 (220-1102). Domain 2.0 Security —
 * recognising the signs of a compromised Windows workstation from the
 * event log, an everyday help-desk skill. Entries are plain-language
 * (not raw event IDs) to match the A+ level. Synthetic but realistic.
 */
export const aPlusCore2ThreatHunts: ThreatHuntScenario[] = [
  {
    type: "threat-hunt",
    id: "a2-hunt-workstation-compromise",
    title: "A user's PC is acting up",
    briefing:
      "A user says their laptop is slow and pop-ups appeared after they opened an email attachment. You pull the Windows event log. Flag every entry that shows the machine was compromised, then identify what happened. Routine entries are mixed in.",
    domain_number: "2.0",
    domain_title: "Security",
    logSource: "Windows Event Log · LAPTOP-MARIA (Downloads\\invoice.exe opened 09:14)",
    lines: [
      {
        text: "09:02  Logon: user MARIA signed in (interactive, console)",
        malicious: false,
        note: "The user's normal morning sign-in — benign.",
      },
      {
        text: "09:15  Windows Defender: Threat found — Trojan:Win32/Wacatac.B!ml in C:\\Users\\MARIA\\Downloads\\invoice.exe",
        malicious: true,
        note: "Defender flagged the attachment as a trojan — the infection point.",
      },
      {
        text: "09:15  Windows Defender: Real-time protection was turned OFF by process invoice.exe",
        malicious: true,
        note: "The malware disabled antivirus so it could run unimpeded — a major red flag.",
      },
      {
        text: "09:16  Software installed: Zoom Workplace 6.1 (installed by MARIA)",
        malicious: false,
        note: "A legitimate app the user installed — benign.",
      },
      {
        text: "09:17  New local user account created: 'sysadmin_'",
        malicious: true,
        note: "A new account the user didn't create — the attacker establishing their own access.",
      },
      {
        text: "09:17  User 'sysadmin_' added to the local Administrators group",
        malicious: true,
        note: "Privilege escalation: the rogue account now has full admin rights.",
      },
      {
        text: "09:20  Windows Update: KB5034441 installed successfully",
        malicious: false,
        note: "A routine patch install — unrelated to the attack.",
      },
      {
        text: "09:21  Scheduled Task created: 'EdgeUpdateCore' runs C:\\Users\\Public\\svc.exe at every logon",
        malicious: true,
        note: "Persistence: a fake-named task relaunches malware on every logon.",
      },
      {
        text: "09:34  User MARIA locked the workstation",
        malicious: false,
        note: "Normal user action — benign.",
      },
      {
        text: "09:35  Network: svc.exe opened an outbound connection to 203.0.113.200:4444",
        malicious: true,
        note: "The malware calling home to a command-and-control server on port 4444.",
      },
    ],
    question: "What happened to this workstation?",
    options: [
      "A Windows Update failed and corrupted system files",
      "A malware infection disabled antivirus, created a rogue admin account, and set up persistence",
      "Antivirus wrongly flagged a normal software install the user performed",
      "An IT technician remotely reconfigured the laptop for a new user",
    ],
    correctOption: 1,
    explanation:
      "The chain is a classic malware compromise: the user opened invoice.exe, Defender identified it as a trojan, and the malware immediately turned off real-time protection. It then created a hidden local account ('sysadmin_'), gave it administrator rights (privilege escalation), and registered a fake-named scheduled task to relaunch itself at every logon (persistence) — finishing with an outbound connection to a command-and-control server on port 4444. The Zoom install, the Windows Update, and the screen lock are ordinary noise. This isn't a failed update, a false positive, or IT activity. Response: isolate the machine from the network, don't just delete the file — remove the rogue account and task, and because admin was compromised, reimage rather than clean.",
    estimatedMinutes: 4,
  },
];
