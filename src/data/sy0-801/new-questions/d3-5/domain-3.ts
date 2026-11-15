import type { NewQuestion } from "./types";

/** 3.0 Security Architecture: topics SY0-801 names in 3.1–3.4 that the carried bank doesn't cover. */
export const questions: NewQuestion[] = [
  {
    key: "s8-3.1-usability-1",
    objective: "3.1",
    topic: "usability",
    difficulty: 2,
    question:
      "During a pilot of a document encryption tool, staff find that opening any protected file takes nine clicks and a second password, and most of them stop protecting files at all. Which consideration should drive the final choice of tool?",
    options: ["Usability", "Data sovereignty", "Ease of recovery", "Ownership"],
    answer: 0,
    explanation:
      "Usability is how easy a design is for the people who must use it, and a control that's too hard to use gets skipped, which here leaves files less protected than a simpler tool would. The pilot shows the choice should favor a tool staff will actually use, such as one that encrypts automatically. Data sovereignty is about which country's laws apply to data where it's stored, ease of recovery is how quickly a system can be restored after a failure, and ownership is who owns and answers for the infrastructure.",
  },
  {
    key: "s8-3.1-environmental-1",
    objective: "3.1",
    topic: "environmental requirements",
    difficulty: 2,
    question:
      "A retailer is deciding where to run a new analytics platform. Its board has published a target for cutting the company's carbon emissions, and its own server room is already at the limit of what its cooling can handle. Which consideration do these facts BEST represent?",
    options: ["Data classification", "Environmental requirements", "Usability", "Data sovereignty"],
    answer: 1,
    explanation:
      "Environmental requirements cover the conditions a platform needs, such as cooling, and the organization's environmental commitments, such as an emissions target. Both can steer the choice, for example toward a provider whose data centers have the capacity and run on lower-carbon energy. Data classification is about how sensitive the data is, usability is how easy the system is for people to use, and data sovereignty is which country's laws govern data where it's stored.",
  },
  {
    key: "s8-3.2-gmsa-1",
    objective: "3.2",
    topic: "group Managed Service Accounts (gMSAs)",
    difficulty: 2,
    question:
      "An audit finds that a scheduled task on three Windows servers runs as an ordinary domain user whose password sits in plain text in the task's script. Which change BEST removes the stored password?",
    options: [
      "Grant the account Domain Admin rights so the task never fails",
      "Encrypt the script with a key kept in the same folder",
      "Give each server its own local administrator account",
      "Run the task under a group Managed Service Account (gMSA)",
    ],
    answer: 3,
    explanation:
      "A gMSA's password is generated and rotated by Active Directory, and only the servers given permission can retrieve it, so services and scheduled tasks on several servers can run under it with no password stored anywhere. Domain Admin rights break least privilege and leave the password in the script, a key kept beside the script protects nothing, and separate local administrator accounts are more privileged than the task needs and don't give the three servers one domain identity.",
  },
  {
    key: "s8-3.2-sse-1",
    objective: "3.2",
    topic: "Security Service Edge (SSE)",
    difficulty: 2,
    question:
      "A company closes its head office, and staff now work from home and coworking spaces. It wants every user's web and SaaS traffic inspected, and its private apps reachable without a VPN, through a service it subscribes to rather than hardware it runs. Which solution fits BEST?",
    options: [
      "A site-to-site IPsec VPN to a data center",
      "An on-premises unified threat management appliance",
      "Security service edge (SSE)",
      "Out-of-band management for the network devices",
    ],
    answer: 2,
    explanation:
      "Security service edge delivers security as a cloud service close to wherever users are: web and SaaS inspection through a secure web gateway and a CASB, and access to private apps through zero trust network access instead of a VPN. A site-to-site VPN joins networks rather than securing users who work from anywhere, an on-premises UTM only protects traffic that passes through an office the company no longer has, and out-of-band management is a separate path for administering network devices.",
  },
  {
    key: "s8-3.2-e2ee-1",
    objective: "3.2",
    topic: "end-to-end encrypted messaging",
    difficulty: 2,
    question:
      "A company's board discusses a confidential merger over a chat app. Members want message content readable only on their own devices, so that even a breach of the app company's servers would expose nothing readable. Which feature should the app have?",
    options: [
      "TLS 1.3 with stronger cipher suites",
      "Encryption at rest on the app company's storage",
      "Multifactor authentication for every user",
      "End-to-end encrypted messaging",
    ],
    answer: 3,
    explanation:
      "With end-to-end encryption, each message is encrypted on the sender's device and only the recipients' devices hold the keys, so the app company's servers hold only ciphertext and a breach of them exposes nothing readable. TLS protects messages only on the way to the servers, where they're decrypted, encryption at rest leaves the keys with the company, and MFA protects accounts rather than stored message content.",
  },
  {
    key: "s8-3.2-diversity-1",
    objective: "3.2",
    topic: "diversity",
    difficulty: 2,
    question:
      "A security architect proposes a different antivirus vendor for each of two layers: one engine on the email gateway and another on endpoints. What is the main cost of this diversity?",
    options: [
      "Any malware that one engine misses is guaranteed to get past the other",
      "More to run: two consoles, two update cycles and two sets of skills",
      "The two engines will block each other's signature updates",
      "Email attachments will no longer be scanned at all",
    ],
    answer: 1,
    explanation:
      "Diversity means using different vendors or technologies for controls that back each other up, so a gap in one product, such as a malware sample its engine misses, can still be caught by the other. The price is complexity: two consoles, two update and licensing cycles, and staff who know both. Diversity makes it less likely, not more, that one engine's miss gets through, the engines run on different systems and don't block each other's updates, and the gateway still scans attachments.",
  },
  {
    key: "s8-3.3-structured-1",
    objective: "3.3",
    topic: "structured vs. unstructured data",
    difficulty: 1,
    question:
      "A data discovery project finds customer ID numbers in two places: one column of the CRM database, and scattered through scanned contracts, email attachments and chat messages. Which statement BEST describes the second place?",
    options: [
      "It's structured data, so a column-level control such as masking can protect it",
      "It's metadata, so it holds no sensitive values",
      "It's unstructured data, so tools must inspect the content itself",
      "It's data in transit, so TLS already protects it",
    ],
    answer: 2,
    explanation:
      "Unstructured data has no predefined schema: documents, scanned images, email and chat. Sensitive values can sit anywhere inside it, so discovery tools have to inspect the content, for example with pattern matching, plus text recognition for scans. The CRM column is the structured case, data organized in a defined schema, where a control such as column encryption or masking can target one field. ID numbers are values rather than metadata (data that describes other data), and stored files are data at rest, not in transit.",
  },
  {
    key: "s8-3.3-transpose-1",
    objective: "3.3",
    topic: "data transpose",
    difficulty: 2,
    question:
      "A legacy application obscures stored reference numbers by swapping each pair of digits, so 482915 is stored as 849251. An auditor points out that every original digit is still there, and anyone who works out the pattern can restore the numbers. Which method is the application using?",
    options: ["Hashing", "Tokenization", "Masking", "Data transpose"],
    answer: 3,
    explanation:
      "Transposing rearranges data's characters or values without changing them, so every original digit remains, only in a different order. Anyone who learns the pattern can reverse it, which is why transposition alone is weak; modern ciphers such as AES use a transposition step (ShiftRows) alongside substitution. Hashing produces a fixed-length digest that can't be reversed, tokenization replaces the value with an unrelated token whose real value sits in a vault, and masking hides characters behind symbols, such as showing only the last four digits.",
  },
  {
    key: "s8-3.3-filtering-1",
    objective: "3.3",
    topic: "filtering",
    difficulty: 2,
    question:
      "Before application logs are sent to an outside analytics service, a pipeline step strips the fields holding card numbers and customer email addresses out of every record, so those values never leave the company. Which data protection method is this?",
    options: ["Filtering", "Hashing", "Tokenization", "Data transpose"],
    answer: 0,
    explanation:
      "Filtering removes or excludes sensitive data so that only what's needed passes on: the card numbers and email addresses never reach the analytics service at all. Hashing would still send a digest of each value, tokenization would send a substitute token that maps back to the real value in a vault, and transposing would send the original characters in a different order.",
  },
  {
    key: "s8-3.3-operator-1",
    objective: "3.3",
    topic: "data operator",
    difficulty: 2,
    question:
      "A warehouse clerk scans each incoming parcel, which saves the customer's name and delivery address in the logistics system. The clerk follows set handling procedures and has no say in what's collected or who can see it. Which data protection role does the clerk hold?",
    options: ["Data owner", "Data controller", "Data operator", "Data subject"],
    answer: 2,
    explanation:
      "A data operator works with data, such as capturing, using or updating it, by following procedures others set, without deciding why it's collected or who may access it. The data owner decides classification and access, the data controller decides the purposes and means of processing personal data (here, the company), and the data subjects are the customers the data is about.",
  },
  {
    key: "s8-3.3-geofencing-1",
    objective: "3.3",
    topic: "geofencing",
    difficulty: 2,
    question:
      "A hospital lets clinicians open patient records on managed tablets, but only while the tablets are on the hospital campus. The mobile device management system blocks the records app as soon as a tablet leaves that area. Which data handling control is this?",
    options: ["Data sovereignty", "Geofencing", "Marking and labeling", "Data transpose"],
    answer: 1,
    explanation:
      "Geofencing draws a virtual boundary around a physical area and triggers an action, here blocking the app, when a device enters or leaves it. Data sovereignty is the principle that data is subject to the laws of the country where it's stored, marking and labeling attach a classification to data so people and tools handle it correctly, and transposing rearranges data's characters to obscure them.",
  },
  {
    key: "s8-3.3-steward-1",
    objective: "3.3",
    topic: "data steward",
    difficulty: 2,
    question:
      "A new rule says every customer record must store the country as a standard two-letter ISO code, and thousands of existing records must be cleaned up to match. Which role should own this work?",
    options: [
      "The data steward",
      "The data custodian",
      "The data subprocessor",
      "The data subject",
    ],
    answer: 0,
    explanation:
      "Data stewards look after data quality and definitions on the data owner's behalf, such as a field's permitted values and cleaning records to match them. The custodian runs the systems that store and protect the data, a subprocessor is a third party that a processor engages, and the data subject is the person the data is about.",
  },
  {
    key: "s8-3.3-lifecycle-1",
    objective: "3.3",
    topic: "data management life cycle",
    difficulty: 2,
    question:
      "A company wants every new document to carry the right sensitivity label from the start, so that encryption, sharing limits and retention rules apply to it automatically. At which stage of the data management life cycle should the label be applied?",
    options: ["Distribution", "Retention", "Disposal", "Creation"],
    answer: 3,
    explanation:
      "Labeling data when it's created means every later control, such as encryption, sharing limits and retention, can act on the label for the rest of the data's life. By distribution, when data is shared, an unlabeled file may already have gone out unprotected; retention is the stage where data is kept for a set period; and disposal is its secure destruction at the end.",
  },
  {
    key: "s8-3.4-rps-1",
    objective: "3.4",
    topic: "redundant power supply (RPS)",
    difficulty: 2,
    question:
      "A server with redundant power supplies crashed when one power strip failed, because both supplies were plugged into it. What should be changed?",
    options: [
      "Replace both power supplies with higher-wattage models",
      "Feed each supply from a separate PDU on its own circuit",
      "Remove one power supply, since the second adds nothing",
      "Add a surge protector between the strip and the server",
    ],
    answer: 1,
    explanation:
      "Redundant power supplies only help if each one has its own path to power. With both plugged into the same strip, the strip was a single point of failure, so feeding each supply from a separate PDU on its own circuit lets the server survive losing either path. Higher-wattage supplies would still share the strip, removing a supply takes away the redundancy, and a surge protector guards against voltage spikes, not a failed strip.",
  },
];
