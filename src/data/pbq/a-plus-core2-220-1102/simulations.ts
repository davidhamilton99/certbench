import type { SimulationScenario } from "../types";

export const aPlusCore2Simulations: SimulationScenario[] = [
  /* ================================================================ */
  /*  1. Windows Troubleshooting with Event Viewer                    */
  /* ================================================================ */
  {
    type: "simulation",
    id: "aplus-core2-sim-event-viewer",
    title: "Windows Troubleshooting with Event Viewer",
    briefing:
      "A Windows 11 workstation has been crashing with Blue Screen of Death (BSOD) errors approximately twice per day over the past week. The machine belongs to a finance department analyst. Reboots recover the system temporarily. Your task is to analyse the Event Viewer logs and minidump information provided, identify the root cause, and apply the correct resolution.",
    domain_number: "1.0",
    domain_title: "Operating Systems",
    estimatedMinutes: 10,
    tasks: [
      /* ── Task 1 ── */
      {
        id: "aplus-core2-sim-event-viewer-t1",
        title: "Task 1 — Analyse Event Logs",
        instructions:
          "Review the Event Viewer entries captured before the last BSOD. Identify the event level, source, and event ID that are most relevant to diagnosing the crash.",
        evidence: [
          {
            label: "Windows Event Viewer — System Log (last 60 minutes before crash)",
            content: [
              "Level       Date/Time            Source                    Event ID  Description",
              "----------  -------------------  ------------------------  --------  ---------------------------------------------------",
              "Information 2024-11-14 10:02:11  Microsoft-Windows-Kernel  12        The operating system started",
              "Warning     2024-11-14 10:14:33  disk                      51        An error was detected on device \\Device\\Harddisk0\\DR0",
              "Warning     2024-11-14 10:14:34  disk                      51        An error was detected on device \\Device\\Harddisk0\\DR0",
              "Error       2024-11-14 10:14:38  volmgr                    46        Crash dump initialization failed",
              "Warning     2024-11-14 10:21:07  disk                      51        An error was detected on device \\Device\\Harddisk0\\DR0",
              "Error       2024-11-14 10:31:55  Ntfs                      55        The file system structure on volume C: is corrupt",
              "Critical    2024-11-14 10:32:01  Kernel-Power              41        The system has rebooted without cleanly shutting down first",
              "Information 2024-11-14 10:32:44  EventLog                  6005       The event log service was started",
            ].join("\n"),
          },
          {
            label: "Windows Memory Reliability History (Reliability Monitor excerpt)",
            content: [
              "Date        Event Type     Source                    Details",
              "----------  -------------  ------------------------  ----------------------------------------",
              "2024-11-14  Application    WinDbg                    MEMORY_MANAGEMENT (0x0000001A) — minidump",
              "2024-11-13  Application    WinDbg                    IRQL_NOT_LESS_OR_EQUAL (0x0000000A)",
              "2024-11-12  Windows        Windows Update            Update KB5031455 installed successfully",
              "2024-11-11  Application    WinDbg                    MEMORY_MANAGEMENT (0x0000001A) — minidump",
              "2024-11-10  Hardware       disk                      Failure detected — Harddisk0",
              "2024-11-08  Windows        Windows Update            Attempted — failed (0x80070490)",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "aplus-core2-sim-event-viewer-t1-f1",
            label: "Which event level indicates the highest severity in Windows Event Viewer?",
            options: [
              "Warning",
              "Error",
              "Critical",
              "Information",
              "Verbose",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-event-viewer-t1-f2",
            label: "Event ID 41 from the Kernel-Power source indicates what condition?",
            options: [
              "A Windows Update was applied and requires a planned restart",
              "The system rebooted unexpectedly without a clean shutdown — typical of a BSOD or power loss",
              "A scheduled maintenance task triggered a reboot",
              "The system hibernated due to a low battery",
              "A driver update was rolled back automatically",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-event-viewer-t1-f3",
            label: "The repeated Event ID 51 (disk errors on Harddisk0) combined with Event ID 55 (NTFS corruption) and MEMORY_MANAGEMENT BSODs most strongly indicates which root cause?",
            options: [
              "Insufficient RAM — additional memory modules must be installed",
              "Failing storage drive — the HDD or SSD on Harddisk0 is developing bad sectors",
              "Corrupt Windows Update KB5031455 — must be uninstalled",
              "Overheating CPU causing memory controller errors",
              "Incompatible device driver loaded after KB5031455",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "In Windows Event Viewer, Critical is the highest severity level, followed by Error, Warning, and Information. Kernel-Power Event ID 41 is the definitive indicator of an unexpected reboot caused by a BSOD, power cut, or hard reset. The pattern here — repeated disk Event ID 51 errors, NTFS corruption (Event ID 55), and MEMORY_MANAGEMENT BSODs — points strongly to a failing storage device. Bad sectors on the drive cause I/O errors that can corrupt file system structures and trigger MEMORY_MANAGEMENT stop codes when the OS cannot read paging file data.",
      },

      /* ── Task 2 ── */
      {
        id: "aplus-core2-sim-event-viewer-t2",
        title: "Task 2 — Identify Issue",
        instructions:
          "Use the minidump analysis output below to confirm the stop code and identify the specific driver or component implicated in the crash.",
        evidence: [
          {
            label: "WinDbg Minidump Analysis Output (most recent crash — 2024-11-14 10:32:01)",
            content: [
              "Microsoft (R) Windows Debugger Version 10.0.25200.1",
              "Loading Dump File [C:\\Windows\\Minidump\\111424-9843-01.dmp]",
              "",
              "Mini Kernel Dump File: Only registers and stack trace are available",
              "",
              "MEMORY_MANAGEMENT (1a)",
              "Arguments:",
              "  Arg1: 0000000000041790, the subtype of the bugcheck",
              "  Arg2: ffffb30c1e800000",
              "  Arg3: 000000000000efff",
              "  Arg4: 0000000000000000",
              "",
              "BUGCHECK_STR: 0x1A_41790",
              "PROCESS_NAME: System",
              "STACK_TEXT:",
              "  nt!KeBugCheckEx",
              "  nt!MmMemoryTransitionWorker+0x35c",
              "  nt!IoPageFault+0x1a1  <-- I/O page fault reading from disk",
              "  storport!RaidUnitSubmitTransfer+0x2f",
              "  storport!StorPortNotification+0x8b",
              "  storahci!AhciHwStartIo+0x1cc",
              "",
              "FAILURE_BUCKET_ID: 0x1A_41790_MEMORY_MANAGEMENT_DISK_IO_FAILURE",
              "FOLLOWUP_NAME: MachineOwner",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "aplus-core2-sim-event-viewer-t2-f1",
            label: "The stop code MEMORY_MANAGEMENT (0x0000001A) in this context, combined with IoPageFault in the stack trace, indicates which hardware component is failing?",
            options: [
              "RAM modules — a memory stick has failed",
              "CPU — the memory controller in the processor is corrupted",
              "Storage drive — the I/O page fault during disk access confirms disk failure",
              "GPU — VRAM corruption is causing system memory conflicts",
              "Power supply — voltage fluctuations are corrupting memory writes",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-event-viewer-t2-f2",
            label: "Which Windows built-in tool should be used FIRST to check the health of the storage drive before running any other tests?",
            options: [
              "chkdsk C: /f /r — check disk for file system errors and bad sectors",
              "sfc /scannow — system file checker to repair corrupted Windows files",
              "DISM /Online /Cleanup-Image /RestoreHealth — repair Windows image",
              "mdsched.exe — Windows Memory Diagnostic",
              "perfmon — Performance Monitor to analyse disk read/write latency",
            ],
            correctIndex: 0,
          },
          {
            type: "select-many",
            id: "aplus-core2-sim-event-viewer-t2-f3",
            label: "Select ALL tools or methods appropriate for further diagnosing a potentially failing storage drive. (Select all that apply)",
            options: [
              "CrystalDiskInfo — read SMART data from the drive for reallocated sector count",
              "chkdsk /f /r — check and repair file system errors and attempt bad sector recovery",
              "Manufacturer's drive diagnostic utility (e.g. Seagate SeaTools, Western Digital Dashboard)",
              "mdsched.exe — Windows Memory Diagnostic (test RAM)",
              "SMART data via BIOS/UEFI self-test — check drive health from firmware",
              "sfc /scannow — system file checker",
              "Windows Disk Management — check partition alignment",
            ],
            correctIndices: [0, 1, 2, 4],
          },
        ],
        explanation:
          "The IoPageFault in the minidump stack trace, combined with the storahci (SATA AHCI) driver chain, confirms the crash originates from a failed disk I/O operation — the drive returned an error when Windows attempted to read a page from the paging file. chkdsk /f /r is the first Windows command to run as it repairs file system errors and maps bad sectors. SMART diagnostics (CrystalDiskInfo, manufacturer tools, BIOS SMART test) provide drive health data including reallocated sector count, which rises as a drive develops bad sectors. mdsched.exe tests RAM, which is not the issue here — but it is a valid check to exclude memory as a contributing factor.",
      },

      /* ── Task 3 ── */
      {
        id: "aplus-core2-sim-event-viewer-t3",
        title: "Task 3 — Apply Fix",
        instructions:
          "SMART data confirms the drive has 847 reallocated sectors and 3 pending sectors — the drive is failing and must be replaced. Plan and execute the correct resolution sequence.",
        fields: [
          {
            type: "zone-placement",
            id: "aplus-core2-sim-event-viewer-t3-f1",
            label: "Place each action into the correct phase of the drive replacement process.",
            items: [
              "Back up all user data to an external drive or network share",
              "Install replacement SSD in the laptop",
              "Clone existing drive to replacement SSD using imaging software",
              "Verify backup integrity by spot-checking files",
              "Boot from Windows installation media and perform clean installation",
              "Install drivers and restore user data from backup",
              "Run chkdsk on the new drive to confirm no errors",
            ],
            zones: ["Before Replacement", "During Replacement", "After Replacement"],
            correctZones: [0, 1, 1, 0, 1, 2, 2],
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-event-viewer-t3-f2",
            label: "The user's data has been backed up. The failing drive cannot be cloned reliably. What is the correct next step?",
            options: [
              "Attempt to repair the existing drive with chkdsk /f /r and continue using it",
              "Install a replacement drive, perform a clean Windows installation, install drivers, then restore user data from backup",
              "Reload the system image from last week's backup tape without replacing the hardware",
              "Add the drive as a secondary drive alongside a new drive and let Windows use both",
              "Defragment the failing drive to consolidate bad sectors",
            ],
            correctIndex: 1,
          },
          {
            type: "select-many",
            id: "aplus-core2-sim-event-viewer-t3-f3",
            label: "Select ALL items that should be verified after the repair is complete and Windows is reinstalled. (Select all that apply)",
            options: [
              "All Windows Updates applied and system is fully patched",
              "Device drivers installed (chipset, storage, NIC, GPU)",
              "User data restored from backup and files accessible",
              "chkdsk run on the new drive — no errors reported",
              "SMART data on the new drive checked for any pre-existing issues",
              "Event Viewer monitored for recurrence of disk Event ID 51 errors",
              "The failing old drive reformatted and returned to the user as a spare",
            ],
            correctIndices: [0, 1, 2, 3, 4, 5],
          },
        ],
        explanation:
          "When a drive fails with reallocated sectors, data backup must come before any replacement action. A clean OS install on the new drive is preferable to cloning a corrupted source drive. After reinstallation, the verification checklist ensures the system is fully patched, all drivers are present, user data is accessible, and the new drive itself is healthy. The old failing drive must not be returned to the user — it should be properly disposed of or destroyed to prevent data recovery from a potentially sensitive financial department machine.",
      },
    ],
    explanation:
      "Event Viewer analysis is a core A+ Core 2 operating systems skill. The key log entries to recognise are: Kernel-Power ID 41 (unexpected reboot/BSOD), disk ID 51 (disk I/O error), and Ntfs ID 55 (file system corruption). The minidump stop code MEMORY_MANAGEMENT with IoPageFault in the storport/storahci stack is the definitive indicator of storage drive failure rather than RAM failure. SMART diagnostics, chkdsk, and manufacturer tools are the correct follow-up steps. Data backup always precedes hardware replacement.",
  },

  /* ================================================================ */
  /*  2. Malware Removal Procedure                                    */
  /* ================================================================ */
  {
    type: "simulation",
    id: "aplus-core2-sim-malware-removal",
    title: "Malware Removal Procedure",
    briefing:
      "A receptionist reports that their Windows 10 PC has been behaving strangely for two days. The browser is redirecting to unfamiliar websites, unwanted popup advertisements appear even when no browser is open, and a new toolbar appeared in the browser without being installed intentionally. Task Manager shows several unfamiliar processes consuming CPU resources. You must identify the malware type, follow the CompTIA malware removal process, and implement prevention measures.",
    domain_number: "4.0",
    domain_title: "Operational Procedures",
    estimatedMinutes: 10,
    tasks: [
      /* ── Task 1 ── */
      {
        id: "aplus-core2-sim-malware-removal-t1",
        title: "Task 1 — Identify Malware Type",
        instructions:
          "Review the Task Manager output and symptom descriptions to classify the malware type and identify the infection vector.",
        evidence: [
          {
            label: "Task Manager — Processes Tab (suspicious entries highlighted)",
            content: [
              "Name                      PID   CPU%  Memory   Status",
              "------------------------  ----  ----  -------  ---------------------",
              "chrome.exe                2104   1.2   182 MB   Running",
              "SearchProtect.exe         3788   4.8    48 MB   Running  *SUSPICIOUS*",
              "svchost.exe (LocalSystem) 1120   0.3    24 MB   Running",
              "BetterSurf.exe            4492   2.1    31 MB   Running  *SUSPICIOUS*",
              "explorer.exe              2244   0.8    64 MB   Running",
              "AdRevenue.exe             5116   3.9    27 MB   Running  *SUSPICIOUS*",
              "svchost.exe (netsvcs)     1408   0.2    18 MB   Running",
              "SystemHelper32.exe        6024   6.2    55 MB   Running  *SUSPICIOUS*",
            ].join("\n"),
          },
          {
            label: "Symptom Summary",
            content: [
              "1. Browser homepage changed to 'search.bestfinds.com' without user action.",
              "2. Google searches redirect through 'go.track-me.net' before reaching results.",
              "3. Popup advertisements appear on the desktop outside the browser (via system tray icon).",
              "4. A new browser toolbar 'ShopSaver Deals' appeared in Chrome.",
              "5. Browser default search engine changed to 'SearchProtect Search'.",
              "6. User recalls installing a free PDF converter downloaded from a third-party site two days ago.",
              "7. No ransom note. No files appear encrypted. No self-replication to network shares observed.",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "aplus-core2-sim-malware-removal-t1-f1",
            label: "Based on the symptoms (browser redirects, unwanted toolbars, popup ads, changed homepage), this infection is BEST classified as:",
            options: [
              "Ransomware — encrypts files and demands payment",
              "Worm — self-replicates across the network",
              "Adware / Browser Hijacker — redirects browser and displays unsolicited advertisements",
              "Rootkit — hides itself at the kernel level",
              "Keylogger — captures keystrokes to steal credentials",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-malware-removal-t1-f2",
            label: "The user installed a free PDF converter from a third-party site two days ago. This is an example of which infection vector?",
            options: [
              "Drive-by download — malware installed silently when visiting a malicious website",
              "Phishing email — user clicked a malicious link in an email",
              "Bundleware / PUP (Potentially Unwanted Program) — malware bundled with legitimate-looking free software",
              "USB drop attack — infected USB drive left in a public place",
              "Brute-force attack on the Windows login",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-malware-removal-t1-f3",
            label: "According to the CompTIA A+ malware removal process, what is the FIRST step after identifying suspicious symptoms?",
            options: [
              "Immediately run an antivirus scan while the system remains connected to the network",
              "Investigate and verify malware symptoms, then quarantine the infected system by disconnecting it from the network",
              "Disable System Restore and begin remediation",
              "Power off the system immediately to stop further damage",
              "Educate the end user on safe browsing practices",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "The combination of browser redirects, changed homepage and search engine, unwanted toolbars, and popup ads is the classic profile of adware with browser hijacking capabilities. Bundleware (PUP) distributed via free third-party software downloaders is one of the most common infection vectors for this malware class. The CompTIA malware removal process begins with investigating and verifying symptoms, followed immediately by quarantining the machine — network isolation prevents the malware from phoning home, downloading additional payloads, or spreading.",
      },

      /* ── Task 2 ── */
      {
        id: "aplus-core2-sim-malware-removal-t2",
        title: "Task 2 — Removal Steps",
        instructions:
          "Execute the malware removal process. Place each step in the correct removal phase and answer the remediation questions.",
        fields: [
          {
            type: "zone-placement",
            id: "aplus-core2-sim-malware-removal-t2-f1",
            label: "Assign each malware removal action to its correct phase in the CompTIA process.",
            items: [
              "Disconnect the PC from the network (unplug Ethernet, disable Wi-Fi)",
              "Disable System Restore to prevent malware hiding in restore points",
              "Run Malwarebytes Anti-Malware in full scan mode to detect and quarantine threats",
              "Manually uninstall suspicious programs via Control Panel > Programs and Features",
              "Boot into Safe Mode to prevent malware auto-starting during removal",
              "Enable System Restore and create a new clean restore point",
              "Reconnect to the network, run Windows Update, and update all applications",
              "Verify no suspicious processes remain in Task Manager after reboot",
            ],
            zones: ["Quarantine", "Disable System Restore", "Remediate", "Verify & Restore"],
            correctZones: [0, 1, 2, 2, 2, 3, 3, 3],
          },
          {
            type: "select-many",
            id: "aplus-core2-sim-malware-removal-t2-f2",
            label: "Select ALL correct remediation steps for removing this browser hijacker / adware. (Select all that apply)",
            options: [
              "Uninstall suspicious programs (SearchProtect, BetterSurf, ShopSaver) from Control Panel",
              "Reset all browser settings to default (homepage, search engine, extensions) in Chrome settings",
              "Remove unknown extensions from Chrome via chrome://extensions",
              "Delete temporary files and browser cache using Disk Cleanup or CCleaner",
              "Run Malwarebytes or equivalent anti-malware tool in Safe Mode",
              "Reinstall Chrome from Google's official website after cleaning",
              "Format the hard drive and reinstall Windows — required for all adware infections",
              "Check the Startup tab in Task Manager and disable all suspicious startup entries",
            ],
            correctIndices: [0, 1, 2, 3, 4, 7],
          },
        ],
        explanation:
          "Quarantine (network isolation) prevents further payload downloads. Disabling System Restore stops malware from embedding in restore points before remediation. Remediation includes uninstalling PUPs from Control Panel, removing browser extensions, resetting browser settings, running anti-malware tools in Safe Mode (where auto-start malware cannot interfere), and disabling startup entries. A full OS reinstall is not required for adware — it is a last resort reserved for persistent rootkits or severe system damage. Reinstalling Chrome is unnecessary unless it has been corrupted.",
      },

      /* ── Task 3 ── */
      {
        id: "aplus-core2-sim-malware-removal-t3",
        title: "Task 3 — Prevention",
        instructions:
          "The system has been cleaned and is confirmed malware-free. Implement prevention measures and complete the final steps of the CompTIA malware removal process.",
        fields: [
          {
            type: "select-many",
            id: "aplus-core2-sim-malware-removal-t3-f1",
            label: "Select ALL appropriate prevention measures to recommend to the user and implement on this PC. (Select all that apply)",
            options: [
              "Enable real-time protection in Windows Defender or install a reputable third-party AV",
              "Educate the user: never install software from unofficial third-party download sites",
              "Enable UAC (User Account Control) to prompt before software installation",
              "Configure the browser to block pop-ups and enable Safe Browsing mode",
              "Disable Windows Defender permanently — it conflicts with Malwarebytes",
              "Apply the principle of least privilege — do not use a local administrator account for daily work",
              "Enable automatic Windows Updates to ensure security patches are applied promptly",
              "Install software from vendor websites or trusted app stores only",
            ],
            correctIndices: [0, 1, 2, 3, 5, 6, 7],
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-malware-removal-t3-f2",
            label: "What is the LAST step of the CompTIA A+ malware removal process?",
            options: [
              "Run a final antivirus scan to confirm clean status",
              "Enable System Restore and create a clean restore point",
              "Schedule recurring scans and ensure antivirus definitions are up to date",
              "Educate the end user about the infection cause and prevention",
              "Document the incident in the help desk ticketing system",
            ],
            correctIndex: 3,
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-malware-removal-t3-f3",
            label: "The receptionist's account has local administrator rights. For daily work, what is the recommended account configuration under the principle of least privilege?",
            options: [
              "Keep administrator rights — required for all Windows functionality",
              "Downgrade the account to Standard User; create a separate local admin account used only when elevation is needed",
              "Remove all accounts and have the user log in as the built-in Administrator",
              "Disable UAC so the user does not encounter elevation prompts",
              "Add the user to the Domain Admins group for convenience",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "Prevention is the seventh and final step of the CompTIA malware removal process, but within the overall procedure, user education is the last action. Running as a Standard User rather than a local administrator is one of the most effective defences against PUP and adware installation — many installers silently install bundleware only when they detect administrator privileges. UAC provides an additional prompt barrier. Windows Defender should never be permanently disabled — it can coexist with Malwarebytes (run as on-demand scanner). Real-time AV, browser pop-up blocking, Windows Update, and software source discipline are all standard prevention controls.",
      },
    ],
    explanation:
      "The CompTIA 7-step malware removal process is a key exam objective: (1) Investigate/verify symptoms, (2) Quarantine, (3) Disable System Restore, (4) Remediate, (5) Schedule scans/update, (6) Enable System Restore/create restore point, (7) Educate end user. Browser hijackers and adware distributed via bundleware are the most common malware type encountered by A+ technicians. The principle of least privilege — Standard User for daily work — is the most effective single prevention control for this malware class.",
  },

  /* ================================================================ */
  /*  3. User Account & Permission Configuration                      */
  /* ================================================================ */
  {
    type: "simulation",
    id: "aplus-core2-sim-user-accounts",
    title: "User Account & Permission Configuration",
    briefing:
      "Contoso Ltd. has hired three new employees for a newly created Marketing department. The IT manager has asked you to create their Windows domain user accounts in Active Directory and configure the correct NTFS permissions on the shared Marketing department folder located at D:\\Shares\\Marketing on a Windows Server 2022 file server. You are logged in as a Domain Admin.",
    domain_number: "1.0",
    domain_title: "Operating Systems",
    estimatedMinutes: 8,
    tasks: [
      /* ── Task 1 ── */
      {
        id: "aplus-core2-sim-user-accounts-t1",
        title: "Task 1 — Create Domain User Accounts",
        instructions:
          "Create the three new user accounts with the correct settings as specified in the new employee form. Answer the questions about account configuration options.",
        evidence: [
          {
            label: "New Employee Account Request Form",
            content: [
              "Name                 Username          Department  Account Type     Groups to Join",
              "-------------------  ----------------  ----------  ---------------  ------------------------------------",
              "Sarah Chen           s.chen            Marketing   Standard User    Marketing-Staff, All-Employees",
              "James Okafor         j.okafor          Marketing   Standard User    Marketing-Staff, All-Employees",
              "Maria Vasquez        m.vasquez         Marketing   Department Head  Marketing-Staff, Marketing-Managers, All-Employees",
              "",
              "Password Policy: Minimum 12 characters, complexity required, must change at first logon.",
              "Account Status: All accounts enabled immediately upon creation.",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "aplus-core2-sim-user-accounts-t1-f1",
            label: "Which Windows Server tool is used to create Active Directory domain user accounts?",
            options: [
              "Computer Management (compmgmt.msc) — Local Users and Groups",
              "Active Directory Users and Computers (dsa.msc)",
              "Local Security Policy (secpol.msc)",
              "Group Policy Management Console (gpmc.msc)",
              "Windows Admin Center",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-user-accounts-t1-f2",
            label: "The account form specifies 'must change password at first logon'. Where is this option set in Active Directory Users and Computers?",
            options: [
              "Account tab — 'Password never expires' checkbox",
              "Account tab — 'User must change password at next logon' checkbox",
              "Profile tab — 'Logon script' field",
              "Member Of tab — assign to Password-Reset group",
              "General tab — 'Description' field",
            ],
            correctIndex: 1,
          },
          {
            type: "select-many",
            id: "aplus-core2-sim-user-accounts-t1-f3",
            label: "Select ALL group memberships that Maria Vasquez (Department Head) should have according to the request form. (Select all that apply)",
            options: [
              "Marketing-Staff",
              "Marketing-Managers",
              "All-Employees",
              "Domain Admins",
              "Backup Operators",
              "Remote Desktop Users",
            ],
            correctIndices: [0, 1, 2],
          },
        ],
        explanation:
          "Active Directory Users and Computers (dsa.msc) is the primary tool for managing domain accounts — compmgmt.msc manages only local accounts on a single machine. The 'User must change password at next logon' option is on the Account tab of the user's Properties dialog. Maria Vasquez should be added only to the three groups specified in the request form: Marketing-Staff, Marketing-Managers, and All-Employees. Assigning Domain Admins or Backup Operators to a department head would violate the principle of least privilege.",
      },

      /* ── Task 2 ── */
      {
        id: "aplus-core2-sim-user-accounts-t2",
        title: "Task 2 — Set NTFS File Permissions",
        instructions:
          "Configure NTFS permissions on D:\\Shares\\Marketing. The permissions policy requires that all Marketing Staff can read and write files, Marketing Managers can additionally modify folder structure, and other users have no access.",
        evidence: [
          {
            label: "NTFS Permission Requirements — D:\\Shares\\Marketing",
            content: [
              "Group                 Required NTFS Permission",
              "--------------------  ------------------------------------------",
              "Marketing-Staff       Read & Execute, List Folder Contents, Read, Write",
              "Marketing-Managers    Modify (includes Read & Execute, Write, Delete)",
              "All-Employees         No access (deny inheritance or explicit Deny read)",
              "SYSTEM                Full Control (required for OS operations)",
              "Domain Admins         Full Control",
              "",
              "Inheritance: Disable inheritance from parent, convert existing permissions, then apply above.",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "zone-placement",
            id: "aplus-core2-sim-user-accounts-t2-f1",
            label: "Place each NTFS permission level into the correct group assignment for the Marketing folder.",
            items: [
              "Full Control",
              "Modify",
              "Read & Execute + Write",
              "No Access / Deny",
            ],
            zones: ["Domain Admins / SYSTEM", "Marketing-Managers", "Marketing-Staff", "All-Employees (others)"],
            correctZones: [0, 1, 2, 3],
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-user-accounts-t2-f2",
            label: "A Marketing-Staff member is also a member of All-Employees. If All-Employees has 'Deny Read' and Marketing-Staff has 'Allow Read & Write', what is the effective permission?",
            options: [
              "Allow Read & Write — the most permissive group permission always wins",
              "No access — Deny always overrides Allow in NTFS",
              "Read only — permissions are averaged across group memberships",
              "Modify — Active Directory group nesting elevates permissions",
              "Full Control — domain users always inherit domain admin rights",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-user-accounts-t2-f3",
            label: "Which tab in the folder's Properties dialog is used to configure NTFS permissions?",
            options: [
              "General",
              "Sharing",
              "Security",
              "Customize",
              "Previous Versions",
            ],
            correctIndex: 2,
          },
          {
            type: "select-many",
            id: "aplus-core2-sim-user-accounts-t2-f4",
            label: "Select ALL statements that are true about NTFS permissions. (Select all that apply)",
            options: [
              "NTFS permissions apply to both local and network access",
              "Share permissions only apply when accessing a resource over the network",
              "When NTFS and Share permissions are both applied, the MORE restrictive of the two takes effect",
              "Full Control includes the ability to change permissions and take ownership",
              "NTFS permissions cannot be set on individual files — only folders",
              "Deny permissions always override Allow permissions",
              "Inherited permissions can be blocked by disabling inheritance on a child object",
            ],
            correctIndices: [0, 1, 2, 3, 5, 6],
          },
        ],
        explanation:
          "NTFS Deny permissions always override Allow, regardless of group membership — this is the most important NTFS rule on the A+ exam. NTFS permissions are set on the Security tab of Properties and apply both locally and over the network; Share permissions (set on the Sharing tab) apply only to network access. When both are configured, the effective permission is the more restrictive of the two. Full Control includes the right to change permissions (Change Permissions) and take ownership. NTFS permissions can be set on individual files as well as folders.",
      },
    ],
    explanation:
      "Active Directory user account creation and NTFS permission configuration are core Windows administration skills tested on A+ Core 2. The critical rules: use dsa.msc for domain accounts (not compmgmt.msc, which is local only); assign only the minimum required group memberships; Deny always beats Allow in NTFS; NTFS applies locally and over the network while Share permissions apply only over the network; effective combined NTFS + Share permission is always the more restrictive.",
  },

  /* ================================================================ */
  /*  4. Mobile Device Security Setup                                 */
  /* ================================================================ */
  {
    type: "simulation",
    id: "aplus-core2-sim-mobile-security",
    title: "Mobile Device Security Setup",
    briefing:
      "Contoso Ltd. is issuing corporate-owned Android smartphones to 25 employees. The IT manager wants you to configure the Mobile Device Management (MDM) policy for these devices and then handle a security incident in which one of the newly issued phones has been reported lost by an employee while travelling.",
    domain_number: "2.0",
    domain_title: "Security",
    estimatedMinutes: 8,
    tasks: [
      /* ── Task 1 ── */
      {
        id: "aplus-core2-sim-mobile-security-t1",
        title: "Task 1 — MDM Policy Configuration",
        instructions:
          "Configure the corporate MDM policy for the Android device fleet. Apply the settings required by the company's mobile security policy document.",
        evidence: [
          {
            label: "Contoso Mobile Device Security Policy v2.1",
            content: [
              "1. Screen lock must activate after no more than 5 minutes of inactivity.",
              "2. Minimum PIN/passcode length: 6 digits. Biometric unlock is permitted as a secondary method.",
              "3. Device storage must be encrypted at rest.",
              "4. App installation restricted to company-approved apps from the MDM catalogue only.",
              "   (Sideloading from unknown sources must be blocked.)",
              "5. Camera use is prohibited on devices used in the Finance department.",
              "6. Corporate email and contacts must not be copied to personal cloud accounts.",
              "7. Devices that have been rooted or jailbroken must be automatically quarantined.",
              "8. Remote wipe capability must be enabled on all devices.",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "dropdown",
            id: "aplus-core2-sim-mobile-security-t1-f1",
            label: "According to the policy, what is the maximum screen lock timeout that should be configured in the MDM profile?",
            options: [
              "1 minute",
              "2 minutes",
              "5 minutes",
              "10 minutes",
              "30 minutes",
            ],
            correctIndex: 2,
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-mobile-security-t1-f2",
            label: "The policy requires blocking app installation from unknown sources. In MDM terms, this control is best described as:",
            options: [
              "Application whitelisting — only approved apps from the MDM catalogue can be installed",
              "Application blacklisting — specific apps are blocked by name",
              "Full device wipe policy",
              "Network Access Control (NAC) enforcement",
              "VPN split tunnelling configuration",
            ],
            correctIndex: 0,
          },
          {
            type: "select-many",
            id: "aplus-core2-sim-mobile-security-t1-f3",
            label: "Select ALL MDM policy settings that should be enabled based on the Contoso mobile security policy. (Select all that apply)",
            options: [
              "Screen lock timeout: 5 minutes",
              "Minimum passcode length: 6 digits",
              "Storage encryption: required",
              "Allow app sideloading from unknown sources",
              "Camera disabled for Finance department profile",
              "Prevent copy of corporate email/contacts to personal cloud",
              "Jailbreak/root detection with automatic quarantine",
              "Remote wipe enabled",
              "Allow personal Google account sync on corporate devices",
            ],
            correctIndices: [0, 1, 2, 4, 5, 6, 7],
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-mobile-security-t1-f4",
            label: "Which MDM feature allows the IT department to separate corporate data and apps from personal data on the same device (common in BYOD deployments)?",
            options: [
              "Remote wipe — erases the entire device",
              "MDM containerisation / Managed Profile (Android for Work) — creates an isolated work profile",
              "Full disk encryption — encrypts all data on the device",
              "Mobile Application Management (MAM) for VPN enforcement",
              "GPS tracking — locates the device in real time",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "MDM policies enforce screen lock timeouts, minimum passcode length, encryption, and app restrictions at the device level. Application whitelisting restricts installations to an approved list and blocks sideloading. Containerisation (Android Work Profile / iOS Managed Apps) is the key BYOD technology — it creates an isolated corporate workspace on a personal device, allowing selective wipe of only corporate data without touching personal content. Jailbreak/root detection is critical: a rooted device has bypassed OS security controls and must be quarantined automatically.",
      },

      /* ── Task 2 ── */
      {
        id: "aplus-core2-sim-mobile-security-t2",
        title: "Task 2 — Incident Response: Lost Device",
        instructions:
          "An employee has reported their corporate smartphone lost at an airport. The device contains corporate email, contacts, and access to the company's CRM application. The device is MDM-enrolled and GPS tracking shows it is stationary at the airport terminal — it has not been recovered after 3 hours.",
        evidence: [
          {
            label: "Lost Device Report",
            content: [
              "Reporter    : Emma Walsh, Sales Executive",
              "Device      : Samsung Galaxy S24 (IMEI: 356721092847451)",
              "Reported    : 2024-11-15 14:22 UTC",
              "Location    : GPS last seen — Terminal 3, Manchester Airport, UK",
              "             (Device stationary for 3 hours — not recovered)",
              "MDM Status  : Enrolled — Microsoft Intune",
              "Data on device: Corporate email (Exchange), CRM app, contact list,",
              "              VPN client. No classified documents stored locally.",
              "Personal data: Employee confirmed personal photos and personal banking",
              "              app are also on the device.",
            ].join("\n"),
          },
        ],
        fields: [
          {
            type: "select-many",
            id: "aplus-core2-sim-mobile-security-t2-f1",
            label: "Select ALL correct incident response actions for this lost corporate device scenario. (Select all that apply)",
            options: [
              "Immediately issue a remote wipe command via MDM to erase all data on the device",
              "Disable the employee's corporate account credentials (Exchange, CRM, VPN) to prevent unauthorised access",
              "Contact the airport's lost property office and security team",
              "Notify the mobile carrier to block the device using the IMEI number",
              "Allow the employee to continue using the account from a temporary device while the situation is monitored",
              "Document the incident in the IT security incident log",
              "Provision the employee with a replacement device and enrol it in MDM before granting access",
              "Wait 24 hours before taking any action in case the device is recovered",
            ],
            correctIndices: [1, 2, 3, 5, 6],
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-mobile-security-t2-f2",
            label: "The device contains personal photos and a personal banking app alongside corporate data. Which MDM action should be taken FIRST to protect corporate data while minimising impact on the employee's personal data?",
            options: [
              "Full remote wipe — erase the entire device immediately",
              "Selective remote wipe (corporate data wipe) — remove only the managed work profile and corporate data, leaving personal data intact",
              "Lock the device remotely with a new PIN",
              "Enable GPS tracking and wait for recovery",
              "Remote wipe is not possible — the employee must report the device physically",
            ],
            correctIndex: 1,
          },
          {
            type: "dropdown",
            id: "aplus-core2-sim-mobile-security-t2-f3",
            label: "After 24 hours the device is still not recovered. What action should now be taken regarding the device's IMEI?",
            options: [
              "No further action is needed once corporate data is wiped",
              "Report the IMEI to the carrier to have the device blacklisted from all networks (SIM lock)",
              "Re-enrol the lost IMEI in MDM from a new device profile",
              "Factory-reset the device remotely using the IMEI via the carrier portal",
              "Transfer the IMEI to the replacement device",
            ],
            correctIndex: 1,
          },
        ],
        explanation:
          "For a lost corporate device containing personal data, the priority sequence is: (1) disable corporate credentials to block access to corporate systems immediately, (2) perform a selective/corporate data wipe to protect company data while preserving personal content, (3) notify the carrier to block the IMEI if the device is not recovered. A full wipe is appropriate if the device has no personal data, but must be considered carefully where personal content is present — the MDM containerisation model enables selective wipe for exactly this scenario. The IMEI blacklist prevents the device from connecting to any cellular network, reducing the risk of the device being used by a third party. A full remote wipe after 24 hours of non-recovery is ultimately appropriate for a corporate-owned device, but selective wipe is always the preferred first action when personal data is present.",
      },
    ],
    explanation:
      "Mobile device management is a growing A+ Core 2 exam topic. Key MDM policy settings to memorise: screen lock timeout, minimum PIN length, storage encryption, app whitelisting (block unknown sources), jailbreak/root detection, remote wipe, and containerisation. For lost device incidents, the correct sequence is: disable corporate credentials, selective wipe (or full wipe if no personal data), carrier IMEI blacklist, replacement device provisioning. Selective wipe removes only the managed work profile, protecting personal data — this is the key advantage of containerisation in BYOD and mixed-use corporate deployments.",
  },
];
