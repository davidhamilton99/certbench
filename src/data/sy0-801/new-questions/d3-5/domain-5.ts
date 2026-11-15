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
      "A vendor answers a company's request for information (RFI) with a detailed description and an estimated price. Can the company accept the response as a binding offer?",
    options: [
      "Yes; any written price from a vendor is a binding offer",
      "Yes, if the response arrives before the RFI deadline",
      "No; an RFI response informs planning and isn't an offer",
      "No; only an expression of interest can form a contract",
    ],
    answer: 2,
    explanation:
      "A request for information gathers information for planning, so responses, even ones with estimated prices, aren't offers and can't be accepted to form a contract; the U.S. Federal Acquisition Regulation says so outright. Binding offers come later, in reply to a request for proposal or quote. A written estimate isn't automatically an offer, a deadline doesn't change what an RFI is, and an expression of interest only signals that a supplier wants to compete.",
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
      "A company is negotiating a five-year contract for a cloud HR platform. Which contract term does the MOST to limit vendor lock-in?",
    options: [
      "A right-to-audit clause covering the provider's controls",
      "A non-disclosure agreement covering both parties",
      "Export of all data in a standard format, plus help at exit",
      "A 99.9% monthly availability target with service credits for misses",
    ],
    answer: 2,
    explanation:
      "Vendor lock-in is dependence that makes leaving a provider costly or impractical. A guaranteed export of all data in a standard format, with help migrating at the end, keeps the exit open. A right-to-audit clause lets the company check the provider's controls, an NDA protects confidential information, and an availability target with credits governs uptime; none of them makes it easier to leave.",
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
    difficulty: 3,
    question:
      "A company hires a local agent to help win a government contract abroad. The agent asks for an unusually large success fee and hints that part of it will go to officials. What is the company's position?",
    options: [
      "It's safe, because only the agent would be paying the officials",
      "It's safe, as long as the fee is paid through a bank",
      "It's safe, if the agent signs a confidentiality agreement",
      "It can be liable for bribes its agent pays, so refuse and report",
    ],
    answer: 3,
    explanation:
      "Anti-bribery laws reach bribes paid through intermediaries. Under the UK Bribery Act, a company commits an offense if someone performing services for it, such as an agent, bribes to win it business, unless it can show adequate procedures to prevent bribery, and the U.S. Foreign Corrupt Practices Act also covers payments made through third parties. So the company should refuse, report it to compliance and look hard at the agent. It isn't safe just because someone else hands over the money, and routing the fee through a bank or adding a confidentiality agreement doesn't make it lawful.",
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
      "A U.S. retailer shares customer data with advertising partners unless a customer clicks a link labeled Do Not Sell or Share My Personal Information. Which consent model is this?",
    options: [
      "Opt-out: sharing goes on until the person says stop",
      "Opt-in: nothing is shared until the person agrees",
      "Legal hold: the data is preserved for litigation",
      "Processing restriction: the data is kept but unused",
    ],
    answer: 0,
    explanation:
      "In an opt-out model, processing such as selling or sharing data goes ahead by default until the person objects; California's privacy law gives consumers that right, which businesses commonly offer through a Do Not Sell or Share My Personal Information link. Opt-in is the reverse: nothing happens until the person actively agrees, as the GDPR requires for consent. A legal hold preserves data for litigation, and processing restriction keeps data without using it.",
  },
  {
    key: "s8-5.4-correction-1",
    objective: "5.4",
    topic: "data correction",
    difficulty: 2,
    question:
      "At a customer's request, a company fixes a misspelled name and a wrong date of birth in its records. Last month it shared that record with two partner firms. Under the GDPR, what must it do about the partners?",
    options: [
      "Nothing, since the partners are separate organizations with their own duties",
      "Delete the corrected record from its own systems",
      "Tell the customer to contact each partner themselves",
      "Tell each partner, unless that's impossible or takes disproportionate effort",
    ],
    answer: 3,
    explanation:
      "Under the GDPR, an organization that corrects (rectifies) personal data must pass the correction on to each recipient it disclosed the data to, unless that proves impossible or involves disproportionate effort, and tell the person who those recipients are if asked. That way the partners stop using the wrong data. Doing nothing leaves the errors in use, deleting the record isn't what the customer asked for, and the duty sits with the company, not the customer.",
  },
  {
    key: "s8-5.4-legal-order-1",
    objective: "5.4",
    topic: "legal orders",
    difficulty: 2,
    question:
      "A company is served with a legal order for one person's account history, and the order bars it from telling that person. What should the company do?",
    options: [
      "Tell the person anyway, because the company's privacy policy promises openness",
      "Refuse, because an order that limits notice is never valid",
      "Have counsel verify it, comply within scope and keep it confidential",
      "Delete the records so that there is nothing to produce",
    ],
    answer: 2,
    explanation:
      "Legal orders go to counsel, who confirms the order is genuine and lawful and works out exactly what it requires, and the company then produces only what it covers. Courts can bar a company from telling the person concerned, and breaking that bar can bring penalties of its own, so the restriction is followed while it applies unless counsel challenges it. A privacy policy doesn't override a valid order, such restrictions can be lawful, and deleting records after an order arrives could amount to obstruction.",
  },

  // ---- 5.5 Audits and assessments ----
  {
    key: "s8-5.5-diamond-1",
    objective: "5.5",
    topic: "Diamond Model of Intrusion Analysis",
    difficulty: 2,
    question:
      "An analyst knows only one fact about an intrusion: the command-and-control domain the malware called. Using the Diamond Model, how can the analyst find other victims of the same campaign?",
    options: [
      "Ask the domain's registrar to identify the attacker by name",
      "Pivot from that infrastructure to other events that used it",
      "Map the domain onto one phase of the Cyber Kill Chain instead",
      "Score the domain with the CVSS calculator",
    ],
    answer: 1,
    explanation:
      "The Diamond Model links each intrusion event's adversary, capability, infrastructure and victim, so knowing one feature lets an analyst pivot to related events: other intrusions that used the same command-and-control domain (infrastructure) point to other victims. A registrar rarely knows or names an attacker, a Kill Chain phase describes the stage of one attack rather than finding related ones, and CVSS scores vulnerabilities, not domains.",
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
    difficulty: 3,
    question:
      "A benchmarking study shows a company patches critical flaws about as fast as similar firms in its sector. What does this result NOT tell the company?",
    options: [
      "How its patching speed compares with that of its sector peers",
      "Where it sits against the sector's typical results",
      "Whether it's ahead of or behind similar firms",
      "Whether that speed is fast enough for its own risk appetite",
    ],
    answer: 3,
    explanation:
      "Benchmarking compares an organization's practices and results with peers or an external reference, so it shows where the company stands against them. It can't say whether that's good enough: if peers are slow too, matching them may still leave more risk than the company's appetite allows, which needs the company's own targets, such as risk-based remediation deadlines. The other three are exactly what a benchmark shows.",
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
      "In MITRE ATT&CK, Persistence appears as a column heading, and Scheduled Task/Job (T1053) appears under it. How do the two relate?",
    options: [
      "Persistence is a tactic (the why), Scheduled Task/Job a technique (the how)",
      "Persistence is the technique, and Scheduled Task/Job is the tactic it serves",
      "Persistence is a Kill Chain phase, and T1053 is the CVE number of a flaw",
      "Both are names of threat actor groups that ATT&CK tracks and profiles",
    ],
    answer: 0,
    explanation:
      "ATT&CK's tactics are the adversary's goals, the columns of its matrix, such as Persistence, and its techniques are the ways those goals are achieved, such as T1053 Scheduled Task/Job, which ATT&CK lists under Persistence as well as Execution and Privilege Escalation. The reverse pairing gets the levels backward, ATT&CK IDs aren't CVE numbers and the Kill Chain is a separate model, and ATT&CK profiles threat groups separately from its tactics and techniques.",
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
      "To test whether departed employees' accounts were disabled within a day, an auditor checks 25 of last year's 400 departures. What makes the conclusion about all 400 trustworthy?",
    options: [
      "Checking the 25 people who left most recently",
      "Letting the IT team pick the 25 accounts to check",
      "Interviewing the 25 people about their own accounts",
      "Choosing the 25 without bias, such as at random",
    ],
    answer: 3,
    explanation:
      "Sampling tests part of a population and draws a conclusion about the whole, which only holds if the sample represents it, so the 25 should be chosen without bias, for example at random. The most recent leavers may have been handled differently from earlier ones, a sample picked by the team being audited invites cherry-picking, and people who have left can't vouch for whether their own accounts were disabled.",
  },

  // ---- 5.6 Security awareness ----
  {
    key: "s8-5.6-lms-1",
    objective: "5.6",
    topic: "learning management system (LMS)",
    difficulty: 2,
    question:
      "New hires must pass a security course before they get access to customer data, and IT wants that access granted automatically the moment someone passes. Which delivery mechanism should hold the course and its results?",
    options: [
      "A one-to-many webinar",
      "A self-service portal of policy documents",
      "A learning management system (LMS)",
      "One-to-one coaching sessions",
    ],
    answer: 2,
    explanation:
      "A learning management system delivers courses and records who passed and when, and that record can drive other processes, such as granting access once a new hire passes. A webinar presents to many people at once but doesn't record who passed a test, a self-service portal lets people look things up when they need to, and coaching sessions don't produce a pass record that systems can act on.",
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
    difficulty: 1,
    question:
      "A security team is designing a personnel behavior risk score to decide who needs extra training. Which input belongs in it?",
    options: [
      "Each person's salary band and job grade",
      "How often each person reports suspicious email",
      "Each person's age and years with the company",
      "How many sick days each person took over the past year",
    ],
    answer: 1,
    explanation:
      "A personnel behavior risk score should rest on security behaviors, such as reporting suspicious email, results in phishing simulations, training completion and policy violations, because those are what training can change. Salary, age, tenure and sick days say nothing about security habits, and using them would make the score unfair, which matters for a score that singles out individuals.",
  },
];
