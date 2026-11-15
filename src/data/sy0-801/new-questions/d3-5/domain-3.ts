import type { NewQuestion } from "./types";

/** 3.0 Security Architecture: topics SY0-801 names in 3.1–3.4 that the carried bank doesn't cover. */
export const questions: NewQuestion[] = [
  {
    key: "s8-3.1-usability-1",
    objective: "3.1",
    topic: "usability",
    difficulty: 2,
    question:
      "A company's remote access design makes staff connect to a VPN, sign in to a jump server, then sign in again to each internal app, entering a one-time code at every step. Within a month, help desk tickets triple and some teams start emailing files to personal accounts to avoid the process. Which architecture consideration did the design neglect?",
    options: ["Usability", "Data sovereignty", "Ease of recovery", "Ownership"],
    answer: 0,
    explanation:
      "Usability is how easy a design is for the people who have to use it. Controls that make routine work too hard push people into workarounds, here emailing files to personal accounts, which leaves the company less secure than a design that balances protection with effort, such as single sign-on with one strong MFA prompt. Data sovereignty is about which country's laws apply to data where it's stored, ease of recovery is how quickly a system can be restored after a failure, and ownership is who owns and answers for the infrastructure.",
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
      "A web application runs on six Windows servers behind a load balancer, and every instance must run under the same domain service account. An administrator changes that account's password by hand once a year, and the current password is kept in a shared spreadsheet. Which change BEST fixes this?",
    options: [
      "Grant the service account Domain Admin rights so it never fails",
      "Set the account's password to never expire",
      "Give each server its own local administrator account",
      "Replace it with a group Managed Service Account (gMSA)",
    ],
    answer: 3,
    explanation:
      "A gMSA is a domain account whose password Windows manages: domain controllers compute it and change it automatically, and only the servers given permission can retrieve it, so no person needs to know it or keep it in a spreadsheet. Unlike a standalone managed service account, which is tied to one computer, a gMSA can run the same service on many servers, as a load-balanced farm needs. Domain Admin rights break least privilege, a password that never expires keeps the spreadsheet copy valid forever, and separate local accounts can't give every instance the one shared domain identity the service needs.",
  },
  {
    key: "s8-3.2-sse-1",
    objective: "3.2",
    topic: "Security Service Edge (SSE)",
    difficulty: 2,
    question:
      "A company already runs SD-WAN between its branches. Most staff now work from home and use SaaS apps directly, so it wants a cloud-delivered service that combines a secure web gateway, a cloud access security broker and zero trust access to its private apps, without changing its networking. Which solution fits BEST?",
    options: [
      "A site-to-site IPsec VPN between every branch",
      "An on-premises unified threat management appliance",
      "Security service edge (SSE)",
      "Out-of-band management for the branch routers",
    ],
    answer: 2,
    explanation:
      "Security service edge (SSE) is the security half of SASE: a secure web gateway, a CASB and zero trust network access delivered from the cloud, close to wherever users are. The company already has its networking in SD-WAN, so it needs only the security services. A site-to-site VPN joins networks rather than securing remote users' SaaS traffic, an on-premises UTM only inspects traffic that passes through the office, and out-of-band management is a separate path for administering devices.",
  },
  {
    key: "s8-3.2-e2ee-1",
    objective: "3.2",
    topic: "end-to-end encrypted messaging",
    difficulty: 2,
    question:
      "A law firm's chat service uses TLS between each user's app and the provider's servers, but messages are decrypted on those servers before being passed on. The firm wants a service whose provider can't read messages even with full access to its own servers. Which feature should the firm require?",
    options: [
      "TLS 1.3 with stronger cipher suites",
      "Encryption at rest on the provider's storage",
      "Multifactor authentication for every user",
      "End-to-end encrypted messaging",
    ],
    answer: 3,
    explanation:
      "With end-to-end encryption, a message is encrypted on the sender's device and only the recipients' devices hold the keys to decrypt it, so the provider relays ciphertext it can't read. TLS, even a newer version, protects each hop only as far as the provider's servers, where messages are decrypted. Encryption at rest protects stored data from someone who takes the disks, but the provider holds those keys. MFA protects accounts from takeover, not message content from the provider.",
  },
  {
    key: "s8-3.2-diversity-1",
    objective: "3.2",
    topic: "diversity",
    difficulty: 2,
    question:
      "A company has two layers of firewalls: one at the internet edge and one between the screened subnet and the internal network. The architect insists the two firewalls come from different vendors. What is the main security benefit of this diversity?",
    options: [
      "Firewall rules need to be written only once and can be shared by both devices",
      "A flaw or exploit in one vendor's product won't get through both layers",
      "Traffic no longer needs logging, because each firewall checks the other",
      "Neither firewall needs regular patching",
    ],
    answer: 1,
    explanation:
      "Diversity means using different vendors or technologies for controls that back each other up, so one flaw, such as a zero-day in one vendor's firmware, doesn't defeat every layer at once. The cost is more to manage: two rule syntaxes, so rules can't simply be shared, and two products that both still need patching. Each firewall still needs its own logging too, since neither one records what the other sees.",
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
      "At an insurer, a contracted team keys in and updates claim records every day by following the claims department's written instructions. The team has no say in why the data is collected, how it's classified or who may access it. Which data protection role does the team hold?",
    options: ["Data owner", "Data controller", "Data operator", "Data subject"],
    answer: 2,
    explanation:
      "A data operator works with data, entering, updating and processing it, by following instructions others set, without deciding why it's collected or who may see it. The data owner is the accountable person who decides classification and access, the data controller decides the purposes and means of processing personal data (here, the insurer), and data subjects are the people the data is about, such as the claimants. Running the systems that store the records would make the team custodians, and maintaining the data's definitions and quality would make it stewards.",
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
      "At a bank, one employee maintains the definitions and permitted values for every field in the customer data set, fixes duplicate and inaccurate records, and checks that the data is labeled and used as policy requires. The employee doesn't decide who gets access and doesn't run the servers. Which role does the employee hold?",
    options: ["Data steward", "Data custodian", "Data subprocessor", "Data owner"],
    answer: 0,
    explanation:
      "A data steward looks after the quality and proper use of a set of data: its definitions, permitted values and accuracy, and whether it's labeled and handled as policy requires. The data owner is the accountable person who decides classification and access, the data custodian runs the systems that store and protect the data, and a data subprocessor is a third party that a processor engages to process data on its behalf.",
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
      "A database server has two hot-swappable power supplies, each plugged into a different power distribution unit fed from a separate circuit. Which failure can the server ride through without going down?",
    options: [
      "A utility outage that cuts power to the whole building",
      "The failure of one power supply or the loss of one circuit",
      "A ransomware attack that encrypts the database",
      "A power surge from a lightning strike nearby",
    ],
    answer: 1,
    explanation:
      "Redundant power supplies let a server keep running on one supply if the other fails, and feeding each from its own PDU and circuit extends that to losing a circuit. They don't help when the whole building loses power, which takes a UPS to bridge and a generator for longer outages; a surge calls for a surge protector; and ransomware is a security incident that power redundancy does nothing about.",
  },
];
