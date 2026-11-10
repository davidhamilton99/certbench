import type { NewQuestion } from "./types";

/** New questions for 220-1202 Domain 3.0, Software Troubleshooting: the topics V15 added. */
export const questions: NewQuestion[] = [
  {
    key: "c2-3.2-app-install-1",
    objective: "3.2",
    topic: "application fails to install",
    difficulty: 1,
    question:
      "An iPhone user taps Get on a large game in the App Store, but the download fails right away. The phone shows 900 MB free, and the game needs 3 GB. What should the technician do?",
    options: [
      "Reset all of the phone's settings, then try the download again",
      "Free up storage by offloading unused apps or deleting large files",
      "Turn off Wi-Fi and download the game over Bluetooth instead",
      "Sign out of iCloud, sign back in, then try the download again",
    ],
    answer: 1,
    explanation:
      "Not enough storage is one of the most common reasons an app won't install; offloading unused apps or deleting large media in Settings > General > iPhone Storage frees the space. Resetting settings and signing out of iCloud don't create space, and apps can't be downloaded over Bluetooth.",
  },
  {
    key: "c2-3.2-app-install-2",
    objective: "3.2",
    topic: "application fails to install",
    difficulty: 2,
    question:
      "A company app won't install on an older Android phone, and Google Play says the device isn't compatible. The phone has plenty of free storage. What is the MOST likely cause?",
    options: [
      "The phone's screen is set not to rotate automatically when it is turned",
      "Bluetooth is turned off in the phone's quick settings panel",
      "The app needs a newer Android version or hardware feature than the phone has",
      "The phone's battery is below 50 percent, so large installs are blocked",
    ],
    answer: 2,
    explanation:
      "Apps declare a minimum OS version and the hardware features they need, and the store blocks installation on devices that don't meet them; the fix is an OS update if one exists, or a supported device. Screen rotation, Bluetooth and battery level don't affect whether an app is compatible.",
  },
  {
    key: "c2-3.2-app-install-3",
    objective: "3.2",
    topic: "application fails to install",
    difficulty: 2,
    question:
      "An employee's company-managed iPad has no App Store icon, and the employee can't install any apps. Storage and the iPadOS version are fine. What should the technician check?",
    options: [
      "Restrictions set in Screen Time or by the MDM that don't allow installing apps",
      "Whether the iPad is connected to a 5 GHz Wi-Fi network rather than a 2.4 GHz one",
      "Whether the iPad installs security responses automatically",
      "Whether the screen brightness is set to adjust automatically",
    ],
    answer: 0,
    explanation:
      "Screen Time's Content & Privacy Restrictions and MDM restrictions can block app installation, which hides the App Store; the MDM administrator or the Screen Time settings must allow it, or the app can be pushed through MDM instead. The Wi-Fi band, update settings and screen brightness don't stop apps installing.",
  },
  {
    key: "c2-3.4-unwanted-notifications-1",
    objective: "3.4",
    topic: "unwanted OS notifications",
    difficulty: 2,
    question:
      "A Windows 11 PC keeps showing notifications in the corner of the screen saying 'Virus detected! Renew your protection now'. They name a website as the sender, not Windows Security, and a full malware scan finds nothing. What is the MOST likely cause and fix?",
    options: [
      "A rootkit is hiding in the boot sector, so the PC must be reimaged",
      "A website was allowed to send browser notifications; revoke its permission in the browser",
      "Windows Security has found a real infection, so the user should pay for the renewal",
      "The Windows Update service has failed, so it should be restarted",
    ],
    answer: 1,
    explanation:
      "Scam sites trick users into clicking Allow on a notification prompt, then push fake alerts that look like OS notifications but name the site or browser as the sender; removing the site from the browser's notification permissions stops them. A clean scan and the website sender point away from a rootkit or real infection, the alerts don't come from Windows Security, and they have nothing to do with Windows Update.",
  },
  {
    key: "c2-3.4-unwanted-notifications-2",
    objective: "3.4",
    topic: "unwanted OS notifications",
    difficulty: 2,
    question:
      "A PC shows unwanted pop-up notifications advertising system cleanup deals, from an app the user doesn't remember installing. Which step BEST addresses both the symptom and its cause?",
    options: [
      "Turn on Do not disturb permanently, so that the notifications no longer appear",
      "Turn off Windows Defender Firewall, so that the app can no longer reach its advertising servers",
      "Uninstall the app, run an anti-malware scan and check the browsers' notification permissions",
      "Clear the Windows event logs, so that the app's records are removed from the PC",
    ],
    answer: 2,
    explanation:
      "Unwanted OS notifications often come from PUPs or adware installed alongside other software, or from abused browser permissions, so remove the program, scan for anything left behind and check the browsers. Do not disturb only hides the symptom, turning off the firewall reduces protection, and clearing event logs destroys troubleshooting evidence.",
  },
  {
    key: "c2-3.4-os-update-failures-1",
    objective: "3.4",
    topic: "OS update failures",
    difficulty: 2,
    question:
      "A PC's Windows updates keep failing. The Windows Update service is disabled again each time the technician sets it back to Manual, and Microsoft Defender's real-time protection is off. What should the technician suspect?",
    options: [
      "A full system drive, which makes Windows disable services automatically",
      "Windows' built-in option that pauses updates for up to five weeks",
      "An expired Microsoft 365 license on the user's account",
      "Malware that disables updates and protection so it can stay on the system",
    ],
    answer: 3,
    explanation:
      "Malware often blocks OS updates and turns off antivirus so it can't be patched out or detected; services that keep being disabled after you fix them, along with disabled protection, point to an infection, so follow the malware removal procedure. A full drive causes update failures but doesn't disable services, pausing updates doesn't disable the service, and Microsoft 365 licensing doesn't control Windows Update.",
  },
  {
    key: "c2-3.4-os-update-failures-2",
    objective: "3.4",
    topic: "OS update failures",
    difficulty: 3,
    question:
      "Windows Update fails on a PC with errors about corrupted components, and a malware scan is clean. Which is the BEST next step?",
    options: [
      "Run chkdsk /f on the C: drive, then format the drive and reinstall the update from scratch",
      "Run DISM /Online /Cleanup-Image /RestoreHealth, then sfc /scannow, then retry the update",
      "Delete the C:\\Windows\\System32 folder, then restart and retry the update",
      "Run whoami /priv to check permissions, then retry the update",
    ],
    answer: 1,
    explanation:
      "DISM repairs the Windows component store that updates depend on, using Windows Update as its source by default, and sfc /scannow then repairs protected system files from that store; once both succeed, retry the update. Formatting the drive destroys the installation, deleting System32 breaks Windows, and whoami /priv only lists the current user's privileges.",
  },
  {
    key: "c2-3.4-browser-performance-1",
    objective: "3.4",
    topic: "degraded browser performance",
    difficulty: 2,
    question:
      "A user's browser has become very slow, and the laptop's fan runs constantly while the browser is open, even with a single news site showing. Which tool helps identify the cause FIRST?",
    options: [
      "Disk Defragment (dfrgui.exe), run on the browser's drive",
      "ipconfig /flushdns, to clear cached DNS lookups",
      "The browser's own task manager (Shift+Esc in Chrome and Edge)",
      "The Security log in Event Viewer (eventvwr.msc)",
    ],
    answer: 2,
    explanation:
      "A browser's task manager lists each tab, extension and process with its CPU and memory use, which quickly reveals a cryptojacking script, a runaway tab or a malicious extension behind the slowdown. Defragmenting doesn't affect the browser's CPU use, flushing DNS clears cached name lookups, and the Security log records sign-ins and audit events rather than browser resource use.",
  },
  {
    key: "c2-3.4-browser-performance-2",
    objective: "3.4",
    topic: "degraded browser performance",
    difficulty: 2,
    question:
      "A browser's task manager shows an extension called PDF Helper using 80% of the CPU at all times, even when no PDFs are open. What is the MOST likely explanation?",
    options: [
      "The browser's cache has grown too large for the drive it's on",
      "The DNS server the PC uses has started responding slowly",
      "The browser's secure DNS setting has been turned off",
      "A malicious extension mining cryptocurrency or committing ad fraud",
    ],
    answer: 3,
    explanation:
      "An extension using heavy CPU while idle is doing hidden work, such as cryptomining or click fraud, which degrades browser performance; remove it and scan the PC. A large cache uses disk space rather than constant CPU, and DNS problems or settings slow page loading rather than making an extension use CPU.",
  },
  {
    key: "c2-3.4-inaccessible-files-1",
    objective: "3.4",
    topic: "inability to access files",
    difficulty: 2,
    question:
      "A user can't open any documents on their PC or on a mapped network share. The files have a new extension, and each folder contains a text file with payment instructions. What should the technician do FIRST?",
    options: [
      "Disconnect the PC from the network, then follow the incident response process",
      "Pay the ransom, so that the files are decrypted as quickly as possible",
      "Rename the files back to their original extensions, then reopen them",
      "Run Disk Cleanup to delete the text files with the payment instructions",
    ],
    answer: 0,
    explanation:
      "Files that won't open, a new extension and payment notes are signs of ransomware, which can keep encrypting any share it can reach, so isolating the PC limits the damage before incident response and restoring from clean backups. Paying guarantees nothing and funds the attackers, renaming doesn't decrypt anything, and deleting the notes destroys evidence without fixing the files.",
  },
];
