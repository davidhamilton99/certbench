import type { NewQuestion } from "./types";

/** New questions for 220-1202 Domain 4.0, Operational Procedures: the topics V15 added. */
export const questions: NewQuestion[] = [
  {
    key: "c2-4.1-sla-1",
    objective: "4.1",
    topic: "service level agreements",
    difficulty: 1,
    question:
      "A company's contract with its managed service provider says critical incidents get a response within 1 hour and a resolution within 4 hours, with service credits if these targets are missed. What is this document?",
    options: [
      "An external service-level agreement (SLA)",
      "An acceptable use policy (AUP)",
      "A non-disclosure agreement (NDA)",
      "A standard operating procedure (SOP)",
    ],
    answer: 0,
    explanation:
      "An SLA sets measurable service commitments, such as response and resolution times for each priority, and the remedies when they're missed; one with an outside provider is an external SLA. An AUP governs how users may use systems, an NDA protects confidential information, and an SOP gives step-by-step instructions for a task.",
  },
  {
    key: "c2-4.1-sla-2",
    objective: "4.1",
    topic: "service level agreements",
    difficulty: 2,
    question:
      "The IT department agrees with the sales department that failed laptops will be repaired or replaced by the next business day. Which type of agreement is this?",
    options: [
      "An external SLA",
      "A mutual non-disclosure agreement",
      "An internal SLA",
      "An end-user license agreement",
    ],
    answer: 2,
    explanation:
      "An internal SLA sets service expectations between departments of the same organization, here IT and sales. An external SLA is made with an outside provider or customer, an MNDA protects information both parties share, and an EULA sets the terms for using software.",
  },
  {
    key: "c2-4.1-sla-3",
    objective: "4.1",
    topic: "service level agreements",
    difficulty: 3,
    question:
      "A high-priority ticket will breach its SLA resolution time in 30 minutes, and the assigned technician is still waiting on a part. What should happen, following good ticketing practice?",
    options: [
      "Close the ticket now and reopen it later, which resets the SLA timer",
      "Lower the ticket's severity so that the SLA target no longer applies",
      "Leave the ticket as it is until the part arrives, then update it",
      "Escalate it per the escalation procedure, update the user and record progress",
    ],
    answer: 3,
    explanation:
      "SLAs drive ticket priority and escalation: when a deadline is at risk, escalate, keep the user informed and record progress so the response is visible and accountable. Closing and reopening a ticket or lowering its severity to dodge an SLA falsifies the records, and waiting silently guarantees the breach without warning anyone.",
  },
  {
    key: "c2-4.1-cmdb-1",
    objective: "4.1",
    topic: "CMDB",
    difficulty: 2,
    question:
      "Before upgrading a database server, a technician wants to see which applications and services depend on it. Which asset management resource records configuration items and the relationships between them?",
    options: [
      "A knowledge base article written about the server",
      "A configuration management database (CMDB)",
      "An incident report",
      "An acceptable use policy",
    ],
    answer: 1,
    explanation:
      "A CMDB stores configuration items, such as hardware, software and services, with their details and the relationships between them, so you can see what depends on a server before changing it. Knowledge base articles document fixes and how-tos, an incident report records what happened in an incident, and an AUP sets rules for using systems.",
  },
  {
    key: "c2-4.2-change-types-1",
    objective: "4.2",
    topic: "change management types",
    difficulty: 1,
    question:
      "Adding a user to an existing security group follows a documented, low-risk procedure that was approved in advance. Which type of change is this?",
    options: ["Normal change", "Emergency change", "Change freeze", "Standard change"],
    answer: 3,
    explanation:
      "A standard change is routine, low-risk and pre-approved, so it follows its documented procedure without going to the change board each time. A normal change needs assessment and approval before it's scheduled, an emergency change is an urgent fix with fast-tracked approval, and a change freeze is a period when changes aren't allowed.",
  },
  {
    key: "c2-4.2-change-types-2",
    objective: "4.2",
    topic: "change management types",
    difficulty: 2,
    question:
      "A critical vulnerability in the company's VPN appliances is being actively exploited, and the vendor has released a patch. Which type of change should be used to apply it?",
    options: [
      "Standard change",
      "Emergency change",
      "Normal change, scheduled for next quarter",
      "No change request, because security patches are exempt",
    ],
    answer: 1,
    explanation:
      "An emergency change handles an urgent risk or outage that can't wait for the normal schedule: it gets fast-tracked approval, often from a smaller emergency change board, and is fully documented afterward. A standard change is only for pre-approved routine work, waiting a quarter leaves the exploit open, and security patches still go through change management.",
  },
  {
    key: "c2-4.2-change-types-3",
    objective: "4.2",
    topic: "change management types",
    difficulty: 2,
    question:
      "A team plans to migrate the company's file server to a new storage system. The change isn't routine and carries moderate risk. How should it be handled?",
    options: [
      "As a standard change, because file servers count as standard equipment",
      "As an emergency change, so that the migration can start immediately",
      "As a normal change, with a request, risk analysis, rollback plan and board approval",
      "With no change request at all, because it's only an infrastructure upgrade, not an app change",
    ],
    answer: 2,
    explanation:
      "A normal change is any change that is neither pre-approved nor urgent, and it goes through the full process: request form, risk analysis, rollback plan, change board approval and scheduling. Standard changes are pre-approved routine tasks, emergency changes are for urgent fixes only, and infrastructure work still needs change management.",
  },
  {
    key: "c2-4.2-freeze-windows-1",
    objective: "4.2",
    topic: "change freeze and maintenance windows",
    difficulty: 2,
    question:
      "A retailer allows planned changes only on Sundays from 1 a.m. to 5 a.m., and blocks all non-emergency changes from mid-November to early January. What are these two controls?",
    options: [
      "A maintenance window and a change freeze",
      "A rollback plan and a backup plan",
      "Sandbox testing and peer review",
      "End-user acceptance and risk analysis",
    ],
    answer: 0,
    explanation:
      "A maintenance window is a set, low-impact time when approved changes may be made, and a change freeze blocks non-emergency changes during critical business periods such as holiday sales. Rollback and backup plans cover recovery from a failed change, sandbox testing and peer review check a change before it goes live, and end-user acceptance and risk analysis evaluate it.",
  },
  {
    key: "c2-4.2-peer-review-1",
    objective: "4.2",
    topic: "peer review",
    difficulty: 2,
    question:
      "Before a firewall change goes to the change board, a second engineer checks the proposed rules and implementation steps for mistakes. Which part of the change management process is this?",
    options: ["End-user acceptance", "Sandbox testing", "Change freeze", "Peer review"],
    answer: 3,
    explanation:
      "Peer review has another qualified person check a change's plan or configuration, catching errors before implementation. End-user acceptance confirms with users after the change that it works for them, sandbox testing tries the change in an isolated environment, and a change freeze blocks changes for a period.",
  },
  {
    key: "c2-4.2-backup-plan-1",
    objective: "4.2",
    topic: "backup plan",
    difficulty: 3,
    question:
      "A change request for a database upgrade includes a rollback plan that reinstalls the old version. The change board also asks for a backup plan. What should the backup plan cover?",
    options: [
      "A second change board that can approve the change if the first one refuses it",
      "A list of the users to notify by email once the change has been completed",
      "A verified backup of the data, taken first, in case the change or rollback damages it",
      "The date and time of the next maintenance window, in case this one runs over",
    ],
    answer: 2,
    explanation:
      "A rollback plan undoes the change itself, for example by reinstalling the previous version, while a backup plan protects the data with a verified backup taken beforehand, so it can be restored if the change or the rollback goes wrong. Approvals, notifications and scheduling are separate parts of the change process.",
  },
  {
    key: "c2-4.3-recovery-1",
    objective: "4.3",
    topic: "backup recovery",
    difficulty: 2,
    question:
      "A user overwrote an important spreadsheet this morning and wants yesterday's version back, but also wants to keep today's version in case some of today's edits are needed. Which recovery option should the technician choose?",
    options: [
      "Restore to an alternative location, so both versions exist",
      "Restore in place, overwriting the current file",
      "Run a new full backup instead of restoring",
      "Restore the whole drive from the oldest backup that's available",
    ],
    answer: 0,
    explanation:
      "Restoring to an alternative location puts the backup copy in a different folder or under a different name, leaving the current file untouched so the user can compare and combine them. An in-place restore would overwrite today's version, a new full backup doesn't bring back yesterday's file, and restoring the whole drive from an old backup would roll back everything else too.",
  },
  {
    key: "c2-4.3-recovery-2",
    objective: "4.3",
    topic: "backup recovery",
    difficulty: 2,
    question:
      "Ransomware encrypted a file share, and the technician has a clean backup from last night. The encrypted files are worthless, and users need the share back at its usual path as quickly as possible. Which recovery method fits BEST once the infection is removed?",
    options: [
      "Alternative-location recovery to a USB drive on the technician's desk",
      "In-place (overwrite) recovery to the original location",
      "A differential backup of the encrypted files",
      "Restoring only the ransom note files",
    ],
    answer: 1,
    explanation:
      "In-place recovery writes the backed-up files over the originals at their usual location, which suits files that are destroyed or worthless and need to be back where users expect them; remove the malware first so the restored files aren't encrypted again. Restoring to a USB drive leaves the share unusable, backing up the encrypted files saves nothing useful, and ransom notes should be removed rather than restored.",
  },
  {
    key: "c2-4.3-recovery-3",
    objective: "4.3",
    topic: "backup recovery",
    difficulty: 1,
    question:
      "A file server's motherboard failed, and a replacement server with a different name is ready. The technician restores the backed-up shares onto the new server. Which type of recovery is this?",
    options: ["In-place recovery", "Alternative location recovery", "Synthetic full backup", "Incremental backup"],
    answer: 1,
    explanation:
      "Restoring data to a different server, folder or drive than the one it came from is alternative location recovery, used here because the original server can't run. In-place recovery writes back to the original location, overwriting what's there, and synthetic full and incremental are types of backup, not ways of restoring.",
  },
  {
    key: "c2-4.4-cable-management-1",
    objective: "4.4",
    topic: "cable management",
    difficulty: 1,
    question:
      "A technician sets up a training room where power and network cables would cross a walkway to the instructor's desk. Which action BEST follows safe cable management?",
    options: [
      "Tape the cables loosely across the walkway with masking tape",
      "Run the cables under the carpet so nobody can see them",
      "Coil the extra cable on the floor behind the door",
      "Route the cables along the walls or under a floor cable cover",
    ],
    answer: 3,
    explanation:
      "Cable management keeps cables out of walkways, routing them along walls, in raceways or under rated floor covers, to prevent trips and damage. Loosely taped cables are still a trip hazard, cables under carpet can be damaged and overheat unseen, and coils on the floor are another trip hazard.",
  },
  {
    key: "c2-4.4-cable-management-2",
    objective: "4.4",
    topic: "cable management",
    difficulty: 2,
    question: "While tidying a network rack, a technician bundles the patch cables. Which practice is BEST?",
    options: [
      "Use hook-and-loop ties, label both ends of each cable, and keep bends gentle",
      "Pull plastic zip ties as tight as possible, so that the bundles can't move or sag",
      "Bundle the power cords tightly together with the network cables",
      "Leave the cables loose and unlabeled so they're easier to trace",
    ],
    answer: 0,
    explanation:
      "Hook-and-loop ties hold bundles without crushing cables and are easy to reopen, labels make tracing quicker, and gentle bends avoid damaging copper pairs and fiber. Over-tightened zip ties can deform cables and hurt performance, bundling power cords tightly with data cables can cause interference, and loose cables tangle, block airflow and make tracing harder.",
  },
  {
    key: "c2-4.6-order-of-volatility-1",
    objective: "4.6",
    topic: "order of volatility",
    difficulty: 2,
    question:
      "A technician suspects an attacker is active on a workstation and must preserve evidence. Which of these should be collected FIRST?",
    options: [
      "The files on the hard drive",
      "Last month's backup tapes",
      "The contents of RAM, including running processes",
      "Logs stored on the company's remote logging server",
    ],
    answer: 2,
    explanation:
      "The order of volatility says to collect the most short-lived evidence first, and memory, with running processes and network connections, is lost as soon as the system powers off. Files on disk persist, and remote logs and archived backups last longer still, so they're collected later.",
  },
  {
    key: "c2-4.6-order-of-volatility-2",
    objective: "4.6",
    topic: "order of volatility",
    difficulty: 3,
    question:
      "List these from MOST to LEAST volatile: (1) disk contents, (2) RAM, (3) archived backup media, (4) temporary file systems.",
    options: ["1, 2, 4, 3", "4, 2, 3, 1", "2, 1, 4, 3", "2, 4, 1, 3"],
    answer: 3,
    explanation:
      "Following the order of volatility in RFC 3227: memory is lost at power-off, temporary file systems are cleared on restart or cleanup, disk contents persist but change as the system runs, and archived backup media change least. The other orders put longer-lasting evidence ahead of more volatile evidence.",
  },
  {
    key: "c2-4.6-perpetual-license-1",
    objective: "4.6",
    topic: "perpetual license agreement",
    difficulty: 1,
    question:
      "A company pays once for a version of a design application and may keep using that version indefinitely, but new major versions must be bought separately. Which license type is this?",
    options: ["Subscription license", "Perpetual license", "Open-source license", "Personal-use license"],
    answer: 1,
    explanation:
      "A perpetual license is a one-time purchase of the right to use a particular version indefinitely; upgrades or support often cost extra. A subscription license works only while payments continue, an open-source license grants rights to use, modify and share the source code, and a personal-use license limits use to non-commercial purposes.",
  },
  {
    key: "c2-4.6-perpetual-license-2",
    objective: "4.6",
    topic: "perpetual license agreement",
    difficulty: 2,
    question:
      "A company holds perpetual licenses for an accounting application and has stopped paying for the vendor's maintenance plan. What is the MOST likely result?",
    options: [
      "The application stops working at the end of the current month",
      "The licenses automatically turn into open-source licenses",
      "It can keep using its licensed version but gets no new versions or support",
      "The company must uninstall the application from every PC immediately",
    ],
    answer: 2,
    explanation:
      "With a perpetual license, the right to use the purchased version continues without further payment, while a maintenance or support plan is what typically provides updates, new versions and help; the company should still watch for that version reaching end of support. A subscription would stop working when payments stop, licenses don't turn into open-source ones, and nothing requires removing a perpetually licensed version.",
  },
  {
    key: "c2-4.6-nda-1",
    objective: "4.6",
    topic: "NDA",
    difficulty: 1,
    question:
      "Before a contract technician starts work on a law firm's servers, the firm asks the technician to sign a document promising not to disclose any client information they see. What is this document?",
    options: [
      "A non-disclosure agreement (NDA)",
      "A service-level agreement (SLA)",
      "An end-user license agreement (EULA)",
      "An acceptable use policy (AUP)",
    ],
    answer: 0,
    explanation:
      "An NDA is a legal agreement to keep specified information confidential, common for contractors who may see sensitive data. An SLA sets service levels, a EULA sets the terms for using software, and an AUP governs how users may use an organization's systems.",
  },
  {
    key: "c2-4.6-nda-2",
    objective: "4.6",
    topic: "NDA",
    difficulty: 2,
    question:
      "Two companies are exploring a joint project, and each will share confidential pricing and technical designs with the other. Which agreement fits BEST?",
    options: [
      "A one-way NDA signed only by the smaller company",
      "An internal service-level agreement",
      "A mutual non-disclosure agreement (MNDA)",
      "An open-source license",
    ],
    answer: 2,
    explanation:
      "A mutual NDA binds both parties to protect each other's confidential information, which suits a two-way exchange. A one-way NDA protects only one side's information, an internal SLA sets service levels within one organization, and an open-source license governs how software may be used rather than confidentiality.",
  },
  {
    key: "c2-4.9-spice-1",
    objective: "4.9",
    topic: "SPICE",
    difficulty: 2,
    question:
      "A technician manages Linux virtual machines on a KVM host and wants to open a VM's graphical console from a workstation, with USB redirection and audio. Which remote access protocol is designed for this?",
    options: ["SSH", "WinRM", "SFTP", "SPICE"],
    answer: 3,
    explanation:
      "SPICE (Simple Protocol for Independent Computing Environments) gives remote access to virtual machines' displays, with features such as USB device sharing, audio and folder sharing; clients such as remote-viewer connect to the hypervisor rather than to the guest OS. SSH gives a text shell, WinRM runs remote management commands on Windows, and SFTP transfers files.",
  },
  {
    key: "c2-4.9-spice-2",
    objective: "4.9",
    topic: "SPICE",
    difficulty: 3,
    question:
      "A VM's network adapter is misconfigured, so RDP and SSH connections to the guest OS fail, but the technician can still see and use the VM's console through SPICE. Why does SPICE still work?",
    options: [
      "SPICE reaches the VM's display through the hypervisor, not the guest's network",
      "SPICE switches to the guest's wireless adapter whenever the wired one fails",
      "SPICE tunnels through the guest's RDP service using a different port number",
      "SPICE connects only to a guest operating system that has been shut down",
    ],
    answer: 0,
    explanation:
      "With SPICE, the hypervisor serves the VM's display, keyboard and mouse, so the console works even when the guest's own networking is broken, which makes it ideal for fixing that network. RDP and SSH are services inside the guest that need its networking. SPICE doesn't use the guest's adapters or its RDP service, and it shows the running VM, including startup and shutdown.",
  },
  {
    key: "c2-4.9-winrm-1",
    objective: "4.9",
    topic: "WinRM",
    difficulty: 2,
    question:
      "An administrator wants to run PowerShell commands on 50 remote Windows servers from one console using Invoke-Command. Which Windows service must be configured on the servers for this?",
    options: [
      "Remote Desktop Services",
      "Windows Remote Management (WinRM)",
      "SPICE",
      "Simple Network Management Protocol (SNMP)",
    ],
    answer: 1,
    explanation:
      "PowerShell remoting runs over WinRM, Microsoft's implementation of the WS-Management protocol; Enable-PSRemoting or winrm quickconfig starts the service, creates a listener and opens the firewall. Remote Desktop gives a full graphical session on one server at a time, SPICE is for virtual machine consoles, and SNMP monitors devices rather than running commands.",
  },
  {
    key: "c2-4.9-winrm-2",
    objective: "4.9",
    topic: "WinRM",
    difficulty: 2,
    question: "By default, which TCP ports do WinRM listeners use for HTTP and HTTPS?",
    options: ["3389 and 3390", "5985 and 5986", "22 and 443", "5900 and 5901"],
    answer: 1,
    explanation:
      "Since WinRM 2.0, the default listener ports are 5985 for HTTP and 5986 for HTTPS; with Kerberos or NTLM authentication the messages are encrypted even over HTTP, and HTTPS adds certificate-based verification of the server. 3389 is RDP, 22 is SSH and 443 is HTTPS for websites, and 5900 and up are commonly used by VNC.",
  },
  {
    key: "c2-4.10-ai-1",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 1,
    question:
      "A technician asks a public AI chatbot for a Windows command, and it confidently gives a command-line switch that doesn't exist. What is this AI limitation called?",
    options: ["Bias", "Plagiarism", "Hallucination", "Data privacy"],
    answer: 2,
    explanation:
      "A hallucination is output that sounds confident and plausible but is false, such as an invented command switch, citation or setting; check AI-generated commands against vendor documentation before running them. Bias is skew learned from training data, plagiarism is passing off others' work as your own, and data privacy concerns how personal information is handled.",
  },
  {
    key: "c2-4.10-ai-2",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 2,
    question:
      "An AI tool that screens help desk job applicants consistently ranks candidates from some schools lower, because most of the company's past hires came from other schools. Which AI limitation does this show?",
    options: ["Bias", "Hallucination", "Plagiarism", "Data security"],
    answer: 0,
    explanation:
      "Bias occurs when a model reflects skew in its training data or design and produces unfair results for some groups, here repeating past hiring patterns. A hallucination is invented false content, plagiarism is presenting others' work as your own, and data security is about protecting data from unauthorized access.",
  },
  {
    key: "c2-4.10-ai-3",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 2,
    question:
      "An AI assistant summarizes a 40-page vendor contract for a manager. Which practice BEST addresses the accuracy limitations of AI?",
    options: [
      "Ask the AI to rate its own confidence, and accept the summary if it's above 90%",
      "Use the summary as it is, because the AI has read every page of the contract",
      "Ask the AI the same question again until two of its answers match each other",
      "Have a person check key points, such as dates and amounts, against the contract",
    ],
    answer: 3,
    explanation:
      "AI output can omit, misread or invent details, so a person checks it against the source, especially figures and commitments. A model's rating of its own confidence isn't a reliable measure, reading every page doesn't guarantee a correct summary, and two matching answers can both be wrong.",
  },
  {
    key: "c2-4.10-ai-4",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 2,
    question:
      "A help desk technician wants to paste a customer's ticket, including the customer's name, address and account number, into a free public AI chatbot to draft a reply. What is the MAIN concern?",
    options: [
      "Hallucination: the chatbot can't read street addresses or account numbers correctly",
      "Bias: the chatbot gives some customers better replies than it gives others",
      "Application integration: the chatbot can't connect to the ticketing system",
      "Data privacy: public AI services may keep or train on prompts, exposing personal data",
    ],
    answer: 3,
    explanation:
      "Pasting personal data into a public AI tool sends it outside the company's control, where the provider may keep it or use it to train models, which can breach privacy law and policy; remove the personal details or use an approved private AI tool. Hallucination, bias and integration are real AI topics, but none is the main risk of sharing this data.",
  },
  {
    key: "c2-4.10-ai-5",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 2,
    question:
      "A company wants employees to use generative AI with internal documents, without that data leaving the company's control or being used to train the provider's models. Which option fits BEST?",
    options: [
      "A private AI deployment, such as an enterprise service or a self-hosted model",
      "A free public chatbot, used with each employee's own personal account",
      "Any AI browser extension that offers to summarize documents for free",
      "A public AI service, used over a VPN so the traffic is hidden from everyone else",
    ],
    answer: 0,
    explanation:
      "Private AI runs in an environment the organization controls or contracts for, such as an enterprise service with data protection terms or a self-hosted model, so prompts and documents stay within its security boundary and aren't used to train public models. Free public chatbots and unvetted extensions may keep or share data, and a VPN protects traffic in transit but doesn't change what the AI provider does with the data.",
  },
  {
    key: "c2-4.10-ai-6",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 2,
    question:
      "A company's internal AI assistant answers questions from the company's own policy documents rather than from the open internet. What is an advantage of controlling the data source this way?",
    options: [
      "The assistant can no longer make mistakes of any kind in its answers",
      "The assistant no longer needs any security controls or access rules",
      "Answers come from vetted company information, and access to it can be governed",
      "The assistant can now answer questions on any topic, not just company ones",
    ],
    answer: 2,
    explanation:
      "The data source an AI draws on shapes its answers: grounding a private assistant in approved internal documents keeps answers relevant and lets the company control and audit what data it uses. It can still make mistakes, it still needs security controls because it holds sensitive data, and a narrow source limits it to those topics.",
  },
  {
    key: "c2-4.10-ai-7",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 3,
    question:
      "A company turns on an AI assistant integrated with its email, documents and chat. Soon after, an employee asks it about salaries and gets details from an HR spreadsheet the employee could technically open but was never meant to see. What does this reveal?",
    options: [
      "The assistant broke into the HR system's database to find the salary data",
      "It uses each user's existing permissions, so overshared files become easy to find",
      "The assistant is hallucinating, and the salary details it gave are invented",
      "AI integrations always bypass the permissions that are set on files",
    ],
    answer: 1,
    explanation:
      "AI assistants built into productivity apps can surface anything the user already has access to, so oversharing that went unnoticed becomes easy to find; review and tighten permissions and data labels before turning on the integration. The assistant didn't break in, the data is real rather than invented, and these integrations respect the user's existing permissions rather than bypassing them.",
  },
  {
    key: "c2-4.10-ai-8",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 1,
    question: "Which example BEST describes AI application integration?",
    options: [
      "An AI feature in a word processor that drafts and rewrites text in the document",
      "A user copying a paragraph from a website and pasting it into a document",
      "A spreadsheet macro scheduled to run every night and email a report",
      "A printer driver that saves any document as a PDF file instead of printing",
    ],
    answer: 0,
    explanation:
      "Application integration means AI capabilities are built into the tools people already use, such as drafting in a word processor, summarizing a videoconference or analyzing a spreadsheet, using the app's own context. Copying text, scheduled macros and printer drivers involve no AI.",
  },
  {
    key: "c2-4.10-ai-9",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 1,
    question:
      "A company publishes a document stating which AI tools employees may use, what kinds of data they may enter into them, and that AI output must be reviewed before it is used. What is this?",
    options: [
      "A service-level agreement",
      "A non-disclosure agreement",
      "A change freeze",
      "An appropriate use policy for AI",
    ],
    answer: 3,
    explanation:
      "An appropriate use policy for AI, often part of the acceptable use policy, sets which tools are approved, what data may be shared with them and how their output must be checked and disclosed. An SLA sets service levels, an NDA protects confidential information, and a change freeze pauses changes.",
  },
  {
    key: "c2-4.10-ai-10",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 2,
    question:
      "A technician uses an AI tool to write a knowledge base article and publishes it under their own name without review or disclosure. Parts of it closely match a vendor's copyrighted documentation. Which concern does this raise MOST directly?",
    options: ["Data source", "Bias", "Plagiarism", "Application integration"],
    answer: 2,
    explanation:
      "Presenting AI-generated text as your own original work, especially when it reproduces someone else's material, is plagiarism and may also infringe copyright; policies typically require reviewing AI output, citing sources and disclosing AI help. Data source, bias and application integration are AI concepts, but none describes passing off others' work.",
  },
  {
    key: "c2-4.10-ai-11",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 2,
    question: "A training team may use AI to help write course material. Which practice BEST avoids plagiarism?",
    options: [
      "Use the AI's output word for word, because AI-generated text is always original",
      "Review and rework AI drafts, cite sources, and disclose AI help as policy requires",
      "Remove every citation from the material, so that the content looks original",
      "Run the AI's text through a second AI tool, so it is paraphrased automatically",
    ],
    answer: 1,
    explanation:
      "AI can reproduce or closely paraphrase existing work, so drafts need human review, checking, citation and disclosure in line with policy. AI text isn't guaranteed to be original, removing citations is itself plagiarism, and automated paraphrasing hides the source instead of crediting it.",
  },
  {
    key: "c2-4.10-ai-12",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 2,
    question:
      "A junior technician wants to run a PowerShell script that an AI chatbot wrote to clean up user profiles on every company PC. What should happen first?",
    options: [
      "Run it on all of the PCs at once, so the cleanup finishes as quickly as possible",
      "Review it, check its cmdlets against documentation, and test it in a sandbox",
      "Ask the chatbot whether the script is safe, and run it if the answer is yes",
      "Rename the script from .ps1 to .bat so that it runs faster on older PCs",
    ],
    answer: 1,
    explanation:
      "AI can produce scripts with invented parameters or destructive logic, so a person reviews them, checks them against documentation and tests them in a sandbox before change approval and rollout. Running it everywhere risks mass damage, the chatbot can't vouch for its own output, and renaming a PowerShell script to .bat just stops it working.",
  },
  {
    key: "c2-4.10-ai-13",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 3,
    question:
      "Before approving a public AI service for staff, a security team reviews its terms of service. Which question is MOST important for data security?",
    options: [
      "Whether the AI service can answer questions in more than one language",
      "Whether the AI service's apps offer a dark mode for use at night",
      "Whether prompts and files are kept, used for training or seen by the provider",
      "How many images the AI service can generate for each user per minute at peak times",
    ],
    answer: 2,
    explanation:
      "With a public AI service, the provider holds whatever users submit, so data security depends on its retention, training, access and encryption terms. Language support, interface themes and image speed don't affect where company data goes or who can see it.",
  },
  {
    key: "c2-4.10-ai-14",
    objective: "4.10",
    topic: "basic AI concepts",
    difficulty: 2,
    question:
      "A technician asks an AI chatbot for the latest firmware version for a vendor's router, and it names a version that is two releases old. Which limitation does this show, and what should the technician do?",
    options: [
      "Accuracy: the model's knowledge may be out of date, so check the vendor's website",
      "Bias: the model prefers older firmware, so ask the question again",
      "Plagiarism: the model copied the version number, so cite the chatbot",
      "Data privacy: the model is hiding the newest version, so ask again in private browsing",
    ],
    answer: 0,
    explanation:
      "AI models are trained on data up to a point in time and may not know about recent releases, so answers about current versions can be wrong; check the authoritative source, the vendor's own site. This isn't bias, citing the chatbot doesn't make a wrong answer right, and private browsing doesn't change what the model knows.",
  },
];
