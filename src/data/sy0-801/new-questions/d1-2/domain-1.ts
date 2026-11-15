import type { NewQuestion } from "./types";

/** 1.0 General Security Concepts: the topics SY0-801 names in 1.2 and 1.3 that the bank has no question on. */
export const questions: NewQuestion[] = [
  // ---- 1.2 Change management ----
  {
    key: "s8-1.2-backout-plan-1",
    objective: "1.2",
    topic: "backout planning",
    difficulty: 2,
    question:
      'A team plans to move the company\'s inbound email from its on-premises gateway to a cloud filtering service during Sunday\'s maintenance window. The backout section of the change request says only: "If there are problems, switch back." What should the change advisory board ask the team to add?',
    options: [
      "A comparison of the new service's features with the old gateway's",
      "Tested steps to restore the old mail routing, and the point at which the team will use them",
      "A message for users once the new service is live, explaining what changed and whom to call with questions",
      "The cloud provider's published uptime for the past year",
    ],
    answer: 1,
    explanation:
      "A backout plan has to work under pressure: the exact steps to return to the last working state (here, restoring the old mail routing), proof they were tested, and a decision point, such as a time limit or a failed test, that says when to stop troubleshooting and back out. A feature comparison belongs in the business case, a message to users is communication rather than recovery, and the provider's uptime history says nothing about how to undo this change.",
  },
  {
    key: "s8-1.2-fail-forward-1",
    objective: "1.2",
    topic: "fail forward",
    difficulty: 2,
    question:
      "An upgrade converts an order database to a new schema. Two hours after the change, a reporting feature breaks. Restoring the pre-change backup would lose every order taken since the upgrade, so the team keeps the new version and pushes a corrective fix through the change process. Which approach is the team taking?",
    options: [
      "Executing the backout plan",
      "Extending the maintenance window",
      "Repeating the impact analysis",
      "Failing forward",
    ],
    answer: 3,
    explanation:
      "Failing forward means fixing a failed change in place with a further change, instead of undoing it. It's the better call when backing out would do more harm than the problem itself, as here, where restoring the backup would wipe out new orders. Executing the backout plan is exactly what the team decided against, extending the window only changes when work happens, and an impact analysis is done before a change is approved, not to recover from one.",
  },
  {
    key: "s8-1.2-restricted-activities-1",
    objective: "1.2",
    topic: "restricted activities",
    difficulty: 2,
    question:
      "During an approved change to replace a failed access switch, a technician notices that the neighboring router runs outdated firmware, and there's still time left in the window to upgrade it. What should the technician do?",
    options: [
      "Upgrade the router now, since the maintenance window is already open",
      "Upgrade the router, then add it to the change record afterward",
      "Leave the router as it is and raise a separate change request for it",
      "Upgrade the router while a colleague watches for problems",
    ],
    answer: 2,
    explanation:
      "An approved change covers specific work, and anything outside it is restricted until it gets its own approval: the router upgrade wasn't part of this change's impact analysis, testing or backout plan, so it needs a change request of its own. An open window doesn't widen what was approved, recording the work afterward skips the review entirely, and a colleague watching doesn't replace an approval.",
  },
  {
    key: "s8-1.2-service-restart-1",
    objective: "1.2",
    topic: "service restart",
    difficulty: 2,
    question:
      "To harden a Linux server, an administrator edits the SSH server's configuration file to turn off password logins and allow only key-based logins. A scan a week later shows the server still accepts passwords, although the file is correct. What did the change MOST likely miss?",
    options: [
      "Restarting or reloading the SSH service afterward",
      "Updating the network diagram that shows the server",
      "Adding the scanner's IP address to a deny list",
      "Re-imaging the server from the standard build",
    ],
    answer: 0,
    explanation:
      "A service reads its configuration when it starts, so an edited file has no effect until the service is restarted or told to reload; the OpenSSH server, for example, rereads its configuration when it receives a reload signal. A change plan should include the restart, the brief interruption it may cause and a check afterward that the setting really applies. Updating a diagram is documentation, blocking the scanner would only hide the finding, and re-imaging is far more than this change needs.",
  },
  {
    key: "s8-1.2-application-restart-1",
    objective: "1.2",
    topic: "application restart",
    difficulty: 2,
    question:
      "Endpoint management reports that a critical browser update was installed on every laptop three days ago, yet the vulnerability scanner still finds the old, vulnerable browser version running on about a third of them. What is the MOST likely reason?",
    options: [
      "The scanner's vulnerability database is out of date and needs updating first",
      "Those browsers haven't been restarted since the update was installed",
      "The update was installed on the wrong disk partition",
      "Full disk encryption is blocking the update from taking effect",
    ],
    answer: 1,
    explanation:
      "Many applications, browsers among them, download an update in the background but keep running the old code until they're closed and reopened, so the patch isn't in force until the application restarts. Patch and change plans should cover that restart, for example by prompting users and then forcing a relaunch after a deadline. An out-of-date scanner database might miss newer flaws, but it wouldn't report a version that isn't running, updates don't land on the wrong partition, and disk encryption doesn't stop software from updating.",
  },

  // ---- 1.3 Cryptographic solutions ----
  {
    key: "s8-1.3-root-of-trust-1",
    objective: "1.3",
    topic: "root of trust",
    difficulty: 2,
    question:
      "A company issues TLS certificates for its internal web apps from its own private certificate authority. Company laptops open the apps without warnings, but a contractor's laptop shows a certificate error on every internal site. What is the MOST likely cause?",
    options: [
      "The private CA's root certificate isn't in the contractor laptop's trust store",
      "The internal sites need wildcard certificates before outside devices will trust them",
      "The contractor's laptop requires a longer key length than company laptops do",
      "The contractor's laptop has disk encryption turned off",
    ],
    answer: 0,
    explanation:
      "Every certificate chain has to end at a root certificate the device already trusts: its root of trust. Company laptops were given the private CA's root certificate, so chains to it validate; the contractor's laptop wasn't, so nothing that CA issues is trusted there. Installing the root on the devices that need access, or using a public CA for sites outsiders must reach, fixes it. A wildcard changes which names a certificate covers, not who trusts it, the same certificates work on company laptops, and disk encryption has nothing to do with checking certificates.",
  },
  {
    key: "s8-1.3-root-of-trust-2",
    objective: "1.3",
    topic: "root of trust",
    difficulty: 2,
    question:
      "A laptop's firmware checks the bootloader's signature before running it, the bootloader checks the operating system's signature, and a TPM records a measurement of each stage. Why does this chain of checks start in hardware?",
    options: [
      "Keys stored in hardware can be read faster than keys stored on disk",
      "Software can't alter hardware, so malware can't fake the checks that follow",
      "Hardware is required to generate certificate signing requests",
      "A TPM removes the need to encrypt the disk, since it already protects the keys",
    ],
    answer: 1,
    explanation:
      "Each stage is only as trustworthy as the one that checked it, so the chain needs a starting point that is trusted by design and protected from software tampering: a hardware root of trust, such as protected firmware code or a TPM. If the first check could be altered, malware could approve itself and every later check. Speed isn't the reason, certificate signing requests need no special hardware, and a TPM often protects the key for disk encryption rather than replacing it.",
  },
  {
    key: "s8-1.3-wildcard-1",
    objective: "1.3",
    topic: "wildcard certificates",
    difficulty: 2,
    question: "A company installs a wildcard certificate issued for *.example.com. Which hostname does it NOT cover?",
    options: ["www.example.com", "shop.example.com", "vpn.example.com", "dev.shop.example.com"],
    answer: 3,
    explanation:
      "A wildcard stands in for exactly one label at the left of a name, so *.example.com covers www.example.com, shop.example.com and vpn.example.com, but not dev.shop.example.com, which has two labels in that position. Covering it takes another certificate, such as one for *.shop.example.com, or listing the name as a subject alternative name. The bare domain, example.com, isn't covered by the wildcard either.",
  },
  {
    key: "s8-1.3-wildcard-2",
    objective: "1.3",
    topic: "wildcard certificates",
    difficulty: 3,
    question:
      "To save money, a company installs one wildcard certificate, and its private key, on 40 web servers run by different teams. What is the main security drawback?",
    options: [
      "Browsers show visitors a warning whenever a site uses a wildcard certificate",
      "A wildcard certificate can't be revoked once issued, even after its key is stolen",
      "Stealing the key from any one server lets an attacker pose as every covered host",
      "Wildcard certificates only support shorter, weaker keys",
    ],
    answer: 2,
    explanation:
      "Every server holds the same private key, so the weakest of the 40 sets the security of all of them: steal the key from one and an attacker can pose as any host the wildcard covers, and revoking it means replacing the certificate everywhere at once. Browsers accept wildcard certificates without warnings, a wildcard certificate can be revoked like any other, and it can use the same key types and lengths as any certificate.",
  },
  {
    key: "s8-1.3-partition-encryption-1",
    objective: "1.3",
    topic: "partition encryption",
    difficulty: 2,
    question:
      "A field laptop dual-boots two operating systems, each on its own partition, and a third partition holds client case files that both systems use. Policy requires that third partition, and only that one, to be encrypted. Which encryption level meets the requirement?",
    options: [
      "Full disk encryption",
      "Partition encryption",
      "Record-level encryption",
      "Transport encryption",
    ],
    answer: 1,
    explanation:
      "Partition encryption protects one partition of a drive and leaves the others as they are, which is exactly what the policy asks for. Full disk encryption would encrypt every partition on the drive, both operating systems included. Record-level encryption protects fields inside a database, and transport encryption protects data moving across a network rather than data stored on the laptop.",
  },
  {
    key: "s8-1.3-volume-encryption-1",
    objective: "1.3",
    topic: "volume encryption",
    difficulty: 2,
    question:
      "A cloud server keeps its application data on a separate block storage volume attached to the VM. The administrator turns on encryption for that volume, so everything written to it, and every snapshot taken from it, is encrypted. Which level of encryption is this?",
    options: [
      "Volume encryption",
      "File encryption",
      "Database encryption",
      "Record-level encryption",
    ],
    answer: 0,
    explanation:
      "Encrypting a whole storage volume, here the attached block storage disk and its snapshots, is volume-level encryption: everything written to the volume is protected, whatever files or databases it holds. File encryption protects individual files one at a time, and database and record-level encryption protect data inside a database, which would leave anything else on the volume unencrypted.",
  },
  {
    key: "s8-1.3-database-encryption-1",
    objective: "1.3",
    topic: "database encryption",
    difficulty: 3,
    question:
      "After a backup tape went missing, a company turns on transparent data encryption for its SQL Server database. Which threat does this address, and which does it leave open?",
    options: [
      "It stops database administrators from reading sensitive columns, but leaves backups unprotected",
      "It encrypts connections between the application and the database, but not the files on disk",
      "It protects the data files and backups if they're stolen, but anyone with database access still reads plaintext",
      "It hashes each record so changes can be detected, but it doesn't hide the data",
    ],
    answer: 2,
    explanation:
      "Database-level encryption such as transparent data encryption encrypts the database's data and log files, and its backups, as they're written, and decrypts pages as they're read, so stolen files or tapes are unreadable while anyone the database lets in still sees plaintext. Hiding a column from administrators takes record- or column-level encryption with keys the server doesn't hold. Transparent data encryption doesn't protect connections, which need TLS, and it encrypts rather than hashes.",
  },
  {
    key: "s8-1.3-record-encryption-1",
    objective: "1.3",
    topic: "record encryption",
    difficulty: 3,
    question:
      "A clinic's patient table holds names, appointment times and health insurance numbers. Front-desk staff must search names and appointments freely, but only the billing application should be able to read insurance numbers, even if a database administrator browses the table. Which approach fits BEST?",
    options: [
      "Full disk encryption on the database server's drives",
      "Transparent encryption of the whole database and its backups",
      "Masking the insurance numbers wherever they appear on front-desk screens",
      "Record-level encryption of that field, with a key only billing holds",
    ],
    answer: 3,
    explanation:
      "Record-level encryption protects chosen fields inside each record, here the insurance number, with their own key, so the rest of the table stays searchable and only the holder of that key, the billing application, can read the field. Full disk and whole-database encryption both decrypt data for anyone the database lets in, administrators included, and masking only changes what a screen displays, so the real numbers are still readable in the table.",
  },
];
