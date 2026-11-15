import type { NewQuestion } from "./types";

/**
 * 5.0 Security Program Management and Oversight: top-ups that bring 5.1 past
 * 20, and topics SY0-801 names in 5.3–5.6 that the carried bank doesn't cover.
 */
export const questions: NewQuestion[] = [
  // ---- 5.1 Governance, risk and compliance artifacts ----
  {
    key: "s8-5.1-rfc-1",
    objective: "5.1",
    topic: "Request for Comments (RFC)",
    difficulty: 2,
    question:
      "An engineer drafting the company's email security standard cites a Request for Comments (RFC) for one of the protocols, then learns that a newer RFC has obsoleted it. What should the standard do?",
    options: [
      "Keep citing the old number, because the RFC Editor revises each RFC in place",
      "Cite the newer RFC; published RFCs are never edited, only updated or obsoleted",
      "Drop the citation, because RFCs are informal drafts that no product follows",
      "Ask the change advisory board to approve the new RFC before the standard cites it",
    ],
    answer: 1,
    explanation:
      "A published RFC never changes: corrections are recorded as errata, and new versions come out as new RFCs that update or obsolete earlier ones, with the RFC index showing which is current. So the standard should cite the current RFC. RFCs include the IETF's specifications for internet protocols, which products implement, so they aren't informal drafts. A request for change is the change management meaning of the same letters; a change advisory board approves changes to systems, not the documents a standard cites.",
  },
  {
    key: "s8-5.1-runbook-1",
    objective: "5.1",
    topic: "runbooks",
    difficulty: 2,
    question:
      "When a monitoring alert shows a web server's certificate will expire within seven days, the on-call engineer follows a document with numbered steps and ready-made commands for renewing and installing the certificate and checking the result. What is this document?",
    options: ["A policy", "A guideline", "A runbook", "A risk register"],
    answer: 2,
    explanation:
      "A runbook is a procedure with exact steps, often including ready-made commands or scripts, for carrying out one operational task the same way every time, here renewing a certificate. A policy states at a high level what must happen and why, a guideline offers recommendations that can be adapted, and a risk register records identified risks and how they're treated.",
  },
  {
    key: "s8-5.1-clean-desk-1",
    objective: "5.1",
    topic: "clean desk policy",
    difficulty: 1,
    question:
      "An evening walk-through of an office finds printed customer lists on desks, a notebook full of passwords and unlocked laptops left out. Which policy addresses this?",
    options: [
      "A clean desk policy",
      "A data retention policy",
      "A bring your own device policy",
      "A vulnerability disclosure policy",
    ],
    answer: 0,
    explanation:
      "A clean desk policy requires staff to lock away papers and portable devices and secure their workstations whenever they leave, so cleaners, visitors or intruders can't read or take them. A retention policy sets how long data is kept, a BYOD policy governs personal devices used for work, and a vulnerability disclosure policy tells outside researchers how to report flaws.",
  },
  {
    key: "s8-5.1-reference-architecture-1",
    objective: "5.1",
    topic: "reference architecture",
    difficulty: 2,
    question:
      "A team building a new cloud deployment starts from its provider's published reference architecture for a secure three-tier web application, then adapts it to its own needs. What kind of governance document is the reference architecture?",
    options: [
      "A policy: management's mandatory statement of intent",
      "A procedure: exact steps for a routine task",
      "A plan: what to do to keep operating in a disaster",
      "A guideline: a proven design that can be adapted",
    ],
    answer: 3,
    explanation:
      "A reference architecture is a proven example design for a type of system, published so teams don't have to start from scratch. It's guidance to adapt rather than a requirement, so it belongs with guidelines, alongside benchmarks, advisories and implementation guides. A policy states management's intent and requirements, a procedure gives exact steps for a task, and a plan, such as a disaster recovery plan, sets out what to do in a particular situation.",
  },
  {
    key: "s8-5.1-implementation-guide-1",
    objective: "5.1",
    topic: "implementation guides",
    difficulty: 2,
    question:
      "Before putting a new VPN appliance into service, an engineer works through the vendor's document on securing it setting by setting: disabling unused services, enforcing strong ciphers and turning on logging. What is this document?",
    options: [
      "An acceptable use policy",
      "A service-level agreement",
      "An implementation guide",
      "A post-incident report",
    ],
    answer: 2,
    explanation:
      "An implementation guide gives practical direction for deploying and configuring a particular product or system securely, often setting by setting. An acceptable use policy tells users what they may and may not do with company systems, a service-level agreement sets the service levels a provider commits to, and a post-incident report records what happened in an incident and what will change.",
  },
  {
    key: "s8-5.1-byod-1",
    objective: "5.1",
    topic: "BYOD policy",
    difficulty: 2,
    question:
      "Employees may read work email on their personal phones. One asks whether the company could erase their family photos if the phone is lost. Which document should answer this, and what does it typically say?",
    options: [
      "The BYOD policy; only the managed work apps and their data are wiped",
      "The clean desk policy; phones must be locked in a drawer overnight",
      "The incident response plan; lost phones are reported to the police",
      "The data retention policy; photos are kept for seven years",
    ],
    answer: 0,
    explanation:
      "A BYOD policy sets the rules for using personal devices for work: which devices are allowed, the security they need, such as a screen lock and current updates, enrollment in device management, and what the company may do to them, typically a selective wipe that removes only the work apps or work profile and leaves personal data alone. A clean desk policy covers papers and devices left unattended at work, an incident response plan covers how incidents are handled, and a retention policy sets how long company data is kept, not personal photos.",
  },
  {
    key: "s8-5.1-vdp-1",
    objective: "5.1",
    topic: "vulnerability disclosure policy",
    difficulty: 2,
    question:
      "A researcher finds a flaw on a company's website but can't find any way to report it, and worries that testing the site could lead to legal action. Which document should the company publish to solve both problems?",
    options: [
      "An acceptable use policy setting out the rules for the company's own staff",
      "A non-disclosure agreement for every site visitor",
      "A data classification and retention policy",
      "A vulnerability disclosure policy with a reporting channel and safe harbor",
    ],
    answer: 3,
    explanation:
      "A vulnerability disclosure policy tells outside researchers what's in scope, how to report a flaw and what to expect, and usually promises not to take legal action against good-faith research that follows it, often called safe harbor. A security.txt file at /.well-known/security.txt (RFC 9116) can point researchers to it. An acceptable use policy governs staff, an NDA can't be signed by every anonymous visitor, and a classification policy covers how the company labels and keeps its own data.",
  },
  {
    key: "s8-5.1-retention-1",
    objective: "5.1",
    topic: "data classification and retention policy",
    difficulty: 3,
    question:
      "An audit finds that a company keeps every customer record indefinitely, just in case, including data on customers who left ten years ago. Which document should set how long each kind of data is kept and when it must be deleted?",
    options: [
      "The data disposal policy",
      "The data classification and retention policy",
      "The access control policy for customer systems",
      "The acceptable use policy",
    ],
    answer: 1,
    explanation:
      "A data classification and retention policy defines the categories of data and how long each must be kept, often driven by legal requirements, so that data past its retention period is deleted; data kept longer than needed only adds to what a breach can expose. A data disposal policy covers how data and media are destroyed once their time is up, such as by shredding or wiping, not how long they're kept. An access control policy covers who may reach what, and an acceptable use policy covers what users may do.",
  },

  // ---- 5.3 Third-party risk ----
  {
    key: "s8-5.3-rfi-1",
    objective: "5.3",
    topic: "RFP, RFI, RFQ and EOI",
    difficulty: 2,
    question:
      "A company is considering a managed detection and response service but doesn't yet know what's available or how providers approach it. It asks several providers to describe their capabilities, without committing to buy anything. Which document is it issuing?",
    options: [
      "A request for quote (RFQ)",
      "A statement of work (SOW)",
      "A request for information (RFI)",
      "A master services agreement (MSA)",
    ],
    answer: 2,
    explanation:
      "A request for information gathers information about the market and what providers can do, early in planning; responses aren't offers and commit nobody. An RFQ asks for prices once requirements are already defined, a statement of work defines the work and deliverables for a specific engagement, and an MSA sets the general terms for an ongoing relationship.",
  },
  {
    key: "s8-5.3-rfq-1",
    objective: "5.3",
    topic: "RFP, RFI, RFQ and EOI",
    difficulty: 1,
    question:
      "A company knows exactly what it needs: 300 laptops of one model and configuration, each with a three-year warranty. It asks resellers for their prices. Which document is it issuing?",
    options: [
      "A request for proposal (RFP)",
      "A request for information (RFI)",
      "An expression of interest (EOI)",
      "A request for quote (RFQ)",
    ],
    answer: 3,
    explanation:
      "A request for quote is used when requirements are fully defined and the main question is price. An RFP asks suppliers to propose how they'd meet a need, an RFI gathers information while needs are still unclear, and an expression of interest is a supplier's statement that it wants to compete for, and is qualified for, upcoming work.",
  },
  {
    key: "s8-5.3-rfp-1",
    objective: "5.3",
    topic: "RFP, RFI, RFQ and EOI",
    difficulty: 3,
    question:
      "A public agency needs a new identity platform. First it publishes a notice inviting suppliers to say whether they want to bid and to show their qualifications, and uses the replies to build a shortlist. Then it sends shortlisted suppliers detailed requirements, including security controls and a security questionnaire, and asks each to propose a solution and a price. Which two stages are these, in order?",
    options: [
      "Expression of interest, then request for proposal",
      "Request for information, then request for quote",
      "Request for proposal, then expression of interest",
      "Statement of work, then memorandum of understanding",
    ],
    answer: 0,
    explanation:
      "Inviting suppliers to state their interest and qualifications so the buyer can build a shortlist is the expression of interest stage. Asking shortlisted suppliers to propose a solution against detailed requirements is a request for proposal, judged on how well the solution meets them as well as on price, and it's where security requirements belong so they shape every proposal. The reverse order would ask for proposals before anyone was shortlisted. An RFQ asks only for prices on a fixed specification, a statement of work describes the work under an agreement being made, and an MOU records an intent to cooperate, usually without binding terms.",
  },
  {
    key: "s8-5.3-slo-1",
    objective: "5.3",
    topic: "service-level objectives (SLOs)",
    difficulty: 2,
    question:
      "A managed security provider sets itself an internal target: acknowledge 99% of critical alerts within 10 minutes, measured each month. Missing it triggers no penalty or credit; the provider just tracks it to manage its own performance. What is this target?",
    options: [
      "A service-level agreement (SLA)",
      "A service-level objective (SLO)",
      "A memorandum of agreement (MOA)",
      "A non-disclosure agreement (NDA)",
    ],
    answer: 1,
    explanation:
      "A service-level objective is a target value for a measured aspect of service, here the share of critical alerts acknowledged within 10 minutes. What turns a target into an agreement is a consequence: an SLA is a contract that attaches remedies, such as service credits, to missing its targets. An MOA records the responsibilities parties agree to, and an NDA protects confidential information.",
  },
  {
    key: "s8-5.3-vendor-registry-1",
    objective: "5.3",
    topic: "vendor registry",
    difficulty: 2,
    question:
      "A payroll software supplier announces a data breach. The CISO needs to know within the hour which business units use that supplier, what data it holds, its risk tier and when it was last assessed. Which vendor management tool should provide this?",
    options: [
      "A right-to-audit clause",
      "A request for proposal",
      "A penetration test report",
      "A vendor registry",
    ],
    answer: 3,
    explanation:
      "A vendor registry is a central, maintained record of every third party: what it provides, who in the business uses it, what data and access it has, its risk tier, contract dates and assessment status. It lets the company answer quickly when a supplier is breached, and plan which vendors to reassess. A right-to-audit clause gives the company the right to inspect a vendor, an RFP is used to choose a vendor, and a penetration test report describes weaknesses in the systems tested.",
  },
  {
    key: "s8-5.3-lock-in-1",
    objective: "5.3",
    topic: "vendor lock-in",
    difficulty: 2,
    question:
      "A company is about to sign a five-year contract with a SaaS provider that stores all data in a proprietary format, offers no bulk export and charges heavily for early termination. Which risk is the company taking on, and which contract term would reduce it?",
    options: [
      "Conflict of interest; ask the provider for a list of its other clients",
      "Staffing limitations; hire more administrators before signing",
      "Vendor lock-in; require data export in a standard format and help with exit",
      "Data sovereignty; move the company's headquarters",
    ],
    answer: 2,
    explanation:
      "Vendor lock-in is dependence on one provider that makes leaving costly or impractical, here through a proprietary format, no export and termination fees. Contract terms that guarantee data export in a standard format and assistance at the end of the contract keep an exit open. A conflict of interest is a competing interest that could bias a decision, staffing limitations concern the company's own people, and data sovereignty is about which country's laws apply to data.",
  },

  // ---- 5.4 Security compliance ----
  {
    key: "s8-5.4-aml-1",
    objective: "5.4",
    topic: "anti-money laundering and counter-terrorism financing (AML/CTF)",
    difficulty: 3,
    question:
      "In compliance training at a bank, tellers study a customer who makes cash deposits on several consecutive days, each just under the amount that would trigger a mandatory report. What should a teller do in this situation?",
    options: [
      "Report it through the bank's internal process without alerting the customer",
      "Tell the customer the deposits look suspicious and ask them for a full explanation",
      "Refuse all of the customer's future deposits on the spot",
      "Combine the deposits into one so that a single report is filed",
    ],
    answer: 0,
    explanation:
      "Splitting cash deposits to stay under a reporting threshold, called structuring, is a classic money laundering red flag. Anti-money laundering and counter-terrorism financing (AML/CTF) training teaches staff to report it through the bank's internal process, usually to its compliance team, without tipping off the customer, which is itself an offense in many countries. Confronting the customer tips them off, refusing deposits on the spot isn't a teller's decision, and merging the deposits would falsify the records.",
  },
  {
    key: "s8-5.4-anti-bribery-1",
    objective: "5.4",
    topic: "anti-bribery",
    difficulty: 2,
    question:
      "A salesperson negotiating a government contract abroad is told that a personal payment to the official in charge would make sure the company wins. Which compliance training topic covers this, and what should the salesperson do?",
    options: [
      "Data handling; encrypt the official's emails",
      "AML/CTF; pay through a bank so the transfer is recorded",
      "Acknowledgement; ask the official to sign the company's policy",
      "Anti-bribery; refuse and report it to the compliance team",
    ],
    answer: 3,
    explanation:
      "Paying an official personally to win business is bribery, which laws such as the U.S. Foreign Corrupt Practices Act and the UK Bribery Act prohibit, so anti-bribery training teaches staff to refuse and report it. Under the UK Act, a company can be liable when someone acting for it pays a bribe unless it can show adequate procedures to prevent bribery, which is one reason companies train staff. Paying through a bank doesn't make a bribe legal, and data handling and policy acknowledgements don't address it.",
  },
  {
    key: "s8-5.4-restriction-1",
    objective: "5.4",
    topic: "processing restrictions and prevention",
    difficulty: 3,
    question:
      "A customer tells a company that the income figure in their file is wrong. While the company checks, the customer asks it not to use the data in any decisions, but not to delete it. Under the GDPR, which right does this request rely on?",
    options: [
      "The right to be forgotten",
      "The right to data portability",
      "The right to restriction of processing",
      "The right to opt out of sale",
    ],
    answer: 2,
    explanation:
      "Restriction of processing lets a person have their data kept but not used, for example while its accuracy is checked: the company may store it but generally can't process it further without the person's consent or another narrow ground. Fixing the figure once checked is the separate right to rectification. The right to be forgotten would delete the data, data portability gives the person a copy to take elsewhere, and opting out of sale is a right under laws such as California's, not the GDPR.",
  },
  {
    key: "s8-5.4-prevention-1",
    objective: "5.4",
    topic: "processing restrictions and prevention",
    difficulty: 2,
    question:
      "A customer tells an online store to stop using their personal data for direct marketing altogether. Under the GDPR, what must the store do?",
    options: [
      "Keep marketing, but less often",
      "Stop processing the data for direct marketing",
      "Delete the customer's account and order history",
      "Ask the customer to show that the marketing harms them",
    ],
    answer: 1,
    explanation:
      "An objection to direct marketing prevents that processing outright: under the GDPR's right to object, the data must no longer be used for that purpose, with no balancing test. The objection doesn't require deleting the account or order history, which the store may still need for other purposes, and the customer doesn't have to show any harm.",
  },
  {
    key: "s8-5.4-opt-in-1",
    objective: "5.4",
    topic: "opt-in and opt-out",
    difficulty: 2,
    question:
      "A sign-up form includes a box, already ticked, that reads: Send me offers from our partners. A privacy reviewer says this doesn't collect valid consent under the GDPR. Why not?",
    options: [
      "Consent needs an opt-in: a clear act, such as ticking an empty box",
      "Consent must be given on paper and signed, not collected on a website",
      "The box must be ticked by a member of the company's staff, not by the user",
      "Consent is never needed for marketing emails",
    ],
    answer: 0,
    explanation:
      "The GDPR treats consent as valid only when it's a clear affirmative act, so a pre-ticked box, silence or inactivity doesn't count: the user has to opt in, for example by ticking an empty box. A pre-ticked box is an opt-out design, where processing happens unless the person acts to stop it. Consent can be given online, it has to come from the person, and marketing often does rely on consent.",
  },
  {
    key: "s8-5.4-correction-1",
    objective: "5.4",
    topic: "data correction",
    difficulty: 1,
    question:
      "A customer finds that an insurer has the wrong date of birth on file, which raises their premium, and asks for it to be fixed. Under laws such as the GDPR, the insurer must also tell partners it shared the data with. Which privacy right applies to this request?",
    options: ["Opt-out", "Processing restriction", "Legal hold", "Data correction"],
    answer: 3,
    explanation:
      "Data correction, called rectification in the GDPR, lets a person have inaccurate personal data fixed without undue delay, and the GDPR also requires the organization to pass the correction on to each recipient it disclosed the data to, unless that proves impossible or takes disproportionate effort. Opting out stops a kind of processing, such as sale or marketing; restriction keeps data but stops it being used; and a legal hold preserves data for litigation.",
  },
  {
    key: "s8-5.4-legal-order-1",
    objective: "5.4",
    topic: "legal orders",
    difficulty: 2,
    question:
      "A help desk analyst receives an emailed court order demanding a customer's account records within 48 hours. What should the analyst do?",
    options: [
      "Send the records at once, since court orders must be obeyed",
      "Ignore it, since orders sent by email are never valid",
      "Pass it to the legal team to check it's genuine and what it covers",
      "Delete the customer's records so that there's nothing left to hand over",
    ],
    answer: 2,
    explanation:
      "Legal orders such as subpoenas, warrants and court orders go to the legal team, which confirms the order is genuine, works out exactly what it requires and makes sure only that is disclosed; forged legal requests are a known way of tricking companies into handing over data. Sending the records at once risks a privacy breach if the order is fake or narrower than it looks, ignoring a real order can bring penalties, and deleting records after receiving an order could amount to obstruction.",
  },

  // ---- 5.5 Audits and assessments ----
  {
    key: "s8-5.5-diamond-1",
    objective: "5.5",
    topic: "Diamond Model of Intrusion Analysis",
    difficulty: 2,
    question:
      "An analyst records each intrusion event using four connected elements: who carried it out, the malware and tools used, the IP addresses and domains involved, and the organization targeted. Starting from a known command-and-control domain, the analyst pivots to find other victims. Which model is the analyst using?",
    options: [
      "MITRE ATT&CK",
      "The Diamond Model of Intrusion Analysis",
      "The Cyber Kill Chain",
      "The Common Vulnerability Scoring System (CVSS)",
    ],
    answer: 1,
    explanation:
      "The Diamond Model describes every intrusion event by four core features, adversary, capability, infrastructure and victim, linked to one another, so an analyst can pivot from one known feature, such as a C2 domain (infrastructure), to related ones, such as other victims. ATT&CK catalogs adversary tactics and techniques, the Cyber Kill Chain splits an intrusion into seven phases in sequence, and CVSS scores the severity of vulnerabilities.",
  },
  {
    key: "s8-5.5-audit-charter-1",
    objective: "5.5",
    topic: "audit charter",
    difficulty: 2,
    question:
      "Internal auditors reviewing a business unit ask for its system access logs. The unit's vice president refuses, saying the auditors have no right to see them. Which document should settle the question?",
    options: [
      "The audit charter",
      "The rules of engagement",
      "The unit's acceptable use policy",
      "A non-disclosure agreement",
    ],
    answer: 0,
    explanation:
      "The audit charter, approved by the board or its audit committee, sets out internal audit's mandate, including its right of access to the records, systems and people it needs, so it settles disputes like this one and protects the function's independence. Rules of engagement set the limits of a penetration test, an acceptable use policy tells users how they may use company systems, and an NDA protects confidential information shared between parties; none of them grants auditors access.",
  },
  {
    key: "s8-5.5-benchmarking-1",
    objective: "5.5",
    topic: "benchmarking",
    difficulty: 2,
    question:
      "A board asks how the company's security spending, time to patch critical flaws and phishing click rate compare with those of similar companies in its sector. The CISO commissions an assessment that compares the company's results with peer data. Which engagement type is this?",
    options: [
      "Gap analysis",
      "Penetration testing",
      "Regulatory examination",
      "Benchmarking",
    ],
    answer: 3,
    explanation:
      "Benchmarking compares an organization's practices and results with those of peers or an external reference, to show where it stands. A gap analysis compares the current state with a target, such as a framework's requirements, to list what's missing; a penetration test tries to exploit weaknesses; and a regulatory examination is carried out by a regulator to check compliance.",
  },
  {
    key: "s8-5.5-functional-testing-1",
    objective: "5.5",
    topic: "functional vs. behavioral testing",
    difficulty: 3,
    question:
      "Before go-live, an assessor takes the access requirements for a new payroll system and checks each one: clerks can view salaries but not change bank details, every change needs a second approver, and sessions end after 10 idle minutes. Each check passes or fails against the written requirement. Which type of testing is this?",
    options: [
      "Behavioral testing",
      "Benchmarking",
      "Functional testing",
      "Passive reconnaissance",
    ],
    answer: 2,
    explanation:
      "Functional testing checks that a system or control does what its requirements specify: a given action produces the expected result, case by case. Behavioral testing looks instead at how a system, or the people using it, actually behave in realistic or unexpected situations that no single requirement spells out. Benchmarking compares the organization with peers or a reference standard, and passive reconnaissance gathers information about a target without interacting with it.",
  },
  {
    key: "s8-5.5-attack-1",
    objective: "5.5",
    topic: "MITRE ATT&CK",
    difficulty: 2,
    question:
      "A detection team maps each of its SIEM rules to technique IDs such as T1053 (Scheduled Task/Job) and T1566 (Phishing), to see which adversary techniques it has no detection for. Which reference is it using?",
    options: [
      "MITRE ATT&CK",
      "The Diamond Model of Intrusion Analysis",
      "The Cyber Kill Chain",
      "The CIS Benchmarks",
    ],
    answer: 0,
    explanation:
      "MITRE ATT&CK is a knowledge base of adversary tactics, the goals behind actions, and techniques, the ways those goals are achieved, built from real-world observations and identified by IDs such as T1053. Mapping detections to it shows coverage gaps. The Diamond Model relates adversary, capability, infrastructure and victim, the Cyber Kill Chain has seven broad phases with no technique IDs, and CIS Benchmarks are secure configuration guides.",
  },
  {
    key: "s8-5.5-kill-chain-1",
    objective: "5.5",
    topic: "Cyber Kill Chain",
    difficulty: 2,
    question:
      "An email gateway quarantines a message carrying a malicious attachment before it reaches the user's inbox. In Lockheed Martin's Cyber Kill Chain, at which phase was the attack stopped?",
    options: ["Reconnaissance", "Delivery", "Installation", "Actions on objectives"],
    answer: 1,
    explanation:
      "Delivery is the phase in which the weapon reaches the target, here as an email attachment, so quarantining it breaks the chain there, before exploitation, installation and command and control. Reconnaissance is the attacker's earlier research into targets, installation puts a backdoor on a compromised system, and actions on objectives, such as stealing data, come last.",
  },
  {
    key: "s8-5.5-sampling-1",
    objective: "5.5",
    topic: "sampling",
    difficulty: 2,
    question:
      "An auditor needs to test whether user access changes were approved, but there were 12,000 of them last year. The auditor selects 60 at random, checks each for an approval and draws a conclusion about the whole year. Which data gathering technique is this?",
    options: ["Interviews", "Assertion", "Questionnaires", "Sampling"],
    answer: 3,
    explanation:
      "Sampling tests a representative subset of a population and uses the results to draw conclusions about the whole, which makes large populations practical to audit; random selection helps keep the sample representative. Interviews and questionnaires gather information by asking people, and an assertion is a claim, such as management's statement that its controls work, that the audit then tests.",
  },

  // ---- 5.6 Security awareness ----
  {
    key: "s8-5.6-lms-1",
    objective: "5.6",
    topic: "learning management system (LMS)",
    difficulty: 1,
    question:
      "A compliance officer needs proof that all 2,000 employees completed this year's security awareness course, plus automatic reminders for anyone overdue and quiz scores by department. Which delivery mechanism provides this?",
    options: [
      "A one-to-many webinar",
      "A self-service portal of policy documents",
      "A learning management system (LMS)",
      "One-to-one coaching sessions",
    ],
    answer: 2,
    explanation:
      "A learning management system assigns and delivers courses, tracks who has completed them, sends reminders, records quiz scores and produces the reports auditors ask for. A one-to-many webinar reaches many people at once but isn't built to assign courses, chase the overdue and keep completion records, a self-service portal lets people look things up when they need to, and one-to-one coaching doesn't scale to 2,000 people.",
  },
  {
    key: "s8-5.6-delivery-1",
    objective: "5.6",
    topic: "delivery mechanisms",
    difficulty: 2,
    question:
      "A manager has clicked links in three phishing simulations this quarter. The security team arranges a private session in which an analyst walks the manager through each message and the warning signs it carried. Which delivery mechanism and type of training is this?",
    options: [
      "One-to-one delivery; corrective training",
      "One-to-many delivery; onboarding training",
      "A self-service portal; ongoing training",
      "A learning management system; initial training",
    ],
    answer: 0,
    explanation:
      "A private session between an analyst and one person is one-to-one delivery, and training that responds to a particular person's mistakes is corrective. One-to-many delivery, such as a webinar or an all-hands talk, reaches a group at once; a self-service portal lets people find material on their own; an LMS assigns and tracks courses; and onboarding, or initial, training is what new staff receive when they join.",
  },
  {
    key: "s8-5.6-risk-scoring-1",
    objective: "5.6",
    topic: "personnel behavior risk scoring",
    difficulty: 2,
    question:
      "A security team combines each employee's phishing simulation results, how often they report suspicious email, their training completion and their data loss prevention policy violations into a single score, then uses the scores to decide who gets extra training. What is this?",
    options: [
      "Situational awareness",
      "Personnel behavior risk scoring",
      "Operational security",
      "A vulnerability scan",
    ],
    answer: 1,
    explanation:
      "Personnel behavior risk scoring rates people by how their actions affect risk, using signals such as simulation clicks, reporting rates, training records and policy violations, so training and monitoring go where they'll help most. Because it concerns individuals, it should be run transparently and fairly. Situational awareness is noticing what's happening around you, operational security protects information that could help an adversary, and a vulnerability scan checks systems, not people.",
  },
];
