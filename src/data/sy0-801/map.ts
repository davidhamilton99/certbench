// Relative, so the migration builder (scripts/sy0-801) can load it outside Next.
import { SY0_801_DOMAINS } from "../security-plus-v8";
import type { Sy0801Map } from "./types";

/**
 * Security+ SY0-801, and where CertBench's SY0-701 bank lands on it.
 *
 * The domains, weights and objective labels are the public SY0-801 pages' own
 * (src/data/security-plus-v8.ts), from CompTIA's SY0-801 exam objectives,
 * document version 2.0. The titles below say what each objective covers in our
 * words: CompTIA's wording is copyrighted.
 *
 * Every SY0-701 question follows its objective's map unless it's listed under
 * overrides, decided by reading that question against SY0-801's topic lists.
 * SY0-801 is a separate exam beside SY0-701, which stays open until June 11,
 * 2027, so nothing here changes an SY0-701 question: the SY0-801 exam gets a
 * copy of each one that carries over, and fixes apply to that copy only.
 */

/** What each SY0-801 objective covers, in our own words. */
const TITLES: Record<string, string> = {
  "1.1": "Core security concepts, and the categories and types of security controls",
  "1.2": "How change management processes affect security",
  "1.3": "Cryptography in practice: PKI, certificates, encryption, hashing and signatures",
  "2.1": "What threats and vulnerabilities look like: intelligence, scoring and prioritizing",
  "2.2": "Threat actors, what drives them and what they can do",
  "2.3": "The vectors and sources attacks arrive through",
  "2.4": "Kinds of vulnerabilities and attack surfaces",
  "2.5": "Reading the signs of malicious activity",
  "2.6": "Threats and vulnerabilities that come with using AI",
  "3.1": "The security trade-offs of different architecture models",
  "3.2": "Managing security architecture to protect infrastructure",
  "3.3": "Protecting data: types, states, classifications, roles and handling",
  "3.4": "Resilience and recovery in security architecture",
  "4.1": "Mitigating controls and techniques that secure an environment",
  "4.2": "Security across the hardware, software and data asset life cycle",
  "4.3": "Running vulnerability management, from finding flaws to reporting",
  "4.4": "Security alerting and monitoring tools and concepts",
  "4.5": "Identity and access management in practice",
  "4.6": "Automation, orchestration and AI in security operations",
  "4.7": "What incident response involves, from preparation to lessons learned",
  "4.8": "Using data, artifacts and sources in a security investigation",
  "5.1": "Governance, risk and compliance documents and why they matter",
  "5.2": "Risk management processes and what they mean for security",
  "5.3": "Assessing and managing risk from third parties",
  "5.4": "What effective security compliance involves",
  "5.5": "Audits and assessments, their scope and methods",
  "5.6": "Security awareness that improves an organization's security",
};

export const SY0_801_MAP: Sy0801Map = {
  slug: "security-plus-sy0-801",
  sourceSlug: "security-plus-sy0-701",
  examCode: "SY0-801",
  sourceExamCode: "SY0-701",
  passingScore: 750,
  domains: SY0_801_DOMAINS.map((d) => ({
    number: d.number,
    title: d.title,
    weight: d.weight,
    objectives: d.objectives.map((o) => ({ code: o.code, label: o.label, title: TITLES[o.code] })),
  })),
  // Every SY0-701 objective has a home on SY0-801; none left the exam whole.
  objectiveMap: {
    "1.1": "1.1",
    "1.2": "1.1", // core concepts; deception tech, access models and gap analysis go elsewhere (overrides)
    "1.3": "1.2",
    "1.4": "1.3",
    "2.1": "2.2",
    "2.2": "2.3", // threat vectors; social engineering attacks are 2.5, attack surfaces 2.4
    "2.3": "2.4", // vulnerabilities; injection, forgery and overflows are application attacks (2.5)
    "2.4": "2.5",
    "2.5": "4.1", // SY0-701's mitigation techniques are SY0-801's mitigating controls
    "3.1": "3.1",
    "3.2": "3.2", // firewalls, IDS/IPS, proxies and 802.1X move to 4.1
    "3.3": "3.3",
    "3.4": "3.4",
    "4.1": "4.1",
    "4.2": "4.2",
    "4.3": "4.3", // CVSS, CVE and intelligence sources are 2.1 on SY0-801
    "4.4": "4.4", // "what does this indicate" questions are indicators (2.5)
    "4.5": "4.1", // enterprise capabilities: firewalls, filters, email security, EDR, NAC
    "4.6": "4.5",
    "4.7": "4.6",
    "4.8": "4.7",
    "4.9": "4.8",
    "5.1": "5.1", // data roles move to 3.3, legal and regulatory questions to 5.4
    "5.2": "5.2", // recovery metrics (RTO, RPO, MTTR) move to 3.4
    "5.3": "5.3",
    "5.4": "5.4",
    "5.5": "5.5",
    "5.6": "5.6",
    // The two domain 2 questions the database never tagged to an objective:
    // both are software supply chain attacks.
    "2.0": "2.3",
  },
  overrides: {
    // SY0-701 1.2
    "134e903d-8b3e-4e3c-8722-8c681b626f42": { to: "1.3", why: "Picks mTLS, request signing and digital signatures for an API: cryptographic solutions (1.3)." },
    "18907c39-cee4-4baf-94c6-6cd01e5a92cc": { to: "4.5", why: "Mandatory access control with compartments is an access control model (4.5)." },
    "5b7cc722-11ab-414f-8d16-c8303f6d1164": { to: "4.5", why: "Bell-LaPadula's no-write-down rule is how mandatory access control works (4.5)." },
    "61720b8f-0bac-4632-ac24-fb65d57f4465": { to: "4.5", why: "Zero standing privileges is just-in-time access, an access control model (4.5)." },
    "8ed6df99-bf68-4588-a847-993bf4fd6d87": { to: "4.5", why: "Single sign-on and federation are identity and access management (4.5)." },
    "bd216e0d-3b0d-4699-81aa-bd2654ebcdcd": { to: "4.5", why: "Clearance-based access is mandatory access control (4.5)." },
    "c36f0fcb-750e-411e-8cd5-2ab744c0f3ff": { to: "4.5", why: "Compares MFA methods, SMS one-time codes among them (4.5)." },
    "83611c8b-78c5-4f33-984d-0aa0e73ce567": { to: "4.1", why: "Honeypots are deception and disruption technology, a mitigating control on SY0-801 (4.1)." },
    "c864c269-0ce6-4fab-9428-98ffbb63ccf0": { to: "4.1", why: "Honeynets are deception and disruption technology (4.1)." },
    "da8b69bd-ba71-4b9c-a711-2f7c9982f32a": { to: "4.1", why: "Honeyfiles are deception and disruption technology (4.1)." },
    "e354936a-fba8-41c2-81ae-057f34d8ed6a": { to: "4.1", why: "Honeytokens are deception and disruption technology (4.1)." },
    "f90e3395-c105-41e6-b5c9-473c05f00433": { to: "4.1", why: "Uses a honeytoken to test an extortion claim: deception technology (4.1)." },
    "32dd7c7d-be01-4ddf-9d7d-882ed54a45c0": { to: "5.5", why: "Gap analysis is an audit and assessment engagement type on SY0-801 (5.5)." },
    // SY0-701 1.3
    "1ce942c7-f4b9-40f0-85a8-efddcd619c27": { to: "4.1", why: "Defines application allow listing itself, which SY0-801 teaches as application control (4.1); 1.2 covers allow lists only as a change's technical implication." },
    "1ed73291-e45f-4bde-b781-4633362b7148": { to: "1.3", why: "Chooses key types, lengths and algorithms for PKI use cases: cryptography (1.3), filed under change management by mistake." },
    // SY0-701 2.1
    "543e367c-e489-40e2-bf49-545761a9826a": { to: "2.4", why: "SY0-801 lists shadow IT as a vulnerability and attack surface (2.4), no longer as a threat actor." },
    "b36197ba-97ac-43fe-8655-c377b2a9b602": { to: "2.1", why: "How fast a disclosed vulnerability is weaponized is the threat life cycle (2.1)." },
    // SY0-701 2.2
    "1d58d28c-b9d9-4d75-869e-326ad980db1f": { to: "2.5", why: "Business email compromise that impersonates the CEO is a social engineering attack (2.5)." },
    "25b78d07-2f6c-47f1-8576-6e1a3866d249": { to: "2.5", why: "An on-path attack is a network attack (2.5)." },
    "32a1dca0-7ccf-48c4-a3c1-884c6bac2837": { to: "2.5", why: "An on-path attack on open Wi-Fi is a network attack (2.5)." },
    "3e96a716-af5b-41ff-afef-76a9e085d5bb": { to: "2.5", why: "Brand impersonation through malvertising is an impersonation attack (2.5)." },
    "658df45b-8361-4c3d-843a-65ffd4f32f5f": { to: "2.5", why: "Pretexting is a social engineering attack (2.5)." },
    "75968bc3-11ef-45e4-bef8-7f07a8ddc307": { to: "2.5", why: "The risk it names is an on-path attack, a network attack (2.5)." },
    "78158fda-7309-42db-bb29-330c1e819729": { to: "2.5", why: "Spear phishing is a social engineering attack (2.5)." },
    "8444ef71-644c-4828-9371-be7ee5dffe14": { to: "2.5", why: "OAuth consent phishing is a phishing attack (2.5)." },
    "9a22081e-3ba8-43a7-a507-58b42eda79b9": { to: "2.5", why: "Spear phishing built on OSINT is a social engineering attack (2.5)." },
    "a17b76aa-69e0-4c1f-8f89-a7a0ee622aba": { to: "2.5", why: "Vishing over VoIP is a social engineering attack (2.5)." },
    "a2b2b1fd-6705-48e8-913d-bc37265f66d4": { to: "2.5", why: "Vishing is a social engineering attack (2.5)." },
    "ba79fced-de53-4ca1-8ad4-66b7dbab8538": { to: "2.5", why: "Pretexting over the phone is vishing, a social engineering attack (2.5)." },
    "e9140054-9bb0-4162-8432-b4e129e5eb4b": { to: "2.5", why: "Smishing is a social engineering attack (2.5)." },
    "edf57722-bb21-4d91-a3ba-817ac55d2e25": { to: "2.5", why: "Brand impersonation paired with phishing is a social engineering attack (2.5)." },
    "ee6c91d4-20eb-4938-877d-3f2590dadfd8": { to: "2.5", why: "Typosquatting lures victims by impersonating a real domain, a social engineering attack (2.5)." },
    "f3ecfbe9-0adb-41ff-9296-e0d533de03d7": { to: "2.5", why: "Whaling is a social engineering attack (2.5)." },
    "2943915a-c9f2-443e-86b5-f2b5bbf38b06": { to: "2.4", why: "Hardcoded credentials found in a mobile app's code are a code vulnerability (2.4)." },
    "76eab772-13c8-4059-968e-9553cdb369d3": { to: "2.4", why: "Appliance firmware that was never patched is an unpatched system (2.4)." },
    "ad3940f9-bbd5-4ed7-9eeb-2ec320b948bf": { to: "2.4", why: "An open Telnet port is a ports-and-services attack surface (2.4)." },
    "bb0963f0-7fd4-42c8-808d-0159df0625dc": { to: "2.4", why: "Default credentials left in place are a misconfiguration (2.4)." },
    "d8a66e2e-c960-4697-8116-680c2dc9fd39": { to: "2.4", why: "Windows XP that can no longer be patched is an unsupported product (2.4)." },
    "f7ae3552-6b36-43c9-be25-cedabeebf158": { to: "2.4", why: "Agent-based software as an attack surface is an application vulnerability (2.4)." },
    "90100fe8-a4f3-4aad-9f69-8ccd952486aa": { to: "4.1", why: "Chooses a mitigating control for each stage of an attack chain (4.1)." },
    // SY0-701 2.3
    "062a747d-c3d7-41a9-8d63-ead09978e001": { to: "2.5", why: "CSRF is a forgery attack, an application attack on SY0-801 (2.5)." },
    "06a542c4-235e-4a76-a156-35dd8461e8c4": { to: "2.5", why: "Stored XSS is an injection attack (2.5)." },
    "0ce715ef-a763-4da5-b533-218b61c76c24": { to: "2.5", why: "Stored XSS is an injection attack (2.5)." },
    "18a83098-a908-433f-8993-a78375bc6ccc": { to: "2.5", why: "SSRF is a forgery attack (2.5)." },
    "331530be-67a6-4ce5-b9de-a19e1bd0f969": { to: "2.5", why: "SQL injection is an injection attack (2.5)." },
    "51fefe14-daec-4cff-b150-97774ccde4e1": { to: "2.5", why: "An out-of-bounds write is a buffer overflow, an application attack (2.5)." },
    "6cdad37a-a237-4c70-8eaf-5217336b84fb": { to: "2.5", why: "Stored XSS is an injection attack (2.5)." },
    "8aa0a269-706c-4b19-964d-73ed56ff24d5": { to: "2.5", why: "A stack buffer overflow is an application attack (2.5)." },
    "d0551086-76e2-4747-8873-e1f21e011bab": { to: "2.5", why: "OS command injection is an injection attack (2.5)." },
    "decd16f1-2125-4ab6-bed7-57d820d4c342": { to: "2.5", why: "Memory injection is an injection attack (2.5)." },
    "eab6b4e9-bb73-46c6-9879-a2a75f0f88fd": { to: "2.5", why: "Directory traversal is an application attack (2.5)." },
    "fc1b79fb-7e5f-48da-b16a-737b8bae7c38": { to: "2.5", why: "A buffer overflow is an application attack (2.5)." },
    "d761e9ea-27c1-4e59-9f75-1917b4a722a4": { to: "2.3", why: "A backdoored open-source dependency arrives through the supply chain (2.3)." },
    // SY0-701 2.5
    "1126de98-ac68-4daf-9667-438c773e4b92": { to: "1.1", why: "Asks which CIA property encryption protects: core security concepts (1.1)." },
    "b829864d-9240-475a-a306-ec0ed97c1d18": { to: "1.1", why: "Defines least privilege, a core security concept on SY0-801 (1.1)." },
    "ce7693d5-16e0-4141-ab0c-2b9ae8b64d17": { to: "1.1", why: "Asks what type of control file integrity monitoring is: detective (1.1)." },
    "f2d6d5e8-ed5c-479e-803d-fbad8cb3a0c6": { to: "1.1", why: "Layered network access controls are defense in depth (1.1)." },
    "ade95f26-9c88-41b2-bb64-60a9f2a5c47d": { to: "1.3", why: "TLS, AES and certificate authentication grouped as encryption: cryptographic solutions (1.3)." },
    "b45cca36-8e7f-485e-9e3a-7e39c52e1740": { to: "1.3", why: "Full-disk encryption keyed to a TPM is an encryption level (1.3)." },
    "268940a6-139d-4827-8c8f-50386e89746d": { to: "4.2", why: "Decommissioning instead of repurposing is asset disposal (4.2)." },
    "db85f458-b551-4f06-a3f3-9f771f8cbda6": { to: "4.2", why: "Wiping drives at decommissioning is asset disposal (4.2)." },
    "eea0a10e-68f5-4ff3-b404-bd76571ffd83": { to: "4.2", why: "Retiring end-of-life switches and firewalls is decommissioning (4.2)." },
    "2359c6da-1e6f-48dc-acf1-51997679bb27": { to: "4.3", why: "Patching critical fixes within a deadline is vulnerability remediation (4.3)." },
    "3f9ff7ac-0bc5-4381-9b2c-a302b3c86fac": { to: "4.5", why: "MFA and separate admin accounts are privileged account management (4.5)." },
    "481df2d6-b860-43b9-84f3-f60cc38a4911": { to: "4.5", why: "Risk-based authentication is access management (4.5)." },
    "5adf8005-8cb5-4512-aa48-ddb9dda085c4": { to: "4.5", why: "Role-based access control and separation of duties are permission assignments (4.5)." },
    "6ff91c2c-0646-4845-b588-ef20c98fff56": { to: "4.5", why: "Least privilege kept up by quarterly access reviews (4.5)." },
    "75e3b9b0-326d-433b-b4f9-4c51770beb9d": { to: "4.5", why: "Breached-password detection and other account takeover controls are IAM (4.5)." },
    "7b0f7d92-d256-43da-b817-09386e00d951": { to: "4.5", why: "Disabling accounts at termination is deprovisioning (4.5)." },
    "89afe04b-e5a0-4f89-b3eb-8ba460ff141c": { to: "4.5", why: "Separation of duties on wire transfers is a permission assignment (4.5)." },
    "8f302ec6-678f-4189-896f-8685f771afe9": { to: "4.5", why: "Screening passwords against breached lists is compromised credential monitoring (4.5)." },
    "7beccfe2-6650-4754-8c4e-24577cd1feae": { to: "4.6", why: "Configuration management that enforces baselines and undoes drift is desired state management (4.6)." },
    "98270b58-d181-4b9c-81ec-e3ae71aa74cb": { to: "3.2", why: "A privileged access workstation is a least privilege access account practice (3.2)." },
    "bde48ddb-555b-4f19-a951-d039aecafb16": { to: "4.7", why: "Isolating an infected server during an incident is containment (4.7)." },
    "3136c369-59e4-4a53-a04c-7ca0f9bf0676": { to: "5.6", why: "Awareness training is security awareness (5.6)." },
    // SY0-701 3.1
    "21f75c93-3ad1-4f7e-9586-74e400631566": { to: "2.4", why: "Containers sharing the host kernel is a virtualization vulnerability (2.4)." },
    "50b07b47-e997-443f-bda6-f4a1e5ed2e8a": { to: "2.4", why: "Credentials in IaC templates in a public repository: hardcoded secrets in public repositories (2.4)." },
    "73a63470-d3a3-4827-a4cc-b4c920734c5f": { to: "2.4", why: "A cloud identity provider as one high-value target: identity providers as an attack surface (2.4)." },
    "d0cf4c51-762e-4e09-bbc9-3d580e2b3ffd": { to: "2.4", why: "Secrets kept in container environment variables are a hardcoded-secrets weakness (2.4)." },
    "a0f8aa4e-0fa1-4f9c-8fbe-d4001a7eea68": { to: "3.2", why: "Removing implicit trust from a hybrid design is Zero Trust architecture (3.2)." },
    "c2d34c83-393f-4217-9df1-d52af9ae754a": { to: "2.3", why: "IoT devices with hardcoded credentials and no updates are an IoT-based vector (2.3)." },
    "d6d6a30a-4df6-446e-8577-e470d0ae0c02": { to: "4.3", why: "Rebuilding a vulnerable container image is remediation (4.3)." },
    "2946dae5-e21a-4618-af67-6ccd72d3de98": { to: "4.6", why: "Policy-as-code checks in the CI/CD pipeline enforce baselines through automation (4.6)." },
    // SY0-701 3.2
    "0df51918-395a-46d2-9562-e20a74eb784d": { to: "4.1", why: "A WAF left in monitoring mode: firewalls are mitigating controls on SY0-801 (4.1)." },
    "29e36581-92d8-42f8-9968-a9b799513ace": { to: "4.1", why: "A forward proxy is a content filter (4.1)." },
    "3f68d89f-cf97-4219-977b-bd19139bad1b": { to: "4.1", why: "A next-generation, layer 7 firewall is a mitigating control (4.1)." },
    "4040d06f-68a0-47dc-87a4-8a6f43ded624": { to: "4.1", why: "Stateful versus packet-filtering firewalls (4.1)." },
    "4954df9b-08a4-4ecf-87ca-3e568846eb88": { to: "4.1", why: "802.1X port-based access control is network access control (4.1)." },
    "6491e751-edad-4081-a203-2a06b8ab7a81": { to: "4.1", why: "An explicit web proxy with TLS inspection is a content filter (4.1)." },
    "b8bd00b0-ffbe-4da4-ba6e-4b97f2159147": { to: "4.1", why: "How deeply an NGFW inspects traffic: firewalls (4.1)." },
    "ec52c120-4bfe-441d-bd11-60c2ada3be7b": { to: "4.1", why: "A HIPS is a host-based intrusion prevention control (4.1)." },
    "8b566c2a-fbed-4336-b16e-3852f300f16a": { to: "3.4", why: "Load balancing is a redundancy strategy (3.4)." },
    "a41b3a48-6efd-434e-9b32-a01c8c05462d": { to: "3.4", why: "Autoscaling behind a load balancer is a redundancy strategy (3.4)." },
    // SY0-701 3.3
    "8ea4bc16-82fd-442d-8c6c-3215b2ae6005": { to: "3.1", why: "Data sovereignty is a business consideration for architecture on SY0-801 (3.1)." },
    "dd774538-e629-459f-ae32-bf84c7c73443": { to: "3.1", why: "A data sovereignty ruling decides where data can live (3.1)." },
    "a553b96e-aea9-445e-a879-a99825f75234": { to: "5.4", why: "Preserving data under a legal hold is legal compliance (5.4)." },
    "f69c6d1c-cfe3-4417-b9f4-2a418d785685": { to: "5.4", why: "Which data a legal hold covers is legal compliance (5.4)." },
    // SY0-701 3.4
    "d3a61456-006c-4f00-a392-4c396ab79773": { to: "4.7", why: "SY0-801 teaches tabletop exercises as incident response preparation (4.7)." },
    // SY0-701 4.1
    "07d5e537-65e0-454b-b970-b750d5905258": { to: "2.4", why: "Unpatchable end-of-life embedded devices are unsupported, obsolete systems (2.4)." },
    "2cc00930-e3b5-4a95-9cbb-c239fff9e072": { to: "1.2", why: "Testing an ICS firmware update and coordinating it before production is change management (1.2)." },
    // SY0-701 4.3
    "03fc4a50-ca3d-440e-b96d-082496bff383": { to: "2.1", why: "CVSS metrics are vulnerability scoring (2.1)." },
    "81504dd7-b1d8-4a0a-8e55-a1003707f8b4": { to: "2.1", why: "CVSS environmental metrics are vulnerability scoring (2.1)." },
    "f68ad1cd-3a53-4e7d-b879-9d73971096b6": { to: "2.1", why: "The NVD is an intelligence source for CVE and CVSS data (2.1)." },
    "fe212a23-1cc1-4949-a4da-54fc09f576fb": { to: "2.1", why: "What a CVSS base score does and doesn't measure is scoring and prioritization (2.1)." },
    "58f28c85-b1a3-4e26-9dbd-2c490afaaa31": { to: "2.1", why: "Active exploitation raising a medium CVSS finding's priority is likelihood and prioritization (2.1)." },
    "042cd9c0-8716-4619-9344-f7f8e6e0fb25": { to: "4.8", why: "Picks the log that shows which process made a connection: investigation data (4.8)." },
    "0cc9af7b-caa6-423d-986c-415fd132f436": { to: "4.8", why: "Picks the logs that reveal scheduled-task persistence: investigation data (4.8)." },
    "7036b35c-85a1-4d83-a9f3-21b0a408c5f7": { to: "4.8", why: "Picks the log that records PowerShell command lines: investigation data (4.8)." },
    "bf6591e0-32d4-459e-8bdc-5b683c061fea": { to: "4.8", why: "Picks the web server logs that show a web shell upload: investigation data (4.8)." },
    "2d75dab9-b366-4629-b70a-f8b562f4b655": { to: "4.8", why: "Asks which data source would have flagged an intruder using valid credentials first (4.8)." },
    "a08e9f3e-7705-480d-83c0-c84eb826ee97": { to: "5.2", why: "Formally accepting a finding through an exception is risk acceptance (5.2)." },
    "bceeccc3-eb3a-44e3-bac2-189a06ee64ca": { to: "5.5", why: "A system and process audit is an audit activity (5.5)." },
    "fec2fa9e-c900-49bc-9ee8-904389bafa5a": { to: "5.5", why: "An external penetration test is a penetration test type (5.5)." },
    // SY0-701 4.4
    "2af76be1-6e7f-476e-8fe4-52fce7febc1c": { to: "2.5", why: "Asks what a spike of DNS queries from one host indicates (2.5)." },
    "5f1daa6b-2d5e-44be-a9c0-46efef1c8c41": { to: "2.5", why: "Word spawning encoded PowerShell is a malicious-process indicator (2.5)." },
    "82f76189-535a-441e-9684-ea331854aada": { to: "2.5", why: "A new permanent WMI event subscription is a persistence indicator (2.5)." },
    "9258a9e1-ec1e-4505-b882-75392cd3b147": { to: "2.5", why: "PsExec run against fourteen hosts indicates lateral movement (2.5)." },
    "ad358683-b686-486e-805e-fc08af323705": { to: "2.5", why: "Queries for random-looking domains indicate a domain generation algorithm (2.5)." },
    "b4912733-494a-4996-b316-13df02a2b21a": { to: "2.5", why: "Small, regular DNS queries to a new domain indicate DNS tunneling (2.5)." },
    "b5d89bfc-7d9b-4aa9-bce5-555d6d103936": { to: "2.5", why: "svchost.exe running from a temp folder is a malicious-process indicator (2.5)." },
    "52c0ccea-aee7-459d-a3d7-481f743eb93d": { to: "4.7", why: "Quarantining a host after an alert is containment (4.7)." },
    "d6d08226-6888-4022-9a22-4755601f4add": { to: "4.7", why: "After a confirmed brute-force alert, the next step is the incident response playbook (4.7)." },
    // SY0-701 4.5
    "4e29e7e1-e12c-44d2-a15a-7417fbbe36ff": { to: "3.2", why: "A CASB is part of a security service edge (SSE, 3.2)." },
    "f3047c05-070b-4138-9b0a-4b3248538d7d": { to: "3.2", why: "A CASB in forward proxy mode is part of a security service edge (3.2)." },
    "9c3eb36a-0a48-441e-9178-20ab9fc4090a": { to: "3.2", why: "Checking identity, device health and app sensitivity on every request is Zero Trust architecture (3.2)." },
    "9aeeae68-2460-4428-bd7c-44c146b910b9": { to: "4.5", why: "Phishing-resistant FIDO2/WebAuthn MFA is MFA and passwordless authentication (4.5)." },
    // SY0-701 4.6
    "002992b8-aa7c-4748-b771-5a5285585de6": { to: "4.1", why: "Checking device posture before VPN access is network access control (4.1)." },
    "1179485e-21f4-4a9b-aca6-17d611e3a47f": { to: "3.2", why: "Keeping old access after a move is privilege creep, which SY0-801 lists under 3.2." },
    // SY0-701 4.8
    "f8e7526c-63a9-4dbd-9d8d-a0137f455936": { to: "5.4", why: "A legal hold is legal compliance on SY0-801 (5.4)." },
    // SY0-701 4.9
    "4897be50-c57c-446b-9ca4-392ea039dce8": { to: "2.5", why: "Failures across many systems for one account from many IPs indicate password spraying (2.5)." },
    "1157967b-2e0b-4635-89f5-4d677958f8cb": { to: "2.5", why: "Asks what repeated, denied RDP connection attempts indicate (2.5)." },
    // SY0-701 5.1
    "103be037-4800-4f94-8547-9667e9618470": { to: "5.5", why: "ISO 27001 alongside national law: frameworks and standards (5.5)." },
    "855f68d0-c18f-489b-85a7-0291cf28b18f": { to: "5.2", why: "A CISO reporting to the board's risk committee is management oversight of risk (5.2)." },
    "ac9d5337-a7b4-4999-9ed1-01cdf658112b": { to: "5.2", why: "Board oversight of cybersecurity risk is management oversight (5.2)." },
    "af8d6b7d-81b9-461a-8b84-66b644b1e5d1": { to: "3.3", why: "The data protection officer is a data protection role (3.3)." },
    "b3be8d27-50d3-4a48-9b86-1f722152dbd1": { to: "3.3", why: "The data controller is a data protection role (3.3)." },
    "d69d7547-5830-48b7-8d21-bd83f7f90867": { to: "3.3", why: "The data custodian is a data protection role (3.3)." },
    "ee5f4cd4-dad1-413f-ad38-609c1359ca56": { to: "3.3", why: "The data owner is a data protection role (3.3)." },
    "b198fd7a-c46f-484c-a4a8-ece88950fe1e": { to: "5.4", why: "Balancing GDPR, state privacy law and PCI DSS is legal and regulatory compliance (5.4)." },
    "d69021cd-367e-4651-877f-c81ce4d4c90e": { to: "5.4", why: "Meeting several countries' health privacy laws is legal compliance (5.4)." },
    "e3927890-8cb2-4c4a-9b00-1c5ea2431c6a": { to: "5.4", why: "A banking regulator's requirements are regulatory compliance (5.4)." },
    "b5ff071f-d6f5-4e6a-8293-dcf02efffd27": { to: "1.2", why: "The purpose of a change management policy is change management (1.2)." },
    // SY0-701 5.2
    "b657f138-0e4a-4792-9079-11cee029cad0": { to: "3.4", why: "MTTR against RTO: SY0-801 lists recovery metrics under resilience and recovery (3.4)." },
    "b81c6bb4-3753-4487-9437-f318502b3ab1": { to: "3.4", why: "RTO is a recovery metric (3.4)." },
    "f5895280-9114-40b3-a229-34a03bf50112": { to: "3.4", why: "RPO is a recovery metric (3.4)." },
    // SY0-701 5.3
    "436ee11f-7ff2-470e-b8d5-7b53a8bef505": { to: "2.3", why: "A compromised open-source library arrives through the supply chain (2.3)." },
    "88407a9b-433d-4c2b-a36a-199200ecc726": { to: "2.3", why: "A backdoor added during manufacture arrives through the supply chain (2.3)." },
    // SY0-701 5.6
    "a340e8c3-49de-44f1-90d9-e5da091a7c71": { to: "2.5", why: "Asks which attack a fake bank text is: smishing (2.5)." },
    "e4681371-28af-4551-994c-9ccf50a6f5d8": { to: "5.4", why: "Confirming that you accept a policy is an acknowledgement, a compliance monitoring item (5.4)." },
  },
  retired: {
    "50b438fd-7247-458f-8f03-ef47c86c914a": "Blockchain and open public ledgers aren't in SY0-801.",
    "6297dfd6-096c-4f4c-9f24-b565425b89cb": "Software-defined networking isn't in SY0-801.",
    "226ff24d-5119-4367-9f39-1a045d2946d3": "Governance structures (here a hybrid model) aren't in SY0-801.",
    "6f4cdff8-68ff-48be-957b-7f7487b6b175": "Governance structures (decentralized governance) aren't in SY0-801.",
    "97c03183-4fc1-4730-b27a-7ef37306fd36": "Governance structures (committee-based governance) aren't in SY0-801.",
    "c3c8e19f-785b-4198-a8e8-446a9c869bf7": "Asks which governance structure a board represents; SY0-801 dropped governance structures.",
  },
  fixes: {
    "73a57c56-eab4-4d51-92b0-7240f90facaf": {
      why: "Its answer is SY0-701's vector name; SY0-801 calls Bluetooth a signal-based vector.",
      options: ["Message-based", "External media-based", "Signal-based", "Attachment-based"],
      answer: 2,
      explanation: "SY0-801 groups Bluetooth with radio frequency and NFC as signal-based vectors: an attacker only needs to be in radio range, with no cable or file involved. Bluejacking, bluesnarfing and BIAS attacks all exploit Bluetooth. External media-based vectors are physical media such as a malicious USB drive, and message-based and attachment-based vectors arrive through email, SMS or instant messaging.",
    },
    "ad05777e-a052-4af6-bda7-2bd61bd26423": {
      why: "Its answer is SY0-701's 'removable device' vector; SY0-801 calls it external media-based.",
      options: ["Message-based", "External media-based", "Network-based", "Remote access"],
      answer: 1,
      explanation: "A USB drive left in a parking lot is an external media-based vector: physical media that delivers malware, usually as baiting that counts on curiosity. Message-based vectors use email, SMS or instant messaging, and network-based and remote access vectors need a network path to the target rather than a device someone plugs in.",
    },
    "e7042c7c-7885-401f-9a7f-70046846f43f": {
      why: "Its answer calls this bloatware, which SY0-801 dropped; adware stays.",
      options: ["Ransomware", "Rootkit", "Adware", "Worm"],
      answer: 2,
      explanation: "Software that floods the user with advertisements, often tracking browsing to target them, is adware. It usually arrives bundled with free software and slows the machine down. When tracking is the main purpose, it's spyware. Ransomware encrypts files, a rootkit hides deep in the system rather than drawing attention with ads, and a worm spreads itself across the network.",
    },
    "7ee2d02f-a94e-47aa-ac8e-3c5e8c6d011a": {
      why: "Its answer calls a disaster recovery plan a procedure; SY0-801 lists plans (BC, DR) as their own kind of document.",
      question: "A document states that if the primary data center is lost, the organization will activate its hot site within 4 hours and restore its critical systems there in a set order. Which governance document is this?",
      options: ["Disaster recovery plan", "Business continuity plan", "Standard operating procedure", "Information security policy"],
      answer: 0,
      explanation: "Restoring IT systems at an alternate site after a disaster is the job of a disaster recovery plan. A business continuity plan is broader: it keeps the organization's essential functions running through the disruption, manual workarounds included, and the disaster recovery plan supports it. A standard operating procedure documents how a routine task is done, and an information security policy sets high-level direction rather than recovery steps.",
    },
    "ac4206be-b302-4fb2-9826-a8eeb774f080": {
      why: "Its answer calls an incident response plan a procedure; SY0-801 separates policies, plans and procedures (SOPs, runbooks), so the copy asks about a runbook instead.",
      question: "A document gives SOC analysts the exact steps for a reported phishing email: which mailbox searches to run, which accounts to reset and whom to notify. Which kind of governance document is this?",
      options: ["Runbook", "Policy", "Standard", "Guideline"],
      answer: 0,
      explanation: "Step-by-step operational instructions for a specific, recurring situation are a runbook, a kind of procedure. A policy states management's intent at a high level, a standard sets a mandatory, specific requirement such as a minimum password length, and a guideline gives advice that people may choose not to follow.",
    },
    "10cb5a8a-ccdf-463d-9ad1-625f7c6e48b6": {
      why: "Its answer calls a key pushed to a public repository a misconfiguration; SY0-801 names hardcoded secrets and public repositories for this.",
      options: ["Supply chain vulnerability", "Cryptographic vulnerability", "Hardcoded secrets exposed in a public repository", "Zero-day vulnerability"],
      answer: 2,
      explanation: "Access keys written into code and pushed to a public repository are hardcoded secrets exposed through a public repository, two of the attack surfaces SY0-801 names. Bots scan public repositories for keys within minutes of a push. Keep secrets in a secrets manager and turn on secrets scanning so a commit containing a key is caught. It isn't a supply chain vulnerability, since no third-party component was compromised, nor a cryptographic weakness, since the keys were exposed rather than broken, nor a zero-day.",
    },
    "5017cb70-0c38-489a-a7ae-3af8e085e215": {
      why: "Its options are SY0-701's mitigation technique names; on SY0-801 a secure web gateway is a content filter, delivered from the cloud as part of SSE.",
      question: "An organization requires all web traffic from endpoints to pass through a cloud-based secure web gateway that inspects and blocks malicious content, whether the user is in the office or working remotely. Which kind of control is this?",
      options: ["Network segmentation between internal zones", "Quarantine of compromised endpoints", "A content filter using a centralized proxy", "A host-based intrusion prevention system"],
      answer: 2,
      explanation: "A secure web gateway is a content filter delivered through a centralized proxy: every web request passes through it, so it can inspect traffic and block malicious or disallowed content wherever the user is. Delivered from the cloud as a service, it's part of a security service edge (SSE). Segmentation separates internal zones, quarantine isolates a machine that's already compromised, and a HIPS watches for malicious activity on a single host.",
    },
    "7ca6c753-fed7-4e2d-8ea6-7b9ab4ce15b5": {
      why: "It describes a break-glass account, which SY0-801 names as an emergency access account; its answer, just-in-time access, is a different idea.",
      question: "A database administrator account exists only for emergencies, when normal administrative access has failed. It stays disabled until an incident requires it, and every use is logged and reviewed. What kind of account is this?",
      options: ["Emergency access (break-glass) account", "Service account", "Third-party account", "Shared user account"],
      answer: 0,
      explanation: "A break-glass account is an emergency access account: kept disabled or locked away, used only when normal access fails, and closely monitored and reviewed after every use. A service account runs an application or process, a third-party account belongs to a vendor or partner, and a shared user account is used by several people, which breaks accountability.",
    },
    "20f1365d-4df0-4367-855c-add9d6cc9c60": {
      why: "Its answer is 'script kiddie'; both Security+ versions call this threat actor an unskilled attacker.",
      options: ["Nation-state actor", "Insider threat", "Unskilled attacker", "Hacktivist"],
      answer: 2,
      explanation: "An unskilled attacker, often called a script kiddie, lacks the expertise to build tools and relies on ready-made exploits and automated toolkits. It's a low-sophistication threat that can still do real damage. Nation-state actors and organized crime groups are far more sophisticated and often build custom tooling, and hacktivists are defined by their cause rather than their skill.",
    },
    "5c8d7cbc-f18f-49f2-85a2-ff4f7be2dedd": {
      why: "Its answer is 'script kiddie'; both Security+ versions call this threat actor an unskilled attacker.",
      options: ["Nation-state actor", "Organized crime group", "Unskilled attacker", "APT group"],
      answer: 2,
      explanation: "Unskilled attackers, sometimes called script kiddies, have the lowest technical sophistication: they run tools and exploits that others wrote rather than developing their own. Nation-state actors, organized crime groups and APT groups all bring far more skill, planning and resources, often including custom tooling.",
    },
  },
  // Every Security+ lab's SY0-801 domain. Six differ from their SY0-701 tags.
  labDomains: {
    "certificate-lifecycle": "1.0",
    "encryption-key-sizes": "1.0",
    "security-controls": "1.0", // control categories and types; tagged 5.0 for SY0-701 by mistake
    "attack-definitions": "2.0",
    "sp-topo-wireless-security": "2.0", // finding a rogue AP and deauthentication exposure (2.4, 2.5)
    "sp-ports-to-services": "3.0",
    "cloud-service-models": "3.0",
    "sp-topo-network-segmentation": "3.0",
    "sp-topo-dmz-hardening": "3.0",
    "incident-response-steps": "4.0",
    "authentication-factors": "4.0", // MFA factors are 4.5; tagged 2.0 for SY0-701 by mistake
    "sp-log-types-to-tools": "4.0",
    "firewall-acl-configuration": "4.0", // firewall rules are mitigating controls (4.1)
    "security-incident-log-analysis": "4.0",
    "wireless-ap-configuration": "4.0", // WPA3-Enterprise, 802.1X and RADIUS: hardening and NAC (4.1)
    "email-security-configuration": "4.0", // SPF, DKIM and DMARC are email security (4.1)
    "vulnerability-assessment-remediation": "4.0",
    "sec-hunt-ssh-bruteforce": "4.0",
    "risk-assessment-process": "5.0",
  },
  // SY0-801 names its incident response activities differently, so its path
  // plays its own version of the ordering lab (src/data/pbq/security-plus-sy0-801).
  replacedLabs: {
    "incident-response-steps": "incident-response-process",
  },
  closingLabs: {
    // The AI threat hunt, SY0-801's own; the default pick would be the wireless topology.
    "2.0": "sec801-hunt-ai-assistant",
    // Domain 4 would otherwise close on the firewall ACL lab, the first
    // simulation it now holds; incident log analysis closed it on SY0-701 too.
    "4.0": "security-incident-log-analysis",
  },
};
