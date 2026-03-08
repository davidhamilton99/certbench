import type { PbqScenario } from "../types";

export const securityPlusScenarios: PbqScenario[] = [
  /* ================================================================ */
  /*  ORDERING SCENARIOS                                               */
  /* ================================================================ */
  {
    type: "ordering",
    id: "incident-response-steps",
    title: "Incident Response Process",
    description:
      "Arrange the incident response steps in the correct order according to the NIST framework.",
    domain_number: "4.0",
    domain_title: "Security Operations",
    items: [
      "Preparation",
      "Detection and Analysis",
      "Containment",
      "Eradication",
      "Recovery",
      "Post-Incident Activity",
    ],
    correct_order: [0, 1, 2, 3, 4, 5],
    explanation:
      "The NIST incident response lifecycle follows: Preparation → Detection & Analysis → Containment → Eradication → Recovery → Post-Incident Activity (Lessons Learned). Preparation is always first as it involves establishing the response capability before incidents occur.",
  },
  {
    type: "ordering",
    id: "risk-assessment-process",
    title: "Risk Assessment Process",
    description:
      "Place the risk assessment steps in their correct sequential order.",
    domain_number: "5.0",
    domain_title: "Security Program Management and Oversight",
    items: [
      "Identify assets and their value",
      "Identify threats to those assets",
      "Identify vulnerabilities",
      "Analyse likelihood and impact",
      "Determine risk level",
      "Select risk treatment option",
    ],
    correct_order: [0, 1, 2, 3, 4, 5],
    explanation:
      "Risk assessment follows a logical progression: first identify what you're protecting (assets), then what could harm them (threats), then how they could be exploited (vulnerabilities), analyse probability and impact, determine the risk level, and finally decide how to handle the risk (accept, mitigate, transfer, or avoid).",
  },
  {
    type: "ordering",
    id: "certificate-lifecycle",
    title: "PKI Certificate Lifecycle",
    description:
      "Arrange the steps of the PKI certificate lifecycle in the correct order.",
    domain_number: "1.0",
    domain_title: "General Security Concepts",
    items: [
      "Generate key pair",
      "Create Certificate Signing Request (CSR)",
      "Certificate Authority validates identity",
      "CA issues signed certificate",
      "Install certificate on server",
      "Monitor and renew before expiration",
    ],
    correct_order: [0, 1, 2, 3, 4, 5],
    explanation:
      "The PKI certificate lifecycle begins with key pair generation, followed by creating a CSR containing the public key. The CA then validates the requester's identity, signs and issues the certificate, which is installed on the target server. The certificate is then monitored and renewed before it expires.",
  },

  /* ================================================================ */
  /*  MATCHING SCENARIOS                                               */
  /* ================================================================ */
  {
    type: "matching",
    id: "ports-to-services",
    title: "Match Ports to Services",
    description:
      "Match each well-known port number to its corresponding service or protocol.",
    domain_number: "3.0",
    domain_title: "Security Architecture",
    left: ["22", "53", "443", "3389", "389", "161"],
    right: ["SSH", "DNS", "HTTPS", "RDP", "LDAP", "SNMP"],
    correct_map: [0, 1, 2, 3, 4, 5],
    explanation:
      "Port 22 = SSH (Secure Shell), Port 53 = DNS (Domain Name System), Port 443 = HTTPS (HTTP over TLS), Port 3389 = RDP (Remote Desktop Protocol), Port 389 = LDAP (Lightweight Directory Access Protocol), Port 161 = SNMP (Simple Network Management Protocol).",
  },
  {
    type: "matching",
    id: "encryption-key-sizes",
    title: "Match Encryption Algorithms to Properties",
    description:
      "Match each encryption algorithm to its correct classification.",
    domain_number: "1.0",
    domain_title: "General Security Concepts",
    left: ["AES", "RSA", "SHA-256", "3DES", "ECC", "HMAC"],
    right: [
      "Symmetric block cipher",
      "Asymmetric algorithm",
      "Hashing algorithm",
      "Legacy symmetric cipher",
      "Elliptic curve cryptography",
      "Keyed hash function",
    ],
    correct_map: [0, 1, 2, 3, 4, 5],
    explanation:
      "AES is a symmetric block cipher (128/192/256-bit keys). RSA is an asymmetric algorithm used for encryption and digital signatures. SHA-256 is a one-way hashing algorithm. 3DES is a legacy symmetric cipher (effectively deprecated). ECC uses elliptic curve mathematics for asymmetric cryptography. HMAC is a keyed hash function for message authentication.",
  },
  {
    type: "matching",
    id: "attack-definitions",
    title: "Match Attacks to Descriptions",
    description:
      "Match each attack type to its correct description.",
    domain_number: "2.0",
    domain_title: "Threats, Vulnerabilities, and Mitigations",
    left: [
      "SQL Injection",
      "Cross-Site Scripting",
      "Man-in-the-Middle",
      "DNS Poisoning",
      "Privilege Escalation",
    ],
    right: [
      "Inserting malicious database queries via user input",
      "Injecting client-side scripts into web pages",
      "Intercepting communications between two parties",
      "Corrupting DNS cache with false records",
      "Gaining higher access than originally authorised",
    ],
    correct_map: [0, 1, 2, 3, 4],
    explanation:
      "SQL Injection targets database queries through unsanitised input. XSS injects scripts into web content viewed by other users. MITM intercepts and potentially alters communications. DNS Poisoning corrupts cached DNS records to redirect traffic. Privilege escalation exploits flaws to gain elevated permissions.",
  },

  /* ================================================================ */
  /*  CATEGORIZATION SCENARIOS                                         */
  /* ================================================================ */
  {
    type: "categorization",
    id: "authentication-factors",
    title: "Classify Authentication Factors",
    description:
      "Sort each authentication method into its correct factor category.",
    domain_number: "2.0",
    domain_title: "Threats, Vulnerabilities, and Mitigations",
    categories: [
      "Something You Know",
      "Something You Have",
      "Something You Are",
    ],
    items: [
      { text: "Password", category: 0 },
      { text: "Smart card", category: 1 },
      { text: "Fingerprint scan", category: 2 },
      { text: "Security PIN", category: 0 },
      { text: "Hardware token", category: 1 },
      { text: "Retina scan", category: 2 },
      { text: "Security question answer", category: 0 },
      { text: "Mobile authenticator app", category: 1 },
      { text: "Voice recognition", category: 2 },
    ],
    explanation:
      "Knowledge factors (something you know) include passwords, PINs, and security questions. Possession factors (something you have) include smart cards, hardware tokens, and authenticator apps. Inherence factors (something you are) include biometrics like fingerprints, retina scans, and voice recognition.",
  },
  {
    type: "categorization",
    id: "security-controls",
    title: "Classify Security Controls",
    description:
      "Categorise each security measure by its control type.",
    domain_number: "5.0",
    domain_title: "Security Program Management and Oversight",
    categories: ["Preventive", "Detective", "Corrective"],
    items: [
      { text: "Firewall rules", category: 0 },
      { text: "IDS alerts", category: 1 },
      { text: "System restore from backup", category: 2 },
      { text: "Access control lists", category: 0 },
      { text: "Log monitoring", category: 1 },
      { text: "Patch deployment", category: 2 },
      { text: "Encryption", category: 0 },
      { text: "Security audit", category: 1 },
      { text: "Incident response execution", category: 2 },
    ],
    explanation:
      "Preventive controls stop incidents before they occur (firewalls, ACLs, encryption). Detective controls identify incidents that have occurred or are in progress (IDS, log monitoring, audits). Corrective controls restore systems after an incident (backups, patching, incident response).",
  },
  {
    type: "categorization",
    id: "cloud-service-models",
    title: "Classify Cloud Responsibilities",
    description:
      "Sort each responsibility to the correct cloud service model where the CUSTOMER is responsible for it.",
    domain_number: "3.0",
    domain_title: "Security Architecture",
    categories: ["IaaS Customer", "PaaS Customer", "SaaS Customer"],
    items: [
      { text: "Operating system patching", category: 0 },
      { text: "Application code security", category: 1 },
      { text: "User access management", category: 2 },
      { text: "Network firewall configuration", category: 0 },
      { text: "Runtime environment config", category: 1 },
      { text: "Data classification", category: 2 },
      { text: "Middleware management", category: 0 },
      { text: "Database schema design", category: 1 },
      { text: "Browser security settings", category: 2 },
    ],
    explanation:
      "In IaaS, customers manage OS, middleware, and network config. In PaaS, customers manage their application code, runtime config, and database design. In SaaS, customers are responsible for user access, data classification, and client-side security. The provider handles lower layers in each model.",
  },
];
