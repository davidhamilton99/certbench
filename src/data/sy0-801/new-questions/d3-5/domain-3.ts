import type { NewQuestion } from "./types";

/** 3.0 Security Architecture: topics SY0-801 names in 3.1–3.4 that the carried bank doesn't cover. */
export const questions: NewQuestion[] = [
  {
    key: "s8-3.1-usability-1",
    objective: "3.1",
    topic: "usability",
    difficulty: 2,
    question:
      "A hospital wants clinicians to open patient records quickly at shared workstations without weakening sign-in security. Which design BEST balances security with usability?",
    options: [
      "A badge tap plus a PIN or fingerprint, with fast re-entry during a shift",
      "A 20-character password typed at every workstation and changed monthly",
      "One shared generic account for each ward, so nobody has to sign in",
      "Sign-in at a single nurses' station, with records printed for the wards",
    ],
    answer: 0,
    explanation:
      "Usability is how easy a design is for the people who must use it, and a control that slows urgent work gets bypassed. A badge tap (something you have) plus a PIN or fingerprint (something you know or are) keeps two factors while making each sign-in take seconds. A long password typed at every workstation and changed monthly pushes clinicians toward workarounds, and NIST no longer recommends forced periodic changes; a shared ward account removes accountability; and printing records for the wards swaps one problem for a data exposure.",
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
      "An administrator is setting up a group Managed Service Account (gMSA) for a scheduled task that runs on two file servers. Which statement about the account is accurate?",
    options: [
      "Its password is chosen by the administrator and typed into each server's task settings",
      "It can run on only one server, so the second server needs its own account",
      "It is meant for staff to sign in to interactively when the task fails",
      "Domain controllers compute and rotate its password; only allowed hosts fetch it",
    ],
    answer: 3,
    explanation:
      "With a gMSA, domain controllers compute the password from a key that the Key Distribution Service provides and change it automatically, and only the computers given permission can retrieve it, so nobody types or stores it. One gMSA can run the same service or task on several servers, which is what the group adds over a standalone managed service account tied to one computer. It's an identity for services and tasks, not for people to sign in with.",
  },
  {
    key: "s8-3.2-sse-1",
    objective: "3.2",
    topic: "Security Service Edge (SSE)",
    difficulty: 2,
    question:
      "A vendor pitches its security service edge (SSE) platform to a company with 40 branch offices. Which capability should the company NOT expect SSE to provide on its own?",
    options: [
      "A secure web gateway for users' internet traffic",
      "A cloud access security broker for SaaS apps",
      "SD-WAN routing that links the branch offices",
      "Zero trust network access to private apps",
    ],
    answer: 2,
    explanation:
      "SSE is the security half of SASE: a secure web gateway, a CASB and zero trust network access, delivered from the cloud. The networking half, such as SD-WAN linking branches, isn't part of SSE; together the two make SASE, so a company that needs both adds SD-WAN or buys a full SASE service. The other three options are SSE's core capabilities.",
  },
  {
    key: "s8-3.2-e2ee-1",
    objective: "3.2",
    topic: "end-to-end encrypted messaging",
    difficulty: 2,
    question:
      "A company moves staff chat to an end-to-end encrypted messaging service. Which security trade-off should it plan for?",
    options: [
      "Messages will cross the internet unencrypted between users",
      "Users will no longer need to authenticate to the service",
      "The provider will be able to read every message stored on its servers",
      "Server-side DLP and archiving can no longer inspect message content",
    ],
    answer: 3,
    explanation:
      "With end-to-end encryption only the users' devices hold the keys, so nothing in between, including the company's own server-side DLP, monitoring and archiving tools, can read message content. Retention and inspection then have to happen on the endpoints, through managed devices or the app's own features. Messages stay encrypted the whole way rather than crossing unencrypted, users still authenticate, and the provider can't read messages, which is the point of end-to-end encryption.",
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
      "While keying in customer records, a data operator notices that a batch marked Public contains card numbers. Whose decision is the right label, and what should the operator do?",
    options: [
      "The operator's; relabel the batch Restricted straight away",
      "The custodian's; ask IT to change the label in the database",
      "The owner's; report it so the owner or data steward can fix it",
      "The data subjects'; ask each customer which label they want",
    ],
    answer: 2,
    explanation:
      "Classification is the data owner's decision, and the data steward keeps labels correct day to day on the owner's behalf. A data operator works with data by following rules others set, so the right move is to report the mislabeled batch rather than relabel it. The custodian runs the systems and applies controls as directed but doesn't decide classifications, and data subjects are the people the data is about, not the ones who classify it.",
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
