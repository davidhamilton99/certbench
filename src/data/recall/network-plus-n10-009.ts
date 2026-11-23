import { isDataRate, type RecallDeckConfig } from "@/lib/recall/recall-deck";

/**
 * Curated Recall decks for Network+ N10-009. These pick a unique cue column so
 * the drill is never ambiguous (the generic auto-picker would otherwise cue on
 * a broad category like routing "type" or cable "category", which maps to many
 * answers). Tables with no config here still get a clean auto-deck.
 */
export const networkPlusRecallConfigs: RecallDeckConfig[] = [
  {
    id: "net-ports",
    label: "Ports and protocols",
    blurb: "Match protocols to their port numbers, cold.",
    tableId: "ports-protocols",
    mode: "choice",
    ask: { key: "protocol", label: "protocol" },
    answer: { key: "port", label: "port" },
    bidirectional: true,
    accept: "numeric-parts",
    detailKeys: ["service", "transport"],
    // The first sentence pairs the protocol with its port. The second says, in
    // a sentence, what the table's "Service / Use" cell says in a note. Every
    // row is written out, so that what a learner reads can be read here; a test
    // (explanations.test.ts) fails if a row's sentences stop naming its
    // protocol and its port as the table has them.
    explain: {
      template: "{protocol} uses port {port}.",
      rows: {
        FTP: "FTP uses ports 20 and 21. The File Transfer Protocol uses port 20 for data and port 21 for control.",
        SSH: "SSH uses port 22. Secure Shell is used for encrypted remote access, SCP and SFTP.",
        Telnet: "Telnet uses port 23. It provides unencrypted remote terminal access, which is insecure.",
        SMTP: "SMTP uses port 25. The Simple Mail Transfer Protocol sends outbound email.",
        DNS: "DNS uses port 53. The Domain Name System provides name resolution.",
        DHCP: "DHCP uses ports 67 and 68. The Dynamic Host Configuration Protocol server uses port 67, and the client uses port 68.",
        TFTP: "TFTP uses port 69. The Trivial File Transfer Protocol has no authentication and no directory listing.",
        HTTP: "HTTP uses port 80. The Hypertext Transfer Protocol carries unencrypted web traffic.",
        POP3: "POP3 uses port 110. Post Office Protocol version 3 is used to retrieve email.",
        NTP: "NTP uses port 123. The Network Time Protocol provides clock synchronization.",
        IMAP: "IMAP uses port 143. The Internet Message Access Protocol is used to synchronize email.",
        SNMP: "SNMP uses ports 161 and 162. The Simple Network Management Protocol uses port 161 for polls and port 162 for traps.",
        LDAP: "LDAP uses port 389. LDAP stands for Lightweight Directory Access Protocol.",
        HTTPS: "HTTPS uses port 443. It is HTTP Secure, which runs over TLS.",
        SMB: "SMB uses port 445. Server Message Block provides Windows file and printer sharing.",
        Syslog: "Syslog uses port 514. The System Logging Protocol runs over UDP, which is unreliable.",
        "SMTP (STARTTLS)": "SMTP (STARTTLS) uses port 587. It is used for mail submission with opportunistic TLS encryption.",
        LDAPS: "LDAPS uses port 636. It is LDAP over SSL/TLS, for encrypted directory access.",
        IMAPS: "IMAPS uses port 993. It is IMAP over SSL/TLS.",
        POP3S: "POP3S uses port 995. It is POP3 over SSL/TLS.",
        "MS-SQL": "MS-SQL uses port 1433. It is Microsoft SQL Server.",
        "Oracle SQL": "Oracle SQL uses port 1521. This is the port of the Oracle Database listener.",
        MySQL: "MySQL uses port 3306. MySQL and MariaDB databases use this port.",
        RDP: "RDP uses port 3389. The Remote Desktop Protocol provides remote access to the Windows GUI.",
        SIP: "SIP uses ports 5060 and 5061. The Session Initiation Protocol carries VoIP signaling on port 5060, or on port 5061 over TLS.",
        "HTTP Alt": "HTTP Alt uses port 8080. This is the alternate HTTP port, used by proxies and development servers.",
      },
    },
  },
  {
    id: "net-commands",
    label: "Commands",
    blurb: "Name the command for the job.",
    tableId: "network-commands",
    mode: "choice",
    ask: { key: "purpose", label: "purpose" },
    answer: { key: "command", label: "command" },
    detailKeys: ["platform", "example"],
  },
  {
    id: "net-routing",
    label: "Routing protocols",
    blurb: "Recall each protocol's administrative distance.",
    tableId: "routing-protocols",
    mode: "choice",
    ask: { key: "protocol", label: "protocol" },
    answer: { key: "ad", label: "admin distance" },
    distractorGroupKey: "type",
    detailKeys: ["type", "algorithm", "metric"],
  },
  {
    id: "net-cables",
    label: "Cable types",
    blurb: "Recall each cable's max speed.",
    tableId: "cable-types",
    mode: "choice",
    ask: { key: "cable", label: "cable" },
    answer: { key: "maxSpeed", label: "max speed" },
    distractorGroupKey: "category",
    detailKeys: ["maxDistance", "connector", "category"],
    only: (row) => isDataRate(row.maxSpeed),
  },
  {
    id: "net-osi",
    label: "OSI model",
    blurb: "Match each layer to its number, both ways.",
    tableId: "osi-model",
    mode: "choice",
    ask: { key: "name", label: "layer" },
    answer: { key: "layer", label: "layer number" },
    bidirectional: true,
    detailKeys: ["function", "protocols"],
    // The second sentence is the table's "Function" cell, written as a sentence.
    explain: {
      template: "The {name} layer is layer {layer} of the OSI model.",
      rows: {
        Application:
          "The Application layer is layer 7 of the OSI model. It provides end-user network services and application APIs.",
        Presentation:
          "The Presentation layer is layer 6 of the OSI model. It handles data formatting, encryption, compression and encoding.",
        Session:
          "The Session layer is layer 5 of the OSI model. It handles session establishment, maintenance and teardown.",
        Transport:
          "The Transport layer is layer 4 of the OSI model. It provides reliable delivery, segmentation, flow control and port addressing.",
        Network:
          "The Network layer is layer 3 of the OSI model. It handles logical (IP) addressing and routing between networks.",
        "Data Link":
          "The Data Link layer is layer 2 of the OSI model. It handles MAC addressing, local frame delivery and error detection.",
        Physical:
          "The Physical layer is layer 1 of the OSI model. It handles bit transmission over physical media, including voltage, signaling and topology.",
      },
    },
  },
  {
    id: "net-wireless",
    label: "Wi-Fi standards",
    blurb: "Recall each 802.11 standard's frequency band.",
    tableId: "wireless-standards",
    mode: "choice",
    ask: { key: "standard", label: "standard" },
    answer: { key: "frequency", label: "frequency band" },
    detailKeys: ["name", "maxSpeed"],
    // Bluetooth, NFC, Zigbee and Z-Wave share the table but not the question.
    only: (row) => row.standard.startsWith("802.11"),
  },
];
