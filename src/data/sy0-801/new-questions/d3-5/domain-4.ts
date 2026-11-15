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
      "A small company turns on every inspection feature of its unified threat management (UTM) appliance. Internet traffic now slows badly at busy times. What is the MOST likely cause?",
    options: [
      "Every feature shares the one appliance's processing capacity",
      "UTM appliances can't inspect more than one protocol at a time",
      "The web filter is blocking every site during busy periods",
      "Turning on IPS disables the appliance's firewall",
    ],
    answer: 0,
    explanation:
      "A UTM puts several security functions into one device, so they all draw on the same processor and memory; with every inspection feature on, it can become a bottleneck at peak load, and if it fails, every function fails together. Sizing the appliance for the full feature set, or splitting functions across devices, addresses it. UTMs inspect many protocols at once, a web filter blocks categories rather than every site, and turning on IPS doesn't disable the firewall.",
  },
  {
    key: "s8-4.1-secrets-1",
    objective: "4.1",
    topic: "secrets scanning",
    difficulty: 2,
    question:
      "A company turns on secrets scanning for the first time across 200 existing repositories. Why should it scan each repository's full commit history, not just the latest code?",
    options: [
      "Git deletes old commits automatically after 90 days, so history is short",
      "Scanning history is the only way to find ordinary code bugs",
      "Secrets in old commits stop working by themselves, so history holds no risk",
      "A secret removed in a later commit still sits in history and may still work",
    ],
    answer: 3,
    explanation:
      "Deleting a secret in a later commit doesn't remove it from the repository's history, where anyone with access can still read it, and it keeps working until it's revoked. Scanning full histories finds those leftovers so they can be revoked and rotated. Git keeps commits unless someone rewrites history, secrets don't expire just because they're old, and secrets scanning looks for credentials, not general code bugs.",
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
      "At 3 a.m., a canary account that no person or system ever uses records a failed sign-in from a PC at the reception desk. What should the security team conclude?",
    options: [
      "Nothing, because failed sign-ins on canary accounts are routine noise",
      "The canary account's password has expired and needs resetting",
      "The reception PC needs a newer version of its antivirus",
      "Someone on that PC is likely trying accounts, so investigate it now",
    ],
    answer: 3,
    explanation:
      "A canary account has no legitimate use, so any sign-in attempt, failed or not, is a strong sign of an intruder or insider trying accounts, for example from a stolen credential list or a password-spraying run. That makes it a high-confidence alert: investigate the reception PC and who used it. Canary alerts aren't routine noise, the account's password status doesn't matter because nobody should be using it, and nothing points to the antivirus version.",
  },
  {
    key: "s8-4.1-captive-portal-1",
    objective: "4.1",
    topic: "captive portals",
    difficulty: 2,
    question:
      "A coffee shop's guest Wi-Fi is an open, unencrypted network that sends new users to a captive portal to accept terms before they can browse. A customer asks whether that page makes their traffic private from others on the network. What is the accurate answer?",
    options: [
      "No; the portal only controls admission, so rely on HTTPS or a VPN",
      "Yes; accepting the terms turns on WPA3 encryption for the session",
      "Yes; the portal encrypts all traffic once the customer accepts",
      "No; captive portals block HTTPS, so browse only plain websites",
    ],
    answer: 0,
    explanation:
      "A captive portal holds a device's traffic until the user completes a step in the browser, such as accepting terms, then lets it through; it controls admission, not encryption. On an unencrypted open network, nothing protects traffic over the air, so privacy depends on HTTPS or a VPN. Accepting terms doesn't switch on WPA3 or any other encryption, the portal doesn't encrypt traffic, and captive portals don't block HTTPS once the user is through.",
  },
  {
    key: "s8-4.1-rate-limit-1",
    objective: "4.1",
    topic: "rate-limiting requests",
    difficulty: 2,
    question:
      "A retailer's public price-check API is being hammered by a competitor's scraper, which makes 50,000 requests an hour from a handful of addresses and slows the site for real shoppers. Which feature addresses this without taking the API offline?",
    options: [
      "Port mirroring of API traffic to an IDS sensor",
      "Data loss prevention rules",
      "Rate limiting of requests per client",
      "Code signing of the API's responses",
    ],
    answer: 2,
    explanation:
      "Rate limiting caps how many requests each client can make in a time window, so the scraper's flood is slowed or rejected while shoppers, who make a few requests each, aren't affected and the API stays up. Port mirroring only copies traffic for monitoring, DLP looks for sensitive data leaving the organization, and code signing proves who published code; none of them limits request volume.",
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
    difficulty: 2,
    question:
      "A company already pays for an annual penetration test of its web services. What would adding a bug bounty program give it?",
    options: [
      "Ongoing testing by many researchers, paying only for valid findings",
      "A guarantee that every vulnerability in its services will be found and fixed",
      "Testing with full access to its source code and administrator credentials",
      "Legal permission to test any other company's systems",
    ],
    answer: 0,
    explanation:
      "A bug bounty invites many outside researchers to keep testing all year, and the company pays only for valid, in-scope findings, which complements a penetration test's deep but time-boxed look by one team. Neither approach guarantees finding every flaw, bounty researchers usually test from the outside without source code or administrator access, and a bounty authorizes testing only of the company's own in-scope systems.",
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
    difficulty: 2,
    question:
      "A company's network management system monitors 400 switches by polling them with SNMPv2c, using the community string public. An auditor flags the setup. What should the team change?",
    options: [
      "Move the devices and the NMS to SNMPv3 with authentication and encryption",
      "Change the community string to private, so only the NMS can read the switches",
      "Poll the switches over Telnet so administrators can watch each session",
      "Stop polling and wait for staff to report outages instead",
    ],
    answer: 0,
    explanation:
      "A network management system watches devices' health and performance, usually by polling them with SNMP. SNMPv1 and v2c authenticate with a community string sent in cleartext, and public is a widely known default, so anyone who can reach the switches could query them and anyone watching the traffic could read the string. SNMPv3 adds per-user authentication and encryption. private is another common default, often with write access, and it still crosses the network in cleartext; Telnet is unencrypted too; and giving up polling trades a fixable weakness for no monitoring at all.",
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
      "A team mirrors four busy 1 Gbps server ports to a single 1 Gbps monitoring port for its packet capture appliance. The captures show gaps during peak hours. What explains the gaps?",
    options: [
      "Four busy ports can exceed one monitor port, so copies get dropped",
      "Port mirroring only copies traffic during business hours",
      "The capture appliance blocks traffic it can't keep up with",
      "The switch encrypts mirrored copies, so the appliance can't read some",
    ],
    answer: 0,
    explanation:
      "Port mirroring (SPAN) copies traffic from source ports to a monitoring port, but the copy is best effort: four busy 1 Gbps ports can send more than one 1 Gbps monitor port can carry, so the switch drops the excess copies and the capture has gaps. A faster monitor port, fewer sources or a network tap fixes it. Mirroring doesn't follow business hours, a passive capture appliance can't block traffic, and switches don't encrypt mirrored copies.",
  },
  {
    key: "s8-4.4-dashboard-1",
    objective: "4.4",
    topic: "dashboards",
    difficulty: 2,
    question:
      "The SOC shares its analyst dashboard, full of per-host alert details and raw counts, with the executive team, who find it useless. What should the security team do?",
    options: [
      "Send executives the raw SIEM logs instead",
      "Add even more per-host detail and raw counts, so nothing is ever hidden",
      "Build a separate dashboard with risk and trend metrics for leaders",
      "Stop reporting to executives until they have learned the SOC's tools",
    ],
    answer: 2,
    explanation:
      "A dashboard should fit its audience. Analysts need live, per-host detail, while leaders need a few business-level measures, such as risk trends, patch compliance and response times, so the team should build a view for them rather than reuse the SOC's. Raw logs and more detail make the problem worse, and withholding reporting leaves leadership without the oversight it needs.",
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
    difficulty: 3,
    question:
      "A SOC plans to let an AI agent isolate production servers on its own when it judges an alert serious. Which guardrail BEST limits the risk of this agentic AI?",
    options: [
      "Give the agent domain admin rights so it never fails mid-task",
      "Least privilege, plus human approval for high-impact actions",
      "Turn off its activity logging so its actions don't flood the SIEM",
      "Let it raise its own permissions whenever it decides it needs more",
    ],
    answer: 1,
    explanation:
      "Agentic AI plans and acts on its own with tools, so guardrails decide how much damage a mistake or a manipulated prompt can do: least privilege limits what it can touch, a person approves actions with big consequences such as isolating production servers, and every action is logged for review. Domain admin rights or self-granted permissions turn any error into a domain-wide problem, and turning off logging hides what it did.",
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
      "Six months after a breach, an auditor asks whether the fixes the company promised were actually made. Which record should list each corrective action with its owner and due date?",
    options: [
      "The incident response playbook",
      "The post-incident report",
      "The chain of custody form",
      "The legal hold notice",
    ],
    answer: 1,
    explanation:
      "A post-incident report records what happened, why, what it cost and what will change, with an owner and a due date for each corrective action, so it's the record leadership and auditors use to check that promised fixes were made. A playbook guides the response before and during an incident, a chain of custody form tracks who handled each piece of evidence, and a legal hold notice tells people to preserve data for litigation.",
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
      "A national cybersecurity agency warns that a ransomware crew is breaking into companies through a particular remote support tool, and lists the domains the crew uses. What should a company's security team do FIRST with the advisory?",
    options: [
      "File it away until the agency publishes its full report next month",
      "Begin restoring every server from backup as a precaution, just in case",
      "Forward the advisory to all staff and wait for their replies",
      "Check whether it runs that tool and search its logs for the domains",
    ],
    answer: 3,
    explanation:
      "An external advisory feeds identification: the team checks whether it's exposed, here whether it runs that remote support tool, and searches its logs and DNS records for the listed domains for any sign the crew is already inside. Filing it wastes the warning, restoring servers with no sign of compromise causes an outage for nothing, and a staff-wide email asks people who can't check logs to do the security team's job.",
  },

  // ---- 4.8 Data and sources for investigations ----
  {
    key: "s8-4.8-bit-level-1",
    objective: "4.8",
    topic: "bit-level copies",
    difficulty: 2,
    question:
      "An investigator made a logical copy of a suspect's laptop, capturing all the user's folders, but finds no trace of a spreadsheet the suspect is known to have deleted. Why not?",
    options: [
      "Deleted files are always overwritten instantly, so no copy method finds them",
      "A logical copy captures only existing files, not unallocated or slack space",
      "Spreadsheets are kept in memory and never written to the drive",
      "The laptop's antivirus quietly removed the file from the copy as it was made",
    ],
    answer: 1,
    explanation:
      "A logical copy captures the files and folders that currently exist, so leftover data from deleted files in unallocated or slack space is left behind; a bit-level copy of the whole drive would include it. Deleted data often survives until it's overwritten, spreadsheets are saved to the drive, and nothing suggests antivirus touched the copy.",
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
