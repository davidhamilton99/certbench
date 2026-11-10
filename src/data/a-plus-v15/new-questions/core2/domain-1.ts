import type { NewQuestion } from "./types";

/** New questions for 220-1202 Domain 1.0, Operating Systems: the topics V15 added. */
export const questions: NewQuestion[] = [
  {
    key: "c2-1.1-refs-1",
    objective: "1.1",
    topic: "ReFS",
    difficulty: 2,
    question:
      "A file server keeps large archives on a Storage Spaces mirror. The administrator wants the file system itself to detect corrupted data with checksums and repair it from the mirror's good copy while the volume stays online. Which file system should the volume use?",
    options: ["NTFS", "ReFS", "exFAT", "FAT32"],
    answer: 1,
    explanation:
      "ReFS (Resilient File System) keeps checksums, called integrity streams, and on a Storage Spaces mirror or parity space it repairs corrupted data from the other copy without taking the volume offline. NTFS has no checksums on file data, so it can't detect silent corruption, and exFAT and FAT32 are simple file systems for removable media with no integrity checking or self-repair.",
  },
  {
    key: "c2-1.1-refs-2",
    objective: "1.1",
    topic: "ReFS",
    difficulty: 2,
    question:
      "A technician building a new Windows workstation asks whether the system drive can be formatted with ReFS for its resiliency features. What should the technician be told?",
    options: [
      "ReFS can't be used for the volume Windows boots from; the system drive must use NTFS",
      "ReFS works on the system drive only when BitLocker is turned off",
      "ReFS is supported on the system drive only in Windows 11 Home, which boots from ReFS by default",
      "ReFS must be on the system drive before TPM 2.0 can be enabled",
    ],
    answer: 0,
    explanation:
      "Microsoft lists ReFS as not bootable, so Windows itself goes on an NTFS volume, and ReFS suits data volumes such as file shares, backup targets and virtual machine storage. BitLocker works on both NTFS and ReFS, no edition makes ReFS bootable, and the TPM is a hardware security chip that doesn't depend on any file system.",
  },
  {
    key: "c2-1.1-refs-3",
    objective: "1.1",
    topic: "ReFS",
    difficulty: 2,
    question:
      "A technician wants to format a 256 GB USB flash drive with ReFS to get its integrity checking. What will the technician find?",
    options: [
      "ReFS works on the drive, but only with a 4 KB cluster size and a GPT partition table",
      "ReFS formats the drive and also makes it bootable",
      "ReFS isn't supported on removable media, so the drive should use exFAT or NTFS",
      "ReFS works on the drive only if it uses MBR partitioning",
    ],
    answer: 2,
    explanation:
      "Microsoft lists removable media among the things ReFS doesn't support, along with booting Windows, disk quotas and shrinking a volume. exFAT suits flash drives shared between Windows and macOS, and NTFS adds permissions and journaling for Windows-only use. No cluster size or partition style makes ReFS work on removable drives, and ReFS volumes aren't bootable.",
  },
  {
    key: "c2-1.1-xfs-1",
    objective: "1.1",
    topic: "XFS",
    difficulty: 1,
    question:
      "A technician installs Red Hat Enterprise Linux 9 with the default storage layout, then checks the file system type of the root volume. Which file system is the technician MOST likely to see?",
    options: ["ext4", "APFS", "ReFS", "XFS"],
    answer: 3,
    explanation:
      "XFS has been the default file system in Red Hat Enterprise Linux since version 7, when it replaced ext4. It's a 64-bit journaling file system built for large files and volumes. ext4 is still common, for example as Ubuntu's default, but isn't RHEL's; APFS is Apple's file system for macOS and iOS; and ReFS is a Microsoft file system that Linux installers don't use.",
  },
  {
    key: "c2-1.1-xfs-2",
    objective: "1.1",
    topic: "XFS",
    difficulty: 3,
    question:
      "A Linux server's /data volume uses XFS on an LVM logical volume. The administrator has extended the logical volume and now needs the file system to use the new space. Which command should the administrator run while /data is mounted?",
    options: [
      "sudo resize2fs /data",
      "sudo fsck.xfs /dev/vg0/data",
      "sudo mkfs.xfs /dev/vg0/data",
      "sudo xfs_growfs /data",
    ],
    answer: 3,
    explanation:
      "xfs_growfs grows a mounted XFS file system into space added to its device. Red Hat documents that an XFS file system can be grown but not reduced, so size it with that in mind. resize2fs resizes ext2, ext3 and ext4; fsck.xfs does nothing and exits, because XFS recovers its journal at mount time (xfs_repair is the real repair tool); and mkfs.xfs creates a new, empty file system, which would destroy the data rather than grow it.",
  },
  {
    key: "c2-1.1-xfs-3",
    objective: "1.1",
    topic: "XFS",
    difficulty: 2,
    question:
      "A user connects an external drive that was formatted with XFS on a Linux server to a Windows 11 PC. The drive doesn't appear in File Explorer, and Disk Management shows its partition with no recognized file system. What is the MOST likely reason?",
    options: [
      "The drive must be defragmented before Windows can read it",
      "Windows can't read XFS on its own, so it doesn't recognize the volume",
      "XFS drives can be read in Windows only after BitLocker To Go is enabled",
      "The drive is larger than any Windows file system supports",
    ],
    answer: 1,
    explanation:
      "Windows natively reads NTFS, ReFS, FAT32 and exFAT, but not Linux file systems such as XFS or ext4 (WSL 2 can mount them, but File Explorer can't read them by itself). Copy the files off on a Linux system, and use exFAT for drives shared between operating systems. Defragmenting doesn't change the file system, BitLocker To Go encrypts drives rather than adding file system support, and NTFS handles far larger volumes than an external drive.",
  },
  {
    key: "c2-1.2-multiboot-1",
    objective: "1.2",
    topic: "multiboot",
    difficulty: 2,
    question:
      "A developer wants one laptop to start either Windows 11 or Ubuntu, choosing at power-on. Windows 11 is already installed and uses the whole drive. Which approach BEST sets this up?",
    options: [
      "Shrink the Windows partition, install Ubuntu into the free space, and pick an OS from the boot menu at startup",
      "Install Ubuntu over the Windows partition, then reinstall Windows into a folder inside Ubuntu's home directory",
      "Convert the drive from GPT to MBR so both operating systems can share a single partition",
      "Run Ubuntu inside Windows Sandbox and set it to launch automatically at sign-in",
    ],
    answer: 0,
    explanation:
      "Multiboot keeps each operating system on its own partition and uses a boot menu to choose one at startup. Shrinking the Windows partition frees space for Ubuntu, whose installer sets up the GRUB menu. Installing over Windows would erase it, and an OS can't be installed into a folder; changing to MBR doesn't let two operating systems share a partition; and Windows Sandbox runs only a temporary copy of Windows, not Linux.",
  },
  {
    key: "c2-1.2-multiboot-2",
    objective: "1.2",
    topic: "multiboot",
    difficulty: 3,
    question:
      "A PC was set up to multiboot Linux and Windows 11. After Windows is reinstalled, the PC starts straight into Windows with no boot menu, though the Linux partition is intact. What is the MOST likely cause?",
    options: [
      "Windows Setup converted the Linux partition to NTFS during the reinstall",
      "Clearing the TPM during the reinstall deleted the Linux kernel files",
      "Windows Setup made Windows Boot Manager the default boot entry, so the Linux bootloader's menu no longer loads",
      "Secure Boot was turned off during the reinstall, so the firmware now hides every operating system except Windows",
    ],
    answer: 2,
    explanation:
      "Windows Setup installs Windows Boot Manager, makes it the default and doesn't add entries for other operating systems, so the GRUB menu that offered Linux stops appearing; that's also why Windows is usually installed first when multibooting. Putting GRUB first in the firmware's boot order, or repairing GRUB from a live USB, brings the menu back. Windows doesn't convert other partitions, clearing a TPM erases its keys rather than files on disk, and turning off Secure Boot lets more boot loaders run, not fewer.",
  },
  {
    key: "c2-1.2-zero-touch-1",
    objective: "1.2",
    topic: "zero-touch deployment",
    difficulty: 2,
    question:
      "A company ships new laptops straight from the vendor to remote employees. An employee powers one on, connects to Wi-Fi and signs in with a work account, and the laptop then joins the company directory, enrolls in device management and installs its apps with no technician involved. Which installation type is this?",
    options: ["Zero-touch deployment", "Repair installation", "Remote network installation", "Recovery partition"],
    answer: 0,
    explanation:
      "In a zero-touch deployment, devices configure themselves from the cloud when first started, as Windows Autopilot does: the user connects to a network and signs in, and the rest is automated. A repair installation reinstalls Windows over itself to fix problems, a remote network installation boots a PC from a deployment server to install an OS, and a recovery partition restores a device to its factory image.",
  },
  {
    key: "c2-1.2-zero-touch-2",
    objective: "1.2",
    topic: "zero-touch deployment",
    difficulty: 2,
    question:
      "An IT manager wants new Windows laptops to be ready for work without building and maintaining a custom image for every model. How do zero-touch services such as Windows Autopilot achieve this?",
    options: [
      "They copy a complete disk image to each laptop from a USB drive that a technician carries to every desk in turn",
      "They take the manufacturer's preinstalled Windows and apply the company's settings and apps from the cloud",
      "They require each laptop to boot from the network so that a technician can choose the right image",
      "They install Windows on each laptop from a DVD and an answer file prepared for that model",
    ],
    answer: 1,
    explanation:
      "Windows Autopilot starts from the manufacturer's preinstalled Windows and turns it into a business-ready device by applying settings, policies and apps from cloud services, so there's no custom image per model to maintain. Copying an image from USB, booting from the network to pick an image and installing from DVD all need a technician to handle each device, which is what zero-touch removes.",
  },
  {
    key: "c2-1.3-tpm-1",
    objective: "1.3",
    topic: "TPM",
    difficulty: 2,
    question:
      "Microsoft's PC Health Check says a three-year-old desktop can't run Windows 11 because TPM 2.0 isn't detected. The motherboard manual says the CPU includes a firmware TPM. What should the technician do FIRST?",
    options: [
      "Replace the motherboard with one that has a discrete TPM 2.0 chip",
      "Install the 32-bit edition of Windows 11, which doesn't need a TPM",
      "Turn off Secure Boot in the UEFI settings so that Windows Setup can detect the TPM chip",
      "Turn on the CPU's firmware TPM (Intel PTT or AMD fTPM) in the UEFI settings",
    ],
    answer: 3,
    explanation:
      "Many CPUs include a firmware TPM 2.0 that is often disabled by default; turning on Intel PTT or AMD fTPM in the UEFI settings usually lets the PC pass the TPM check. Replacing the motherboard is unnecessary until that's ruled out, Windows 11 has no 32-bit edition, and Secure Boot has nothing to do with detecting the TPM (Windows 11 separately requires firmware that is Secure Boot capable).",
  },
  {
    key: "c2-1.3-tpm-2",
    objective: "1.3",
    topic: "TPM",
    difficulty: 1,
    question: "Which of the following BEST describes what a Trusted Platform Module (TPM) provides to Windows 11?",
    options: [
      "Firmware that replaces the legacy BIOS and starts the operating system from a GPT-partitioned disk",
      "A hidden partition that holds the Windows Recovery Environment and factory image",
      "A hardware chip that generates and protects keys for features such as BitLocker and Windows Hello",
      "A background service that downloads and installs feature updates for Windows",
    ],
    answer: 2,
    explanation:
      "A TPM is a secure crypto-processor that creates and protects keys: BitLocker can seal its encryption key to the TPM, and Windows Hello keys are protected by it. Windows 11 requires TPM 2.0. Firmware that replaces the BIOS and boots from GPT disks is UEFI, the recovery environment lives on a recovery partition, and feature updates come from Windows Update.",
  },
  {
    key: "c2-1.3-uefi-1",
    objective: "1.3",
    topic: "UEFI",
    difficulty: 3,
    question:
      "A Windows 10 PC fails the Windows 11 compatibility check because its firmware runs in legacy BIOS (CSM) mode and its system disk uses MBR. The firmware supports UEFI. How can the technician fix this while keeping the existing installation and data?",
    options: [
      "Switch the firmware to UEFI mode first, and Windows converts the disk to GPT at the next start",
      "Use Disk Management to convert the system disk to a dynamic disk, then upgrade",
      "Reformat the Windows partition as exFAT, which UEFI requires, then restore the data",
      "Run MBR2GPT to convert the system disk to GPT, then switch the firmware to UEFI mode",
    ],
    answer: 3,
    explanation:
      "UEFI starts Windows from a GPT disk, and Microsoft's MBR2GPT tool converts the system disk from MBR to GPT without deleting data; Microsoft notes the firmware must then be switched to UEFI mode for the PC to start. Switching the firmware first leaves an MBR disk that won't boot in UEFI mode, and Windows doesn't convert it. A dynamic disk keeps its partition style, and the Windows volume stays NTFS (only the small EFI system partition is FAT32).",
  },
  {
    key: "c2-1.3-uefi-2",
    objective: "1.3",
    topic: "UEFI",
    difficulty: 1,
    question: "Which firmware requirement must a PC meet to run Windows 11?",
    options: [
      "Legacy BIOS with the Compatibility Support Module turned on",
      "UEFI firmware that is Secure Boot capable",
      "Any firmware, provided the system disk uses MBR",
      "Firmware that can start the PC from optical media",
    ],
    answer: 1,
    explanation:
      "Microsoft's Windows 11 requirements list UEFI firmware that is Secure Boot capable, alongside TPM 2.0. Legacy BIOS and CSM mode don't meet the requirement, MBR is the older partition style that goes with BIOS booting, and starting from optical media isn't a requirement at all.",
  },
  {
    key: "c2-1.3-windows-11-editions-1",
    objective: "1.3",
    topic: "Windows 11 editions",
    difficulty: 1,
    question:
      "A small accounting firm is buying laptops that must join its Active Directory domain and be managed with Group Policy. Which is the LEAST expensive Windows 11 edition that meets this need?",
    options: ["Windows 11 Home", "Windows 11 Enterprise", "Windows 11 Pro", "Windows 11 Pro for Workstations"],
    answer: 2,
    explanation:
      "Windows 11 Pro can join an Active Directory domain and includes the Local Group Policy Editor (gpedit.msc) and BitLocker. Home can't join a domain and has no gpedit.msc. Enterprise and Pro for Workstations can also join a domain, but they cost more and add features the firm doesn't need.",
  },
  {
    key: "c2-1.3-windows-11-editions-2",
    objective: "1.3",
    topic: "Windows 11 editions",
    difficulty: 2,
    question:
      "A video editor's new workstation has 256 GB of RAM. Which Windows 11 edition would leave about half of that memory unused?",
    options: ["Windows 11 Home", "Windows 11 Pro", "Windows 11 Enterprise", "Windows 11 Pro for Workstations"],
    answer: 0,
    explanation:
      "Windows 11 Home supports up to 128 GB of RAM, so half of the 256 GB would go unused. Windows 11 Pro supports up to 2 TB, and Enterprise and Pro for Workstations support up to 6 TB, so all three can use the full 256 GB.",
  },
  {
    key: "c2-1.3-windows-11-editions-3",
    objective: "1.3",
    topic: "Windows 11 editions",
    difficulty: 2,
    question:
      "A home user running Windows 11 Home wants BitLocker, and wants to connect to this PC with Remote Desktop from work. What is the simplest way to get both while keeping their apps and files?",
    options: [
      "Do a clean install of Windows 11 Enterprise from a USB drive",
      "Turn on Device encryption, and use Quick Assist whenever a remote connection is needed",
      "Install the Media Feature Pack from Settings > Apps > Optional features",
      "Upgrade to Windows 11 Pro with a Pro product key, an in-place edition upgrade",
    ],
    answer: 3,
    explanation:
      "Entering a Pro product key (Settings > System > Activation) upgrades Home to Pro in place, keeping apps and files, and Pro adds BitLocker and the ability to host Remote Desktop sessions. A clean install wipes the PC, and Enterprise is sold through business licensing. Device encryption is a simplified form of drive encryption without BitLocker's management options, and Quick Assist needs someone at the PC to accept each session. The Media Feature Pack only restores media components to N editions.",
  },
  {
    key: "c2-1.3-n-versions-1",
    objective: "1.3",
    topic: "N versions",
    difficulty: 2,
    question:
      "A user in Europe bought a PC with Windows 11 Pro N. Videos won't play in some apps, and the Camera app reports missing media components. What should the technician do?",
    options: [
      "Install the Media Feature Pack from Settings > Apps > Optional features",
      "Reinstall Windows 11 Pro N from the recovery partition",
      "Change the edition to Windows 11 Home, which includes the media components",
      "Run sfc /scannow to restore the missing media files",
    ],
    answer: 0,
    explanation:
      "N editions ship without Windows Media Player and related technologies such as Media Foundation and several audio and video codecs, which apps like Camera depend on. Microsoft's Media Feature Pack, added from Settings > Apps > Optional features, restores them. Reinstalling Pro N gives the same result, going from Pro to Home is a downgrade that loses features and needs a reinstall, and sfc repairs damaged system files but can't add components the edition never included.",
  },
  {
    key: "c2-1.5-whoami-1",
    objective: "1.5",
    topic: "whoami",
    difficulty: 1,
    question:
      "A technician is working at a shared workstation and isn't sure which account an open command prompt is running as. Which command displays the current domain and user name?",
    options: ["hostname", "whoami", "net use", "winver"],
    answer: 1,
    explanation:
      "whoami shows the domain and user name of the account the prompt runs as, such as CORP\\jsmith. hostname shows the computer's name, net use lists or connects mapped network drives, and winver shows the Windows version and build.",
  },
  {
    key: "c2-1.5-whoami-2",
    objective: "1.5",
    topic: "whoami",
    difficulty: 2,
    question:
      "A user says a share still denies access, though IT added them to the Finance group an hour ago. Which command shows the groups in the user's current sign-in token, so the technician can see whether Finance is there yet?",
    options: ["gpupdate /force", "whoami /upn", "whoami /groups", "net user /domain"],
    answer: 2,
    explanation:
      "whoami /groups lists the groups in the current access token. A new group membership reaches the token only when the user signs in again, so if Finance is missing, the user should sign out and back in. gpupdate /force refreshes Group Policy but doesn't show or refresh group membership, whoami /upn shows only the user principal name, and net user /domain lists the domain's user accounts.",
  },
  {
    key: "c2-1.8-system-folders-1",
    objective: "1.8",
    topic: "macOS system folders",
    difficulty: 2,
    question:
      "A Mac app keeps crashing for one user, and the vendor says to delete the app's preference file for that user only. In which folder should the technician look?",
    options: [
      "/Library/Preferences",
      "/Users/<username>/Library/Preferences",
      "/System/Library/Preferences",
      "/Applications/Utilities",
    ],
    answer: 1,
    explanation:
      "Each user's own settings live in the Library folder inside their home folder (/Users/<username>/Library, also written ~/Library), which Finder hides; hold Option and choose Go > Library to open it. /Library holds resources shared by every user on the Mac, /System holds macOS itself on a read-only system volume, and /Applications/Utilities holds tools such as Terminal and Disk Utility.",
  },
  {
    key: "c2-1.8-system-folders-2",
    objective: "1.8",
    topic: "macOS system folders",
    difficulty: 2,
    question:
      "Malware on a Mac running a current version of macOS tries to replace files in the /System folder. Why does this fail, even when the malware has an administrator's password?",
    options: [
      "/System is on a separate, read-only system volume, kept apart from the volume that holds user data",
      "/System is encrypted by FileVault, which blocks every write to the startup disk while the Mac is running",
      "/System is synced to iCloud Drive, so any changes are rolled back from the cloud",
      "/System is hidden in Finder, so programs can't find the files inside it",
    ],
    answer: 0,
    explanation:
      "Since macOS Catalina, macOS runs from a dedicated read-only system volume that is separate from the data volume holding users' files, which keeps critical OS files from being overwritten. FileVault encrypts the disk against offline access but doesn't make files read-only, iCloud Drive syncs user documents rather than system files, and /System isn't hidden; even a hidden folder can be opened by path.",
  },
  {
    key: "c2-1.8-rsr-1",
    objective: "1.8",
    topic: "Rapid Security Response (RSR)",
    difficulty: 2,
    question:
      "A technician checking a MacBook sees the macOS version shown as 13.3.1 (a). What does the letter in parentheses indicate?",
    options: [
      "A beta build from Apple's developer program is installed on this Mac",
      "The Mac is running a release made only for Apple silicon",
      "A Rapid Security Response has been applied on top of macOS 13.3.1",
      "The installation hasn't been activated with an Apple ID",
    ],
    answer: 2,
    explanation:
      "Apple marked Rapid Security Responses with a letter after the version number, its own example being macOS 13.3.1 (a). RSRs, first delivered for iOS 16.4.1 and macOS 13.3.1, installed urgent security fixes between full software updates. Beta builds are labeled as betas, the letter has nothing to do with Apple silicon, and macOS has no activation step.",
  },
  {
    key: "c2-1.8-rsr-2",
    objective: "1.8",
    topic: "Rapid Security Response (RSR)",
    difficulty: 3,
    question:
      "After a Rapid Security Response is applied to an iPhone, a user's banking app starts crashing, and the bank confirms an incompatibility with the response. What can the technician do?",
    options: [
      "Download the previous major version of iOS from the App Store and install it over the current one",
      "Turn off Automatic Updates, which uninstalls every update since the phone was set up",
      "Reset the phone's network settings, which rolls back the most recent security response",
      "Remove the security response in Settings > General > About, returning to the base iOS version",
    ],
    answer: 3,
    explanation:
      "Apple let users remove a Rapid Security Response (Settings > General > About > iOS Version > Remove Security Response), returning the device to the base version; the fix could be reinstalled later or arrive with the next standard update. iOS can't be rolled back to an earlier major version from the App Store, turning off automatic updates only stops future installs, and resetting network settings doesn't touch installed software. Starting with iOS 26.1 and macOS 26.1, Apple delivers these quick fixes as Background Security Improvements.",
  },
  {
    key: "c2-1.8-icloud-1",
    objective: "1.8",
    topic: "iCloud features",
    difficulty: 2,
    question:
      "A Mac user wants the files on their Desktop and in their Documents folder to appear on their iPhone and on a second Mac, and new files there to sync automatically. Which setting should the technician turn on?",
    options: [
      "Time Machine, backing up the whole Mac to an external drive every hour",
      "Desktop & Documents Folders, under iCloud Drive in System Settings",
      "FileVault, under Privacy & Security in System Settings",
      "AirDrop, set so that everyone nearby can send files",
    ],
    answer: 1,
    explanation:
      "Turning on Desktop & Documents Folders (System Settings > [your name] > iCloud > Drive) moves those folders' files into iCloud Drive and stores new files there automatically, so they appear on every device signed in to the same Apple Account. Time Machine makes backups rather than syncing, FileVault encrypts the startup disk, and AirDrop sends individual files to nearby devices on demand.",
  },
  {
    key: "c2-1.8-icloud-2",
    objective: "1.8",
    topic: "iCloud features",
    difficulty: 1,
    question:
      "On a user's iPhone, messages to a coworker who has an iPhone appear in blue bubbles, but messages to a friend with an Android phone appear in green. What explains the difference?",
    options: [
      "Blue ones are iMessages sent over the internet between Apple devices; green ones are SMS, MMS or RCS",
      "Blue ones are encrypted with FileVault on both of the phones, while green ones aren't encrypted at all",
      "Green ones failed to send and are waiting in a queue until the phone retries them",
      "Blue ones are sent through FaceTime, while green ones are relayed through iCloud Drive",
    ],
    answer: 0,
    explanation:
      "iMessage is Apple's messaging service: it works over Wi-Fi or cellular data between Apple devices, shows blue bubbles and is end-to-end encrypted. Messages to other phones go through the carrier as SMS, MMS or RCS and show green. FileVault encrypts a Mac's disk, not messages; a message that fails shows a red Not Delivered alert rather than a green bubble; and FaceTime is for calls while iCloud Drive stores files.",
  },
  {
    key: "c2-1.8-continuity-1",
    objective: "1.8",
    topic: "Continuity",
    difficulty: 1,
    question:
      "A user copies a paragraph on their iPhone and wants to paste it straight into a document on their Mac without emailing it. Which Continuity feature does this?",
    options: ["Sidecar", "Time Machine", "Mission Control", "Universal Clipboard"],
    answer: 3,
    explanation:
      "Universal Clipboard, part of Continuity, lets you copy text, images and other content on one Apple device and paste it on another nearby device signed in to the same Apple Account. Sidecar uses an iPad as a second display for a Mac, Time Machine backs up a Mac, and Mission Control shows all open windows and desktops on one Mac.",
  },
  {
    key: "c2-1.8-continuity-2",
    objective: "1.8",
    topic: "Continuity",
    difficulty: 2,
    question:
      "Handoff and Universal Clipboard have stopped working between a user's iPad and Mac, which are on the same Wi-Fi network. What should the technician check FIRST?",
    options: [
      "That FileVault is turned on for the Mac's startup disk",
      "That the Mac's firewall is set to block all incoming connections from other devices",
      "That both devices use the same Apple Account, with Bluetooth and Handoff on",
      "That the iPad is set to install security responses automatically",
    ],
    answer: 2,
    explanation:
      "Continuity features such as Handoff and Universal Clipboard need both devices near each other, signed in to the same Apple Account, with Bluetooth, Wi-Fi and Handoff turned on. FileVault encryption doesn't affect Continuity, blocking all incoming connections is more likely to cause problems than fix them, and update settings control how fixes install.",
  },
  {
    key: "c2-1.9-fsck-1",
    objective: "1.9",
    topic: "fsck",
    difficulty: 2,
    question:
      "A Linux workstation's secondary data partition, /dev/sdb1, reports file system errors after a power cut. What should the technician do before running fsck on it?",
    options: [
      "Mount the partition read-write first, so that fsck can save its repairs to the disk",
      "Unmount the partition, so fsck doesn't repair a file system that is in use",
      "Run du on the partition, so fsck has free space to work with",
      "Delete the partition's entry from /etc/fstab permanently",
    ],
    answer: 1,
    explanation:
      "fsck checks and repairs Linux file systems, and repairing one while it's mounted and in use can corrupt it further, so unmount it first (umount /dev/sdb1). Mounting it read-write is exactly what to avoid, du only reports how much space files use, and the fstab entry can stay: it controls mounting at boot and the order of boot-time checks.",
  },
  {
    key: "c2-1.9-fsck-2",
    objective: "1.9",
    topic: "fsck",
    difficulty: 3,
    question:
      "In /etc/fstab, the last field is 1 for the root file system, 2 for a local data volume and 0 for a network share. What do these values control?",
    options: [
      "Whether and in what order fsck checks each file system at boot, with 0 meaning never",
      "The order in which the file systems are mounted when the system starts up",
      "How many days pass between the automatic backups that the dump command makes of each one",
      "Which file system is given priority for space when the disk is nearly full",
    ],
    answer: 0,
    explanation:
      "The sixth fstab field (fs_passno) tells fsck the order of boot-time checks: 1 for the root file system, 2 for other file systems, and 0 for don't check, which suits network shares. This field doesn't set the mount order, the fifth field is a dump flag rather than a backup interval, and fstab has no disk-full priority setting.",
  },
  {
    key: "c2-1.9-mount-1",
    objective: "1.9",
    topic: "mount",
    difficulty: 1,
    question:
      "A technician plugs a USB drive into a Linux desktop and needs to attach its partition, /dev/sdc1, to the existing empty directory /mnt/usb. Which command does this?",
    options: [
      "sudo fsck /dev/sdc1",
      "sudo mkdir /mnt/usb/sdc1",
      "ln -s /dev/sdc1 /mnt/usb",
      "sudo mount /dev/sdc1 /mnt/usb",
    ],
    answer: 3,
    explanation:
      "mount attaches a device's file system to a directory, the mount point, so its files appear under /mnt/usb; umount detaches it. fsck checks a file system for errors, mkdir creates a directory, and ln -s creates a symbolic link; none of them make the drive's files accessible.",
  },
  {
    key: "c2-1.9-mount-2",
    objective: "1.9",
    topic: "mount",
    difficulty: 2,
    question:
      "After adding a line for /dev/sdb1 to /etc/fstab, an administrator wants to test it without rebooting. Which command mounts everything listed in fstab that isn't already mounted?",
    options: ["df -h", "sudo umount -a", "sudo mount -a", "sudo fsck -N"],
    answer: 2,
    explanation:
      "mount -a mounts all file systems listed in /etc/fstab, except those marked noauto, so a mistake in the new line shows up now instead of at the next boot. df -h reports free space on file systems that are already mounted, umount -a unmounts file systems, and fsck -N only shows what fsck would do without checking anything.",
  },
  {
    key: "c2-1.9-dnf-1",
    objective: "1.9",
    topic: "dnf",
    difficulty: 1,
    question:
      "A technician needs to install the nmap package on a Fedora workstation. Which command should the technician use?",
    options: ["sudo dnf install nmap", "sudo apt install nmap", "sudo dpkg -i nmap", "rpm --query nmap"],
    answer: 0,
    explanation:
      "dnf is the package manager on Fedora and on Red Hat Enterprise Linux 8 and later, and dnf install downloads a package and its dependencies from the configured repositories. apt is the equivalent on Debian and Ubuntu, dpkg -i installs a local .deb file without resolving dependencies, and rpm --query only checks whether a package is installed.",
  },
  {
    key: "c2-1.9-dnf-2",
    objective: "1.9",
    topic: "dnf",
    difficulty: 2,
    question:
      "After a dnf upgrade on a Red Hat Enterprise Linux 9 workstation, a business application stops working. The technician wants to reverse that whole set of package changes. Which command helps?",
    options: ["sudo dnf autoremove", "sudo dnf history undo", "dnf check-update", "dnf search"],
    answer: 1,
    explanation:
      "dnf records every transaction: dnf history lists them, and dnf history undo with a transaction ID reverses its operations, as long as the older package versions are still available. dnf autoremove removes dependencies nothing needs any more, dnf check-update only reports available updates, and dnf search finds packages by keyword.",
  },
  {
    key: "c2-1.9-ping-1",
    objective: "1.9",
    topic: "ping",
    difficulty: 2,
    question:
      "A technician used to Windows runs ping 192.168.1.1 on a Linux workstation, and replies keep scrolling long after the fourth one. What should the technician know?",
    options: [
      "The router is flooding the workstation with replies, which means the network is under attack",
      "Linux ping needs -n 4 to send four requests, the same option Windows uses",
      "The workstation's DNS settings are wrong, so ping keeps retrying the address",
      "Linux ping keeps sending until it's stopped with Ctrl+C; use -c 4 to send only four",
    ],
    answer: 3,
    explanation:
      "On Linux, ping runs until it's interrupted, then prints round-trip and packet-loss statistics; -c sets how many echo requests to send. Windows sends four by default and uses -n for the count, but on Linux -n means show numeric addresses only. Continuous replies are normal rather than an attack, and the command used an IP address, so DNS isn't involved.",
  },
  {
    key: "c2-1.9-curl-1",
    objective: "1.9",
    topic: "curl",
    difficulty: 2,
    question:
      "From a Linux workstation, a technician wants to check whether an internal web server responds, seeing only its HTTP response headers without downloading the page. Which command does this?",
    options: [
      "dig intranet.example.com",
      "traceroute intranet.example.com",
      "curl -I http://intranet.example.com",
      "ping -c 1 intranet.example.com",
    ],
    answer: 2,
    explanation:
      "curl transfers data to and from URLs, and -I (--head) fetches only the response headers, showing the status code, such as 200 or 404, and server details. dig queries DNS records, traceroute shows the routers along the path, and ping tests reachability with ICMP; none of them talk HTTP to the web server.",
  },
  {
    key: "c2-1.9-curl-2",
    objective: "1.9",
    topic: "curl",
    difficulty: 2,
    question:
      "A technician needs to download a vendor's install script from https://downloads.example.com/tools/setup.sh into the current directory, keeping its file name. The link redirects to a mirror. Which command works?",
    options: [
      "curl https://downloads.example.com/tools/setup.sh",
      "curl -I https://downloads.example.com/tools/setup.sh",
      "curl -L -O https://downloads.example.com/tools/setup.sh",
      "sudo dnf install https://downloads.example.com/tools/setup.sh",
    ],
    answer: 2,
    explanation:
      "-L makes curl follow the redirect to the mirror, and -O saves the file under its remote name, setup.sh. Without -O (or -o), curl prints what it receives to the terminal instead of saving it, and without -L it stops at the redirect. -I fetches headers only, and dnf installs RPM packages, not shell scripts. Read a downloaded script before running it.",
  },
  {
    key: "c2-1.9-traceroute-1",
    objective: "1.9",
    topic: "traceroute",
    difficulty: 1,
    question:
      "Users report that a cloud application is slow. Which command, run on a Linux workstation, shows each router between the workstation and the application's server, with the response time at each hop?",
    options: ["ping -c 4 app.example.com", "traceroute app.example.com", "dig app.example.com", "ip route show"],
    answer: 1,
    explanation:
      "traceroute lists each router (hop) on the path to the destination with round-trip times, so you can see where delay begins. ping reports round-trip time to the destination only, dig looks up DNS records, and ip route show displays the workstation's own routing table rather than the path across the network.",
  },
  {
    key: "c2-1.9-traceroute-2",
    objective: "1.9",
    topic: "traceroute",
    difficulty: 3,
    question:
      "A traceroute from a Linux workstation shows only asterisks after the fifth hop, but tracert from a Windows PC on the same network completes. A firewall beyond hop five drops UDP probes but allows ICMP. Which command should the technician try on Linux?",
    options: [
      "sudo traceroute -I server.example.com",
      "traceroute -n server.example.com",
      "sudo traceroute -m 5 server.example.com",
      "ping -c 5 server.example.com",
    ],
    answer: 0,
    explanation:
      "Linux traceroute sends UDP probes by default, starting at port 33434, while Windows tracert uses ICMP echo requests. traceroute -I switches to ICMP echo probes, which the firewall allows (ICMP probes can need root, hence sudo). -n only skips resolving hop names, -m 5 stops the trace at five hops, and ping tests whether the destination answers but doesn't show the path.",
  },
  {
    key: "c2-1.9-du-1",
    objective: "1.9",
    topic: "du",
    difficulty: 1,
    question:
      "A Linux workstation's /home partition is nearly full. Which command shows the total size of each user's folder in human-readable units, so the technician can find the largest?",
    options: ["df -h /home", "ls -l /home", "top", "sudo du -sh /home/*"],
    answer: 3,
    explanation:
      "du reports the disk space used by files and directories: -s prints one total per argument and -h uses units such as M and G, so du -sh /home/* totals each home folder. df -h shows used and free space for the whole file system rather than per folder, ls -l shows the directories' own entries rather than the size of their contents, and top shows running processes.",
  },
  {
    key: "c2-1.9-du-2",
    objective: "1.9",
    topic: "du",
    difficulty: 2,
    question:
      "df -h shows the file system holding /var at 97% used. What is the BEST next step to find what is using the space?",
    options: [
      "Run sudo du -h --max-depth=1 /var and drill into the largest subfolder",
      "Run sudo fsck on the /var file system so it can reclaim the space it's using",
      "Run df -i to find and remove the unused inodes on the file system",
      "Reboot the workstation, so the kernel clears /var automatically",
    ],
    answer: 0,
    explanation:
      "df shows how full a file system is, and du breaks that down by directory: du -h --max-depth=1 /var totals each subfolder one level down, so you can follow the largest, often /var/log or a cache, to the cause. fsck repairs file system errors rather than freeing space, df -i only reports inode usage, and rebooting doesn't empty /var.",
  },
  {
    key: "c2-1.9-config-files-1",
    objective: "1.9",
    topic: "common configuration files",
    difficulty: 1,
    question:
      "A Linux workstation must reach a test server called stage01 at 10.0.5.20, which isn't in DNS. The technician wants this name to work on this workstation only. Which file should be edited?",
    options: ["/etc/resolv.conf", "/etc/fstab", "/etc/hosts", "/etc/passwd"],
    answer: 2,
    explanation:
      "/etc/hosts maps host names to IP addresses locally, so a line such as '10.0.5.20 stage01' works on this machine without a DNS record. /etc/resolv.conf lists the DNS servers and search domains to use, /etc/fstab lists file systems to mount, and /etc/passwd lists user accounts.",
  },
  {
    key: "c2-1.9-config-files-2",
    objective: "1.9",
    topic: "common configuration files",
    difficulty: 2,
    question:
      "On a Linux workstation, why can every user read /etc/passwd, while regular users can't read /etc/shadow?",
    options: [
      "/etc/passwd holds the users' encrypted passwords, which are safe to share; /etc/shadow holds settings for the root account only",
      "/etc/passwd holds account details programs need, like UIDs and home folders; /etc/shadow holds password hashes",
      "/etc/shadow is a backup copy of /etc/passwd that fsck creates after each check",
      "/etc/passwd lists the groups, and /etc/shadow lists the users who belong to each group",
    ],
    answer: 1,
    explanation:
      "/etc/passwd stores each account's name, UID, GID, home folder and login shell, which many programs read; its password field normally holds just an x. The password hashes, with password-aging and account-expiry dates, are in /etc/shadow, which regular users mustn't be able to read, because hashes in a readable file could be copied and cracked offline. /etc/shadow isn't a backup made by fsck, and groups are defined in /etc/group.",
  },
  {
    key: "c2-1.9-config-files-3",
    objective: "1.9",
    topic: "common configuration files",
    difficulty: 2,
    question:
      "A Linux workstation reaches websites by IP address but not by name, and ip route shows the correct default gateway. Which file should the technician check next?",
    options: ["/etc/fstab", "/etc/shadow", "/etc/passwd", "/etc/resolv.conf"],
    answer: 3,
    explanation:
      "/etc/resolv.conf lists the DNS servers (nameserver lines, up to three) and search domains the system's resolver uses, so a wrong or missing nameserver breaks name lookups while connections by IP address still work. On many systems a service such as NetworkManager or systemd-resolved writes this file. /etc/fstab controls mounts, /etc/shadow holds password hashes, and /etc/passwd holds account details.",
  },
  {
    key: "c2-1.9-systemd-1",
    objective: "1.9",
    topic: "systemd",
    difficulty: 2,
    question:
      "A technician installs an SSH server on a Linux workstation that uses systemd, and wants the sshd service to start now and at every boot. Which command does both?",
    options: [
      "sudo systemctl start sshd",
      "systemctl status sshd",
      "sudo systemctl restart sshd",
      "sudo systemctl enable --now sshd",
    ],
    answer: 3,
    explanation:
      "systemctl enable makes a service start at boot, and --now starts it immediately as well. systemctl start runs it only until the next reboot, status shows whether it's running along with its recent log lines, and restart stops and starts a running service without changing whether it starts at boot.",
  },
  {
    key: "c2-1.9-systemd-2",
    objective: "1.9",
    topic: "systemd",
    difficulty: 1,
    question:
      "On most current Linux distributions, which component does the kernel start first, as process ID 1, to bring up and manage the system's services?",
    options: ["GRUB", "sudo", "systemd", "cron"],
    answer: 2,
    explanation:
      "systemd is the init system and service manager on most modern distributions: the kernel starts it as PID 1, and it starts and supervises services, controlled with systemctl and logged with journalctl. GRUB is the bootloader that runs before the kernel, sudo runs a single command with elevated privileges, and cron runs scheduled jobs.",
  },
  {
    key: "c2-1.9-kernel-1",
    objective: "1.9",
    topic: "kernel",
    difficulty: 2,
    question:
      "A vendor's driver supports Linux kernel 6.1 or later. Which command shows the version of the kernel the workstation is running?",
    options: ["systemctl --version", "uname -r", "cat /etc/hosts", "du -h /boot"],
    answer: 1,
    explanation:
      "The kernel is the core of the OS, managing the CPU, memory and hardware through drivers, and uname -r prints the release of the kernel that is running, such as 6.8.0-45-generic. systemctl --version shows the systemd version, /etc/hosts holds local name mappings, and du -h /boot shows how much space the kernel files take, not which one is running.",
  },
  {
    key: "c2-1.9-bootloader-1",
    objective: "1.9",
    topic: "bootloader",
    difficulty: 1,
    question:
      "When a Linux PC starts, which component shows the menu of installed kernels or operating systems and then loads the chosen kernel into memory?",
    options: [
      "The bootloader, such as GRUB",
      "The init system, such as systemd",
      "The /etc/fstab file",
      "The root account",
    ],
    answer: 0,
    explanation:
      "The bootloader runs after the firmware (UEFI or BIOS) and loads the kernel and its initial RAM disk; GRUB is the usual Linux bootloader and can offer a menu of kernels or other operating systems. systemd starts after the kernel, /etc/fstab lists file systems to mount once the system is running, and the root account is the superuser rather than part of the boot process.",
  },
  {
    key: "c2-1.9-bootloader-2",
    objective: "1.9",
    topic: "bootloader",
    difficulty: 3,
    question:
      "After a kernel update, a Linux workstation crashes every time it starts. What is the quickest way to get it running so the technician can investigate?",
    options: [
      "Choose the previous kernel from the GRUB boot menu at startup",
      "Run fsck on the boot partition so that it can repair the new kernel",
      "Reinstall the distribution, keeping the /home partition",
      "Edit /etc/resolv.conf to point to a different DNS server",
    ],
    answer: 0,
    explanation:
      "Distributions usually keep the previous kernel installed, and the GRUB boot menu (on some distributions under an Advanced options entry) lets you start it, so the system runs on the known-good kernel while you investigate or remove the faulty one. fsck repairs file systems and wouldn't fix a faulty kernel, reinstalling is a last resort, and DNS settings don't affect startup.",
  },
  {
    key: "c2-1.9-root-account-1",
    objective: "1.9",
    topic: "root account",
    difficulty: 2,
    question:
      "A new Linux administrator wants to sign in as root for all daily work to avoid typing sudo. Which response BEST reflects good practice for the root account?",
    options: [
      "Share the root password with the help desk team so everyone can fix problems quickly",
      "Rename the root account, which removes UID 0 and its unlimited privileges from it",
      "Use a standard account with sudo for admin commands, and block direct root sign-in, including over SSH",
      "Sign in as root as planned, but turn off the shell history so that the commands typed aren't recorded",
    ],
    answer: 2,
    explanation:
      "root (UID 0) can do anything, so mistakes and malware running as root have no limits. A standard account plus sudo elevates one command at a time and logs who ran what; many distributions, such as Ubuntu, lock root's password by default, and an SSH server can refuse root sign-ins (PermitRootLogin no). Sharing the root password removes accountability, renaming the account doesn't change its UID 0 or its power, and turning off history only hides what was done.",
  },
  {
    key: "c2-1.10-image-deployment-1",
    objective: "1.10",
    topic: "image deployment",
    difficulty: 2,
    question:
      "A school is setting up 150 identical lab PCs that all need the same office suite, browser and testing app. Which distribution method gets the applications onto every PC fastest and most consistently?",
    options: [
      "Install each application from its downloadable package on each PC by hand, one at a time",
      "Include the applications in a standard image and deploy that image to every PC",
      "Mount each application's ISO file on each PC and run its setup program",
      "Email the students the download links and have them install the apps",
    ],
    answer: 1,
    explanation:
      "With image deployment, the applications are installed once on a reference PC, captured in an image and deployed to every machine, so all 150 get identical, tested installs. Installing packages or mounting ISO files on each PC repeats the same work 150 times and lets machines drift apart, and leaving installs to students gives no control over versions or settings.",
  },
  {
    key: "c2-1.10-image-deployment-2",
    objective: "1.10",
    topic: "image deployment",
    difficulty: 2,
    question:
      "An organization installs its standard applications as part of its Windows image. A critical security update for one of those applications is released. What drawback of this distribution method does the organization now face?",
    options: [
      "Applications installed from an image can never be updated after deployment",
      "Applications in an image need no licenses, so the vendor won't support them",
      "Image deployment works only on PCs that have a dedicated graphics card",
      "The image must be rebuilt and retested, or new PCs get the old version",
    ],
    answer: 3,
    explanation:
      "Applications built into an image are frozen at the version captured, so an app update means rebuilding and retesting the image, or pushing the update to PCs separately; otherwise new deployments start out of date. Imaged applications can still be updated after deployment, they still need valid licenses, and imaging has nothing to do with graphics hardware.",
  },
  {
    key: "c2-1.10-image-deployment-3",
    objective: "1.10",
    topic: "image deployment",
    difficulty: 3,
    question:
      "An organization's standard applications are updated almost every month, and rebuilding its Windows image each time is taking too long. Which change BEST reduces the work while keeping deployments consistent?",
    options: [
      "Stop using images and install Windows and every application on each PC by hand from a USB drive instead",
      "Use a thin image with the OS and core settings, and install the apps afterward from current packages",
      "Keep the current image and skip application updates until the next hardware refresh",
      "Add every application to the image, including ones that only one department uses",
    ],
    answer: 1,
    explanation:
      "A thin image holds the OS and baseline settings, and applications are added after deployment from up-to-date packages, so an app update changes one package instead of the whole image. A thick image, with the applications built in, needs rebuilding whenever they change. Manual installs lose consistency, skipping updates leaves known vulnerabilities open, and adding every department's apps makes the image bigger and out of date more often.",
  },
  {
    key: "c2-1.10-image-deployment-4",
    objective: "1.10",
    topic: "image deployment",
    difficulty: 2,
    question:
      "A technician adds a CAD application to the company's standard image, which is deployed to 120 PCs. The company owns 20 per-device licenses for the application. What is the problem?",
    options: [
      "Applications included in an image are covered by the Windows license, so there's no compliance problem",
      "The imaging tool will stop deploying the image after the twentieth PC",
      "Each PC the image installs the application on needs a license, so 100 PCs would be out of compliance",
      "The application will uninstall itself from the PCs that don't have a license",
    ],
    answer: 2,
    explanation:
      "Putting an application in an image installs it on every PC that receives the image, and with per-device licensing each installation needs a license, so 120 installs against 20 licenses breaks the agreement. Deploy it separately to the 20 licensed PCs, or buy more licenses. The Windows license doesn't cover other vendors' software, imaging tools don't count application licenses, and applications don't remove themselves.",
  },
  {
    key: "c2-1.11-cloud-1",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 2,
    question:
      "A user's laptop has a small SSD that is nearly full, mostly with files synced by OneDrive. The user wants to keep seeing every file in File Explorer but stop storing most of them on the laptop. What should the technician do?",
    options: [
      "Unlink OneDrive from the laptop and delete the local OneDrive folder to recover the space",
      "Turn on Always keep on this device for the whole OneDrive folder",
      "Move the OneDrive folder to the Recycle Bin and empty it",
      "Select the folders and choose Free up space, making them online-only files",
    ],
    answer: 3,
    explanation:
      "With OneDrive Files On-Demand, Free up space turns locally available files into online-only files, shown with a cloud icon: they still appear in File Explorer and download when opened, but use no local space. Unlinking and deleting the folder removes the files from view, Always keep on this device does the opposite and stores everything locally, and deleting the folder deletes the files from OneDrive as well.",
  },
  {
    key: "c2-1.11-cloud-2",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 2,
    question:
      "A consultant will spend a week at a client site with no internet access and needs a project folder that is stored in OneDrive. Which option should be set on that folder before leaving?",
    options: ["Always keep on this device", "Free up space", "Share, with an Anyone link", "Version history"],
    answer: 0,
    explanation:
      "Always keep on this device downloads the folder's files and keeps them on the laptop, shown with a solid green circle and white check mark, so they open offline; changes sync when the laptop is back online. Free up space does the opposite, and online-only files can't be opened without an internet connection. A sharing link and version history don't make files available offline.",
  },
  {
    key: "c2-1.11-cloud-3",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 2,
    question:
      "Before replacing a user's laptop, a technician wants the user's Desktop, Documents and Pictures folders to sync to the cloud automatically, so they appear on the new laptop once the user signs in to OneDrive. Which OneDrive setting does this?",
    options: [
      "Choose folders, so that only the selected OneDrive folders sync to the new laptop",
      "Free up space on the Desktop, Documents and Pictures folders",
      "Back up the Desktop, Documents and Pictures folders to OneDrive (folder backup)",
      "Turn on File History, saving to an external drive",
    ],
    answer: 2,
    explanation:
      "OneDrive's folder backup, also called Known Folder Move, redirects the Desktop, Documents and Pictures folders into OneDrive, so their contents sync to the cloud and appear on any PC where the user signs in to OneDrive. Choose folders limits which OneDrive folders sync to a device, Free up space makes files online-only, and File History backs up to a local or network drive rather than the cloud.",
  },
  {
    key: "c2-1.11-cloud-4",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 2,
    question:
      "A user's OneDrive holds 900 GB across many folders. On a small second laptop, they want only two project folders to appear and sync, with nothing else from OneDrive shown. Which OneDrive setting should the technician use on that laptop?",
    options: [
      "Choose folders, selecting only the two project folders",
      "Always keep on this device, for the whole OneDrive",
      "Back up the Desktop folder to OneDrive",
      "Pause syncing for 24 hours",
    ],
    answer: 0,
    explanation:
      "Choose folders (selective sync) controls which OneDrive folders sync to, and appear on, a particular device; the others stay in the cloud and are hidden there. Always keep on this device would download everything, folder backup adds the Desktop to OneDrive rather than limiting what syncs, and pausing sync stops updates only for a while.",
  },
  {
    key: "c2-1.11-cloud-5",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 1,
    question:
      "A team emails a budget spreadsheet back and forth, and edits keep getting lost between copies. Everyone has the same cloud productivity suite. What should the technician recommend?",
    options: [
      "Save the spreadsheet as a PDF before each person emails it on to the next",
      "Have each person keep their own local copy, then merge all of the copies together at the end of each week",
      "Compress the spreadsheet into a ZIP file so its contents can't change in transit",
      "Keep one copy in shared cloud storage and share it with edit access, so everyone co-authors it",
    ],
    answer: 3,
    explanation:
      "Cloud spreadsheet apps such as Excel for the web and Google Sheets let several people edit one stored copy at the same time, saving changes automatically and keeping version history, so nothing is lost between copies. A PDF can't be edited as a spreadsheet, weekly merges keep the conflicting copies, and a ZIP file only compresses the attachment.",
  },
  {
    key: "c2-1.11-cloud-6",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 2,
    question:
      "An hour ago, a user accidentally deleted half of a shared cloud document, and others have been editing it since. What should the technician do FIRST?",
    options: [
      "Restore the user's PC from last night's system image to get the document back",
      "Open the document's version history and copy back the deleted text",
      "Delete the document and ask the user to type the lost text again",
      "Use Free up space on the document to reset it",
    ],
    answer: 1,
    explanation:
      "Cloud word processors and storage, such as Word with OneDrive or SharePoint, or Google Docs, keep version history, so an earlier version can be opened and the lost text copied back without undoing others' later edits. Restoring the PC doesn't touch the cloud copy, retyping is unnecessary, and Free up space only changes whether a synced file is stored locally.",
  },
  {
    key: "c2-1.11-cloud-7",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 2,
    question:
      "A user joins videoconferences in a web browser. Others can see the user's video but can't hear them, and the browser shows a crossed-out microphone icon in the address bar. What should the technician check FIRST?",
    options: [
      "Whether a videoconferencing license has been assigned to the user's account in the admin center",
      "The DNS server settings on the network adapter the user's laptop is using",
      "Whether the meeting organizer has started recording the meeting",
      "The browser's microphone permission for the site, and Windows' microphone privacy settings",
    ],
    answer: 3,
    explanation:
      "A crossed-out microphone icon means the browser has blocked the site from using the microphone; allow it in the site's permissions, and check that Windows lets the browser use the microphone (Settings > Privacy & security > Microphone). A licensing problem would stop the user joining at all, a DNS problem would stop the meeting loading, and recording doesn't mute anyone.",
  },
  {
    key: "c2-1.11-cloud-8",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 2,
    question:
      "After a meeting, a presenter wants to send an outside client a slide deck stored in the company's cloud storage. The client should be able to view the slides but not change them, and the original must stay in the company's storage. What should the presenter do?",
    options: [
      "Share a link to the deck with edit permission",
      "Share a link to the deck with view-only permission",
      "Move the deck into the client's own cloud account",
      "Create a full company account for the client",
    ],
    answer: 1,
    explanation:
      "Cloud presentation tools such as PowerPoint for the web and Google Slides can share a file with view-only permission, so the client always sees the current slides but can't edit them, and the file stays in the company's storage. Edit permission would let the client change the deck, moving it hands over the original, and a full company account gives far more access than needed.",
  },
  {
    key: "c2-1.11-cloud-9",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 1,
    question:
      "A project team wants quick back-and-forth conversations, with searchable history organized by topic and @mentions to get someone's attention, instead of long email threads. Which cloud collaboration tool fits BEST?",
    options: [
      "An instant messaging platform with team channels, such as Microsoft Teams or Slack",
      "A shared spreadsheet with a row for each question and a column for each person's answer",
      "A videoconference scheduled every hour, so everyone can talk things through",
      "A shared mailbox that every member of the team can read and reply from",
    ],
    answer: 0,
    explanation:
      "Instant messaging platforms with persistent chat and channels give fast conversations, @mentions, presence status and searchable history grouped by team or topic. A spreadsheet holds data rather than conversations, hourly videoconferences interrupt work and leave no searchable text, and a shared mailbox is still email, with the long threads the team wants to avoid.",
  },
  {
    key: "c2-1.11-cloud-10",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 2,
    question:
      "A technician is setting up the Outlook desktop app for a new employee whose mailbox is in Microsoft 365. What does the technician normally need to enter?",
    options: [
      "The IMAP and SMTP server names, their port numbers and encryption types",
      "The mailbox server's IP address and the POP3 port number",
      "The user's email address; after sign-in, Autodiscover finds the settings",
      "The organization's MX record and its DNS server addresses",
    ],
    answer: 2,
    explanation:
      "Cloud email systems such as Microsoft 365 support Autodiscover: enter the email address, sign in (with MFA if required) and Outlook configures itself. Entering IMAP or POP3 servers and ports by hand is for providers without automatic setup and loses calendar and contact sync. MX records tell other mail servers where to deliver the domain's mail; email clients don't need them.",
  },
  {
    key: "c2-1.11-cloud-11",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 2,
    question:
      "A company is moving its email from an on-premises server to a cloud email provider. Which DNS record must change so that mail from the internet is delivered to the new provider?",
    options: [
      "The CNAME record for www",
      "The PTR record for the router's address",
      "The A record for the web server",
      "The MX records for the domain",
    ],
    answer: 3,
    explanation:
      "MX (mail exchanger) records tell sending mail servers which hosts accept email for a domain, so pointing them at the cloud provider routes incoming mail there. Providers also ask for records such as SPF, DKIM and DMARC so receivers can authenticate the domain's mail. A CNAME for www and an A record for the web server affect the website, and a PTR record maps an IP address back to a name.",
  },
  {
    key: "c2-1.11-cloud-12",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 2,
    question:
      "Employees sign in to their domain-joined PCs with Active Directory accounts but have to remember a separate password for the company's Microsoft 365 apps. What should be deployed so they use the same user name and password for both?",
    options: [
      "Identity synchronization, such as Microsoft Entra Connect, syncing AD accounts to the cloud directory",
      "A separate local account on each PC, with its password always set to match the user's cloud password",
      "A password manager on each PC that stores both of each user's passwords for them",
      "A Group Policy setting that makes both the AD and cloud passwords never expire",
    ],
    answer: 0,
    explanation:
      "Identity synchronization copies on-premises Active Directory users and groups to the cloud identity provider, Microsoft Entra ID for Microsoft 365, and with password hash synchronization users sign in to cloud apps with their AD credentials, so there is one identity to manage. Matching local accounts and password managers still leave two credentials to keep in step, and never-expiring passwords weaken security without linking the accounts.",
  },
  {
    key: "c2-1.11-cloud-13",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 3,
    question:
      "An administrator creates a new hire's account in on-premises Active Directory at 9:05. At 9:10 the new hire can sign in to their domain PC but not to Microsoft 365, which says the account doesn't exist. Directory sync runs on Microsoft Entra Connect's default schedule. What is the MOST likely explanation?",
    options: [
      "Microsoft 365 accounts must be created by hand in the cloud even when directory sync is used",
      "It hasn't synced yet: sync runs every 30 minutes by default, or an admin can force one",
      "The new hire's PC must run gpupdate /force before cloud sign-in can work",
      "The account can't exist in the cloud directory until a license is assigned to it",
    ],
    answer: 1,
    explanation:
      "Microsoft Entra Connect Sync runs a sync cycle every 30 minutes by default, so a new on-premises account appears in the cloud after the next cycle; an administrator can trigger one sooner with Start-ADSyncSyncCycle -PolicyType Delta. Synced accounts aren't created by hand, Group Policy refreshes don't sync accounts, and licenses are assigned to accounts that already exist in the cloud directory.",
  },
  {
    key: "c2-1.11-cloud-14",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 2,
    question:
      "A new employee can sign in to the Microsoft 365 portal, but Outlook on the web says they have no mailbox and the desktop Office apps won't activate. The account was synced from Active Directory yesterday. What should the technician check FIRST?",
    options: [
      "Whether the user's PC is running the latest firmware version available from its manufacturer",
      "Whether the user's new password meets the domain's complexity requirements",
      "Whether a license that includes Exchange Online and the Office apps is assigned to the user",
      "Whether the user's account is in the local Administrators group on their PC",
    ],
    answer: 2,
    explanation:
      "Syncing or creating an account gives the user an identity, but services such as an Exchange Online mailbox and Office app activation come from the license assigned to that user, in the Microsoft 365 admin center (Users > Active users > Licenses and apps) or through group-based licensing. Firmware, password complexity and local admin rights don't create mailboxes or activate Office.",
  },
  {
    key: "c2-1.11-cloud-15",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 3,
    question:
      "A technician tries to assign a Microsoft 365 license to a user whose account was synced from on-premises Active Directory, and the admin center asks for one more detail before it will assign it. Which detail is it MOST likely to be?",
    options: ["Usage location", "Job title", "Manager", "Office phone number"],
    answer: 0,
    explanation:
      "Microsoft 365 needs a usage location, the country where the user will use the services, before it can assign a license, because services vary by country, and accounts synced from on-premises AD have none by default. Job title, manager and phone number are optional directory details that don't affect licensing.",
  },
  {
    key: "c2-1.11-cloud-16",
    objective: "1.11",
    topic: "cloud-based productivity tools",
    difficulty: 1,
    question:
      "An employee is leaving, and a replacement starts next week. The company's cloud productivity suite is licensed per user, and the company has exactly as many licenses as staff. Once the departing employee's data has been handled under company policy, what should the technician do with their license?",
    options: [
      "Leave it assigned, because unused licenses move to new users automatically after 90 days",
      "Buy a new license for the replacement and keep the old one assigned",
      "Give the replacement the departed employee's user name and password",
      "Remove the license from the departed user's account so it can be assigned to the new hire",
    ],
    answer: 3,
    explanation:
      "Per-user subscription licenses are assigned to accounts, so unassigning the license from the departed user's account frees it for the replacement and the company doesn't pay for an unused seat. Licenses aren't reassigned automatically, buying another wastes money, and sharing a former employee's credentials breaks accountability and most service terms.",
  },
];
