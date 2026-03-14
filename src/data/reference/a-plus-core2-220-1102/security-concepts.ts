import type { ReferenceTable } from "../types";

export const securityConcepts: ReferenceTable = {
  id: "security-concepts",
  title: "Security Concepts",
  description: "Core security topics for the CompTIA A+ 220-1102 exam: MFA, encryption, malware, social engineering, and endpoint defences.",
  columnHeaders: [
    { key: "concept", label: "Concept" },
    { key: "type", label: "Category" },
    { key: "description", label: "Description" },
    { key: "example", label: "Example / Exam Notes" },
  ],
  entries: [
    // MFA
    { columns: { concept: "Something you know", type: "MFA factor", description: "Knowledge-based authentication — the weakest factor alone", example: "Password, PIN, security question answers" } },
    { columns: { concept: "Something you have", type: "MFA factor", description: "Possession-based authentication — physical or virtual token", example: "Smart card, hardware token (RSA SecurID), authenticator app (TOTP), SMS code" } },
    { columns: { concept: "Something you are", type: "MFA factor", description: "Biometric authentication — inherence factor", example: "Fingerprint, face recognition, iris scan, voice recognition" } },
    { columns: { concept: "TOTP", type: "MFA method", description: "Time-based One-Time Password — 6-digit code that rotates every 30 seconds", example: "Google Authenticator, Microsoft Authenticator, Authy apps" } },
    // Encryption
    { columns: { concept: "BitLocker", type: "Encryption (Windows)", description: "Full-disk encryption built into Windows Pro/Enterprise; uses AES-128 or AES-256", example: "Encrypts entire OS drive; requires TPM chip (v1.2+) or USB key; recovery key stored in AD or Microsoft account" } },
    { columns: { concept: "EFS", type: "Encryption (Windows)", description: "Encrypting File System — file/folder level encryption tied to user account", example: "Right-click file > Properties > Advanced > Encrypt; encrypted files shown in green; lost if user account deleted without backup" } },
    { columns: { concept: "FileVault", type: "Encryption (macOS)", description: "Apple's full-disk encryption for macOS; uses XTS-AES-128", example: "Enabled in System Preferences > Security & Privacy; recovery key stored in Apple ID or as local key" } },
    { columns: { concept: "TPM", type: "Encryption hardware", description: "Trusted Platform Module — dedicated security chip that stores cryptographic keys", example: "Required for BitLocker (TPM 1.2+); required for Windows 11 (TPM 2.0); validates boot integrity" } },
    // Malware types
    { columns: { concept: "Virus", type: "Malware", description: "Self-replicating code that attaches to legitimate files/programs and requires a host to spread", example: "Spreads when infected file is shared or executed; can corrupt data, display messages, or deliver payloads" } },
    { columns: { concept: "Trojan", type: "Malware", description: "Malware disguised as legitimate software; does not self-replicate but opens a backdoor", example: "Fake AV software, game cheats, cracked software that installs RAT (Remote Access Trojan)" } },
    { columns: { concept: "Rootkit", type: "Malware", description: "Hides its presence and other malware by modifying OS internals; operates at kernel or firmware level", example: "Makes processes, files, and registry entries invisible; often requires offline scanning or OS reinstall to remove" } },
    { columns: { concept: "Ransomware", type: "Malware", description: "Encrypts victim's files and demands payment for decryption key", example: "WannaCry, CryptoLocker, Ryuk; spreads via phishing or exploits; recovery requires backups or paying ransom" } },
    { columns: { concept: "Spyware", type: "Malware", description: "Secretly monitors user activity and sends data to attacker without consent", example: "Tracks browsing, keystrokes, login credentials; often bundled with freeware" } },
    { columns: { concept: "Keylogger", type: "Malware", description: "Records every keystroke to capture passwords, credit card numbers, and PII", example: "Software keylogger (runs as process) or hardware keylogger (USB or PS/2 inline device)" } },
    { columns: { concept: "Worm", type: "Malware", description: "Self-replicating malware that spreads across networks without needing a host file", example: "Blaster, Conficker, WannaCry; exploits network vulnerabilities; causes bandwidth consumption and payload delivery" } },
    { columns: { concept: "Cryptominer", type: "Malware", description: "Uses victim's CPU/GPU resources to mine cryptocurrency for the attacker", example: "Causes high CPU usage, overheating, slow performance; often delivered via browser scripts or Trojans" } },
    { columns: { concept: "Botnet / Bot", type: "Malware", description: "Infected device (zombie) under remote attacker control, used in coordinated attacks", example: "C2 (command-and-control) server directs bots; used for DDoS attacks, spam campaigns, credential stuffing" } },
    // Social engineering
    { columns: { concept: "Phishing", type: "Social engineering", description: "Fraudulent emails designed to trick users into revealing credentials or clicking malicious links", example: "Fake bank email with urgent account warning; link leads to spoofed login page" } },
    { columns: { concept: "Vishing", type: "Social engineering", description: "Voice phishing — phone calls impersonating IT support, banks, or government agencies", example: "Caller claims to be Microsoft Support; says your PC is sending viruses; requests remote access" } },
    { columns: { concept: "Smishing", type: "Social engineering", description: "SMS phishing — malicious text messages with links or requests for information", example: "Text: 'Your package is held — click here to reschedule delivery' with malicious link" } },
    { columns: { concept: "Shoulder surfing", type: "Social engineering", description: "Observing a person's screen or keyboard to steal credentials or PINs", example: "Standing behind someone at ATM; watching someone type laptop password in a coffee shop" } },
    { columns: { concept: "Tailgating / Piggybacking", type: "Social engineering", description: "Following an authorised person through a secure door without using own credentials", example: "Walking in behind badge-access employee while holding boxes, appearing to have hands full" } },
    { columns: { concept: "Dumpster diving", type: "Social engineering", description: "Searching discarded documents and hardware for sensitive information", example: "Finding printed org charts, old hard drives, or documents with account numbers in the trash" } },
    { columns: { concept: "Evil twin", type: "Social engineering", description: "Rogue wireless access point with the same SSID as a legitimate network to intercept traffic", example: "Attacker sets up 'CoffeeShop_WiFi' in a coffee shop to capture login credentials via MitM" } },
    // Endpoint defences
    { columns: { concept: "UAC (User Account Control)", type: "Windows security", description: "Prompts for admin approval before allowing changes that affect the system; limits privilege escalation", example: "Blue UAC prompt appears when installing software or changing system settings; admin credentials required if standard user" } },
    { columns: { concept: "Windows Defender Firewall", type: "Endpoint security", description: "Built-in host-based firewall that filters inbound and outbound traffic by rule", example: "Block/allow apps through firewall; Advanced Security console (wf.msc) for granular port/protocol rules" } },
    { columns: { concept: "Antivirus (AV)", type: "Endpoint security", description: "Detects and removes known malware using signature databases and heuristics", example: "Windows Defender Antivirus built in; real-time protection scans files on access; scheduled full scans" } },
    { columns: { concept: "EDR (Endpoint Detection & Response)", type: "Endpoint security", description: "Advanced security platform that monitors endpoint behaviour and responds to threats automatically", example: "CrowdStrike Falcon, Microsoft Defender for Endpoint; detects fileless malware that AV misses" } },
  ],
};
