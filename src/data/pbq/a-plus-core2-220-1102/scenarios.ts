import type { PbqScenario } from "../types";

export const aPlusCore2Scenarios: PbqScenario[] = [
  /* ================================================================ */
  /*  ORDERING SCENARIOS                                               */
  /* ================================================================ */
  {
    type: "ordering",
    id: "aplus-core2-malware-removal",
    title: "Malware Removal Process",
    description:
      "Arrange the seven steps of the CompTIA malware removal procedure in the correct order.",
    domain_number: "3.0",
    domain_title: "Software Troubleshooting",
    items: [
      "Investigate and verify malware symptoms",
      "Quarantine the infected system",
      "Disable System Restore in Windows",
      "Remediate the infected system",
      "Schedule scans and run updates",
      "Enable System Restore and create a restore point",
      "Educate the end user",
    ],
    correct_order: [0, 1, 2, 3, 4, 5, 6],
    explanation:
      "CompTIA's 7-step malware removal process begins with identifying and verifying symptoms, then quarantining the machine to prevent spread. System Restore is disabled before remediation so that malware cannot hide in restore points. After remediation, scans and updates are run to confirm the system is clean, System Restore is re-enabled and a clean restore point created, and finally the user is educated on how to avoid reinfection.",
  },
  {
    type: "ordering",
    id: "aplus-core2-windows-installation",
    title: "Windows Operating System Installation",
    description:
      "Arrange the steps of a clean Windows operating system installation in the correct order.",
    domain_number: "1.0",
    domain_title: "Operating Systems",
    items: [
      "Boot from installation media and partition the drive",
      "Format the target partition",
      "Install the Windows OS files",
      "Install motherboard and device drivers",
      "Run Windows Update and apply all patches",
      "Install required applications",
      "Migrate or restore user data",
    ],
    correct_order: [0, 1, 2, 3, 4, 5, 6],
    explanation:
      "A clean Windows installation begins by booting from installation media to partition and format the drive before copying OS files. Drivers are installed immediately after the OS so that hardware functions correctly before updates are applied. Windows Update is run before application installation to ensure the OS security baseline is current. User data is migrated last to avoid compatibility issues with an unpatched or partially configured system.",
  },
  {
    type: "ordering",
    id: "aplus-core2-incident-response",
    title: "Security Incident Response Steps",
    description:
      "Arrange the steps of the security incident response process in the correct order.",
    domain_number: "4.0",
    domain_title: "Operational Procedures",
    items: [
      "Identify the incident",
      "Contain the threat",
      "Investigate and collect evidence",
      "Remediate the root cause",
      "Recover and restore affected systems",
      "Document findings and lessons learned",
    ],
    correct_order: [0, 1, 2, 3, 4, 5],
    explanation:
      "Incident response always begins with identifying that an incident has occurred. Containment immediately follows to limit damage and prevent further spread before the scope is fully known. Evidence is collected during investigation to determine root cause, which is then remediated. Systems are restored to normal operation only after the threat is removed, and all actions are documented to improve future response capability.",
  },
  {
    type: "ordering",
    id: "aplus-core2-change-management",
    title: "Change Management Process",
    description:
      "Arrange the steps of a formal IT change management process in the correct order.",
    domain_number: "4.0",
    domain_title: "Operational Procedures",
    items: [
      "Submit a change request",
      "Assess risk and impact",
      "Develop an implementation and rollback plan",
      "Test the change in a non-production environment",
      "Obtain formal approval from the change board",
      "Implement the change in production",
      "Document the outcome and close the change",
    ],
    correct_order: [0, 1, 2, 3, 4, 5, 6],
    explanation:
      "Change management requires a formal request before any risk or impact is assessed. A plan including a rollback procedure is developed and tested in a safe environment before seeking approval. The change advisory board (CAB) approves the change before production implementation. Documentation closes the change record and provides an audit trail — this order ensures accountability and minimises unplanned outages.",
  },

  /* ================================================================ */
  /*  MATCHING SCENARIOS                                               */
  /* ================================================================ */
  {
    type: "matching",
    id: "aplus-core2-windows-tools",
    title: "Match Windows Administrative Tools to Purposes",
    description:
      "Match each Windows built-in tool or utility to its primary administrative purpose.",
    domain_number: "1.0",
    domain_title: "Operating Systems",
    left: ["msconfig", "regedit", "diskmgmt.msc", "devmgmt.msc", "eventvwr.msc", "taskschd.msc"],
    right: [
      "Configure startup programs, services, and boot options",
      "View and edit the Windows Registry hive",
      "Create, delete, format, and manage disk partitions and volumes",
      "View hardware devices, update or roll back drivers, and check device status",
      "View application, security, and system event logs",
      "Create, modify, and monitor automated scheduled tasks",
    ],
    correct_map: [0, 1, 2, 3, 4, 5],
    explanation:
      "msconfig (System Configuration) manages startup behaviour and is commonly used for troubleshooting boot issues. regedit provides direct access to the Windows Registry and should be used with caution. diskmgmt.msc manages disk volumes and partitions. devmgmt.msc (Device Manager) is the primary tool for driver management. eventvwr.msc (Event Viewer) is essential for diagnosing errors and security events. taskschd.msc (Task Scheduler) automates maintenance and administrative tasks.",
  },
  {
    type: "matching",
    id: "aplus-core2-malware-types",
    title: "Match Malware Types to Behaviours",
    description:
      "Match each type of malware to its defining behaviour or characteristic.",
    domain_number: "2.0",
    domain_title: "Security",
    left: ["Ransomware", "Trojan", "Rootkit", "Keylogger", "Worm", "Cryptominer"],
    right: [
      "Encrypts user files and demands payment for the decryption key",
      "Disguises itself as legitimate software to gain access to a system",
      "Embeds deep in the OS to hide its presence and maintain privileged access",
      "Silently records keystrokes to capture passwords and sensitive data",
      "Self-replicates across networks without user interaction",
      "Hijacks CPU and GPU resources to mine cryptocurrency for the attacker",
    ],
    correct_map: [0, 1, 2, 3, 4, 5],
    explanation:
      "Ransomware encrypts data and extorts victims — a major threat to businesses. Trojans rely on social engineering, appearing as legitimate software. Rootkits operate at kernel or firmware level to evade detection. Keyloggers capture credentials passively. Worms spread autonomously across networks, often causing significant bandwidth consumption. Cryptominers are increasingly common, silently degrading system performance while generating profit for attackers.",
  },
  {
    type: "matching",
    id: "aplus-core2-linux-commands",
    title: "Match Linux Commands to Purposes",
    description:
      "Match each Linux command to its primary function or purpose.",
    domain_number: "1.0",
    domain_title: "Operating Systems",
    left: ["ls", "grep", "chmod", "sudo", "apt-get", "ps", "cat", "ifconfig"],
    right: [
      "List files and directories in the current directory",
      "Search for a pattern within files or command output",
      "Change file or directory permissions",
      "Execute a command with superuser (root) privileges",
      "Install, update, or remove packages on Debian-based systems",
      "Display currently running processes",
      "Display the contents of a file to standard output",
      "Display or configure network interface parameters",
    ],
    correct_map: [0, 1, 2, 3, 4, 5, 6, 7],
    explanation:
      "ls lists directory contents; grep filters output or searches files for matching patterns. chmod modifies access permissions using numeric or symbolic notation. sudo elevates privileges for a single command without switching to the root account. apt-get is the Debian/Ubuntu package manager. ps shows active processes (ps aux for all users). cat concatenates and prints file contents. ifconfig displays and configures network interfaces — though ip addr is its modern replacement on most distributions.",
  },
  {
    type: "matching",
    id: "aplus-core2-social-engineering",
    title: "Match Social Engineering Attacks to Descriptions",
    description:
      "Match each social engineering technique to its correct description.",
    domain_number: "2.0",
    domain_title: "Security",
    left: ["Phishing", "Vishing", "Smishing", "Tailgating", "Shoulder surfing", "Dumpster diving"],
    right: [
      "Fraudulent emails that trick recipients into revealing credentials or clicking malicious links",
      "Voice calls impersonating trusted entities to extract sensitive information",
      "SMS text messages containing malicious links or requests for personal information",
      "Following an authorised person through a secured door without using credentials",
      "Observing a person's screen or keyboard to capture sensitive information",
      "Searching through discarded materials to find sensitive documents or data",
    ],
    correct_map: [0, 1, 2, 3, 4, 5],
    explanation:
      "Phishing uses email, vishing uses voice calls, and smishing uses SMS — all three impersonate trusted sources to steal information. Tailgating (also called piggybacking) is a physical access attack that bypasses door security. Shoulder surfing is a passive observation attack in public spaces. Dumpster diving exploits improperly disposed documents and media; shredding policies and clean-desk policies are the primary defences against the latter two.",
  },

  /* ================================================================ */
  /*  CATEGORIZATION SCENARIOS                                         */
  /* ================================================================ */
  {
    type: "categorization",
    id: "aplus-core2-authentication-factors",
    title: "Classify Authentication Factors",
    description:
      "Sort each authentication method into its correct factor category.",
    domain_number: "2.0",
    domain_title: "Security",
    categories: [
      "Something You Know",
      "Something You Have",
      "Something You Are",
    ],
    items: [
      { text: "Password", category: 0 },
      { text: "PIN", category: 0 },
      { text: "Security question answer", category: 0 },
      { text: "Smart card", category: 1 },
      { text: "Hardware security token (TOTP)", category: 1 },
      { text: "Authenticator app (soft token)", category: 1 },
      { text: "Fingerprint scan", category: 2 },
      { text: "Facial recognition", category: 2 },
    ],
    explanation:
      "Knowledge factors (something you know) are memorised secrets: passwords, PINs, and security question answers. Possession factors (something you have) are physical or digital objects in your control: smart cards, hardware TOTP tokens, and authenticator apps. Inherence factors (something you are) are biometric characteristics: fingerprints and facial geometry. Multi-factor authentication requires two or more categories, not just two instances from the same category.",
  },
  {
    type: "categorization",
    id: "aplus-core2-windows-editions",
    title: "Classify Windows 10/11 Edition Features",
    description:
      "Sort each Windows feature into the lowest edition where it is natively available.",
    domain_number: "1.0",
    domain_title: "Operating Systems",
    categories: ["Home", "Pro", "Enterprise"],
    items: [
      { text: "Microsoft Store and basic apps", category: 0 },
      { text: "Windows Hello biometric login", category: 0 },
      { text: "BitLocker Drive Encryption", category: 1 },
      { text: "Remote Desktop (RDP host)", category: 1 },
      { text: "Active Directory domain join", category: 1 },
      { text: "Group Policy editor (gpedit.msc)", category: 1 },
      { text: "BranchCache for distributed caching", category: 2 },
      { text: "DirectAccess always-on VPN", category: 2 },
      { text: "AppLocker application whitelisting", category: 2 },
    ],
    explanation:
      "Windows Home includes consumer features such as the Microsoft Store, Windows Hello, and Cortana. Windows Pro adds enterprise-grade tools: BitLocker full-disk encryption, RDP host capability, domain join, and the Group Policy editor. Windows Enterprise builds on Pro with advanced features aimed at large organisations: BranchCache for WAN optimisation, DirectAccess for seamless VPN-free remote access, and AppLocker for granular application control.",
  },
  {
    type: "categorization",
    id: "aplus-core2-backup-types",
    title: "Classify Backup Type Characteristics",
    description:
      "Sort each statement into the backup type it correctly describes.",
    domain_number: "4.0",
    domain_title: "Operational Procedures",
    categories: ["Full Backup", "Incremental Backup", "Differential Backup"],
    items: [
      { text: "Copies all selected data regardless of the archive bit", category: 0 },
      { text: "Takes the longest time to back up", category: 0 },
      { text: "Provides the fastest restore from a single tape or set", category: 0 },
      { text: "Copies only data changed since the last backup of any type", category: 1 },
      { text: "Clears the archive bit after completion", category: 1 },
      { text: "Requires the fewest storage resources per session", category: 1 },
      { text: "Copies all data changed since the last full backup", category: 2 },
      { text: "Does not clear the archive bit after completion", category: 2 },
      { text: "Grows in size each day until the next full backup runs", category: 2 },
    ],
    explanation:
      "A full backup copies everything and resets all archive bits, making restoration simple but requiring the most storage and time. Incremental backups copy only changes since the last backup of any type and clear archive bits, resulting in the smallest individual backup but requiring the full set plus every incremental tape for restore. Differential backups copy all changes since the last full backup and do not clear archive bits, so they grow over time but restore requires only the last full plus the latest differential.",
  },
  {
    type: "categorization",
    id: "aplus-core2-file-systems",
    title: "Classify File System Attributes",
    description:
      "Sort each attribute or characteristic into the file system it correctly describes.",
    domain_number: "1.0",
    domain_title: "Operating Systems",
    categories: ["NTFS", "FAT32", "exFAT", "ext4"],
    items: [
      { text: "Supports file-level permissions, encryption (EFS), and journaling", category: 0 },
      { text: "Default file system for Windows system drives", category: 0 },
      { text: "Maximum single file size of 4 GB", category: 1 },
      { text: "Compatible with nearly all operating systems and devices", category: 1 },
      { text: "Optimised for flash drives and memory cards larger than 32 GB", category: 2 },
      { text: "No practical file size limit; lacks journaling", category: 2 },
      { text: "Default file system for Linux distributions", category: 3 },
      { text: "Supports journaling, large volumes, and extended attributes on Linux", category: 3 },
    ],
    explanation:
      "NTFS is the Windows file system of choice, supporting permissions, EFS encryption, and journaling for crash recovery. FAT32 is universally compatible but limited to a 4 GB maximum file size and 8 TB volume size. exFAT was designed to replace FAT32 for large flash media — it removes the 4 GB file size limit while retaining broad cross-platform compatibility. ext4 is the standard Linux file system, featuring journaling, large file support, and extended attributes not present in Windows file systems.",
  },

  /* ================================================================ */
  /*  DOMAIN 3.0 — Software Troubleshooting (additional)              */
  /* ================================================================ */
  {
    type: "ordering",
    id: "aplus-core2-app-install-troubleshooting",
    title: "Application Installation Troubleshooting",
    description:
      "Arrange the steps for troubleshooting a failed application installation in the correct order.",
    domain_number: "3.0",
    domain_title: "Software Troubleshooting",
    items: [
      "Verify system meets minimum requirements (OS version, RAM, disk space)",
      "Check for conflicting applications or previous installations",
      "Run the installer as administrator",
      "Review installation logs for specific error codes",
      "Research error codes and apply vendor-recommended fixes",
      "Test the application after successful installation",
    ],
    correct_order: [0, 1, 2, 3, 4, 5],
    explanation:
      "Always verify system requirements first — insufficient disk space or an incompatible OS version is the most common cause of failed installs. Next, check for conflicts (leftover registry entries, running services from previous installs). Running as administrator resolves permission-related failures. If installation still fails, the installer log files contain specific error codes that can be researched for targeted fixes. After resolving the issue and completing installation, verify the application functions correctly.",
  },
];
