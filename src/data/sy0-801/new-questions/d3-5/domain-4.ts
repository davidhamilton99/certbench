import type { NewQuestion } from "./types";

/**
 * 4.0 Security Operations: topics SY0-801 names in 4.1 and 4.5–4.8 that the
 * carried bank doesn't cover, and top-ups that bring 4.3 and 4.4 past 20.
 */
export const questions: NewQuestion[] = [
  // ---- 4.1 Mitigating controls ----
  {
    key: "s8-4.1-wips-1",
    objective: "4.1",
    topic: "wireless intrusion prevention system (WIPS)",
    difficulty: 2,
    question:
      "Laptops keep dropping off the corporate Wi-Fi, and a wireless capture shows a flood of deauthentication frames aimed at them. Which control can detect this kind of attack on the Wi-Fi itself and alert on it?",
    options: [
      "A host-based intrusion prevention system on every laptop",
      "A web application firewall",
      "A wireless intrusion prevention system (WIPS)",
      "A captive portal on the guest network",
    ],
    answer: 2,
    explanation:
      "A WIPS uses radio sensors to watch wireless traffic itself, so it can spot attacks on the Wi-Fi protocols, such as a deauthentication flood that knocks clients off, as well as rogue access points, and alert on them or respond. Management frame protection (802.11w) also helps devices ignore forged deauthentication frames. A HIPS sees only its own host, a WAF inspects requests to a web application, and a captive portal just admits guests to a network.",
  },
  {
    key: "s8-4.1-utm-1",
    objective: "4.1",
    topic: "unified threat management (UTM)",
    difficulty: 2,
    question:
      "A franchise gives each of its 150 shops a single security device that head office manages remotely. It filters traffic, blocks known exploits, scans downloads for malware and keeps a VPN tunnel to head office. Which solution is this, and what is its main trade-off?",
    options: [
      "Unified threat management; one box can bottleneck or fail as a unit",
      "A web application firewall; it needs a rule for each application",
      "A network tap; it can't decrypt VPN traffic",
      "A jump server; users must sign in twice",
    ],
    answer: 0,
    explanation:
      "A unified threat management (UTM) appliance combines firewalling, intrusion prevention, malware scanning and VPN in one device, which suits sites without their own security staff. The trade-off is that every function shares the same hardware: performance can drop with everything turned on, and if the box fails, every function fails together. A WAF protects web applications only, a tap passively copies traffic for monitoring, and a jump server is a hardened host for administrative access.",
  },
  {
    key: "s8-4.1-secrets-1",
    objective: "4.1",
    topic: "secrets scanning",
    difficulty: 2,
    question:
      "A security team wants an alert whenever a cloud access token or private key turns up anywhere in the company's source code, including old commits across its 200 repositories, so it can revoke the credential quickly. Which control fits?",
    options: [
      "Code signing of every release build",
      "Static code analysis for injection flaws",
      "A web application firewall in front of the app",
      "Secrets scanning across the repositories",
    ],
    answer: 3,
    explanation:
      "Secrets scanning searches code and its history for credentials such as tokens, keys and passwords, and raises an alert so they can be revoked and rotated; many platforms can also block a push that contains one. Code signing proves who published a build, static code analysis looks for coding flaws such as injection, and a WAF filters web requests to a running application; none of them looks for leaked credentials.",
  },
  {
    key: "s8-4.1-secrets-2",
    objective: "4.1",
    topic: "secrets scanning",
    difficulty: 3,
    question:
      "A team learns that a database password was committed to a public repository three days ago. What should it do FIRST?",
    options: [
      "Delete the file in a new commit so the password is no longer visible",
      "Revoke or rotate the password, then clean up the repository",
      "Rewrite the repository's history to remove every trace of the password",
      "Make the repository private",
    ],
    answer: 1,
    explanation:
      "Treat an exposed secret as compromised: revoking or rotating it is what stops it working, since anyone may have copied it in the three days it was public. Deleting the file in a new commit leaves the password in the commit history, rewriting history can't recall copies already taken, and making the repository private doesn't invalidate the password either. Cleaning up the history comes after the secret is dead.",
  },
  {
    key: "s8-4.1-bimi-1",
    objective: "4.1",
    topic: "Brand Indicators for Message Identification (BIMI)",
    difficulty: 3,
    question:
      "A retailer's marketing team wants the company logo to appear next to its emails in recipients' inboxes. The domain publishes SPF and DKIM records, and its DMARC policy is p=none. What does the retailer need to do for BIMI to work?",
    options: [
      "Attach the logo to every outgoing message and sign it with DKIM",
      "Replace its SPF and DKIM records with a BIMI record, which authenticates mail itself",
      "Set DMARC to quarantine or reject, then publish a BIMI record pointing to the logo",
      "Keep DMARC at p=none and add the logo's address to the SPF record",
    ],
    answer: 2,
    explanation:
      "BIMI only works for mail that passes DMARC under an enforcing policy, quarantine or reject (Gmail also wants it applied to all mail, pct=100), so p=none has to change first. The BIMI record is a DNS TXT record, usually named default._bimi under the domain (default._bimi.example.com), that points to the logo in SVG Tiny P/S format, and mailbox providers such as Gmail also require a mark certificate (a VMC or CMC). BIMI doesn't authenticate mail, so it can't replace SPF and DKIM; attaching a logo changes nothing in the inbox; and an SPF record lists the servers allowed to send mail, not a logo.",
  },
  {
    key: "s8-4.1-xdr-1",
    objective: "4.1",
    topic: "extended detection and response (XDR)",
    difficulty: 2,
    question:
      "EDR isolates a laptop after a phishing attachment runs on it, but copies of the same email are still sitting in 30 other mailboxes. Which capability would have removed those emails as part of the same response?",
    options: [
      "Antivirus with daily signature updates",
      "Extended detection and response (XDR)",
      "Data loss prevention (DLP)",
      "Endpoint detection and response (EDR) on its own",
    ],
    answer: 1,
    explanation:
      "XDR joins detection and response across endpoints, email, identities and cloud apps, so one incident can trigger actions in each, such as isolating the laptop and purging the same message from every mailbox. EDR on its own acts only on endpoints, antivirus blocks known malware on a single host, and DLP watches for sensitive data leaving the organization.",
  },
  {
    key: "s8-4.1-canary-1",
    objective: "4.1",
    topic: "canary accounts",
    difficulty: 2,
    question:
      "A company keeps an account in its cloud directory that looks like a departed executive's but has no real access. The identity provider alerts security if anyone ever signs in to it or tries to reset its password. What is this account?",
    options: [
      "A group Managed Service Account",
      "An emergency access account",
      "A honeyfile",
      "A canary account",
    ],
    answer: 3,
    explanation:
      "A canary account exists only as a tripwire: it has no legitimate use, so any sign-in or password-reset attempt on it signals someone probing the directory with harvested or guessed credentials. A gMSA is a real service account whose password Windows manages, an emergency access account is a real account kept for when normal sign-in fails, and a honeyfile is a decoy file rather than an account.",
  },
  {
    key: "s8-4.1-captive-portal-1",
    objective: "4.1",
    topic: "captive portals",
    difficulty: 1,
    question:
      "At a public library, a visitor who plugs a laptop into a study desk's network port is sent to a sign-in page asking for a library card number, and no other website loads until the number is accepted. What is this page?",
    options: ["A captive portal", "802.1X authentication", "A reverse proxy", "A screened subnet"],
    answer: 0,
    explanation:
      "A captive portal holds a newly connected device's traffic until the user completes a step in the browser, here entering a library card number, and then lets it through; it works on wired networks as well as Wi-Fi. 802.1X authenticates a device or user through a RADIUS server before the port passes traffic at all, with no web page involved, a reverse proxy sits in front of servers, and a screened subnet is a network zone for public-facing systems.",
  },
  {
    key: "s8-4.1-rate-limit-1",
    objective: "4.1",
    topic: "rate-limiting requests",
    difficulty: 2,
    question:
      "When concert tickets go on sale, bots refresh a ticketing site's search page hundreds of times a second from a small group of addresses, slowing it for real buyers. Which feature limits this without shutting buyers out?",
    options: [
      "Port mirroring of web traffic to an IDS sensor",
      "Data loss prevention rules",
      "Rate limiting of requests per client",
      "Code signing of the site's pages",
    ],
    answer: 2,
    explanation:
      "Rate limiting caps how many requests each client can make in a time window, so the bots' flood is slowed or rejected while people, who make a few requests each, carry on buying. Port mirroring only copies traffic for monitoring, DLP looks for sensitive data leaving the organization, and code signing proves who published code; none of them limits request volume.",
  },

  // ---- 4.3 Vulnerability management ----
  {
    key: "s8-4.3-ipam-1",
    objective: "4.3",
    topic: "IP address management (IPAM)",
    difficulty: 2,
    question:
      "A vulnerability management team suspects its scans are missing systems, because the scanner's target list was written two years ago. Which tool would BEST show every subnet and address actually in use, so the scan scope can be corrected?",
    options: [
      "IP address management (IPAM)",
      "A packet analyzer",
      "A SIEM correlation rule",
      "A bug bounty program",
    ],
    answer: 0,
    explanation:
      "IPAM tracks the organization's address space, its subnets, DHCP scopes and leases, and DNS records, so it shows what's actually allocated and in use. Comparing that with the scan scope reveals subnets and hosts that are never scanned. A packet analyzer captures traffic on one link at a time, a SIEM rule raises alerts from logs, and a bug bounty pays outside researchers for findings; none of them maps the whole address space.",
  },
  {
    key: "s8-4.3-cspm-1",
    objective: "4.3",
    topic: "cloud security posture management (CSPM)",
    difficulty: 2,
    question:
      "A security lead asks why the vulnerability scanner, which signs in to each cloud virtual machine to check its software, didn't report that an administrator role in the company's cloud account had been granted to an outside user. Which tool covers this gap?",
    options: [
      "Source code review",
      "Cloud security posture management (CSPM)",
      "IP address management (IPAM)",
      "A packet analyzer on the VPN gateway",
    ],
    answer: 1,
    explanation:
      "CSPM reads the cloud platform's own configuration through the provider's APIs, including identity and access settings, networking, storage and logging, and continuously compares it with security standards, so a risky role assignment is flagged as a misconfiguration. A scanner that signs in to virtual machines sees their software and patches, not the account's settings. Source code review examines application code, IPAM tracks address space, and a packet analyzer captures traffic.",
  },
  {
    key: "s8-4.3-code-review-1",
    objective: "4.3",
    topic: "source code review",
    difficulty: 3,
    question:
      "Static analysis of a web application reports no issues. In a manual source code review, a reviewer notices that the function approving refunds checks that the user is signed in, but never checks that the user is a manager. Why did the review find what the tool missed?",
    options: [
      "Static analysis can only read compiled binaries, never the source code itself",
      "Manual reviews run the application, while static analysis never does",
      "A missing business rule is a logic flaw that needs someone who knows the app",
      "Static analysis tools only check code written in the latest release",
    ],
    answer: 2,
    explanation:
      "Automated tools are good at known patterns, such as injection or unsafe functions, but they don't know the business rule that only managers may approve refunds, so a missing authorization check looks like valid code. A reviewer who understands what the application is meant to do can spot it. Static analysis does read source code and can scan all of it, and neither static analysis nor a manual code review runs the application; that's dynamic testing.",
  },
  {
    key: "s8-4.3-pentest-report-1",
    objective: "4.3",
    topic: "penetration test report review",
    difficulty: 3,
    question:
      "Penetration testers chained three medium-rated flaws on production servers to gain domain administrator rights. Their write-up also rates a flaw on an isolated test server as critical. The team can fix only one set this week. Which should it choose?",
    options: [
      "The critical finding, because the ratings alone set the order",
      "Breaking the chain of medium findings that reached domain administrator",
      "Whichever findings are quickest to fix, to close the most items",
      "Nothing, until the testers have retested every finding",
    ],
    answer: 1,
    explanation:
      "Reviewing a penetration test report means reading the findings in context, not just by their individual ratings. The three medium findings were shown to work together against production and reach the highest privilege, so breaking any link in that chain removes a proven path to the domain. The critical flaw on an isolated test server matters less here, closing the easy items first improves the count rather than the risk, and retesting comes after the fixes, to verify them.",
  },
  {
    key: "s8-4.3-disclosure-1",
    objective: "4.3",
    topic: "responsible disclosure",
    difficulty: 2,
    question:
      "A researcher privately reports a serious flaw in a company's mobile app under the company's responsible disclosure policy. What is the company expected to do?",
    options: [
      "Threaten legal action unless the researcher signs a lifelong NDA",
      "Ignore the report until the flaw is actually exploited in the wild",
      "Ask the researcher to publish every detail right away, before any fix",
      "Acknowledge it, fix the flaw promptly and coordinate any publication",
    ],
    answer: 3,
    explanation:
      "Responsible disclosure is a two-way commitment: the researcher reports privately and allows time for a fix, and the organization acknowledges the report, keeps the researcher informed, fixes the flaw in a reasonable time and coordinates publication, often crediting the researcher. Legal threats push researchers to publish without warning, ignoring a report leaves customers exposed, and publishing before a fix arms attackers.",
  },
  {
    key: "s8-4.3-bounty-1",
    objective: "4.3",
    topic: "bug bounty programs",
    difficulty: 1,
    question:
      "A game studio publishes a page listing the online services anyone may test, the rules for testing them and a reward table: $500 for an account takeover flaw and $5,000 for remote code execution. What has it set up?",
    options: [
      "A bug bounty program",
      "A penetration test",
      "A tabletop exercise",
      "An external audit",
    ],
    answer: 0,
    explanation:
      "A bug bounty program invites outside researchers to test published, in-scope services under set rules and pays rewards for valid findings, often scaled by severity. A penetration test is a scoped engagement by a contracted team for a set period, a tabletop exercise walks people through a scenario in discussion, and an external audit checks compliance with a standard or regulation.",
  },
  {
    key: "s8-4.3-verification-1",
    objective: "4.3",
    topic: "verification",
    difficulty: 2,
    question:
      "A team deploys a fix for a SQL injection flaw in its customer portal and closes the ticket the same afternoon. A month later, an outside penetration tester exploits the same flaw on the same page. Which vulnerability management step would have caught this before the tester did?",
    options: [
      "Severity assessment of the flaw",
      "External reporting",
      "Asset acquisition",
      "Verification of the fix",
    ],
    answer: 3,
    explanation:
      "Verification confirms that a fix actually works, by rescanning or retesting the flaw before the ticket is closed. Here the team closed the ticket without confirming the fix, so nobody knew the flaw was still open until the tester found it. Severity assessment ranks a flaw before it's fixed, external reporting tells parties outside the organization, and acquisition is how assets are bought; none of them checks that a fix worked.",
  },
  {
    key: "s8-4.3-reporting-1",
    objective: "4.3",
    topic: "internal and external reporting",
    difficulty: 2,
    question:
      "The CISO wants a monthly vulnerability report for the executive team. Which content suits this internal report BEST?",
    options: [
      "Raw scanner output listing every finding on every host, sorted by IP address",
      "Trends in open critical findings and fix times against agreed targets",
      "Each analyst's working notes from the month's scans",
      "Exploit code for the most serious findings",
    ],
    answer: 1,
    explanation:
      "Internal reporting to leadership should show risk and progress in terms executives can act on: how many critical vulnerabilities remain open, how long fixes take against agreed targets, and how that's trending. Raw scanner output and analysts' notes belong with the teams doing the work, and exploit code adds risk without helping anyone decide anything.",
  },
  {
    key: "s8-4.3-reporting-2",
    objective: "4.3",
    topic: "internal and external reporting",
    difficulty: 3,
    question:
      "While investigating an incident, a company discovers that a firewall model it runs has an unknown flaw that lets attackers bypass authentication. No patch or advisory exists yet. What is the appropriate external reporting step?",
    options: [
      "Post the details on social media at once to warn the vendor's other customers",
      "Wait until another company reports it",
      "Report it privately to the vendor, or through a coordinator such as a CERT",
      "Patch the firmware in-house and tell no one",
    ],
    answer: 2,
    explanation:
      "A new flaw in someone else's product should be reported privately to the vendor, which can fix it for every customer; if the vendor doesn't respond, a coordinator such as a national CERT can help. Posting the details publicly hands attackers a way in before a patch exists, waiting leaves everyone exposed, and a private in-house fix, even if it were possible, leaves every other customer exposed.",
  },

  // ---- 4.4 Alerting and monitoring ----
  {
    key: "s8-4.4-nms-1",
    objective: "4.4",
    topic: "network management systems",
    difficulty: 1,
    question:
      "A network team wants graphs of bandwidth use and error counts for every WAN link and core interface over the past year, so it can see which links are nearing capacity before users notice. What should it use?",
    options: [
      "A network management system (NMS)",
      "A packet analyzer",
      "A data loss prevention system",
      "A vulnerability scanner",
    ],
    answer: 0,
    explanation:
      "A network management system collects performance and health data from network devices, usually over SNMP, and keeps the history, so the team can graph utilization and errors and plan capacity. A packet analyzer decodes individual packets on one link at a time, DLP watches for sensitive data leaving the organization, and a vulnerability scanner looks for known flaws rather than measuring performance.",
  },
  {
    key: "s8-4.4-packet-analyzer-1",
    objective: "4.4",
    topic: "packet analyzers",
    difficulty: 2,
    question:
      "An analyst needs to confirm whether a legacy application sends user credentials across the network in cleartext. Which tool shows the actual contents of the traffic?",
    options: [
      "A NetFlow collector",
      "A packet analyzer",
      "An SNMP-based network monitor",
      "A CSPM tool",
    ],
    answer: 1,
    explanation:
      "A packet analyzer, such as Wireshark, captures packets and decodes each protocol layer, so the analyst can read the payload and see whether a username and password cross the network in cleartext. NetFlow records summarize conversations (who talked to whom, when and how much) without payloads, SNMP reports device status and counters, and CSPM checks cloud configurations.",
  },
  {
    key: "s8-4.4-scap-1",
    objective: "4.4",
    topic: "Security Content Automation Protocol (SCAP)",
    difficulty: 3,
    question:
      "A government agency must check 2,000 servers against a published hardening checklist and report the results in a standard format, using machine-readable content that any validated tool can process. Which standard is built for this?",
    options: [
      "Simple Network Management Protocol (SNMP)",
      "Syslog",
      "IP Flow Information Export (IPFIX)",
      "Security Content Automation Protocol (SCAP)",
    ],
    answer: 3,
    explanation:
      "SCAP is NIST's suite of specifications for expressing security checklists and checks in machine-readable form, such as XCCDF for checklists and OVAL for testing a system's state, so tools from different vendors can run the same content and report results consistently. SNMP monitors and manages network devices, syslog carries log messages, and IPFIX exports traffic flow records.",
  },
  {
    key: "s8-4.4-syslog-1",
    objective: "4.4",
    topic: "syslog",
    difficulty: 3,
    question:
      "Network devices send their logs to a central collector with syslog. To cut noise, each device forwards only messages at severity Warning or more severe. Which message will NOT reach the collector?",
    options: [
      "An Error message saying a power supply failed",
      "A Critical message about a failed fan",
      "An Informational message saying a user logged in",
      "An Emergency message saying the system is unusable",
    ],
    answer: 2,
    explanation:
      "Syslog severities run from 0, Emergency, the most severe, through Alert, Critical, Error, Warning, Notice and Informational, to 7, Debug. Forwarding Warning (4) or more severe sends levels 0 to 4, so Informational (6) messages such as routine logins are dropped, along with Notice and Debug. Emergency, Critical and Error are all more severe than Warning, so those messages are forwarded.",
  },
  {
    key: "s8-4.4-port-mirroring-1",
    objective: "4.4",
    topic: "port mirroring",
    difficulty: 2,
    question:
      "An engineer wants a capture appliance to record all traffic between the office's IP phones and its call server for troubleshooting, without adding any device to the cabling. Which switch feature fits, and what limitation should the engineer plan for?",
    options: [
      "Port mirroring; copies can drop if the monitor port is oversubscribed",
      "An inline IPS; if that device fails, all the phone traffic could stop entirely",
      "Link aggregation; the phones must be rebooted to join the bundle",
      "Rate limiting; calls slow down to the appliance's speed",
    ],
    answer: 0,
    explanation:
      "Port mirroring (SPAN) has the switch copy traffic from chosen ports or VLANs to a monitoring port, so the appliance sees it without being in the path. The copy is best effort: if mirrored traffic exceeds the monitor port's capacity, copies are dropped. An inline IPS sits in the traffic's path, which the engineer wants to avoid, link aggregation bundles links for capacity, and rate limiting restricts traffic rather than copying it.",
  },
  {
    key: "s8-4.4-dashboard-1",
    objective: "4.4",
    topic: "dashboards",
    difficulty: 1,
    question:
      "An IT director wants one web page, kept current by the monitoring tools, that shows at a glance how many laptops are missing patches, which backups failed overnight and which certificates expire this month. What should the team build?",
    options: ["A runbook", "A packet capture", "A dashboard", "A syslog server"],
    answer: 2,
    explanation:
      "A dashboard pulls key measures from monitoring tools into one continuously updated view, tailored to its audience, so problems stand out at a glance. A runbook gives step-by-step instructions for a task, a packet capture records raw network traffic, and a syslog server collects log messages without summarizing them.",
  },
  {
    key: "s8-4.4-agentless-1",
    objective: "4.4",
    topic: "agents vs. agentless",
    difficulty: 2,
    question:
      "A team needs to monitor network printers, IP cameras and building management controllers. The vendors don't allow any software to be installed on these devices. Which monitoring approach fits?",
    options: [
      "Agent-based monitoring with an agent built for each device",
      "Agentless monitoring over protocols the devices support, such as SNMP",
      "Endpoint detection and response installed on each device",
      "No monitoring at all, since devices that can't run agents can't be watched",
    ],
    answer: 1,
    explanation:
      "Agentless monitoring collects data remotely over protocols and interfaces a device already offers, such as SNMP, syslog, SSH or vendor APIs, so nothing has to be installed, which suits appliances and IoT devices that can't run extra software. The trade-offs are less detail than an agent gives and the need for network reach and credentials. Building agents isn't possible when the vendor forbids installing software, EDR is itself an agent, and these devices can still be monitored without one.",
  },
  {
    key: "s8-4.4-agents-1",
    objective: "4.4",
    topic: "agents vs. agentless",
    difficulty: 2,
    question:
      "A company's sales staff spend most of their time traveling, and their laptops are rarely connected to the corporate network. The security team wants to keep collecting detailed activity data from those laptops wherever they are. Which approach suits BEST?",
    options: [
      "Agentless scans from a server in the head office",
      "SNMP polling from the network management system",
      "Monthly manual log reviews when the laptops come back",
      "An agent on each laptop that reports to a cloud console",
    ],
    answer: 3,
    explanation:
      "An agent runs on the device itself, so it can collect detailed data and keep working off the corporate network, sending it to a cloud console whenever the laptop has internet access. Agentless scans and SNMP polling only reach devices the collector can connect to, which these laptops rarely are, and monthly manual reviews leave long gaps and miss anything cleared in the meantime.",
  },
  {
    key: "s8-4.4-benchmark-1",
    objective: "4.4",
    topic: "benchmarks",
    difficulty: 2,
    question:
      "A monitoring tool compares the settings on every Windows server against the CIS Benchmark each night and reports any server that has drifted from it. In this setup, what role does the benchmark play?",
    options: [
      "It's the reference configuration that settings are measured against",
      "It's the log format the servers use to send their events to the console",
      "It encrypts the reports sent to the console",
      "It's the agent that collects the settings",
    ],
    answer: 0,
    explanation:
      "A benchmark, such as a CIS Benchmark, is a published set of secure configuration recommendations, so monitoring tools use it as the yardstick: each server's settings are compared with it and any difference is reported. It isn't a log format, an encryption method or a collection agent; tools do the collecting and reporting, and the benchmark defines what correct looks like.",
  },
  {
    key: "s8-4.4-alert-tuning-1",
    objective: "4.4",
    topic: "alert tuning",
    difficulty: 3,
    question:
      "To silence a flood of alerts, an analyst tunes a SIEM rule to suppress every alert from the subnet where the vulnerability scanners live. What risk does this create?",
    options: [
      "The scanners will run more slowly",
      "The SIEM will need more log storage",
      "Real attacks from that subnet will go unnoticed",
      "Every other subnet's alerts become false positives",
    ],
    answer: 2,
    explanation:
      "Tuning should cut false positives without creating false negatives. Suppressing everything from a subnet means a real attack from it goes unseen, for example by an intruder who takes over a scanner, which holds credentials and broad network reach. Narrower tuning, such as suppressing only the scanners' expected activity during scheduled scan windows, keeps that visibility. Suppression doesn't change scan speed, add log storage or affect other subnets' alerts.",
  },

  // ---- 4.5 Identity and access management ----
  {
    key: "s8-4.5-passkey-1",
    objective: "4.5",
    topic: "passkeys",
    difficulty: 3,
    question:
      "An online retailer moves its customers to passkeys. Months later, attackers steal a full copy of the retailer's authentication database. Why can't they use it to sign in as customers?",
    options: [
      "It holds only public keys; the private keys stay with the customers",
      "Passkeys are encrypted with each customer's password before being stored",
      "The database deletes itself when a breach is detected",
      "Passkeys expire every 24 hours",
    ],
    answer: 0,
    explanation:
      "A passkey is a key pair: the private key stays with the user, on their device or in their password manager, and the service stores only the public key, which can check a signature but can't create one. A stolen database therefore holds no secret that lets anyone sign in. Passkeys don't rely on passwords, databases don't delete themselves when stolen, and passkeys don't expire daily.",
  },
  {
    key: "s8-4.5-backup-code-1",
    objective: "4.5",
    topic: "backup codes",
    difficulty: 2,
    question:
      "An employee who travels often has used three of the ten backup codes issued when their MFA was set up. Which statement is accurate?",
    options: [
      "The three used codes start working again automatically after 30 days",
      "Each code can be used once per device, so all ten still work",
      "Using backup codes turns off MFA on the account until it's reset",
      "Those three no longer work, and a new set can be generated when needed",
    ],
    answer: 3,
    explanation:
      "Backup codes are single-use: each one stops working once it's used, so the employee has seven left, and generating a new set, which services such as Google allow at any time, replaces the old set entirely. Used codes don't come back, the one-use limit belongs to the code rather than the device, and using a backup code doesn't switch MFA off; it stands in for the second factor that one time.",
  },
  {
    key: "s8-4.5-passwordless-1",
    objective: "4.5",
    topic: "passwordless",
    difficulty: 3,
    question:
      "A company replaces passwords with Windows Hello for Business: employees sign in with a fingerprint or a PIN. An employee worries that a six-digit PIN is weaker than their old 16-character password. Why isn't the PIN the same risk?",
    options: [
      "It's stored on the domain controller in encrypted form",
      "It unlocks a key in that device's TPM and is never sent to any server",
      "It changes automatically every day",
      "It works on any of the company's computers, so it's backed up centrally",
    ],
    answer: 1,
    explanation:
      "In this passwordless setup the PIN is local: it unlocks a private key held in the device's TPM, the key signs the sign-in, and the PIN itself is never sent to or stored on any server. Someone who learns it would also need that particular device, and the TPM locks out repeated guesses. A PIN stored on a domain controller or usable on every computer would behave like a password, which is exactly what the design avoids, and it doesn't change daily.",
  },
  {
    key: "s8-4.5-time-based-1",
    objective: "4.5",
    topic: "time-based access",
    difficulty: 2,
    question:
      "A tax firm hires seasonal staff each year. Their access to the client records system should run only from February 1 to April 30 and end automatically, without anyone having to remember to remove it. Which access control model provides this?",
    options: [
      "Discretionary access control",
      "Just-in-time access",
      "Time-based access control",
      "Mandatory access control",
    ],
    answer: 2,
    explanation:
      "Time-based access control grants or denies access by time: hours of the day, days of the week or, as here, a date range, so the seasonal staff lose access on April 30 without depending on anyone to remove it. Just-in-time access grants elevated rights on request for a short task, such as an hour on a server, then removes them; discretionary access control lets a resource's owner decide who may use it; and mandatory access control compares classification labels with clearances.",
  },

  // ---- 4.6 Automation, orchestration and AI ----
  {
    key: "s8-4.6-agentic-1",
    objective: "4.6",
    topic: "agentic AI",
    difficulty: 2,
    question:
      "Handed a list of newly published flaws, an AI system works out which servers run the affected software, opens change tickets and schedules patch windows on its own, asking a person only to approve production changes. Which AI capability is this?",
    options: ["A chatbot", "Agentic AI", "Predictive analysis", "AI-augmented baselines"],
    answer: 1,
    explanation:
      "Agentic AI takes a goal and carries out a multi-step task with tools on its own, deciding the steps as it goes; requiring a person's approval for production changes is a sensible guardrail. A chatbot answers questions in conversation, predictive analysis forecasts what's likely to happen from past data, and AI-augmented baselines learn what normal activity looks like so deviations stand out.",
  },
  {
    key: "s8-4.6-chatbot-1",
    objective: "4.6",
    topic: "chatbots",
    difficulty: 1,
    question:
      "A company wants an AI tool that answers staff questions about its security policies in conversation, and that has no ability to act in any system. Which AI capability fits?",
    options: ["Agentic AI", "AI-augmented baselines", "Predictive analysis", "A chatbot"],
    answer: 3,
    explanation:
      "A chatbot holds a conversation and answers questions, here about policy, without taking actions in other systems, which fits a tool that must never change anything. Agentic AI is the opposite: it plans and carries out tasks with tools. AI-augmented baselines learn what normal activity looks like, and predictive analysis forecasts what's likely to happen.",
  },
  {
    key: "s8-4.6-predictive-1",
    objective: "4.6",
    topic: "predictive analysis",
    difficulty: 2,
    question:
      "A SOC manager uses a model trained on three years of alert and staffing data to forecast how many alerts will arrive each week next quarter, then plans analyst shifts around the busiest weeks. Which AI capability is this?",
    options: ["Predictive analysis", "A chatbot", "Desired state management", "Agentic AI"],
    answer: 0,
    explanation:
      "Predictive analysis uses patterns in historical data to estimate what is likely to happen next, here how many alerts each week will bring, so the SOC can staff for it in advance. A chatbot answers questions in conversation, desired state management automatically corrects configuration drift, and agentic AI carries out multi-step tasks with tools on its own.",
  },
  {
    key: "s8-4.6-ai-baseline-1",
    objective: "4.6",
    topic: "AI-augmented baselines",
    difficulty: 3,
    question:
      "A static alert fires every month-end when the finance servers run heavy batch jobs, and analysts have learned to ignore it. The team wants a system that learns each server's normal activity, including month-end peaks, and flags only activity that is unusual for that server at that time. Which AI capability fits?",
    options: ["Agentic AI", "A chatbot", "Ticket management", "AI-augmented baselines"],
    answer: 3,
    explanation:
      "AI-augmented baselines use machine learning to model normal behavior for each system, user or period and keep updating it, so expected spikes such as month-end batch runs stop raising alerts while real deviations still do. A fixed threshold can't tell a month-end peak from an attack. Agentic AI carries out multi-step tasks with tools, a chatbot converses with users, and ticket management tracks work items.",
  },

  // ---- 4.7 Incident response ----
  {
    key: "s8-4.7-pir-1",
    objective: "4.7",
    topic: "post-incident reporting",
    difficulty: 2,
    question:
      "Six months after a breach, an auditor wants to confirm that every corrective action the company committed to has been completed. Which record should list those actions with their owners and due dates?",
    options: [
      "The incident response playbook",
      "The post-incident report",
      "The chain of custody form",
      "The legal hold notice",
    ],
    answer: 1,
    explanation:
      "A post-incident report records what happened, why, what it cost and what will change, with an owner and a due date for each corrective action, so it's the record leadership and auditors use to check that committed actions were completed. A playbook guides the response before and during an incident, a chain of custody form tracks who handled each piece of evidence, and a legal hold notice tells people to preserve data for litigation.",
  },
  {
    key: "s8-4.7-negotiation-1",
    objective: "4.7",
    topic: "negotiation",
    difficulty: 3,
    question:
      "During a ransomware incident at a U.S. company, executives consider paying the ransom for a decryption key and ask what the U.S. Treasury's Office of Foreign Assets Control (OFAC) says about it. Which statement reflects OFAC's guidance?",
    options: [
      "Paying is lawful in every case once law enforcement has been told",
      "Sanctions rules bind only banks, so the company itself carries no risk",
      "Paying a sanctioned group can breach sanctions, even unknowingly",
      "Paying guarantees the attackers will delete any data they stole",
    ],
    answer: 2,
    explanation:
      "OFAC's 2021 advisory warns that paying a ransom to a sanctioned person or group can violate U.S. sanctions under strict liability, so a company can be liable without knowing who it paid, and that reporting the attack promptly to law enforcement and cooperating is a significant mitigating factor. The U.S. government strongly discourages paying at all, which is why negotiation decisions involve legal counsel and law enforcement. Telling law enforcement doesn't make a payment lawful, the rules aren't limited to banks, and paying guarantees nothing, including deletion of stolen data.",
  },
  {
    key: "s8-4.7-internal-advisory-1",
    objective: "4.7",
    topic: "internal and external advisories",
    difficulty: 2,
    question:
      "Several staff report a convincing email that impersonates the payroll team and asks for bank details. The security team confirms a campaign is targeting the company and sends a notice to all employees describing the email, telling them not to respond and asking them to report any copies. Which incident response activity is this?",
    options: ["An internal advisory", "An external advisory", "Eradication", "Root cause analysis"],
    answer: 0,
    explanation:
      "An internal advisory is a notice an organization issues to its own people about a threat it has identified, so they can recognize it, avoid it and report more examples, which also helps the team find who else was targeted. An external advisory comes from outside, such as from a vendor or a government agency; eradication removes the threat from systems; and root cause analysis comes after the incident, to find why it happened.",
  },
  {
    key: "s8-4.7-external-advisory-1",
    objective: "4.7",
    topic: "internal and external advisories",
    difficulty: 2,
    question:
      "A national cybersecurity agency warns that attackers are phoning company help desks while posing as employees, to get MFA reset on their accounts. Reviewing last month's resets, the help desk finds two approved for callers who failed identity checks, and the security team opens an incident. In incident response terms, what was the agency's warning?",
    options: [
      "It was the post-incident report for an earlier breach",
      "It was the company's own internal advisory to its staff",
      "It removed the need for containment, since the scam is now widely known",
      "It was an external advisory that helped identify the incident",
    ],
    answer: 3,
    explanation:
      "An external advisory is a warning from outside the organization, such as a government agency or a vendor, and acting on it, here by reviewing recent MFA resets, can identify an incident the company hadn't detected. It isn't a post-incident report, which an organization writes after an incident, or an internal advisory, which it issues to its own staff, and finding a match makes containment more urgent, not unnecessary.",
  },

  // ---- 4.8 Data and sources for investigations ----
  {
    key: "s8-4.8-bit-level-1",
    objective: "4.8",
    topic: "bit-level copies",
    difficulty: 2,
    question:
      "A court will let the defense's expert repeat every step of the analysis of a USB drive taken as evidence, so the investigator needs a duplicate that matches the original exactly. Which acquisition method fits?",
    options: [
      "A logical copy of the drive's folders",
      "A bit-level copy of the entire drive",
      "Photographs of each file shown on screen",
      "A copy of the files named in the case notes",
    ],
    answer: 1,
    explanation:
      "A bit-level copy duplicates every bit on the media, so it matches the original exactly, which hashing can show, and anyone can repeat the analysis on another copy and get the same results. A logical copy captures only the current files and folders, and photographs or a chosen set of files capture far less.",
  },
  {
    key: "s8-4.8-bit-level-2",
    objective: "4.8",
    topic: "bit-level copies",
    difficulty: 3,
    question:
      "An investigator duplicates a suspect drive through a write blocker. How can the investigator show that the duplicate is identical to the original, and that duplicating it didn't change the original?",
    options: [
      "Compare the number of files on both drives",
      "Check that both drives report the same capacity",
      "Have a second investigator watch the whole imaging process and sign off",
      "Hash the original before and after imaging, hash the copy, and compare",
    ],
    answer: 3,
    explanation:
      "Hashing the original before imaging, the copy afterward and the original again, then showing that all three values match, proves the copy is exact and the original unchanged, since a change to a single bit would change the hash. Matching file counts or capacities can hide differences in content, and a witness helps with chain of custody but can't prove two drives hold the same bits.",
  },
  {
    key: "s8-4.8-ipfix-1",
    objective: "4.8",
    topic: "IP Flow Information Export (IPFIX)",
    difficulty: 3,
    question:
      "A company's routers and firewalls come from three vendors. Its investigators want every device to export flow records in one open, standardized format that can carry custom fields, so a single collector can store them for investigations. Which protocol fits?",
    options: [
      "IP Flow Information Export (IPFIX)",
      "Syslog over UDP",
      "Simple Network Management Protocol (SNMP)",
      "Full packet capture",
    ],
    answer: 0,
    explanation:
      "IPFIX is the IETF's standard protocol for exporting flow records, developed from Cisco's NetFlow version 9. Devices describe the fields they send in templates, so different vendors' devices can export the fields they support to one collector. Syslog carries log messages rather than flow records, SNMP reads device status and counters, and full packet capture stores whole packets, far more data than flow records.",
  },
  {
    key: "s8-4.8-memory-dump-1",
    objective: "4.8",
    topic: "memory dumps",
    difficulty: 2,
    question:
      "A laptop seized during an investigation is still running and unlocked, and its drive uses full disk encryption. Before shutting it down, the investigator captures its RAM. What might this memory dump hold that would be lost at power-off?",
    options: [
      "The encrypted contents of the whole drive, ready to copy and analyze later",
      "Files the user deleted from the drive last month, with their old names",
      "Running processes, open connections and the disk's encryption key",
      "The laptop's purchase date and warranty status",
    ],
    answer: 2,
    explanation:
      "RAM holds the live state of a running system: processes, network connections, logged-in sessions and, while an encrypted drive is unlocked, the key that decrypts it. All of it is lost when the power goes off, and without the key the drive may be unreadable, which is why memory is captured first. The drive's contents and deleted files stay on the disk, so a disk image covers them, and purchase records live in the asset inventory.",
  },
  {
    key: "s8-4.8-log-parsing-1",
    objective: "4.8",
    topic: "log parsing",
    difficulty: 2,
    question:
      "An analyst is building a timeline from a firewall that logs in UTC, a web server that logs in local time with a different date format, and a cloud service that logs in JSON. Before correlating the events, what should the analyst do while parsing them?",
    options: [
      "Sort each source's events alphabetically",
      "Normalize the fields, putting every timestamp in one time zone and format",
      "Delete the events that don't share a format",
      "Keep only the cloud service's logs, since JSON is the easiest format to read",
    ],
    answer: 1,
    explanation:
      "Log parsing extracts fields such as time, source, user and action from each format and normalizes them; converting every timestamp to one time zone and format lets events from different systems line up in the right order. Sorting alphabetically scrambles the sequence, and deleting or ignoring sources throws away evidence that may be the key to the timeline.",
  },
];
