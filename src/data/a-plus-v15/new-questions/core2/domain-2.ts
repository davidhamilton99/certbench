import type { NewQuestion } from "./types";

/** New questions for 220-1202 Domain 2.0, Security: the topics V15 added. */
export const questions: NewQuestion[] = [
  {
    key: "c2-2.1-mobile-digital-key-1",
    objective: "2.1",
    topic: "mobile digital keys",
    difficulty: 1,
    question:
      "A company replaces employees' plastic access badges with credentials stored in their smartphones' digital wallets, and employees tap their phones on the door readers to enter. Which physical access security control is this?",
    options: ["Key fob", "Smart card", "Mobile digital key", "Access control vestibule"],
    answer: 2,
    explanation:
      "A mobile digital key stores an access credential on a smartphone or smartwatch and presents it to a reader over NFC or Bluetooth, much like tapping a card. A key fob is a separate small token carried on a keyring, a smart card is a physical card with an embedded chip, and an access control vestibule is a two-door space that lets one person through at a time.",
  },
  {
    key: "c2-2.1-mobile-digital-key-2",
    objective: "2.1",
    topic: "mobile digital keys",
    difficulty: 2,
    question:
      "An employee who uses a mobile digital key on their phone to enter the office reports the phone stolen. What advantage do mobile digital keys have over traditional metal keys in this situation?",
    options: [
      "The phone automatically changes the door's lock cylinder when it is reported stolen",
      "The stolen phone's credential can be revoked right away, without rekeying any locks",
      "Mobile digital keys expire every night, so the stolen phone stops opening doors on its own",
      "The building alarm sounds whenever the stolen phone comes near a door reader",
    ],
    answer: 1,
    explanation:
      "Mobile credentials are managed centrally, so an administrator can revoke the stolen phone's key at once and issue a new one to the employee's replacement phone, while a lost metal key means changing locks. Phones can't change lock cylinders, mobile keys don't simply expire each night, and the alarm system doesn't track where a lost phone is.",
  },
  {
    key: "c2-2.1-facial-recognition-1",
    objective: "2.1",
    topic: "facial recognition",
    difficulty: 2,
    question:
      "A data center wants to verify people as they walk up to its entrance, without anyone touching or looking into a reader, by comparing each face with an enrolled list of authorized staff. Which biometric technology fits BEST?",
    options: ["Palm print scanner", "Fingerprint scanner", "Retina scanner", "Facial recognition"],
    answer: 3,
    explanation:
      "Facial recognition technology captures a face with a camera and matches it against enrolled templates, so it works without contact and from a short distance as people approach. Palm print and fingerprint scanners need the person to present a hand or finger at the reader, and a retina scanner needs them to look into it at close range.",
  },
  {
    key: "c2-2.1-facial-recognition-2",
    objective: "2.1",
    topic: "facial recognition",
    difficulty: 3,
    question:
      "A company is replacing badge readers with facial recognition technology (FRT) at its doors. Which concern applies to FRT but NOT to the badge readers?",
    options: [
      "Employees can lend their credential to a coworker who isn't supposed to have access to the building",
      "The credential stops working when the battery in it runs out",
      "Lighting, camera angle and people who look alike can cause false acceptances or false rejections",
      "The credential can be copied with a hidden RFID reader",
    ],
    answer: 2,
    explanation:
      "FRT matches a camera image against stored templates, so lighting, angle and lookalikes can cause false matches or rejections, basic systems may be fooled by photos unless they check for liveness, and stored face templates bring privacy obligations; plan a fallback method. Lending a credential, flat batteries and RFID cloning are risks of badges, fobs and phones, which FRT avoids because the face itself is the credential.",
  },
  {
    key: "c2-2.1-voice-recognition-1",
    objective: "2.1",
    topic: "voice recognition",
    difficulty: 2,
    question:
      "A bank's phone support line verifies callers by their voiceprint. Which weakness of voice recognition technology should the bank plan for?",
    options: [
      "Recordings or AI-cloned voices may fool it, and a cold or noise can cause rejections",
      "It can't work over a phone line, because it needs a camera to see the caller",
      "It requires every caller to have a smart card reader attached to the phone they call from",
      "It stores each caller's fingerprints, which raises privacy concerns",
    ],
    answer: 0,
    explanation:
      "Voice recognition compares a speaker's voice with an enrolled voiceprint, so replayed recordings and AI voice clones are a spoofing risk, and illness, noise or a poor line can cause false rejections; pairing it with another factor addresses both. It works on phone audio, needs no camera or smart card reader, and stores voice characteristics rather than fingerprints.",
  },
  {
    key: "c2-2.1-voice-recognition-2",
    objective: "2.1",
    topic: "voice recognition",
    difficulty: 1,
    question: "Which biometric method identifies a person by the distinctive characteristics of how they speak?",
    options: ["Facial recognition", "Voice recognition", "Retina scanning", "Palm print scanning"],
    answer: 1,
    explanation:
      "Voice recognition (speaker recognition) measures vocal characteristics such as pitch, tone and rhythm and matches them against an enrolled voiceprint. Facial recognition uses facial features, retina scanning uses the pattern of blood vessels at the back of the eye, and palm print scanning uses the lines and features of the palm.",
  },
  {
    key: "c2-2.1-zero-trust-1",
    objective: "2.1",
    topic: "zero trust model",
    difficulty: 2,
    question:
      "A company's security policy says: no user or device is trusted because it's on the corporate network; every request is authenticated, authorized and checked for device health; and access is limited to what each task needs. Which security model does this describe?",
    options: ["Perimeter-based security", "Discretionary access control", "Security through obscurity", "Zero Trust"],
    answer: 3,
    explanation:
      "Zero Trust means never trust, always verify: network location grants no trust, each request is checked against identity, device health and policy, and access follows least privilege. Perimeter-based security trusts whatever is inside the network, discretionary access control lets resource owners set permissions, and security through obscurity relies on hiding how things work.",
  },
  {
    key: "c2-2.1-zero-trust-2",
    objective: "2.1",
    topic: "zero trust model",
    difficulty: 3,
    question:
      "An organization adopting a Zero Trust model finds that a sales laptop on the office LAN can reach the HR database server directly. Which change BEST fits Zero Trust?",
    options: [
      "Verify each connection to HR systems per user and device, and segment the network",
      "Keep trusting the laptop, because it's domain-joined and sits inside the corporate firewall",
      "Move the HR database server into the screened subnet so it's easier to reach",
      "Give every employee a VPN account so that all their traffic is encrypted",
    ],
    answer: 0,
    explanation:
      "Zero Trust removes trust based on network location: each access to a resource is verified for that user and device, and segmentation limits which systems can reach each other at all. Trusting the laptop because it's domain-joined and inside the firewall is the perimeter thinking Zero Trust replaces, a screened subnet is for systems exposed to the internet, and a VPN encrypts traffic but still trusts whoever connects.",
  },
  {
    key: "c2-2.1-authentication-methods-1",
    objective: "2.1",
    topic: "authentication methods",
    difficulty: 2,
    question:
      "An authenticator app on a user's phone shows a six-digit code that changes every 30 seconds, calculated from a secret shared at setup and the current time. Which authentication method is this?",
    options: [
      "One-time passcode sent by SMS",
      "Security Assertion Markup Language (SAML)",
      "Time-based one-time password (TOTP)",
      "Voice call verification",
    ],
    answer: 2,
    explanation:
      "TOTP derives each code from a secret shared at enrollment and the current time, so the app works offline and each code expires after a short window; the phone's clock must be roughly right. An SMS passcode is generated by the service and texted to the phone, SAML passes sign-in assertions between websites, and a voice call reads a code aloud.",
  },
  {
    key: "c2-2.1-authentication-methods-2",
    objective: "2.1",
    topic: "authentication methods",
    difficulty: 2,
    question:
      "A company's MFA sends a one-time passcode (OTP) to each user by text message. Why do security guides rate SMS codes as weaker than an authenticator app or a hardware token?",
    options: [
      "SMS codes never expire, so a code stolen from a phone can be reused again and again indefinitely",
      "Texts can be redirected through SIM swapping or intercepted, and are easy to phish",
      "SMS codes are much longer, so users tend to write them down",
      "SMS codes can only be used to sign in on desktop computers",
    ],
    answer: 1,
    explanation:
      "An OTP sent by SMS depends on the phone network: attackers can take over a number through SIM swapping or port-out fraud, or trick users into reading a code to them, so an authenticator app, hardware token or passkey is stronger. SMS codes expire after a few minutes, they aren't longer than app codes, and they work wherever the user signs in.",
  },
  {
    key: "c2-2.1-authentication-methods-3",
    objective: "2.1",
    topic: "authentication methods",
    difficulty: 2,
    question:
      "Employees sign in once to the company's identity provider, then open a third-party payroll website without signing in again. Behind the scenes, the identity provider sends the payroll site a signed XML message confirming who the user is. Which standard is being used?",
    options: ["Kerberos", "RADIUS", "SAML", "TACACS+"],
    answer: 2,
    explanation:
      "SAML (Security Assertion Markup Language) is an XML-based standard in which an identity provider sends a signed assertion about a user to a service provider, such as a web app, enabling single sign-on across organizations. Kerberos issues tickets inside a domain such as Active Directory, RADIUS authenticates network access such as Wi-Fi and VPN connections, and TACACS+ authenticates administrators on network devices.",
  },
  {
    key: "c2-2.1-authentication-methods-4",
    objective: "2.1",
    topic: "authentication methods",
    difficulty: 1,
    question:
      "Users complain that each morning they sign in separately to email, the HR portal, the file share and the ticketing system. Which solution lets them authenticate once and use all four?",
    options: ["Single sign-on (SSO)", "Password expiration", "Account lockout policy", "Log-in time restrictions"],
    answer: 0,
    explanation:
      "SSO lets one authentication to a trusted identity provider grant access to many connected applications, so users sign in once. Password expiration forces periodic changes, an account lockout policy blocks sign-ins after repeated failures, and log-in time restrictions limit when users can sign in; none of them reduce the number of sign-ins.",
  },
  {
    key: "c2-2.1-mdm-1",
    objective: "2.1",
    topic: "MDM",
    difficulty: 1,
    question:
      "A company issues 300 smartphones and must enforce passcodes and encryption, push approved apps, and wipe any phone that is lost. Which solution does all of this from one place?",
    options: [
      "Data loss prevention (DLP)",
      "A virtual private network (VPN)",
      "Directory services",
      "Mobile device management (MDM)",
    ],
    answer: 3,
    explanation:
      "MDM enrolls devices and lets administrators push configuration and security policies, deploy apps and lock or wipe devices remotely from one console; Microsoft Intune and Jamf are examples. DLP watches for sensitive data leaving the organization, a VPN encrypts network traffic, and directory services store identities rather than configuring phones.",
  },
  {
    key: "c2-2.1-mdm-2",
    objective: "2.1",
    topic: "MDM",
    difficulty: 2,
    question:
      "An employee enrolls a personal phone in the company's MDM to get work email, then worries that IT can now see personal photos and wipe the whole phone. Which MDM approach BEST addresses this for BYOD?",
    options: [
      "Full device enrollment with supervision, applied in the same way to every personal phone in the company",
      "Work-profile or user enrollment, keeping work apps and data separate and wipeable on their own",
      "No MDM at all for personal phones, with unmanaged access to company email instead",
      "A factory reset of the phone before it's enrolled, so no personal data is on it",
    ],
    answer: 1,
    explanation:
      "BYOD-focused enrollment, such as Android's work profile or Apple's User Enrollment, separates company apps and data from personal content, so IT manages, and can selectively wipe, only the work side. Full enrollment and supervision suit company-owned devices, unmanaged email access drops the company's protections, and a factory reset doesn't keep work and personal data apart afterward.",
  },
  {
    key: "c2-2.1-dlp-1",
    objective: "2.1",
    topic: "DLP",
    difficulty: 1,
    question:
      "A hospital wants to automatically stop emails and file uploads containing patient record numbers or credit card numbers from leaving the organization. Which control does this?",
    options: [
      "Mobile device management (MDM)",
      "Data loss prevention (DLP)",
      "Endpoint detection and response (EDR)",
      "Single sign-on (SSO)",
    ],
    answer: 1,
    explanation:
      "DLP inspects content in email, uploads, endpoints and cloud storage for patterns such as card numbers or medical record numbers, then blocks, encrypts or flags it according to policy. MDM manages device settings, EDR detects and responds to threats on endpoints, and SSO simplifies signing in.",
  },
  {
    key: "c2-2.1-dlp-2",
    objective: "2.1",
    topic: "DLP",
    difficulty: 2,
    question:
      "An employee tries to copy a spreadsheet of customers' Social Security numbers to a USB flash drive, and a message says the action is blocked by company policy. What MOST likely blocked it?",
    options: ["BitLocker To Go", "Windows Defender Firewall", "An endpoint DLP agent", "User Account Control"],
    answer: 2,
    explanation:
      "Endpoint DLP runs on the device and can stop sensitive content from being copied to removable media, printed or uploaded, showing a policy message to the user. BitLocker To Go encrypts removable drives rather than inspecting what's copied, the firewall filters network traffic rather than file copies, and UAC prompts for elevation.",
  },
  {
    key: "c2-2.1-directory-services-1",
    objective: "2.1",
    topic: "directory services",
    difficulty: 1,
    question:
      "What is the main purpose of directory services such as Active Directory Domain Services or an LDAP directory?",
    options: [
      "To store user, group and computer accounts centrally for authentication and management",
      "To translate host names into IP addresses when users browse the web",
      "To hand out IP addresses and default gateway settings to client devices automatically at startup",
      "To keep backup copies of users' files at an offsite location for recovery",
    ],
    answer: 0,
    explanation:
      "A directory service is a central database of identities and resources, such as users, groups, computers and printers, used for authentication, authorization and management; LDAP is the protocol commonly used to query it. Translating names to addresses is DNS, assigning addresses is DHCP, and offsite file copies are a backup function.",
  },
  {
    key: "c2-2.1-directory-services-2",
    objective: "2.1",
    topic: "directory services",
    difficulty: 2,
    question:
      "An application needs to look up user accounts and group memberships in the company directory, and security policy requires those queries to be encrypted. Which protocol and port should the application use?",
    options: ["LDAP on TCP port 389", "Kerberos on port 88", "SMB on TCP port 445", "LDAPS on TCP port 636"],
    answer: 3,
    explanation:
      "LDAP is the protocol for querying directory services, and LDAPS (LDAP over TLS) on TCP port 636 encrypts those queries. Plain LDAP on 389 isn't encrypted unless it's upgraded with StartTLS, Kerberos on port 88 issues authentication tickets rather than answering directory lookups, and SMB on 445 is for file and printer sharing.",
  },
  {
    key: "c2-2.1-just-in-time-1",
    objective: "2.1",
    topic: "just-in-time access and PAM",
    difficulty: 2,
    question:
      "An auditor flags that a company's administrators hold domain admin rights permanently. The company wants admins to request elevated rights when they need them, receive them for a few hours, and have that use recorded. Which approach does this describe?",
    options: [
      "Just-in-time access through a privileged access management (PAM) solution",
      "Single sign-on for every administrator account",
      "A shared administrator password, kept in a spreadsheet that only admins can open",
      "Disabling the built-in guest account",
    ],
    answer: 0,
    explanation:
      "Just-in-time access grants elevated privileges only when requested and approved, for a limited time, and a PAM solution manages, records and audits that privileged access, so no one holds standing admin rights. SSO only reduces sign-in prompts, a shared password in a spreadsheet removes accountability and is easy to steal, and disabling the guest account doesn't change what admins can do.",
  },
  {
    key: "c2-2.1-iam-1",
    objective: "2.1",
    topic: "IAM",
    difficulty: 2,
    question:
      "A company wants new hires' accounts created automatically from HR records, access granted by job role, and all access removed on the day someone leaves. Which discipline covers this whole account life cycle?",
    options: [
      "Data loss prevention (DLP)",
      "Mobile device management (MDM)",
      "Endpoint detection and response (EDR)",
      "Identity and access management (IAM)",
    ],
    answer: 3,
    explanation:
      "IAM manages digital identities through their life cycle, from provisioning and role-based access to access reviews and deprovisioning, along with the policies that control what each identity can reach. DLP protects data from leaving the organization, MDM manages devices, and EDR detects threats on endpoints.",
  },
  {
    key: "c2-2.2-passwordless-1",
    objective: "2.2",
    topic: "passwordless authentication",
    difficulty: 2,
    question:
      "A user asks why IT wants them to sign in to Windows with a Windows Hello PIN instead of their account password. Which statement is TRUE?",
    options: [
      "The PIN is stored on Microsoft's servers, so it can always be recovered if the user forgets it",
      "The PIN is secure only if it is longer than the password it replaces",
      "The PIN is tied to that one device and never sent over the network, so it's useless elsewhere",
      "The PIN works on any computer the user signs in to, just like the password",
    ],
    answer: 2,
    explanation:
      "A Windows Hello PIN unlocks a key protected by the device's TPM: the PIN stays on the device, isn't stored on any server and works only where it was set up, while a stolen password can be used from anywhere. The TPM also limits repeated guesses. No server holds the PIN, its protection comes from being tied to the device rather than from length, and Hello has to be set up separately on each device.",
  },
  {
    key: "c2-2.2-passwordless-2",
    objective: "2.2",
    topic: "passwordless authentication",
    difficulty: 2,
    question:
      "A Windows 11 user with a Microsoft account has set up Windows Hello face and PIN sign-in, and wants to remove the password option from this PC's sign-in screen. Which setting should the technician turn on?",
    options: [
      "Password never expires, in the user's properties in Local Users and Groups",
      "Only allow Windows Hello sign-in for Microsoft accounts on this device",
      "Dynamic lock, in Settings > Accounts > Sign-in options",
      "The lowest User Account Control level, in Control Panel",
    ],
    answer: 1,
    explanation:
      "The setting 'For improved security, only allow Windows Hello sign-in for Microsoft accounts on this device', under Settings > Accounts > Sign-in options, makes sign-in passwordless for Microsoft accounts on that PC: users sign in with Windows Hello (face, fingerprint or PIN) and the password option goes away on that device. Password never expires keeps the password in use, Dynamic lock locks the PC when a paired phone moves away, and lowering UAC weakens security without changing sign-in.",
  },
  {
    key: "c2-2.2-domain-join-1",
    objective: "2.2",
    topic: "joining an Active Directory domain",
    difficulty: 2,
    question:
      "A technician tries to join a new Windows 11 Pro PC to the corp.example.com domain and gets an error that a domain controller for the domain could not be contacted. The PC can browse the internet. What is the MOST likely cause?",
    options: [
      "The PC is running Windows 11 Pro, which can't join a domain",
      "The PC's DNS server is set to a public resolver instead of the company's AD DNS servers",
      "The domain administrator account being used for the join has been locked out by too many attempts",
      "BitLocker is turned on for the PC's system drive",
    ],
    answer: 1,
    explanation:
      "Domain members find domain controllers through DNS service (SRV) records that only the company's AD DNS servers hold, so a PC pointed at an ISP or public resolver can browse the web but can't locate a domain controller. Windows 11 Pro supports domain join (Home doesn't), a locked-out account produces a credential error once a domain controller is found, and BitLocker doesn't affect joining a domain.",
  },
  {
    key: "c2-2.2-domain-join-2",
    objective: "2.2",
    topic: "joining an Active Directory domain",
    difficulty: 1,
    question:
      "A technician must join a Windows 11 Pro desktop to the company's Active Directory domain. Which of the following is a correct way to do it?",
    options: [
      "Sign in to the Microsoft Store with a domain account, then restart the desktop to finish joining",
      "Run gpupdate /force from an elevated command prompt, then restart the desktop to finish joining",
      "Map a network drive to a share on a domain controller, then restart the desktop to finish joining",
      "In System Properties (sysdm.cpl), change Member of to Domain, enter the domain and credentials, then restart",
    ],
    answer: 3,
    explanation:
      "In System Properties, Computer Name > Change > Member of: Domain joins the PC once you enter the domain name and an account allowed to join computers, followed by a restart; Settings > Accounts > Access work or school > Connect also offers to join a local Active Directory domain. The Microsoft Store doesn't join domains, gpupdate refreshes Group Policy on a PC that's already a member, and mapping a drive just connects to a share.",
  },
  {
    key: "c2-2.2-domain-join-3",
    objective: "2.2",
    topic: "joining an Active Directory domain",
    difficulty: 2,
    question:
      "A remote employee's laptop runs Windows 11 Home. The company wants it joined to the Active Directory domain so that Group Policy applies. What must happen first?",
    options: [
      "Enable the built-in guest account on the laptop",
      "Install the Media Feature Pack from Optional features",
      "Upgrade the laptop to Windows 11 Pro, or another edition that can join a domain",
      "Rename the laptop's workgroup so that it exactly matches the domain name, then restart",
    ],
    answer: 2,
    explanation:
      "Windows 11 Home can't join an Active Directory domain, while Pro, Enterprise and Education can, so upgrading the edition with a Pro license enables the domain join option. The guest account and the Media Feature Pack are unrelated, and a workgroup with the same name as the domain is still a workgroup, not domain membership.",
  },
  {
    key: "c2-2.2-move-objects-1",
    objective: "2.2",
    topic: "moving objects within organizational units",
    difficulty: 2,
    question:
      "A Group Policy object that installs accounting software is linked to the Accounting OU, but a new accounting PC isn't getting it. In Active Directory Users and Computers, the PC's computer object is still in the default Computers container. What should the administrator do?",
    options: [
      "Move the computer object into the Accounting OU, then restart the PC",
      "Link the Group Policy object to the user's mailbox instead of the OU",
      "Delete the computer object and join the PC to a workgroup",
      "Add the PC's IP address to the Group Policy object's description",
    ],
    answer: 0,
    explanation:
      "Group Policy objects apply to users and computers in the OUs they're linked to, and new computer accounts go into the Computers container, which isn't an OU and can't have policies linked to it. Moving the object into the Accounting OU (drag it, or right-click > Move) brings it into scope, and a restart applies the policy, since software installation policies run at startup. Policies aren't linked to mailboxes, leaving the domain removes policy entirely, and a description has no effect.",
  },
  {
    key: "c2-2.4-stalkerware-1",
    objective: "2.4",
    topic: "stalkerware",
    difficulty: 2,
    question:
      "A client says an ex-partner seems to know where they go and what they text. Their phone has an unfamiliar app with device administrator rights, heavy battery drain and unexplained data use. Which type of malware is MOST likely installed?",
    options: ["Cryptominer", "Ransomware", "Boot sector virus", "Stalkerware"],
    answer: 3,
    explanation:
      "Stalkerware is spyware installed secretly, often by someone close to the victim, to track location, messages, calls and photos; signs include unknown apps with high privileges, battery drain and data use. A cryptominer uses a device's processor to mine cryptocurrency, ransomware encrypts files for a ransom, and a boot sector virus infects a computer's boot code.",
  },
  {
    key: "c2-2.4-stalkerware-2",
    objective: "2.4",
    topic: "stalkerware",
    difficulty: 3,
    question:
      "A technician finds stalkerware on a client's phone that an abusive partner installed. Before removing it, what should the technician consider?",
    options: [
      "The abuser may notice when it stops reporting, so the client should plan for their safety first",
      "Stalkerware can't be removed from a phone, so the phone must be physically destroyed right away",
      "The app should stay installed permanently, so that everything it does keeps being logged as evidence",
      "The technician should contact the partner directly and ask them to uninstall the app themselves",
    ],
    answer: 0,
    explanation:
      "Whoever installed stalkerware may notice when it stops reporting, which can put the client in more danger, so safety and abuse-support services advise planning before removal, and the client may want evidence preserved. Then remove it, update the OS, change account passwords and check other devices and accounts. It can be removed with security tools or a factory reset, leaving it in place keeps the client watched, and contacting the abuser risks the client's safety.",
  },
  {
    key: "c2-2.4-fileless-1",
    objective: "2.4",
    topic: "fileless malware",
    difficulty: 2,
    question:
      "An infection runs malicious PowerShell commands directly in memory, launched from a registry Run key, and never writes an executable file to disk. A signature-based antivirus scan finds nothing. Which type of malware is this?",
    options: ["Boot sector virus", "Fileless malware", "Trojan horse", "Adware"],
    answer: 1,
    explanation:
      "Fileless malware runs in memory and abuses built-in tools such as PowerShell and WMI, often persisting through registry entries or scheduled tasks, so file-scanning antivirus has no malicious file to match. A boot sector virus infects boot code on disk, a Trojan is a malicious program disguised as legitimate software, and adware displays unwanted advertising.",
  },
  {
    key: "c2-2.4-fileless-2",
    objective: "2.4",
    topic: "fileless malware",
    difficulty: 2,
    question: "Which tool is BEST suited to detecting fileless malware on company laptops?",
    options: [
      "Traditional antivirus that only scans the files on disk for known malware signatures each night",
      "A disk defragmenter scheduled to run every week on each of the laptops",
      "EDR that watches process behavior, such as an Office app launching encoded PowerShell",
      "A firewall rule on each laptop that blocks outbound traffic on port 80",
    ],
    answer: 2,
    explanation:
      "Because fileless malware leaves little or nothing on disk, it's caught by watching behavior: EDR records process activity and flags patterns such as a document starting obfuscated PowerShell. Signature-only scanning looks for known files, defragmenting rearranges how files are stored, and blocking port 80 stops some unencrypted web traffic but not scripts running in memory.",
  },
  {
    key: "c2-2.4-pup-1",
    objective: "2.4",
    topic: "PUP",
    difficulty: 1,
    question:
      "After installing a free PDF converter, a user finds a new browser toolbar, a changed search engine and a PC optimizer that nags them to buy a license. The installer had pre-checked boxes for these extras. How are these programs BEST classified?",
    options: ["Rootkits", "Keyloggers", "Potentially unwanted programs", "Boot sector viruses"],
    answer: 2,
    explanation:
      "Potentially unwanted programs (PUPs) are bundled software, such as toolbars, search changers and scareware-style optimizers, that users technically agreed to through pre-checked installer options but don't want; they hurt performance and privacy without being outright malicious code. Rootkits hide deep in the OS to conceal malware, keyloggers record keystrokes, and boot sector viruses infect boot code.",
  },
  {
    key: "c2-2.4-pup-2",
    objective: "2.4",
    topic: "PUP",
    difficulty: 2,
    question:
      "A technician wants Windows to block potentially unwanted apps on employees' PCs, both apps already present and downloads in Microsoft Edge. Where is this set in Windows Security?",
    options: [
      "Firewall & network protection > Allow an app through firewall, with each unwanted app removed from the list",
      "Device security > Core isolation > Memory integrity, turned on for all users",
      "Account protection > Dynamic lock, with each employee's phone paired to their PC",
      "App & browser control > Reputation-based protection > Potentially unwanted app blocking",
    ],
    answer: 3,
    explanation:
      "Potentially unwanted app blocking is under App & browser control > Reputation-based protection settings: Block apps has Microsoft Defender detect PUAs already on the PC, and Block downloads stops them as they download in Microsoft Edge. Firewall rules control network traffic, memory integrity protects the Windows kernel from malicious code, and Dynamic lock locks the PC when a paired phone moves away.",
  },
  {
    key: "c2-2.4-adware-1",
    objective: "2.4",
    topic: "adware",
    difficulty: 1,
    question:
      "A user's PC shows pop-up advertisements on the desktop even when no browser is open, and new ads appear every few minutes. Which type of software is MOST likely responsible?",
    options: ["Ransomware", "Adware", "Rootkit", "Cryptominer"],
    answer: 1,
    explanation:
      "Adware displays unwanted advertising, often as pop-ups outside the browser, and frequently arrives bundled with free software; remove it in Settings > Apps and run an anti-malware scan. Ransomware encrypts files and demands payment, a rootkit hides itself and other malware rather than showing ads, and a cryptominer uses the CPU or GPU to mine cryptocurrency.",
  },
  {
    key: "c2-2.4-edr-1",
    objective: "2.4",
    topic: "EDR",
    difficulty: 2,
    question:
      "A company wants software on every laptop that continuously records process, file and network activity, detects suspicious behavior, and lets analysts cut an infected laptop off from the network with one click. What should it deploy?",
    options: [
      "Endpoint detection and response (EDR)",
      "A host-based firewall",
      "Mobile device management (MDM) software",
      "An email security gateway",
    ],
    answer: 0,
    explanation:
      "EDR agents collect detailed activity from each endpoint, detect threats by behavior as well as signatures, and provide responses such as isolating the host, stopping processes and reviewing what happened. A host-based firewall filters traffic, MDM configures and manages devices, and an email security gateway filters mail before it reaches users.",
  },
  {
    key: "c2-2.4-edr-2",
    objective: "2.4",
    topic: "EDR",
    difficulty: 2,
    question: "How does endpoint detection and response (EDR) differ from traditional antivirus?",
    options: [
      "EDR runs only on network routers and firewalls, while traditional antivirus runs on the endpoints",
      "EDR removes the need for patching and backups, while traditional antivirus still needs both",
      "EDR watches endpoint behavior and supports investigation and response; antivirus mainly blocks known files",
      "EDR scans email before it's delivered, while traditional antivirus scans web traffic",
    ],
    answer: 2,
    explanation:
      "Traditional antivirus focuses on matching files against known signatures; EDR records ongoing activity on the endpoint, spots suspicious behavior such as credential theft or fileless scripts, and gives responders tools to contain and investigate. EDR runs on endpoints such as laptops and servers, it doesn't replace patching or backups, and scanning email before delivery is an email security gateway's job.",
  },
  {
    key: "c2-2.4-mdr-1",
    objective: "2.4",
    topic: "MDR",
    difficulty: 2,
    question:
      "A 40-person company has EDR installed but nobody to watch its alerts at night or on weekends. Which offering provides 24/7 monitoring, investigation and response by an outside team of security analysts?",
    options: [
      "Managed detection and response (MDR)",
      "Extended detection and response (XDR)",
      "Data loss prevention (DLP)",
      "Remote monitoring and management (RMM)",
    ],
    answer: 0,
    explanation:
      "MDR is a managed service: a provider's analysts watch your detection tools around the clock, investigate alerts, hunt for threats and respond, or guide the response, for you. XDR is a technology platform that still needs people to run it, DLP prevents data leaks, and RMM is software IT providers use to monitor and maintain devices rather than a security monitoring service.",
  },
  {
    key: "c2-2.4-mdr-2",
    objective: "2.4",
    topic: "MDR",
    difficulty: 3,
    question:
      "A small business's MDR provider calls the owner at 2 a.m.: ransomware behavior was detected on a file server, and the provider has already isolated the server from the network. Which statement BEST describes the value MDR provided?",
    options: [
      "A signature update was queued, ready to install at the next scheduled scan",
      "Analysts watched the alerts in real time and contained the threat on its behalf",
      "The MDR provider had been taking a nightly backup of the file server",
      "A firewall rule automatically blocked all of the company's outbound email that night",
    ],
    answer: 1,
    explanation:
      "MDR adds people and process to detection tools: analysts triage alerts 24/7 and, as agreed in advance, act at once, here by isolating the server to stop the ransomware spreading. A queued signature update waits for the next scan, MDR isn't a backup service (backups are still needed to recover), and blocking outbound email wouldn't contain ransomware on a file server.",
  },
  {
    key: "c2-2.4-xdr-1",
    objective: "2.4",
    topic: "XDR",
    difficulty: 2,
    question:
      "An analyst wants one platform that links a phishing email, the user's sign-in from an unusual location and malware behavior on the user's laptop into a single incident. Which technology does this?",
    options: [
      "Endpoint detection and response (EDR)",
      "An email security gateway",
      "Signature-based antivirus",
      "Extended detection and response (XDR)",
    ],
    answer: 3,
    explanation:
      "XDR collects and correlates detections across several layers, such as email, identity, endpoints, network and cloud, so related alerts become one incident that shows the whole attack. EDR covers endpoints only, an email security gateway sees only mail, and antivirus scans for known malicious files on one device.",
  },
  {
    key: "c2-2.4-xdr-2",
    objective: "2.4",
    topic: "XDR",
    difficulty: 3,
    question: "Which statement BEST compares EDR, XDR and MDR?",
    options: [
      "EDR covers endpoints, XDR correlates many sources like email, and MDR is a managed service",
      "EDR, XDR and MDR are three brand names for the same signature-based antivirus product",
      "XDR is a managed service, MDR is a type of next-generation firewall, and EDR filters email",
      "MDR runs only on mobile devices, XDR runs only on servers, and EDR runs only on laptops",
    ],
    answer: 0,
    explanation:
      "EDR and XDR are technologies: EDR watches and responds on endpoints, while XDR correlates data from many sources into single incidents. MDR is a managed service in which a provider's analysts monitor and respond using tools like these. They aren't one product, MDR isn't a firewall or limited to mobile devices, and filtering email is a gateway's job.",
  },
  {
    key: "c2-2.4-email-gateway-1",
    objective: "2.4",
    topic: "email security gateway",
    difficulty: 2,
    question:
      "A company wants to stop phishing messages, spam and malicious attachments in mail from the internet before they ever reach users' inboxes. What should it deploy?",
    options: ["Endpoint DLP", "A web proxy server", "Full-disk encryption", "An email security gateway"],
    answer: 3,
    explanation:
      "An email security gateway sits in the mail flow, often as a cloud service that the domain's MX records point to, and filters inbound mail for spam, phishing, malicious links and attachments, for example by sandboxing files and checking SPF, DKIM and DMARC. Endpoint DLP controls data leaving devices, a web proxy filters browsing, and disk encryption protects stored data.",
  },
  {
    key: "c2-2.4-email-gateway-2",
    objective: "2.4",
    topic: "email security gateway",
    difficulty: 2,
    question:
      "Users notice that links in incoming emails now begin with the address of the company's mail filtering service, and each link is checked before the user is sent on to the real site. Which tool is doing this?",
    options: [
      "The browser's pop-up blocker, checking each new window",
      "The email security gateway, rewriting links and checking them when they're clicked",
      "Windows Defender Firewall, inspecting outbound connections",
      "The browser's secure DNS setting, encrypting each lookup the link triggers before loading it",
    ],
    answer: 1,
    explanation:
      "Many email security gateways rewrite links so each click is checked against current threat information at the moment it happens, which catches sites that turn malicious after the email arrives. A pop-up blocker stops pop-up windows, the firewall filters network connections, and secure DNS encrypts name lookups; none of them rewrite links in messages.",
  },
  {
    key: "c2-2.5-qr-phishing-1",
    objective: "2.5",
    topic: "QR code phishing",
    difficulty: 1,
    question:
      "Stickers with QR codes are placed over the real codes on a city's parking meters. Scanning one opens a convincing payment page that collects card details. What is this attack?",
    options: ["Vishing", "Tailgating", "QR code phishing", "Evil twin"],
    answer: 2,
    explanation:
      "QR code phishing, or quishing, uses a QR code to send victims to a malicious site, here a fake payment page; it works because a code's destination can't be seen before scanning. Vishing uses voice calls, tailgating follows someone through a secure door, and an evil twin is a rogue Wi-Fi access point that imitates a legitimate one.",
  },
  {
    key: "c2-2.5-qr-phishing-2",
    objective: "2.5",
    topic: "QR code phishing",
    difficulty: 2,
    question:
      "An email that appears to come from IT says the user's MFA must be re-registered and asks them to scan a QR code with their phone. Why do attackers often put the link in a QR code rather than a clickable link?",
    options: [
      "QR codes install malware on a device just by being displayed on its screen, without any scan",
      "QR codes are encrypted, so nobody can check where one leads until after it has been opened",
      "Filters may miss a link inside an image, and the phone often lacks company web protection",
      "QR codes work only on company-managed phones, which are set to trust messages from IT",
    ],
    answer: 2,
    explanation:
      "A QR code is an image, so link scanning in email filters can miss it, and scanning it moves the victim to a personal phone that usually lacks the company's web filtering and has a small screen that hides a suspicious address. Displaying a code installs nothing, codes aren't encrypted (any scanner app shows the URL), and they work on any device with a camera.",
  },
  {
    key: "c2-2.5-spear-phishing-1",
    objective: "2.5",
    topic: "spear phishing",
    difficulty: 1,
    question:
      "An attacker researches a company's payroll clerk on social media, then emails the clerk a message that names their manager and mentions a recent team event, with a link to a fake benefits portal. Which attack is this?",
    options: ["Whaling", "Spear phishing", "Smishing", "Dumpster diving"],
    answer: 1,
    explanation:
      "Spear phishing targets a specific person or small group with a message personalized from research, which makes it more convincing than mass phishing. Whaling is spear phishing aimed at senior executives, smishing uses text messages, and dumpster diving searches discarded material for information.",
  },
  {
    key: "c2-2.5-spear-phishing-2",
    objective: "2.5",
    topic: "spear phishing",
    difficulty: 2,
    question: "What is the key difference between general phishing and spear phishing?",
    options: [
      "Spear phishing is tailored to specific people using details about them, not one lure sent to many",
      "Spear phishing always arrives as a phone call or voicemail, while general phishing always arrives as email",
      "Spear phishing targets only CEOs, while general phishing targets all other employees",
      "Spear phishing never contains links or attachments, while general phishing always does",
    ],
    answer: 0,
    explanation:
      "General phishing casts a wide net with one generic message, while spear phishing uses researched details such as names, projects and colleagues to fool particular targets. Phishing by phone is vishing, attacks aimed at executives are called whaling, and spear phishing often includes links or attachments.",
  },
  {
    key: "c2-2.5-bec-1",
    objective: "2.5",
    topic: "business email compromise (BEC)",
    difficulty: 2,
    question:
      "An accounts payable clerk receives an email from what appears to be a long-standing supplier's address. It says the supplier has changed banks and the next invoice should be paid into a new account. The email has no links or attachments. Which attack is this MOST likely to be?",
    options: ["Cross-site scripting (XSS)", "SQL injection", "Evil twin", "Business email compromise (BEC)"],
    answer: 3,
    explanation:
      "BEC uses a compromised or spoofed business email account to trick staff into wire transfers, payment-detail changes or gift-card purchases, and because it often carries no malware or links, filters may miss it. XSS and SQL injection attack web applications, and an evil twin is a rogue Wi-Fi access point.",
  },
  {
    key: "c2-2.5-bec-2",
    objective: "2.5",
    topic: "business email compromise (BEC)",
    difficulty: 2,
    question:
      "Which control BEST protects a company from business email compromise requests to change a vendor's payment details?",
    options: [
      "Reply to the email and ask the sender to confirm in writing that the change is genuine",
      "Install a pop-up blocker in the finance team's web browsers",
      "Call the vendor back on a phone number already on file, not one from the email",
      "Require vendors to send payment changes as PDF attachments",
    ],
    answer: 2,
    explanation:
      "BEC works when people trust the email itself, so the defense is checking through a separate, known channel, backed by a written procedure for payment changes and MFA on email accounts. Replying goes straight back to the attacker when the account is compromised or spoofed, pop-up blockers don't affect email, and a PDF can be forged as easily as the message.",
  },
  {
    key: "c2-2.5-supply-chain-1",
    objective: "2.5",
    topic: "supply chain attack",
    difficulty: 2,
    question:
      "Attackers break into a software vendor's build system and insert a backdoor into a signed update. Thousands of the vendor's customers install it through their normal patching. What type of attack is this?",
    options: [
      "Zero-day attack on the customers' browsers",
      "Brute-force attack",
      "Insider threat at each customer",
      "Supply chain attack",
    ],
    answer: 3,
    explanation:
      "A supply chain (or pipeline) attack compromises a trusted supplier, such as its build pipeline or update servers, to reach the supplier's customers through software they trust. The customers' browsers weren't exploited, no passwords were guessed, and nobody inside the customer organizations acted maliciously.",
  },
  {
    key: "c2-2.5-supply-chain-2",
    objective: "2.5",
    topic: "supply chain attack",
    difficulty: 3,
    question:
      "A company wants to reduce its risk from supply chain attacks on the software it buys. Which action helps MOST?",
    options: [
      "Turn off all software updates permanently, so that no vendor update can ever carry a backdoor into the network",
      "Vet vendors' security, use official, signed software, and pilot updates before a wide rollout",
      "Let employees install any software they like, as long as it is free of charge",
      "Rely on each vendor's marketing materials to judge how secure its products are",
    ],
    answer: 1,
    explanation:
      "Vendor security assessments, official sources, checking signatures and hashes, and trying updates on a pilot group before company-wide rollout all reduce exposure to a compromised supplier. Turning off updates leaves known vulnerabilities unpatched, free downloads from anywhere add risk, and marketing claims aren't evidence of security.",
  },
  {
    key: "c2-2.6-reimage-1",
    objective: "2.6",
    topic: "reimage/reinstall",
    difficulty: 2,
    question:
      "During SOHO malware removal, a technician finds a rootkit that scans from safe mode and from the preinstallation environment can't fully remove. What is the BEST next step?",
    options: [
      "Back up the user's data, scanning it for malware, then reimage or reinstall the OS",
      "Re-enable System Restore and return the PC to the user right away",
      "Educate the user about safe browsing habits, then close the support ticket as resolved",
      "Run Disk Cleanup to delete the temporary files where the rootkit hides",
    ],
    answer: 0,
    explanation:
      "When scanning and removal can't guarantee a clean system, which is common with rootkits, CompTIA's procedure moves to reimaging or reinstalling, which returns the OS to a known-good state once the user's data is saved and scanned. Re-enabling System Restore comes only after remediation, educating the user is the last step once the system is clean, and Disk Cleanup doesn't remove rootkits.",
  },
  {
    key: "c2-2.6-reimage-2",
    objective: "2.6",
    topic: "reimage/reinstall",
    difficulty: 2,
    question:
      "Following CompTIA's SOHO malware removal procedure, a technician has just reimaged an infected Windows 11 Home PC. What should the technician do NEXT?",
    options: [
      "Schedule scans and run updates",
      "Quarantine the infected system",
      "Disable System Restore",
      "Investigate and verify the malware symptoms",
    ],
    answer: 0,
    explanation:
      "In CompTIA's procedure, reimaging or reinstalling is part of remediation; next come scheduling scans and running updates, then enabling System Restore and creating a restore point, and finally educating the user. Investigating symptoms, quarantining the system and disabling System Restore are the first three steps, done before remediation.",
  },
  {
    key: "c2-2.7-password-uniqueness-1",
    objective: "2.7",
    topic: "password uniqueness",
    difficulty: 1,
    question:
      "After a breach at a shopping website, attackers sign in to a user's work email with the same email address and password the user had used on the shopping site. Which practice would have prevented this?",
    options: [
      "Changing the password every 30 days",
      "Adding a number to the end of the password",
      "Letting the browser remember the password",
      "Using a different password for every account",
    ],
    answer: 3,
    explanation:
      "Attackers take credentials leaked from one site and try them on others (credential stuffing), so a unique password for every account keeps a breach in one place from opening the rest. Changing the password regularly or adding a number doesn't help if the same password is reused everywhere, and having the browser remember it doesn't make it unique.",
  },
  {
    key: "c2-2.7-password-uniqueness-2",
    objective: "2.7",
    topic: "password uniqueness",
    difficulty: 2,
    question:
      "A help desk wants to stop users from choosing a new password that matches one of their last several passwords. Which Windows password policy setting does this?",
    options: [
      "Minimum password age",
      "Enforce password history",
      "Password must meet complexity requirements",
      "Account lockout threshold",
    ],
    answer: 1,
    explanation:
      "Enforce password history remembers a set number of previous passwords and blocks their reuse. Minimum password age stops users cycling through quick changes to get back to an old password but doesn't block reuse on its own, complexity requires a mix of character types, and the lockout threshold limits failed sign-in attempts.",
  },
  {
    key: "c2-2.7-complexity-1",
    objective: "2.7",
    topic: "complexity",
    difficulty: 2,
    question:
      "Windows' Password must meet complexity requirements policy is enabled. Which new password would be accepted for the account jsmith, whose display name is John Smith?",
    options: ["jsmith2026!", "summerharbor", "Harbor7-Lantern", "SMITH-2026"],
    answer: 2,
    explanation:
      "The policy rejects passwords containing the account name, or any part of the display name three or more characters long, and requires characters from three of five categories: uppercase, lowercase, digits, symbols and other Unicode letters. Harbor7-Lantern uses four categories and no part of the name; jsmith2026! contains the account name, summerharbor uses only lowercase letters, and SMITH-2026 contains Smith from the display name.",
  },
  {
    key: "c2-2.7-complexity-2",
    objective: "2.7",
    topic: "complexity",
    difficulty: 3,
    question:
      "A security policy requires passwords to include uppercase and lowercase letters, numbers and symbols. Why does current guidance, such as NIST's, put more weight on password length than on these complexity rules?",
    options: [
      "Longer passwords are always easier for users to remember than shorter, complex ones",
      "Each added character multiplies the possibilities, while forced complexity breeds patterns",
      "Windows doesn't support complexity rules at all, so password length is the only option left",
      "Symbols can't be typed on phone keyboards, so complex passwords lock mobile users out",
    ],
    answer: 1,
    explanation:
      "Length grows the number of possible passwords fastest, and forced complexity often leads to predictable substitutions like Password1! that cracking tools try early, so NIST's guidance favors long passphrases checked against lists of breached passwords over composition rules. Long passwords aren't always easier to remember, Windows does support complexity rules, and symbols can be typed on phones.",
  },
  {
    key: "c2-2.7-password-managers-1",
    objective: "2.7",
    topic: "password managers",
    difficulty: 1,
    question:
      "A user has more than 80 online accounts and admits to reusing a few passwords. Which recommendation BEST lets them use a strong, unique password everywhere?",
    options: [
      "Use a password manager, protected by a strong master password and MFA",
      "Write the passwords in a notebook kept in a locked drawer beside the PC",
      "Use one very long password for every account",
      "Keep the passwords in a text file on the desktop",
    ],
    answer: 0,
    explanation:
      "A password manager generates and stores a long, random, unique password for every account in an encrypted vault, so the user remembers only one strong master password, ideally protected with MFA. A notebook by the PC can be read by anyone nearby, one shared password means one breach exposes every account, and a text file isn't encrypted.",
  },
  {
    key: "c2-2.7-password-managers-2",
    objective: "2.7",
    topic: "password managers",
    difficulty: 3,
    question:
      "A user's password manager doesn't offer to fill in their bank password on a page that looks exactly like the bank's sign-in page. What is the MOST likely reason, and what should the user do?",
    options: [
      "The password manager's vault is corrupted, so the user should type the password in by hand",
      "The bank has changed its logo, so the user should update the saved entry with the new design",
      "The page's domain doesn't match the saved one, a sign of phishing, so don't enter the password",
      "The browser cache is full, so the user should clear it and then try the page again",
    ],
    answer: 2,
    explanation:
      "Password managers fill credentials only on the domain saved with them, so a lookalike domain gets no offer, which is a useful warning sign of phishing; typing the password by hand would hand it to the attacker. A corrupted vault, a new logo or a full cache wouldn't explain a manager that works everywhere else declining this one page.",
  },
  {
    key: "c2-2.7-account-expiration-1",
    objective: "2.7",
    topic: "account expiration dates",
    difficulty: 2,
    question:
      "A contractor will work at the company until June 30. Which setting makes sure the contractor's domain account stops working after that date, even if nobody remembers to disable it?",
    options: [
      "A password expiration policy of 90 days",
      "An account lockout policy for failed attempts",
      "Restricted log-in hours on the account",
      "An account expiration date on the user account",
    ],
    answer: 3,
    explanation:
      "An account expiration date, set on the Account tab in Active Directory Users and Computers or with net user's /expires option, disables sign-in automatically from that date, so temporary accounts don't linger. Password expiration only forces a new password, lockout reacts to failed attempts, and log-in hours limit the time of day.",
  },
  {
    key: "c2-2.7-account-expiration-2",
    objective: "2.7",
    topic: "account expiration dates",
    difficulty: 2,
    question:
      "A technician creates a local account called intern on a kiosk PC for a summer intern and wants it to expire automatically. Which command sets an expiration date?",
    options: [
      "net accounts /maxpwage:30",
      "whoami /user",
      "net user intern /active:yes",
      "net user intern /expires:08/31/2026",
    ],
    answer: 3,
    explanation:
      "net user with /expires sets the date an account expires (by default accounts never expire), with the date format following the system's region settings. net accounts /maxpwage sets the maximum password age for every account rather than ending one, whoami /user shows the current user's SID, and /active:yes enables an account rather than expiring it.",
  },
  {
    key: "c2-2.7-unused-services-1",
    objective: "2.7",
    topic: "disabling unused services",
    difficulty: 2,
    question:
      "A hardening checklist for reception PCs says to reduce their attack surface, and an audit finds several services running that the PCs never use. Which action follows the checklist?",
    options: [
      "Set every service's startup type to Automatic, so that all of them are monitored and kept running",
      "In services.msc, stop the services the PCs don't need and set their startup type to Disabled",
      "Remove the Windows Update service so that updates can't change the PCs",
      "Turn off Microsoft Defender Antivirus to free up memory for other services",
    ],
    answer: 1,
    explanation:
      "Every running service is potential attack surface, especially one that listens on the network, so services a machine doesn't need should be stopped and disabled. Setting all services to Automatic adds attack surface, removing Windows Update leaves the PCs unpatched, and turning off antivirus removes protection.",
  },
  {
    key: "c2-2.7-unused-services-2",
    objective: "2.7",
    topic: "disabling unused services",
    difficulty: 2,
    question:
      "An audit finds the vsftpd FTP server running on a Linux workstation, though nobody uses FTP on it. Which command stops the service now and keeps it from starting at boot?",
    options: [
      "sudo systemctl enable vsftpd",
      "sudo systemctl reload vsftpd",
      "sudo systemctl disable --now vsftpd",
      "systemctl status vsftpd",
    ],
    answer: 2,
    explanation:
      "systemctl disable --now stops the service immediately and removes it from startup. An FTP server sends credentials in plain text, so an unused one is pure attack surface. enable would start it at every boot, reload rereads its configuration, and status only reports whether it's running.",
  },
  {
    key: "c2-2.8-configuration-profiles-1",
    objective: "2.8",
    topic: "configuration profiles",
    difficulty: 2,
    question:
      "An administrator wants every company iPhone to get the same Wi-Fi settings, VPN, email account and passcode rules without setting up each phone by hand. What should be deployed through the MDM?",
    options: ["A configuration profile", "A Rapid Security Response", "A jailbreak", "A factory reset"],
    answer: 0,
    explanation:
      "A configuration profile is a file (.mobileconfig on Apple devices) that bundles settings such as Wi-Fi, VPN, email, certificates and restrictions; MDM installs it on every enrolled device so they're all set up the same way. Rapid Security Responses were Apple's quick security fixes, a jailbreak removes iOS security restrictions, and a factory reset erases the device.",
  },
  {
    key: "c2-2.8-configuration-profiles-2",
    objective: "2.8",
    topic: "configuration profiles",
    difficulty: 3,
    question:
      "A user's personal iPhone sends all web traffic through an unknown VPN and lists an unfamiliar profile under Settings > General > VPN & Device Management. The user installed it from a free streaming website. What should the technician do?",
    options: [
      "Leave the profile installed, because configuration profiles can't change any network settings on a phone",
      "Install a second configuration profile that overrides the settings of the first",
      "Remove the profile, which removes its settings, then change the passwords used on the phone",
      "Turn on Low Power Mode, which disables every VPN configuration on the phone",
    ],
    answer: 2,
    explanation:
      "Configuration profiles can install VPNs, proxies and root certificates that let an attacker intercept traffic, so a profile from an untrusted website should be removed (select it under VPN & Device Management and remove it), which removes its settings too; passwords used while it was active may be exposed. Profiles can change network settings, a second profile doesn't cancel the first, and Low Power Mode doesn't disable VPN configurations.",
  },
  {
    key: "c2-2.8-application-updates-1",
    objective: "2.8",
    topic: "application updates",
    difficulty: 1,
    question:
      "A company's phones get OS updates promptly, but a security review finds many of their apps months out of date. Which step BEST closes this gap?",
    options: [
      "Block the app store on the phones so that installed apps can never change",
      "Ask users to delete and reinstall every one of their apps once a year",
      "Update only the apps that users report as broken or crashing",
      "Turn on automatic app updates, or have the MDM require current app versions",
    ],
    answer: 3,
    explanation:
      "Patch management on mobile devices covers apps as well as the OS: automatic updates from the App Store or Google Play, or app versions enforced through MDM, close known app vulnerabilities quickly. Blocking the store freezes vulnerable versions, yearly reinstalls leave months of exposure, and waiting for breakage ignores the security fixes users never notice.",
  },
  {
    key: "c2-2.8-application-updates-2",
    objective: "2.8",
    topic: "application updates",
    difficulty: 2,
    question:
      "An Android user installed a navigation app as an APK file from a website. Months later, the Google Play version has security fixes, but the user's copy has never updated. What is the MOST likely reason?",
    options: [
      "Apps sideloaded from outside the store generally don't get its automatic updates",
      "Android doesn't allow navigation apps to update while location services are on",
      "The phone's content filter is blocking the update from downloading from Google Play",
      "The app needs an Apple configuration profile installed before it can update",
    ],
    answer: 0,
    explanation:
      "App stores update the apps they installed; an APK sideloaded from a website generally isn't kept current by Google Play, so it stays on an old, vulnerable version. Reinstalling it from the official store restores automatic updates and Play Protect scanning. Location services don't block updates, content filters block sites and categories rather than updates, and configuration profiles are an Apple mechanism.",
  },
  {
    key: "c2-2.8-content-filtering-1",
    objective: "2.8",
    topic: "content filtering",
    difficulty: 1,
    question:
      "A school issues tablets to students and must block adult and gambling websites on them, including when they're used on home Wi-Fi. Which mobile security control does this?",
    options: [
      "Device encryption turned on for every tablet's storage",
      "Content filtering applied to the tablets, for example through MDM",
      "Remote wipe set up for any tablet that is lost or stolen",
      "A locator application installed on every student's tablet by the school",
    ],
    answer: 1,
    explanation:
      "Content filtering blocks websites and apps by category or list; applied on the device, through MDM or a filtering app, it works on any network rather than only behind the school's firewall. Device encryption protects stored data, remote wipe erases a lost device, and a locator app finds it.",
  },
  {
    key: "c2-2.8-content-filtering-2",
    objective: "2.8",
    topic: "content filtering",
    difficulty: 2,
    question:
      "A parent wants their child's iPhone to block adult websites in Safari without buying third-party software. Which built-in feature should the technician set up?",
    options: [
      "VPN & Device Management, with a new VPN configuration added for Safari",
      "Location Services, turned off for Safari in Privacy & Security settings",
      "Screen Time's Content & Privacy Restrictions, set to Limit Adult Websites",
      "Software Update, with automatic downloads and installs turned on",
    ],
    answer: 2,
    explanation:
      "Screen Time's Content & Privacy Restrictions include a Web Content setting that can limit adult websites or allow only listed sites, a content filter built into iOS. VPN & Device Management lists profiles and VPN configurations, Location Services controls access to location, and Software Update installs iOS updates.",
  },
  {
    key: "c2-2.9-regulatory-1",
    objective: "2.9",
    topic: "regulatory and environmental requirements",
    difficulty: 2,
    question:
      "A medical clinic is replacing 30 PCs whose drives hold patient records. Which disposal plan BEST meets its regulatory and environmental requirements?",
    options: [
      "Delete the patient folders from each drive, then donate the PCs to a local school or charity",
      "Quick format each drive, then put the PCs out with the regular office trash",
      "Keep the old PCs in a locked storage closet until someone decides what to do",
      "Hire a certified vendor to destroy the drives, issue certificates and recycle the rest",
    ],
    answer: 3,
    explanation:
      "Health data regulations require patient information to be made unreadable before disposal, and many jurisdictions' e-waste laws keep electronics out of regular trash, so a certified vendor's destruction certificates and recycling document compliance with both. Deleting folders or quick formatting leaves recoverable data, the trash breaks e-waste rules, and storing PCs indefinitely leaves the data at risk without solving anything.",
  },
  {
    key: "c2-2.9-regulatory-2",
    objective: "2.9",
    topic: "regulatory and environmental requirements",
    difficulty: 2,
    question:
      "Why should a company check data retention requirements before wiping and recycling its old file servers?",
    options: [
      "Data retention rules require every drive to be degaussed twice before it can be recycled",
      "Some records may legally need keeping for years, so preserve them before destroying the drives",
      "Retention requirements apply only to paper records, so the old file servers need no check at all",
      "Recycling vendors refuse to accept any drive that still holds data, so it must be empty",
    ],
    answer: 1,
    explanation:
      "Regulations cover keeping data as well as destroying it: tax, healthcare, financial or legal-hold rules can require records to be kept for years, so they must be migrated or archived before the hardware is sanitized. Retention rules don't prescribe degaussing, they apply to electronic records too, and certified recyclers routinely take drives in order to destroy them.",
  },
  {
    key: "c2-2.10-secure-management-1",
    objective: "2.10",
    topic: "secure management access",
    difficulty: 2,
    question:
      "A technician is hardening a SOHO router. Which configuration BEST secures access to the router's management interface?",
    options: [
      "Turn off WAN-side management, allow HTTPS admin access from the LAN only, and change the default password",
      "Turn on remote management over HTTP on the WAN port, so the owner can fix problems from anywhere",
      "Keep the default admin password, since it's printed on the router, and hide the SSID instead",
      "Allow Telnet and HTTP management from any address on the internet, as long as every sign-in attempt is logged",
    ],
    answer: 0,
    explanation:
      "Securing management access means limiting who can reach the admin interface and protecting the session: turn off management from the internet side, use HTTPS or SSH rather than HTTP or Telnet, limit access to the LAN or specific addresses, and replace default credentials. Remote HTTP management exposes an unencrypted login page to the internet, hiding the SSID doesn't protect the admin page, and Telnet sends credentials in plain text.",
  },
  {
    key: "c2-2.10-secure-management-2",
    objective: "2.10",
    topic: "secure management access",
    difficulty: 3,
    question:
      "A small office's owner wants to manage the office router from home. Which approach allows this while keeping management access secure?",
    options: [
      "Forward port 80 on the router to its own admin page so the owner can reach it from home",
      "Connect to the office over a VPN, then manage the router at its internal address",
      "Turn on remote management with the default credentials so the vendor can help as well",
      "Turn on UPnP so the router opens its admin page to the owner automatically",
    ],
    answer: 1,
    explanation:
      "A VPN authenticates and encrypts the connection into the office network, so the router's admin page never has to face the internet. Forwarding port 80 publishes an unencrypted login page to anyone, default credentials are widely known, and UPnP lets devices open ports on their own, which adds risk rather than securing access.",
  },
  {
    key: "c2-2.10-guest-access-1",
    objective: "2.10",
    topic: "configuring guest access",
    difficulty: 2,
    question:
      "A café owner wants to offer customers Wi-Fi without giving them any access to the point-of-sale system and office PC on the same router. Which configuration BEST does this?",
    options: [
      "A separate guest network with client isolation, so guests reach only the internet",
      "The main Wi-Fi password, given to customers and changed every month",
      "SSID broadcast turned off on the main network, so that customers can't find or join it",
      "UPnP turned on, so that customers' devices can connect without a password",
    ],
    answer: 0,
    explanation:
      "A guest network puts visitors on a separate SSID and network segment that reaches the internet but not internal devices, and client isolation stops guests reaching each other. Sharing the main password puts customers on the same network as the point-of-sale system, a hidden SSID is still easy to find, and UPnP doesn't control who can join; it lets devices open ports on the router, which adds risk.",
  },
  {
    key: "c2-2.11-browser-patching-1",
    objective: "2.11",
    topic: "browser patching",
    difficulty: 1,
    question:
      "A browser downloaded a security update in the background several days ago, but the user hasn't closed the browser in weeks. What should the technician tell the user?",
    options: [
      "Nothing is needed, because a downloaded update protects the browser immediately",
      "Clear the browser cache, which applies any downloaded updates",
      "Restart the browser to apply the update; until then the old version keeps running",
      "Turn off automatic updates to avoid interruptions in the future",
    ],
    answer: 2,
    explanation:
      "Browsers such as Chrome and Edge download updates automatically but finish applying them only when the browser restarts, so one left open for weeks keeps running the vulnerable version. Browsers are a common target for drive-by attacks, which is why patching them matters. Clearing the cache doesn't install anything, and turning off updates leaves known vulnerabilities open.",
  },
  {
    key: "c2-2.11-browser-patching-2",
    objective: "2.11",
    topic: "browser patching",
    difficulty: 2,
    question:
      "Which page shows the installed version of Microsoft Edge, checks for updates and installs any that are available?",
    options: [
      "edge://extensions (Extensions)",
      "edge://settings/privacy (Privacy, search, and services)",
      "edge://flags (Experiments)",
      "edge://settings/help (About Microsoft Edge)",
    ],
    answer: 3,
    explanation:
      "About Microsoft Edge (edge://settings/help) shows the version, checks for updates and offers to restart the browser when one is ready to apply. edge://extensions manages extensions, the Privacy, search, and services page covers tracking prevention, clearing browsing data and secure DNS, and edge://flags holds experimental features.",
  },
  {
    key: "c2-2.11-proxy-1",
    objective: "2.11",
    topic: "proxy",
    difficulty: 2,
    question:
      "A company requires all web traffic to go through its filtering proxy, proxy.corp.example.com on port 8080, and a new laptop can't reach external websites. Where should the technician set the proxy so Edge and Chrome on Windows 11 use it?",
    options: [
      "Settings > Network & internet > Proxy, with the address and port or a setup script",
      "On each browser's extensions page, by installing the company's proxy extension",
      "In the hosts file, by mapping each external website to the proxy's IP address",
      "In Device Manager, in the advanced properties of the network adapter's driver",
    ],
    answer: 0,
    explanation:
      "Edge and Chrome on Windows use the system proxy settings, set in Settings > Network & internet > Proxy with a manual server and port or an automatic configuration (PAC) script, often pushed by Group Policy. Extensions aren't the standard way to set a proxy, the hosts file only maps names to addresses, and the adapter's driver settings control hardware features.",
  },
  {
    key: "c2-2.11-proxy-2",
    objective: "2.11",
    topic: "proxy",
    difficulty: 3,
    question:
      "After a user installed a free VPN download, all their browser traffic goes through an unknown proxy server and they see certificate warnings on banking sites. What should the technician do?",
    options: [
      "Accept the certificate warnings, since using any proxy server always causes them",
      "Clear the browser cache and keep using the proxy, since the user installed it on purpose",
      "Switch the browser to private-browsing mode, which always bypasses the proxy server",
      "Remove the proxy setting and the software, then scan and check for added root certificates",
    ],
    answer: 3,
    explanation:
      "Malware and shady VPN apps can set a proxy to intercept traffic; certificate warnings appear when it presents certificates the browser doesn't trust, and some also install a root certificate to hide this. Removing the proxy setting and the software, then scanning, restores direct, trusted connections. Accepting the warnings invites interception, clearing the cache leaves the proxy in place, and private browsing uses the same proxy settings.",
  },
  {
    key: "c2-2.11-secure-dns-1",
    objective: "2.11",
    topic: "secure DNS",
    difficulty: 2,
    question:
      "A user often works on public Wi-Fi and wants to stop others on the network from seeing or tampering with the website names the browser looks up. Which browser setting helps?",
    options: [
      "Private-browsing mode",
      "The pop-up blocker",
      "Use secure DNS (DNS over HTTPS)",
      "Clear cookies and site data on exit",
    ],
    answer: 2,
    explanation:
      "Secure DNS sends the browser's name lookups to a resolver over HTTPS (DNS over HTTPS), encrypting them so others on the network can't read or change them. Private browsing only avoids keeping history and cookies on the device, a pop-up blocker blocks new windows, and clearing site data on exit removes stored data.",
  },
  {
    key: "c2-2.11-secure-dns-2",
    objective: "2.11",
    topic: "secure DNS",
    difficulty: 3,
    question:
      "A company blocks malicious and banned sites with its internal DNS servers. Users who turned on secure DNS with a public provider in their browsers are no longer filtered. What should the administrator do?",
    options: [
      "Block all traffic on port 53 at the firewall, which stops DNS over HTTPS lookups",
      "Use browser policies to turn secure DNS off or point it at the company's resolver",
      "Have users clear their browser cache at the end of every working day",
      "Disable private-browsing mode in every browser through Group Policy",
    ],
    answer: 1,
    explanation:
      "DNS over HTTPS sends lookups over HTTPS, on port 443, to whichever resolver the browser is set to, bypassing internal DNS filtering; managed browser policies for Chrome and Edge can turn secure DNS off or require the company's resolver. Blocking port 53 doesn't affect DNS over HTTPS, clearing the cache doesn't change where lookups go, and private browsing doesn't control DNS.",
  },
  {
    key: "c2-2.11-plug-ins-1",
    objective: "2.11",
    topic: "plug-ins",
    difficulty: 3,
    question:
      "An old internal web app depends on an ActiveX control that current browsers don't support. Which response BEST balances keeping the app working with security?",
    options: [
      "Install an old, unpatched browser that still runs ActiveX and make it the default on every PC",
      "Turn off all of Chrome's security features so the control can load",
      "Download the control's installer from a file-sharing website",
      "Open only that site in Microsoft Edge's Internet Explorer mode, and plan to replace the app",
    ],
    answer: 3,
    explanation:
      "Plug-ins and controls run code inside the browser, and legacy ones are a large attack surface, which is why modern browsers dropped them. Edge's IE mode can run a legacy site that needs ActiveX controls, limited to the sites listed, while the app is replaced. An unpatched default browser exposes every site visit, turning off security features helps attackers, and file-sharing sites are a common source of malware.",
  },
  {
    key: "c2-2.11-plug-ins-2",
    objective: "2.11",
    topic: "plug-ins",
    difficulty: 1,
    question: "Which statement BEST describes the difference between browser plug-ins and extensions?",
    options: [
      "Plug-ins are always safe to install, because only the browser's own vendor can publish them",
      "Plug-ins render content types the browser can't, like Flash; extensions add features to the browser",
      "Extensions can be installed only by administrators, while anyone can install plug-ins",
      "Plug-ins and extensions are two names for exactly the same thing in every browser",
    ],
    answer: 1,
    explanation:
      "Plug-ins were add-ons that let browsers render content types they couldn't handle themselves, such as Flash or Java applets, and most legacy plug-ins are no longer supported. Extensions add functions such as ad blocking or password filling and, depending on their permissions, can read page content. Plug-ins often came from third parties, users can usually install extensions unless policy blocks them, and the two aren't the same thing.",
  },
  {
    key: "c2-2.11-extensions-1",
    objective: "2.11",
    topic: "extensions",
    difficulty: 2,
    question:
      "A user's browser now uses an unfamiliar search engine and injects ads into every page. An extension installed last week asked for permission to read and change all data on all websites. What should the technician do FIRST?",
    options: [
      "Remove the suspicious extension, reset the search engine and scan the PC",
      "Back up the user's files and reinstall Windows from scratch on the PC",
      "Clear the browser history and leave the extension installed as it is",
      "Tell the user to browse only in private-browsing mode from now on",
    ],
    answer: 0,
    explanation:
      "Extensions with broad site permissions can hijack searches, inject ads and read page data, so remove the suspicious one (chrome://extensions or edge://extensions), restore the default search engine and run an anti-malware scan. Reinstalling Windows is excessive before simpler fixes, clearing history doesn't remove the extension, and private browsing changes only what's saved for a session while the extension stays installed.",
  },
  {
    key: "c2-2.11-extensions-2",
    objective: "2.11",
    topic: "extensions",
    difficulty: 2,
    question:
      "A company wants employees to use only approved browser extensions from official sources. Which approach BEST enforces this?",
    options: [
      "A request that employees read reviews before they install any extension",
      "The browser's pop-up blocker, turned on for every single website that employees visit",
      "Browser policies, through Group Policy or MDM, allowing only listed extensions",
      "A rule that extensions may be installed only in private-browsing windows",
    ],
    answer: 2,
    explanation:
      "Chrome and Edge support enterprise policies that block every extension except an approved list, or force-install approved ones, enforced through Group Policy or MDM. Reviews are easily faked, the pop-up blocker is unrelated, and private browsing doesn't restrict what can be installed.",
  },
  {
    key: "c2-2.11-features-1",
    objective: "2.11",
    topic: "features",
    difficulty: 2,
    question:
      "A company uses a dedicated password manager and doesn't want passwords saved in web browsers. Which browser feature should be turned off, ideally through policy?",
    options: [
      "The pop-up blocker for unwanted windows",
      "Secure DNS for encrypted name lookups",
      "Tracking prevention, which blocks third-party trackers",
      "The built-in offer to save passwords and fill them in",
    ],
    answer: 3,
    explanation:
      "Browser feature management lets administrators turn individual features on or off: disabling the built-in password saving stops credentials being stored in browser profiles, which may sync to personal accounts, outside the company's approved tool. The pop-up blocker, secure DNS and tracking prevention protect users and should stay on.",
  },
  {
    key: "c2-2.11-features-2",
    objective: "2.11",
    topic: "features",
    difficulty: 2,
    question:
      "A user wants websites to stop asking for their location, and wants the camera and microphone blocked for every site except the company's videoconferencing site. Where should the technician set this?",
    options: [
      "The browser's site permissions for location, camera and microphone",
      "The browser's pop-up blocker, with the videoconferencing site added as an exception",
      "Clear browsing data, removing cookies and cached images for every site",
      "Private-browsing mode, used for every site except the videoconferencing one",
    ],
    answer: 0,
    explanation:
      "Browsers let you allow or block features such as camera, microphone, location and notifications for all sites or for each site (Site settings in Chrome, Cookies and site permissions in Edge). The pop-up blocker only handles new windows, clearing browsing data removes history and cookies, and private browsing doesn't keep permission choices after the session.",
  },
];
