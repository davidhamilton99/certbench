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
      "A company's email standard says every mail server must follow RFC 5321 when it sends and relays mail. What kind of document is RFC 5321?",
    options: [
      "A change request that the change advisory board must review and approve",
      "A document in the Request for Comments series that specifies a protocol",
      "A vendor's white paper describing its own products",
      "A law that a regulator enforces with fines",
    ],
    answer: 1,
    explanation:
      "A Request for Comments (RFC) is a numbered document in the series the RFC Editor publishes, which includes the IETF's specifications for internet protocols; RFC 5321 specifies SMTP, the protocol mail servers use to send and relay email. Citing it gives the standard an exact, public reference that any product can be checked against. A request for change is the change management meaning of the same letters, a vendor's white paper isn't an open specification, and an RFC isn't a law.",
  },
  {
    key: "s8-5.1-runbook-1",
    objective: "5.1",
    topic: "runbooks",
    difficulty: 2,
    question:
      "When monitoring reports that the primary database server is down, the on-call engineer follows a document of numbered steps and ready-made commands to fail over to the standby and confirm the application works. What is this document?",
    options: ["A policy", "A guideline", "A runbook", "A risk register"],
    answer: 2,
    explanation:
      "A runbook gives exact steps, often with ready-made commands or scripts, for carrying out one operational task the same way every time, here failing over to the standby database. A policy states at a high level what must happen and why, a guideline offers recommendations that can be adapted, and a risk register records identified risks and how they're treated.",
  },
  {
    key: "s8-5.1-clean-desk-1",
    objective: "5.1",
    topic: "clean desk policy",
    difficulty: 1,
    question:
      "An office switches to hot desking: nobody has an assigned desk, and different staff use the same desk on different days. Which policy does this change make MOST important?",
    options: [
      "A clean desk policy",
      "A data retention policy",
      "A bring your own device policy",
      "A vulnerability disclosure policy",
    ],
    answer: 0,
    explanation:
      "With hot desking, whatever one person leaves on a desk is in front of the next person to sit there, so a clean desk policy, which requires papers and devices to be locked away and screens locked whenever staff leave, becomes essential. A retention policy sets how long data is kept, a BYOD policy covers personal devices used for work, and a vulnerability disclosure policy tells outside researchers how to report flaws.",
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
    difficulty: 3,
    question:
      "A company's vulnerability disclosure policy covers its online store and customer portal. During testing, a researcher also probes a login page run by the company's payroll provider. What does the policy mean for that testing?",
    options: [
      "It's covered, because any system holding the company's data is in scope",
      "It's covered, as long as the researcher reports it within 90 days",
      "It's covered, because the policy speaks for the company's providers too",
      "It isn't covered: the policy's promises apply only to in-scope systems",
    ],
    answer: 3,
    explanation:
      "A vulnerability disclosure policy names the systems in scope and the testing allowed, and its promise not to pursue good-faith researchers applies to research within that scope. A company can't authorize testing of a system it doesn't own, such as a login page its payroll provider runs, so that testing isn't covered and could expose the researcher to action by the provider. Holding the company's data doesn't put a third party's system in scope, reporting quickly doesn't change what was authorized, and the policy can't speak for another company.",
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
      "Before deciding whether to fund a project at all, a logistics company wants to learn what passwordless sign-in products exist, roughly what they cost and how similar companies have rolled them out. Which document should it send to vendors?",
    options: [
      "A request for quote (RFQ)",
      "A statement of work (SOW)",
      "A request for information (RFI)",
      "A master services agreement (MSA)",
    ],
    answer: 2,
    explanation:
      "A request for information gathers market information for planning, such as what's available, rough pricing and others' experience, and the responses aren't offers. A request for quote asks for firm prices on a fixed specification, a statement of work defines the work and deliverables for a specific engagement, and a master services agreement sets general terms for an ongoing relationship with a chosen supplier.",
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
    difficulty: 2,
    question:
      "A hospital wants bidders for its new patient portal to explain how each would meet a detailed list of requirements, including encryption, MFA and breach notification terms, along with a price. Which document should it issue?",
    options: [
      "A request for proposal that includes the security requirements",
      "A request for quote, since only the bidders' prices matter here",
      "A request for information, since nothing is committed yet",
      "An expression of interest, since bidders choose the requirements",
    ],
    answer: 0,
    explanation:
      "A request for proposal asks suppliers to propose how they'd meet a need and is judged on the solution as well as the price, and putting security requirements in it means every proposal has to answer them. A request for quote suits fixed specifications where price is the only question, a request for information gathers background before requirements exist, and an expression of interest is a supplier saying it wants to compete; none of them asks for a full solution against detailed requirements.",
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
      "A company has spent five years building workflows on a no-code platform whose automations can't run anywhere else. At renewal, the provider announces a 60% price rise. Which risk has the company run into, and which contract term would have reduced it?",
    options: [
      "Conflict of interest; a list of the provider's other clients",
      "Staffing limitations; more administrators before signing",
      "Vendor lock-in; data and workflow export plus help at exit",
      "Data sovereignty; moving the company's headquarters",
    ],
    answer: 2,
    explanation:
      "Vendor lock-in is dependence on one provider that makes leaving costly or impractical, which leaves the company little choice but to pay the higher price. Contract terms that guarantee export of data and workflows in usable formats, with help at exit, keep the way out open. A conflict of interest is a competing interest that could bias a decision, staffing limitations concern the company's own people, and data sovereignty is about which country's laws apply to data.",
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
      "A supplier bidding for a large contract offers the company's procurement manager a free luxury holiday, calling it a thank-you for considering the bid. Which compliance training topic covers this, and what should the manager do?",
    options: [
      "Data handling; encrypt the supplier's emails",
      "AML/CTF; ask for the holiday to be paid by bank transfer",
      "Acknowledgement; ask the supplier to sign the company's policy",
      "Anti-bribery; decline it and report it to the compliance team",
    ],
    answer: 3,
    explanation:
      "A valuable gift from a bidder, offered while it competes for a contract, can be a bribe, and laws such as the UK Bribery Act cover accepting a bribe as well as offering one, so anti-bribery training teaches staff to decline such offers and report them. Encrypting emails, changing how the gift is paid for and policy acknowledgements don't change what it is.",
  },
  {
    key: "s8-5.4-restriction-1",
    objective: "5.4",
    topic: "processing restrictions and prevention",
    difficulty: 3,
    question:
      "A company's retention schedule says a former employee's records are due for destruction this week. The former employee wants them kept, unused, as evidence in a lawsuit. Which GDPR right covers this request?",
    options: [
      "The right to be forgotten",
      "The right to data portability",
      "The right to restriction of processing",
      "The right to opt out of the sale of their data",
    ],
    answer: 2,
    explanation:
      "Restriction of processing lets a person have their data kept but not used, and one of the GDPR's grounds is exactly this case: the controller no longer needs the data, but the person needs it to establish, exercise or defend a legal claim. The right to be forgotten would erase the data, data portability gives the person a copy to take elsewhere, and opting out of sale is a right under laws such as California's, not the GDPR.",
  },
  {
    key: "s8-5.4-prevention-1",
    objective: "5.4",
    topic: "processing restrictions and prevention",
    difficulty: 2,
    question:
      "A shopper tells an online store to stop using their details for direct marketing altogether. Under the GDPR, what must the store do?",
    options: [
      "Keep marketing, but less often",
      "Stop processing the data for direct marketing",
      "Delete the shopper's account and order history",
      "Ask the shopper to show that the marketing harms them",
    ],
    answer: 1,
    explanation:
      "An objection to direct marketing prevents that processing outright: under the GDPR's right to object, the data must no longer be used for that purpose, with no balancing test. The objection doesn't require deleting the account or order history, which the store may still need for other purposes, and the shopper doesn't have to show any harm.",
  },
  {
    key: "s8-5.4-opt-in-1",
    objective: "5.4",
    topic: "opt-in and opt-out",
    difficulty: 2,
    question:
      "After an update, a fitness app starts sharing users' workout data with insurance partners, saying users agreed by carrying on using the app after a pop-up notice. A privacy reviewer says that isn't valid consent under the GDPR. Why not?",
    options: [
      "Consent needs an opt-in: a clear, affirmative act by the user",
      "Consent must be given on paper and signed, not in an app",
      "Only the company's data protection officer can consent for users",
      "Consent is never needed to share data with partners",
    ],
    answer: 0,
    explanation:
      "Under the GDPR, consent must be a clear affirmative act, so silence, inactivity or simply carrying on using a service doesn't count: users have to opt in by actively agreeing. Consent can be given electronically, it comes from the person whose data it is, not a company officer, and sharing personal data with partners needs a lawful basis such as valid consent.",
  },
  {
    key: "s8-5.4-correction-1",
    objective: "5.4",
    topic: "data correction",
    difficulty: 1,
    question:
      "A patient notices that a hospital's online portal lists a penicillin allergy they don't have, and asks the hospital to amend the entry. Which privacy right is the patient using?",
    options: ["Opt-out", "Processing restriction", "Legal hold", "Data correction"],
    answer: 3,
    explanation:
      "Data correction, called rectification in the GDPR, lets a person have inaccurate personal data about them fixed. Opting out stops a kind of processing, such as sale or marketing, processing restriction keeps data but stops it being used, and a legal hold preserves data for litigation.",
  },
  {
    key: "s8-5.4-legal-order-1",
    objective: "5.4",
    topic: "legal orders",
    difficulty: 2,
    question:
      "Police arrive at a company's data center with a search warrant to copy the contents of a server that one employee uses. What should the company do?",
    options: [
      "Refuse until the employee gives written consent to the search",
      "Wipe the server first to protect the other users' privacy",
      "Have counsel check the warrant, then comply within its scope",
      "Hand over every server in the room so nothing is missed",
    ],
    answer: 2,
    explanation:
      "Legal orders such as search warrants go to counsel, who confirms the order is genuine and works out what it covers, and the company then complies within that scope and keeps a record of what was copied or taken. A warrant doesn't depend on the employee's consent, wiping the server would destroy evidence and could amount to obstruction, and handing over systems the warrant doesn't cover exposes other people's data for no reason.",
  },

  // ---- 5.5 Audits and assessments ----
  {
    key: "s8-5.5-diamond-1",
    objective: "5.5",
    topic: "Diamond Model of Intrusion Analysis",
    difficulty: 2,
    question:
      "An analyst records each intrusion as one connected event and pivots from what's known to what isn't: from a phishing domain to the server hosting it, from that server to other organizations it targeted, and from those victims to the malware used on them. Which model is the analyst using?",
    options: [
      "MITRE ATT&CK",
      "The Diamond Model of Intrusion Analysis",
      "The Cyber Kill Chain",
      "The Common Vulnerability Scoring System (CVSS)",
    ],
    answer: 1,
    explanation:
      "The Diamond Model treats each intrusion event as four linked features, adversary, capability, infrastructure and victim, and analysts pivot along those links, as here from infrastructure to victims to capability, to uncover related activity. ATT&CK catalogs adversary tactics and techniques, the Cyber Kill Chain breaks an intrusion into seven phases in sequence, and CVSS scores the severity of vulnerabilities.",
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
      "A university takes part in an annual survey run by a higher-education IT association, and gets back a report placing its security staffing and incident response times against those of 80 peer universities. Which engagement type is this?",
    options: ["Gap analysis", "Penetration testing", "Regulatory examination", "Benchmarking"],
    answer: 3,
    explanation:
      "Benchmarking compares an organization's practices and results with those of peers or an external reference to show where it stands. A gap analysis compares the current state with a target, such as a framework's requirements, to list what's missing, a penetration test tries to exploit weaknesses, and a regulatory examination is carried out by a regulator to check compliance.",
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
      "A red team plans an exercise that imitates a particular ransomware group step by step, using a free, published catalog of the group's known behaviors, from how it gets in to how it encrypts systems. Which reference is the team using?",
    options: [
      "MITRE ATT&CK",
      "The Diamond Model of Intrusion Analysis",
      "The Cyber Kill Chain",
      "The CIS Benchmarks",
    ],
    answer: 0,
    explanation:
      "MITRE ATT&CK is a public knowledge base of adversary tactics and techniques built from real-world observations, and it profiles known groups and the techniques they use, which makes it the usual basis for imitating a specific adversary. The Diamond Model links adversary, capability, infrastructure and victim for analyzing intrusions, the Cyber Kill Chain describes seven broad phases without profiling groups, and CIS Benchmarks are secure configuration guides.",
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
      "To check that the year's 9,000 expense claims followed policy, an internal auditor tests every 50th claim and then reports a conclusion about all of them. Which data gathering technique is this?",
    options: ["Interviews", "Assertion", "Questionnaires", "Sampling"],
    answer: 3,
    explanation:
      "Sampling tests part of a population, here every 50th claim, and draws a conclusion about the whole, which makes large populations practical to audit; the sample has to represent the whole for the conclusion to hold. Interviews and questionnaires gather information by asking people, and an assertion is a claim, such as management's statement that its controls work, that the audit then tests.",
  },

  // ---- 5.6 Security awareness ----
  {
    key: "s8-5.6-lms-1",
    objective: "5.6",
    topic: "learning management system (LMS)",
    difficulty: 1,
    question:
      "New hires must pass a short phishing-awareness module before they get access to customer data, and IT wants that access granted automatically the moment someone passes. Which delivery mechanism should hold the module and its results?",
    options: [
      "A one-to-many webinar",
      "A self-service portal of policy documents",
      "A learning management system (LMS)",
      "One-to-one coaching sessions",
    ],
    answer: 2,
    explanation:
      "A learning management system delivers courses and modules and records who passed and when, and that record can drive other processes, such as granting access once a new hire passes. A webinar presents to many people at once but doesn't record who passed a test, a self-service portal lets people look things up when they need to, and coaching sessions don't produce a pass record that systems can act on.",
  },
  {
    key: "s8-5.6-delivery-1",
    objective: "5.6",
    topic: "delivery mechanisms",
    difficulty: 2,
    question:
      "Before a new accounts payable clerk starts approving payments, a security analyst spends an hour with the clerk alone, walking through the payment controls and the scams that target the role. Which delivery mechanism and type of training is this?",
    options: [
      "One-to-one delivery; initial (onboarding) training",
      "One-to-many delivery; corrective training",
      "A self-service portal; ongoing training",
      "A learning management system; annual refresher training",
    ],
    answer: 0,
    explanation:
      "A private session between an analyst and one person is one-to-one delivery, and training a new starter before they take on the role is initial, or onboarding, training, here aimed at the risks of the job. One-to-many delivery reaches a group at once, corrective training responds to someone's mistake, a self-service portal lets people find material on their own, and an LMS assigns and tracks courses rather than holding a live conversation.",
  },
  {
    key: "s8-5.6-risk-scoring-1",
    objective: "5.6",
    topic: "personnel behavior risk scoring",
    difficulty: 2,
    question:
      "A company rates each team on how quickly members report suspicious messages, how often they click through browser security warnings and whether they lock their screens when they step away, then sends extra coaching to the teams with the worst ratings. What is this?",
    options: [
      "Situational awareness",
      "Personnel behavior risk scoring",
      "Operational security",
      "A vulnerability scan",
    ],
    answer: 1,
    explanation:
      "Personnel behavior risk scoring rates people or teams by how their actions affect risk, so training and support go where they'll help most; because it singles people out, it should be used to help and handled fairly. Situational awareness is noticing what's happening around you, operational security protects information that could help an adversary, and a vulnerability scan checks systems, not people.",
  },
];
