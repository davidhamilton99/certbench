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
      "Staff notice a new Wi-Fi network in the office that uses the company's network name. It turns out someone connected an access point to a network port under a desk. The company wants rogue access points like this detected and contained automatically in future, including by disconnecting clients from them over the air. Which control should it deploy?",
    options: [
      "A host-based intrusion prevention system on every laptop",
      "A web application firewall",
      "A wireless intrusion prevention system (WIPS)",
      "A captive portal on the guest network",
    ],
    answer: 2,
    explanation:
      "A WIPS uses radio sensors to watch the airwaves, spot rogue and look-alike access points and contain them, for example by telling clients to disconnect from a rogue AP or by having the wired switch block the port it's plugged into. A HIPS protects individual hosts, a WAF protects web applications from malicious HTTP requests, and a captive portal only makes guests accept terms or sign in before using a network.",
  },
  {
    key: "s8-4.1-utm-1",
    objective: "4.1",
    topic: "unified threat management (UTM)",
    difficulty: 2,
    question:
      "A 30-person accounting office has no dedicated security staff. It wants one appliance at its internet connection that provides a firewall, intrusion prevention, gateway malware scanning, web filtering and VPN access, managed from a single console. Which solution fits, and what is its main trade-off?",
    options: [
      "Unified threat management; one box can bottleneck or fail as a unit",
      "A web application firewall; it needs a rule for each application",
      "A network tap; it can't decrypt VPN traffic",
      "A jump server; users must sign in twice",
    ],
    answer: 0,
    explanation:
      "A UTM appliance combines a firewall with intrusion prevention, malware scanning, web filtering and VPN in one device and one console, which suits a small office without security staff. The trade-off is that every function shares the same hardware: performance can drop with all of them turned on, and if the device fails, every function fails together. A WAF protects web applications only, a tap passively copies traffic for monitoring and blocks nothing, and a jump server is a hardened host for administrative access.",
  },
  {
    key: "s8-4.1-secrets-1",
    objective: "4.1",
    topic: "secrets scanning",
    difficulty: 2,
    question:
      "A developer copies a payment provider's live API token into a test script to get a failing test working, then runs git push. The company wants pushes like this stopped before the token is stored in the shared repository. Which control does this?",
    options: [
      "Code signing of every release build",
      "Static code analysis in the nightly build",
      "A web application firewall in front of the app",
      "Secrets scanning with push protection",
    ],
    answer: 3,
    explanation:
      "Secrets scanning looks for credentials such as API keys, tokens and passwords in code, and with push protection the repository refuses a push that contains one, before it's stored. A nightly static analysis run happens after the code is already in the repository, code signing proves who published a build and that it hasn't been altered, and a WAF filters web requests to a running application.",
  },
  {
    key: "s8-4.1-secrets-2",
    objective: "4.1",
    topic: "secrets scanning",
    difficulty: 3,
    question:
      "Secrets scanning flags a database password that was committed to a public repository three days ago. What should the team do FIRST?",
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
      "A SOC sees a phishing alert in the email gateway's console, a suspicious process alert in the EDR console and an impossible-travel sign-in in the identity provider's console, and analysts spend hours linking them by hand. Which solution would correlate these signals into one incident and coordinate a response across email, endpoints and identities?",
    options: [
      "Antivirus with daily signature updates",
      "Extended detection and response (XDR)",
      "Data loss prevention (DLP)",
      "Endpoint detection and response (EDR) on its own",
    ],
    answer: 1,
    explanation:
      "XDR extends detection and response beyond the endpoint: it gathers signals from endpoints, email, identities and cloud apps, joins related alerts into one incident and can act across them, for example removing the phishing email from every mailbox while isolating the laptop. EDR on its own sees only endpoints, antivirus blocks known malware on a single host, and DLP watches for sensitive data leaving the organization.",
  },
  {
    key: "s8-4.1-canary-1",
    objective: "4.1",
    topic: "canary accounts",
    difficulty: 2,
    question:
      "A security team creates a domain account named backup-admin with a convincing description, but no person or process ever uses it. Any attempt to authenticate as it raises a high-priority alert. What is this account?",
    options: [
      "A group Managed Service Account",
      "An emergency access account",
      "A honeyfile",
      "A canary account",
    ],
    answer: 3,
    explanation:
      "A canary account is a decoy account with no legitimate use, so any sign-in attempt, or any use of its credentials, signals an intruder trying accounts or credentials they've harvested. A gMSA is a real service account whose password Windows manages, an emergency access account is a real but rarely used account kept for when normal sign-in fails, and a honeyfile is a decoy file rather than an account.",
  },
  {
    key: "s8-4.1-captive-portal-1",
    objective: "4.1",
    topic: "captive portals",
    difficulty: 1,
    question:
      "When guests join a conference center's Wi-Fi, every web request is redirected to a page where they must accept the acceptable use policy and enter the code printed on their badge before they can reach the internet. What is this page?",
    options: ["A captive portal", "802.1X authentication", "A reverse proxy", "A screened subnet"],
    answer: 0,
    explanation:
      "A captive portal holds a newly connected device's traffic until the user completes a step in the browser, such as accepting terms or entering credentials or a code, and then lets it through. It controls admission but doesn't encrypt anything, so guests should still rely on TLS or a VPN. 802.1X authenticates a device or user through a RADIUS server before it's admitted at all, with no web page involved, a reverse proxy sits in front of servers, and a screened subnet is a network zone for public-facing systems.",
  },
  {
    key: "s8-4.1-rate-limit-1",
    objective: "4.1",
    topic: "rate-limiting requests",
    difficulty: 2,
    question:
      "A company's login API is receiving thousands of password attempts a minute, spread across many accounts but coming from a small set of IP addresses. The team wants its web application firewall to slow this down without locking out legitimate users who mistype a password once or twice. Which feature should it configure?",
    options: [
      "Port mirroring to an IDS sensor",
      "Data loss prevention rules",
      "Rate limiting of requests per client",
      "Code signing of the login page",
    ],
    answer: 2,
    explanation:
      "Rate limiting caps how many requests a client can make in a time window, for example ten login attempts per minute from one IP address, so automated guessing slows to a crawl while a person who mistypes a password is unaffected. Port mirroring copies traffic for monitoring without stopping anything, DLP looks for sensitive data leaving the organization, and code signing proves who published code.",
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
      "A penetration test report lists a critical-rated flaw on an isolated test server, and three medium-rated findings on production systems that the testers chained together to reach domain administrator. The team can fix only one set this week. What should a review of the report lead it to prioritize?",
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
      "A researcher finds a flaw in a company's mobile app that exposes customer data. Following responsible disclosure, what should the researcher do?",
    options: [
      "Publish the details at once so customers can protect themselves",
      "Sell the details to a broker who has promised to pass them on to the company",
      "Download as much customer data as possible to prove the impact",
      "Report it privately and allow reasonable time for a fix before publishing",
    ],
    answer: 3,
    explanation:
      "Responsible disclosure means reporting a flaw privately to the organization that can fix it, giving it a reasonable time to do so, and only then publishing, often in coordination with it. Publishing at once arms attackers before a fix exists, selling the details puts them in unknown hands, and downloading customer data goes beyond what any disclosure policy allows and may be illegal.",
  },
  {
    key: "s8-4.3-bounty-1",
    objective: "4.3",
    topic: "bug bounty programs",
    difficulty: 1,
    question:
      "A software company wants outside security researchers to keep testing its public web services all year, and it pays a reward for each valid, in-scope vulnerability they report. What is this?",
    options: ["A bug bounty program", "A penetration test", "A tabletop exercise", "An external audit"],
    answer: 0,
    explanation:
      "A bug bounty program pays rewards to outside researchers for valid vulnerabilities within a published scope, so testing goes on continuously and with many testers. A penetration test is a scoped engagement by a contracted team for a set period, a tabletop exercise walks people through a scenario in discussion, and an external audit checks compliance with a standard or regulation.",
  },
  {
    key: "s8-4.3-verification-1",
    objective: "4.3",
    topic: "verification",
    difficulty: 2,
    question:
      "A team patches a critical flaw in a web server's TLS library and closes the ticket. The next scheduled scan still reports the flaw, because the service was never restarted and the old library is still loaded. Which vulnerability management step did the team skip?",
    options: ["Severity assessment", "External reporting", "Asset acquisition", "Verification of the fix"],
    answer: 3,
    explanation:
      "Verification confirms that a fix actually worked, usually by rescanning or retesting the system before the ticket is closed, which would have caught the old library still in use. Severity assessment happens before remediation to rank a flaw, external reporting informs parties outside the organization, and acquisition is how assets are bought, not how fixes are checked.",
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
      "A network team wants one system that polls every switch, router and firewall for status and performance, draws a map of the network, and alerts when a device stops responding or an interface goes down. What should it use?",
    options: [
      "A network management system (NMS)",
      "A packet analyzer",
      "A data loss prevention system",
      "A vulnerability scanner",
    ],
    answer: 0,
    explanation:
      "A network management system monitors network devices' health and performance, usually by polling them with SNMP and receiving the traps they send, and shows topology, utilization and alerts in one place. A packet analyzer decodes individual packets on a link, DLP watches for sensitive data leaving, and a vulnerability scanner looks for known flaws rather than watching availability.",
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
      "A security team wants its intrusion detection sensor to see all traffic between servers on one switch, without placing any device in the traffic's path. Which feature should it use, and what limitation should it plan for?",
    options: [
      "Port mirroring; the copy can drop packets when the monitor port is oversubscribed",
      "An inline IPS; if the device fails, traffic between the servers could stop entirely",
      "Link aggregation; the servers must be rebooted to join the bundle",
      "Rate limiting; legitimate traffic slows down to the sensor's speed",
    ],
    answer: 0,
    explanation:
      "Port mirroring (SPAN) has the switch copy traffic from chosen ports or VLANs to a monitoring port, so the sensor sees it without sitting in the path. The copy is best effort: if mirrored traffic exceeds the monitoring port's capacity, packets are dropped from the copy, so a busy network may need a hardware tap or more monitoring ports. An inline IPS sits in the traffic's path, which the team wants to avoid; link aggregation bundles links for capacity; and rate limiting restricts traffic rather than copying it.",
  },
  {
    key: "s8-4.4-dashboard-1",
    objective: "4.4",
    topic: "dashboards",
    difficulty: 1,
    question:
      "The CISO wants a single screen, updated continuously, that shows open critical alerts, patch compliance by business unit and the phishing report rate, so the leadership team can see the security posture at a glance. What should the security team build?",
    options: ["A runbook", "A packet capture", "A dashboard", "A syslog server"],
    answer: 2,
    explanation:
      "A dashboard pulls key metrics from monitoring tools into one continuously updated view, tailored to its audience, here leadership, so trends and problems stand out at a glance. A runbook gives step-by-step instructions for a task, a packet capture records raw traffic, and a syslog server collects log messages but doesn't summarize them.",
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
      "When an employee set up an authenticator app for MFA, the identity provider showed ten backup codes. The employee's phone is now lost. Which statement about the codes is accurate?",
    options: [
      "Any code can be reused until the phone is replaced",
      "Only the help desk is allowed to use the codes",
      "They replace the password, which must be reset after each use",
      "Each code works only once, so a used code can't be replayed",
    ],
    answer: 3,
    explanation:
      "Backup codes are single-use recovery codes issued when MFA is set up: each one works once and then stops working, and services such as Google also cancel the whole set when a new one is generated. They belong to the user and should be kept somewhere other than the phone they back up, such as a password manager on another device or a printed copy stored safely. They stand in for the second factor, not the password, and the help desk doesn't use them.",
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
      "A contractor's account should work only from 8:00 to 18:00 on weekdays for the six months of the contract, and sign-in attempts outside those hours should be refused. Which access control model does this apply?",
    options: [
      "Discretionary access control",
      "Just-in-time access",
      "Time-based access control",
      "Mandatory access control",
    ],
    answer: 2,
    explanation:
      "Time-based access control allows or denies access by time of day, day of the week or date range, so the contractor's account works only during the hours set. Just-in-time access grants elevated rights on request for a short window and then removes them, discretionary access control lets a resource's owner decide who may use it, and mandatory access control compares labels with clearances.",
  },

  // ---- 4.6 Automation, orchestration and AI ----
  {
    key: "s8-4.6-agentic-1",
    objective: "4.6",
    topic: "agentic AI",
    difficulty: 2,
    question:
      "A SOC deploys an AI system that, when an alert arrives, decides on its own which tools to query, pulls evidence from the SIEM and EDR, writes up its findings and can isolate a host or open a ticket without waiting for a person. Which AI capability is this?",
    options: ["A chatbot", "Agentic AI", "Predictive analysis", "AI-augmented baselines"],
    answer: 1,
    explanation:
      "Agentic AI plans and carries out multi-step tasks toward a goal by using tools, here querying systems, gathering evidence and acting, with little human direction. Because it acts on its own, it needs guardrails: only the permissions it requires, human approval for high-impact actions and a log of everything it does. A chatbot answers questions in conversation, predictive analysis forecasts likely events from past data, and AI-augmented baselines learn what normal activity looks like so deviations stand out.",
  },
  {
    key: "s8-4.6-chatbot-1",
    objective: "4.6",
    topic: "chatbots",
    difficulty: 1,
    question:
      "A company adds an AI assistant to its intranet that answers employees' security questions in plain language at any hour, such as how to report a phishing email or request VPN access, and hands the conversation to the help desk when it can't help. Which AI capability is this?",
    options: ["Agentic AI", "AI-augmented baselines", "Predictive analysis", "A chatbot"],
    answer: 3,
    explanation:
      "A chatbot holds a conversation with users and answers their questions, which saves the help desk time on routine requests while staff handle the rest. It doesn't carry out tasks across systems on its own, as agentic AI does, learn what normal activity looks like, as AI-augmented baselines do, or forecast future events, as predictive analysis does.",
  },
  {
    key: "s8-4.6-predictive-1",
    objective: "4.6",
    topic: "predictive analysis",
    difficulty: 2,
    question:
      "A vulnerability team has 4,000 open findings. It starts using a model trained on past exploitation data that estimates how likely each vulnerability is to be exploited in the next 30 days, and fixes the highest-scoring ones first. Which AI capability is the team using?",
    options: ["Predictive analysis", "A chatbot", "Desired state management", "Agentic AI"],
    answer: 0,
    explanation:
      "Predictive analysis uses patterns in historical data to estimate what is likely to happen next, here which vulnerabilities attackers are most likely to exploit soon, so the team can work on those first. A chatbot answers questions in conversation, desired state management automatically corrects configuration drift, and agentic AI carries out multi-step tasks with tools on its own.",
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
      "Two weeks after a ransomware incident is closed, the security team writes a document for executives and the board: a timeline of events, the business impact, the root cause, what worked and what didn't, and corrective actions with owners and due dates. What is this document?",
    options: [
      "A playbook",
      "A post-incident report",
      "A chain of custody form",
      "A legal hold notice",
    ],
    answer: 1,
    explanation:
      "A post-incident report records what happened, why, what it cost and what will change, with owners and dates, so leadership can track the fixes and the organization keeps the lessons. A playbook is written before incidents to guide the response, a chain of custody form tracks who handled each piece of evidence, and a legal hold notice tells people to preserve data for possible litigation.",
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
      "A government cybersecurity agency publishes an advisory that attackers are exploiting a flaw in a VPN appliance to break into networks, and it lists indicators of compromise. A company that runs that appliance searches its logs for the indicators and finds matches from last week. What role did the advisory play in the incident response process?",
    options: [
      "It was the post-incident report for an earlier breach",
      "It was the company's own internal advisory to its staff",
      "It removed the need for containment, since the flaw is public",
      "It was an external advisory that helped identify the incident",
    ],
    answer: 3,
    explanation:
      "An external advisory is a warning from outside the organization, such as a government agency, a vendor or an industry sharing group, and its indicators of compromise let the company search its own data and identify an intrusion it hadn't detected. It isn't a post-incident report, which the company writes after an incident, or an internal advisory, which the company issues to its own staff, and finding matches makes containment more urgent, not unnecessary.",
  },

  // ---- 4.8 Data and sources for investigations ----
  {
    key: "s8-4.8-bit-level-1",
    objective: "4.8",
    topic: "bit-level copies",
    difficulty: 2,
    question:
      "An investigator must recover files a suspect deleted from a laptop's drive, including fragments left in slack space. Which acquisition method preserves that data?",
    options: [
      "A logical copy of the user's folders",
      "A bit-level copy of the entire drive",
      "A screenshot of the desktop",
      "A copy of the files the suspect still has open",
    ],
    answer: 1,
    explanation:
      "A bit-level (bit-stream) copy duplicates every bit on the media, including free space and slack space, where deleted files and fragments remain. A logical copy captures only the files and folders that currently exist, so deleted data is lost, and a screenshot or a copy of open files captures even less.",
  },
  {
    key: "s8-4.8-bit-level-2",
    objective: "4.8",
    topic: "bit-level copies",
    difficulty: 3,
    question:
      "An investigator connects a suspect drive through a write blocker and makes a bit-level copy. How can the investigator show that the copy is identical to the original and that imaging didn't change the original?",
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
      "Responders suspect malware is running only in memory on a server, leaving nothing on disk. Before anyone shuts the server down, they capture its RAM. What can analysis of this memory dump reveal that a disk image can't?",
    options: [
      "The installed applications and the version of each one on the server",
      "Files the user deleted a month ago",
      "Running processes, open connections and keys or data held in memory",
      "The server's purchase date and warranty status",
    ],
    answer: 2,
    explanation:
      "RAM holds the system's live state: running processes, including injected code, open network connections, logged-in sessions, recent commands, and data or encryption keys in use. It's lost when the power goes off, which is why it's captured first. Installed applications and deleted files are on the disk, so a disk image covers them, and purchase records live in the asset inventory, not in memory.",
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
