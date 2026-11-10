import type { NewQuestion } from "./types";

/** 5.0 Hardware and Network Troubleshooting: the symptoms 220-1201 added. */
export const questions: NewQuestion[] = [
  {
    key: "c1-5.1-crash-screen-1",
    objective: "5.1",
    topic: "proprietary crash screens",
    difficulty: 2,
    question:
      "A Mac restarts on its own, and after it starts up again it shows the message 'Your computer restarted because of a problem.' What happened?",
    options: [
      "macOS had a kernel panic and restarted to recover",
      "An app stopped responding and showed the spinning wait cursor",
      "The Mac failed its power-on self-test",
      "A scheduled software update installed overnight",
    ],
    answer: 0,
    explanation:
      "That message is how macOS reports a kernel panic, a crash in the core of the operating system serious enough to force a restart; repeated panics point to faulty or newly added hardware, a peripheral, or incompatible software. A spinning wait cursor means one app is busy or hung, not a system crash; a failed self-test stops the Mac before macOS loads; and an update doesn't report a problem.",
  },
  {
    key: "c1-5.1-crash-screen-2",
    objective: "5.1",
    topic: "proprietary crash screens",
    difficulty: 2,
    question:
      "A Windows PC showed a full-screen stop error ('Your device ran into a problem and needs to restart') and restarted before the user could note the stop code. Where can the technician find the code?",
    options: [
      "Device Manager",
      "Task Manager's Startup tab",
      "The System log in Event Viewer",
      "The boot order menu in UEFI firmware setup",
    ],
    answer: 2,
    explanation:
      "When Windows starts again after a stop error, it records a BugCheck event with the stop code in the System log, and it saves a memory dump for deeper analysis. The stop error screen is blue on Windows 10 and black on current Windows 11 versions. Device Manager lists hardware, Task Manager's Startup tab manages startup apps, and the boot order menu chooses boot devices; none of them records the stop code.",
  },
  {
    key: "c1-5.1-crash-screen-3",
    objective: "5.1",
    topic: "proprietary crash screens",
    difficulty: 1,
    question:
      "On a Mac, one app shows the spinning rainbow wait cursor and won't respond, but other apps work normally. What should the technician do FIRST?",
    options: [
      "Reinstall macOS using macOS Recovery",
      "Force quit the app (Command-Option-Esc)",
      "Run Apple Diagnostics on the memory",
      "Reset the Mac's firmware password first",
    ],
    answer: 1,
    explanation:
      "The spinning wait cursor, often called the pinwheel, means an app is busy or hung, not that macOS has crashed; since the rest of the system responds, force quitting that app comes first. Reinstalling macOS and running hardware diagnostics are steps for system-wide problems, not one hung app, and the firmware password has nothing to do with an app freezing.",
  },
  {
    key: "c1-5.2-array-missing-1",
    objective: "5.2",
    topic: "drive array missing",
    difficulty: 3,
    question:
      "After a firmware update reset a workstation's UEFI settings to their defaults, it reports 'no bootable device.' Its two drives formed a RAID 1 array on the motherboard's RAID controller, and setup now lists them as two separate disks with no array. What should the technician do?",
    options: [
      "Create a new RAID 1 array from the two disks",
      "Replace both drives with new ones",
      "Replace the CMOS battery on the board",
      "Set the SATA mode back from AHCI to RAID",
    ],
    answer: 3,
    explanation:
      "Resetting UEFI to defaults often switches the SATA controller from RAID mode to AHCI, which hides the array and shows its members as plain disks. Setting the mode back to RAID brings back the existing array with its data. Creating a new array can overwrite the data, the drives haven't failed, and the settings were reset by the update, not by a failing battery.",
  },
  {
    key: "c1-5.2-array-missing-2",
    objective: "5.2",
    topic: "drive array missing",
    difficulty: 3,
    question:
      "A server's RAID controller failed. After the technician installs an identical replacement, the RAID 5 array is missing, and the controller's setup utility reports a 'foreign configuration' on all of the drives. What should the technician do?",
    options: [
      "Import the foreign configuration",
      "Clear the foreign configuration and create a new array",
      "Initialize the drives so the controller can use them",
      "Remove one drive at a time to force a rebuild",
    ],
    answer: 0,
    explanation:
      "The array's layout is stored on the drives themselves, and a new controller sees it as a foreign configuration; importing it rebuilds the array definition from that metadata with the data intact. Clearing the configuration and creating a new array, or initializing the drives, wipes the layout and can destroy the data, and pulling drives would degrade a healthy array.",
  },
  {
    key: "c1-5.2-raid-alarm-1",
    objective: "5.2",
    topic: "audible alarms",
    difficulty: 2,
    question:
      "A file server starts emitting a continuous, high-pitched beep. The operating system is still running, and the RAID management utility shows the virtual disk as degraded. What is making the sound, and what should the technician do next?",
    options: [
      "The motherboard's POST speaker; reseat RAM",
      "The RAID controller; replace the failed drive",
      "The power supply; replace its failing fan",
      "The UPS; check whether the power went out",
    ],
    answer: 1,
    explanation:
      "Many hardware RAID controllers, like many NAS units, sound an audible alarm when an array becomes degraded. With the utility showing a degraded virtual disk, the next step is to identify the failed drive from the utility or its status LED, replace it and let the array rebuild. POST beeps come at startup, not while the OS runs, nothing points to the power supply, and a UPS alarm signals power problems, not a degraded disk.",
  },
  {
    key: "c1-5.2-raid-alarm-2",
    objective: "5.2",
    topic: "audible alarms",
    difficulty: 2,
    question:
      "A NAS in a small office is beeping, and its status page reads 'RAID 5 volume degraded: Disk 3 failed.' The office manager wants to mute the alarm and replace the disk at next month's maintenance window. What should the technician advise?",
    options: [
      "Waiting is fine, because RAID 5 survives two more failures",
      "Muting the alarm also repairs the volume",
      "The data is already lost, so restore from backup today",
      "Redundancy is gone; replace Disk 3 now and confirm backups",
    ],
    answer: 3,
    explanation:
      "A degraded RAID 5 volume still works but has lost its only redundancy, so one more disk failure would destroy it; the alarm is a warning to replace the failed disk promptly and make sure backups are current. RAID 5 tolerates just one failed disk, muting stops the sound without repairing anything, and the data is still intact while the volume is degraded.",
  },
  {
    key: "c1-5.3-sizing-1",
    objective: "5.3",
    topic: "display sizing issues",
    difficulty: 2,
    question:
      "A technician connects a PC to a large TV over HDMI for a conference room. The edges of the desktop, including the taskbar, are cut off. What should the technician do?",
    options: [
      "Replace the HDMI cable with a longer, thicker one",
      "Lower the refresh rate to 30 Hz",
      "Turn off overscan in the TV's settings",
      "Rotate the display orientation to portrait",
    ],
    answer: 2,
    explanation:
      "Many TVs overscan by default, enlarging the picture slightly so its edges fall outside the screen, which crops a computer's desktop. Setting the TV's picture size to its full-pixel mode (names include Just Scan, Screen Fit and PC mode), or adjusting scaling in the graphics driver, shows the whole image. A different cable, a lower refresh rate or portrait orientation doesn't change how the TV scales the picture.",
  },
  {
    key: "c1-5.3-sizing-2",
    objective: "5.3",
    topic: "display sizing issues",
    difficulty: 2,
    question:
      "A user works with a laptop and an external monitor side by side. App windows and text look much larger on the laptop screen than on the monitor, which makes dragging windows between them awkward. Both run at their native resolutions. What should the technician adjust?",
    options: [
      "Each display's Scale setting in Windows",
      "The external monitor's refresh rate",
      "The laptop screen's color profile",
      "Both displays' resolution, set to 1024×768",
    ],
    answer: 0,
    explanation:
      "Windows sets display scaling (Scale, as a percentage) separately for each display, so one screen can draw items much larger than another. Adjusting each display's Scale until items look about the same size fixes it. Refresh rate and color profile don't change size, and dropping both displays to 1024×768 makes everything blurry and out of proportion on widescreen panels.",
  },
  {
    key: "c1-5.3-distortion-1",
    objective: "5.3",
    topic: "distorted images",
    difficulty: 2,
    question:
      "During 3D games, a PC's display breaks up into colored blocks and checkerboard patterns after 10 to 15 minutes, getting worse as the graphics card's temperature climbs. The desktop looks normal. What is the MOST likely cause?",
    options: [
      "The screen resolution doesn't match the monitor's native one",
      "The graphics card is overheating or its memory is failing",
      "The monitor has developed burn-in from the game's interface",
      "The monitor's power cable has worked loose from its socket",
    ],
    answer: 1,
    explanation:
      "Distortion that appears only under 3D load and worsens as the graphics card heats up points to the card itself: usually overheating from clogged fans or heat sinks, or failing video memory. Check its cooling and temperatures, and replace the card if the artifacts continue. A wrong resolution or burn-in would show on the desktop too and wouldn't track temperature, and a loose power cable turns a monitor off rather than drawing colored blocks.",
  },
  {
    key: "c1-5.3-distortion-2",
    objective: "5.3",
    topic: "distorted images",
    difficulty: 2,
    question:
      "After a laptop was closed on a pen, a warped, rainbow-colored patch appears in the same spot on its screen whatever is displayed. An external monitor connected to the laptop shows a clean image. What should the technician do?",
    options: [
      "Update the laptop's graphics driver",
      "Lower the laptop's screen resolution",
      "Replace the laptop's LCD panel",
      "Degauss the laptop's display",
    ],
    answer: 2,
    explanation:
      "Pressure from the pen damaged the LCD's layers, which leaves a distorted, discolored patch that stays in one place whatever is on screen. The clean image on the external monitor shows the graphics hardware and driver are fine, so the panel needs replacing. A driver update or a lower resolution can't repair physical damage, and degaussing was for CRT monitors, not LCDs.",
  },
  {
    key: "c1-5.4-app-install-1",
    objective: "5.4",
    topic: "unable to install new applications",
    difficulty: 1,
    question:
      "A user tries to install a 2 GB game on a phone and gets a message that there isn't enough storage. What should the technician suggest FIRST?",
    options: [
      "Factory reset the phone to clear old files",
      "Turn on airplane mode during the download",
      "Dim the screen while the app installs",
      "Remove unused apps and media to free space",
    ],
    answer: 3,
    explanation:
      "The install fails because the phone lacks free storage, so removing or offloading unused apps and moving photos and videos to cloud storage or a computer makes room. A factory reset erases everything and is a last resort, and neither airplane mode nor screen brightness affects storage.",
  },
  {
    key: "c1-5.4-app-install-2",
    objective: "5.4",
    topic: "unable to install new applications",
    difficulty: 2,
    question:
      "On a company-managed phone, the app store is missing, and the user can't install a note-taking app they need for work. The phone is enrolled in MDM. What is the MOST likely reason?",
    options: [
      "An MDM restriction blocks public app installs",
      "The phone's internal storage is full",
      "The phone's cellular data plan has run out",
      "Low power mode has paused all app downloads",
    ],
    answer: 0,
    explanation:
      "MDM policies can hide the app store and block users from installing apps, with approved apps delivered through the company portal instead, so the user should request the app from IT. Full storage shows an out-of-space message rather than removing the store, an exhausted data plan doesn't make the store disappear, and low power mode can pause background downloads but doesn't remove the store or block installs.",
  },
  {
    key: "c1-5.4-app-install-3",
    objective: "5.4",
    topic: "unable to install new applications",
    difficulty: 2,
    question:
      "A user can't install a banking app because the app store says it requires a newer version of the operating system. The phone's settings show that an OS update is available. What should the technician do?",
    options: [
      "Download the app's install file from a website",
      "Install the OS update, then install the app",
      "Clear the app store's cache",
      "Reset the phone's network settings",
    ],
    answer: 1,
    explanation:
      "The app's minimum OS requirement is higher than the version on the phone, and an update is available, so installing it lets the app install. Sideloading a banking app from a website is a security risk, and clearing the store's cache or resetting network settings doesn't change the OS version.",
  },
  {
    key: "c1-5.4-stylus-1",
    objective: "5.4",
    topic: "stylus does not work",
    difficulty: 1,
    question:
      "A user's active stylus hasn't been used for several weeks and now doesn't respond at all, while finger touch works normally on the tablet. What should the technician check FIRST?",
    options: [
      "Whether the digitizer needs replacing",
      "Whether the screen needs touch recalibration",
      "Whether the stylus battery needs charging",
      "Whether the tablet's storage is full",
    ],
    answer: 2,
    explanation:
      "An active stylus has electronics powered by a battery, which drains over weeks of sitting unused, so charging it, or replacing its battery, is the first check. With finger touch working normally, a failed digitizer or bad calibration is much less likely, and storage space has nothing to do with stylus input.",
  },
  {
    key: "c1-5.4-stylus-2",
    objective: "5.4",
    topic: "stylus does not work",
    difficulty: 2,
    question:
      "An iPad user turned off Bluetooth to save battery. Since then their Apple Pencil doesn't work, although finger touch is fine. What should the technician do?",
    options: [
      "Turn Bluetooth back on and reconnect the Pencil",
      "Replace the iPad's screen and digitizer",
      "Turn on Wi-Fi so the Pencil can reconnect",
      "Reset all of the iPad's settings to factory defaults",
    ],
    answer: 0,
    explanation:
      "Apple Pencil connects to the iPad over Bluetooth, so with Bluetooth off the iPad stops responding to it; turning Bluetooth back on, and pairing again if needed, restores it. Finger touch shows the screen works, Wi-Fi plays no part in the Pencil's connection, and a full settings reset is unnecessary.",
  },
  {
    key: "c1-5.4-stylus-3",
    objective: "5.4",
    topic: "stylus does not work",
    difficulty: 2,
    question:
      "A user bought an active stylus advertised for a different brand of tablet. It doesn't work at all on the user's tablet, although a basic rubber-tipped stylus does. What is the MOST likely cause?",
    options: [
      "The tablet's touch screen is cracked",
      "The tablet needs a screen protector",
      "The rubber-tipped stylus drained the tablet's battery",
      "Its pen technology isn't one the tablet supports",
    ],
    answer: 3,
    explanation:
      "Active styluses use different pen technologies that mostly aren't interchangeable, and each works only with screens built for it, so a stylus made for another brand often does nothing at all. A basic rubber-tipped stylus works on any capacitive touch screen, which also shows the screen isn't damaged. A screen protector doesn't add pen support, and a passive stylus draws no power.",
  },
  {
    key: "c1-5.4-slow-device-1",
    objective: "5.4",
    topic: "degraded performance",
    difficulty: 2,
    question:
      "An older iPhone has become noticeably slow, especially when opening apps. Its battery health screen reports that performance management has been applied after an unexpected shutdown. What will MOST likely restore its performance?",
    options: [
      "Deleting old text messages",
      "Replacing the battery",
      "Turning off location services",
      "Resetting the network settings",
    ],
    answer: 1,
    explanation:
      "When a worn battery can't deliver peak power, iOS applies performance management to prevent unexpected shutdowns, which slows the phone; a new battery removes the need for it. Deleting messages, turning off location services and resetting network settings don't address the weak battery that is limiting performance.",
  },
  {
    key: "c1-5.4-slow-device-2",
    objective: "5.4",
    topic: "degraded performance",
    difficulty: 2,
    question:
      "A phone runs smoothly at first, but after 20 minutes of gaming in a thick case on a hot day it becomes very warm and the game starts to stutter. What is the MOST likely cause?",
    options: [
      "Thermal throttling of the processor",
      "A SIM card that has started to fail",
      "Display burn-in from the game's controls",
      "An app license that expired mid-game",
    ],
    answer: 0,
    explanation:
      "Phones slow their processors when they get hot, to protect the chip and battery, so long gaming sessions in a thick case on a hot day lead to stuttering. Letting the phone cool, removing the case and closing background apps help. A SIM card doesn't affect processing speed, burn-in is a lasting image on the screen, and an expired license would stop the app rather than slow it.",
  },
  {
    key: "c1-5.5-auth-failure-1",
    objective: "5.5",
    topic: "authentication failures",
    difficulty: 2,
    question:
      "After a router upgrade, the office Wi-Fi was set to WPA3-Personal only. Most devices connect, but an older laptop fails to join even with the correct passphrase. Without replacing hardware, what should the technician do?",
    options: [
      "Give the laptop a static IP address",
      "Turn off DHCP on the router",
      "Use WPA2/WPA3 transition mode on 2.4 and 5 GHz",
      "Start the laptop in Safe Mode with Networking",
    ],
    answer: 2,
    explanation:
      "An older adapter or driver that doesn't support WPA3 can't complete WPA3 authentication, however correct the passphrase. WPA2/WPA3 transition mode lets WPA3 devices use WPA3 while older ones still join with WPA2 (6 GHz stays WPA3-only), and a newer Wi-Fi driver may add WPA3 support. A static IP, turning off DHCP and Safe Mode don't affect authentication.",
  },
  {
    key: "c1-5.5-auth-failure-2",
    objective: "5.5",
    topic: "authentication failures",
    difficulty: 3,
    question:
      "At 8:00 a.m., every user on a company's 802.1X (WPA2-Enterprise) Wi-Fi suddenly fails to authenticate, although the wired network works. The RADIUS server's log shows its server certificate expired overnight. What should the technician do?",
    options: [
      "Move the access points to a different channel",
      "Renew the RADIUS server's certificate",
      "Reset every user's password",
      "Increase the DHCP lease time",
    ],
    answer: 1,
    explanation:
      "In 802.1X, clients check the RADIUS server's certificate before sending their credentials, so an expired server certificate makes authentication fail for everyone at once. Renewing it, and making sure clients trust the new one, restores access. A channel change affects interference, not authentication, the users' passwords are fine, and DHCP only happens after a client has authenticated.",
  },
  {
    key: "c1-5.5-auth-failure-3",
    objective: "5.5",
    topic: "authentication failures",
    difficulty: 2,
    question:
      "A user changed their domain password this morning. Since then their account keeps getting locked out, even though they type the new password correctly on their PC. Their phone joins the company's 802.1X Wi-Fi with their domain credentials. What is the MOST likely cause?",
    options: [
      "The PC's clock is several minutes fast",
      "The access point's firmware is out of date",
      "The PC's DNS cache holds a corrupt entry",
      "The phone keeps retrying the old password",
    ],
    answer: 3,
    explanation:
      "Devices that saved the old password, like the phone's Wi-Fi profile, keep trying it automatically, and each failure counts toward the lockout threshold. Updating the password on the phone, or forgetting and rejoining the network, stops the lockouts. A clock that's off causes sign-in errors rather than lockouts after a password change, AP firmware doesn't lock accounts, and a DNS cache problem affects name resolution, not the account.",
  },
  {
    key: "c1-5.5-intermittent-internet-1",
    objective: "5.5",
    topic: "intermittent internet connectivity",
    difficulty: 2,
    question:
      "Users report that the internet drops for a minute or two several times a day, but the internal file server always stays reachable. During a drop, a continuous ping to the default gateway keeps replying while a ping to a public IP address times out. Where is the problem MOST likely?",
    options: [
      "The modem or the ISP connection",
      "The network adapters in the users' PCs",
      "The office's internal switch",
      "The DNS cache on each PC",
    ],
    answer: 0,
    explanation:
      "Replies from the default gateway show that the PCs, cabling and switch reach the router, while pings to a public IP failing at the same moment point beyond it: to the modem, the router's WAN link or the ISP's service. Failing adapters or a failing switch would also cut off the file server and gateway, and DNS isn't involved when pinging an IP address.",
  },
  {
    key: "c1-5.5-intermittent-internet-2",
    objective: "5.5",
    topic: "intermittent internet connectivity",
    difficulty: 2,
    question:
      "A user says websites sometimes fail to load with 'server not found,' then work a minute later. During a failure, the technician can ping 8.8.8.8 and the default gateway, but nslookup times out for every name. What is the MOST likely cause?",
    options: [
      "A failing network cable",
      "An expired DHCP lease",
      "An unreliable DNS server",
      "A browser cache that is full",
    ],
    answer: 2,
    explanation:
      "Pings to an internet IP address work, so the connection itself is up; only name resolution fails, which points to the configured DNS server. Switching to a reliable DNS server, or fixing the current one, solves it. A bad cable or an expired lease would break the pings too, and a browser cache doesn't stop nslookup from resolving names.",
  },
  {
    key: "c1-5.6-tray-1",
    objective: "5.6",
    topic: "tray not recognized",
    difficulty: 2,
    question:
      "A technician adds an optional 500-sheet tray to a network printer. The printer's configuration page lists the new tray, but the Windows print dialog still offers only the original trays. What should the technician do?",
    options: [
      "Reseat the tray with the printer off",
      "Update the printer's IP address",
      "Restart the Print Spooler service",
      "Enable the tray in the driver's settings",
    ],
    answer: 3,
    explanation:
      "The printer detects the tray, so the gap is in Windows: many drivers keep a list of installed accessories, and the tray must be enabled under installable options on the printer properties' Device Settings tab, or detected with the driver's automatic configuration. Reseating isn't needed when the printer already lists the tray, the IP address doesn't affect tray choices, and restarting the spooler doesn't change the driver's accessory settings.",
  },
  {
    key: "c1-5.6-tray-2",
    objective: "5.6",
    topic: "tray not recognized",
    difficulty: 2,
    question:
      "After an optional paper tray is installed, the printer's control panel doesn't show it, and the printer's configuration page doesn't list it either. What should the technician check FIRST?",
    options: [
      "That the tray is fully seated on its connector",
      "That the tray is enabled in the Windows driver",
      "That the print queue is empty",
      "That the toner cartridge is full",
    ],
    answer: 0,
    explanation:
      "If the printer itself doesn't see the tray, the problem is physical: the tray has to sit fully on its alignment pins and connector, and manufacturers say to install trays with the printer turned off because it checks for them at startup. Driver settings only matter after the printer detects the tray, and the print queue and toner level don't affect tray detection.",
  },
  {
    key: "c1-5.6-printer-offline-1",
    objective: "5.6",
    topic: "connectivity issues",
    difficulty: 2,
    question:
      "A user set up a new wireless printer, but no computer in the office can find it. The printer's configuration page shows it joined the office's guest Wi-Fi network, which keeps clients isolated from the main network. What should the technician do?",
    options: [
      "Connect the printer to the main office Wi-Fi network",
      "Reinstall the printer's driver on every computer",
      "Turn on client isolation for the main network too",
      "Give the printer a static IP on the guest network",
    ],
    answer: 0,
    explanation:
      "Guest networks usually isolate their clients from the main network, so computers on the office network can't reach a printer on the guest Wi-Fi. Connecting the printer to the main network puts it where the computers can find it. Reinstalling drivers doesn't change which network the printer is on, client isolation would block the printer on the main network too, and a static address on the guest network is still isolated.",
  },
  {
    key: "c1-5.6-printer-offline-2",
    objective: "5.6",
    topic: "connectivity issues",
    difficulty: 1,
    question:
      "The office changed its Wi-Fi passphrase yesterday. Today the wireless printer shows as offline on every computer, while the computers, already updated with the new passphrase, work normally. What should the technician do?",
    options: [
      "Replace the printer's wireless network card",
      "Change the printer's default paper size setting",
      "Reconnect the printer using the new passphrase",
      "Give every computer a static IP address instead",
    ],
    answer: 2,
    explanation:
      "The printer is still using the old passphrase, so it can't join the network. Reconnecting it with the new passphrase from its control panel or setup tool brings it back online. Its network card isn't faulty, paper size has nothing to do with connectivity, and the computers' addressing isn't the problem.",
  },
  {
    key: "c1-5.6-print-queue-1",
    objective: "5.6",
    topic: "frozen print queue",
    difficulty: 2,
    question:
      "Everyone in an office prints through a shared queue on a Windows print server, and the queue has frozen for all users. A technician restarts the Print Spooler service on one user's PC, but nothing changes. What should the technician do next?",
    options: [
      "Restart the Print Spooler on every user's PC",
      "Restart the Print Spooler on the print server",
      "Reinstall the printer driver on the technician's PC",
      "Power cycle the switch the printer is connected to",
    ],
    answer: 1,
    explanation:
      "A shared queue lives on the print server, so that server's Print Spooler service holds the stuck jobs; restarting it there, and clearing a stuck job if needed, frees the queue for everyone. Restarting the spooler on client PCs only affects their own local queues, a driver on one PC doesn't control the server's queue, and the switch isn't involved when jobs are stuck in a spooler.",
  },
  {
    key: "c1-5.6-print-queue-2",
    objective: "5.6",
    topic: "frozen print queue",
    difficulty: 2,
    question:
      "Restarting the Print Spooler service didn't free a frozen print queue, so the technician will clear the spool folder (C:\\Windows\\System32\\spool\\PRINTERS) by hand. In which order should the steps be done?",
    options: [
      "Delete the spool files, then stop and start the Print Spooler",
      "Start the Print Spooler, delete the printer, then stop it",
      "Stop the Print Spooler, delete the spool files, then start it",
      "Stop the Print Spooler, reinstall the driver, then reboot",
    ],
    answer: 2,
    explanation:
      "The stuck job's files stay locked while the spooler runs, so the service must be stopped first; then the files in the spool folder can be deleted, and starting the service again brings up an empty queue. Deleting first fails because the files are in use, stopping the service last leaves printing turned off, and reinstalling the driver doesn't remove the stuck job.",
  },
];
