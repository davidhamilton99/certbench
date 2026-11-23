import type { RecallDeckConfig } from "@/lib/recall/recall-deck";

/**
 * The Security+ SY0-701 ports deck. It has a file of its own so that the
 * lookup behind the public port quiz (src/lib/recall/port-explanations.ts)
 * can read this deck without the other Security+ decks. That lookup runs on
 * the server now, so the split no longer keeps anything out of the browser,
 * and it costs nothing to keep. The deck takes its place among the Security+
 * decks in security-plus-sy0-701.ts.
 */
export const securityPlusPortsDeck: RecallDeckConfig = {
  id: "sec-ports",
  label: "Ports and protocols",
  blurb: "Match protocols to their port numbers, cold.",
  tableId: "ports-protocols",
  mode: "choice",
  ask: { key: "protocol", label: "protocol" },
  answer: { key: "port", label: "port" },
  bidirectional: true,
  accept: "numeric-parts",
  detailKeys: ["service", "transport"],
  // The first sentence pairs the protocol with its port, which only restates
  // the answer. The second says, in a sentence, what the row's "Service / Use"
  // and "Transport" cells say in a note, and nothing that is not in the row.
  // Every row is written out, so that what a learner reads can be read here;
  // the template serves a row added to the table later. A row is named by its
  // port, because RADIUS has two rows. A test (explanations.test.ts) fails if
  // a row's sentences stop naming its protocol and its port as the table has
  // them, or state a figure that the row does not have.
  explain: {
    template: "{protocol} uses port {port}.",
    by: "port",
    rows: {
      "20/21": "FTP uses ports 20 and 21. The File Transfer Protocol uses port 20 for data and port 21 for control.",
      "22": "SSH, SCP and SFTP use port 22. Secure Shell, Secure Copy and Secure FTP all run over TCP.",
      "23": "Telnet uses port 23. It provides unencrypted remote access over TCP, which is insecure.",
      "25": "SMTP uses port 25. The Simple Mail Transfer Protocol runs over TCP.",
      "49": "TACACS+ uses port 49. It is a Terminal Access Controller protocol for AAA that runs over TCP.",
      "53": "DNS uses port 53. The Domain Name System runs over both TCP and UDP.",
      "67/68": "DHCP uses ports 67 and 68. The Dynamic Host Configuration Protocol runs over UDP.",
      "69": "TFTP uses port 69. The Trivial File Transfer Protocol runs over UDP.",
      "80": "HTTP uses port 80. The Hypertext Transfer Protocol runs over TCP.",
      "88": "Kerberos uses port 88. It is a network authentication protocol that runs over both TCP and UDP.",
      "110": "POP3 uses port 110. Post Office Protocol version 3 runs over TCP.",
      "119": "NNTP uses port 119. The Network News Transfer Protocol runs over TCP.",
      "123": "NTP uses port 123. The Network Time Protocol runs over UDP.",
      "135": "RPC/DCOM uses port 135. Remote Procedure Call runs over TCP.",
      "137-139": "NetBIOS uses ports 137 to 139. It runs over both TCP and UDP.",
      "143": "IMAP uses port 143. The Internet Message Access Protocol runs over TCP.",
      "161/162": "SNMP uses ports 161 and 162. The Simple Network Management Protocol runs over UDP.",
      "389": "LDAP uses port 389. The Lightweight Directory Access Protocol runs over TCP.",
      "443": "HTTPS uses port 443. It is HTTP Secure, which uses TLS over TCP.",
      "445": "SMB uses port 445. Server Message Block provides file sharing over TCP.",
      "465": "SMTPS uses port 465. It is SMTP over SSL, which is deprecated, and it runs over TCP.",
      "514": "Syslog uses port 514. The System Logging Protocol runs over UDP.",
      "587": "SMTP (STARTTLS) uses port 587. It is used for mail submission with STARTTLS over TCP.",
      "636": "LDAPS uses port 636. It is LDAP over SSL/TLS, and it runs over TCP.",
      "993": "IMAPS uses port 993. It is IMAP over SSL/TLS, and it runs over TCP.",
      "995": "POP3S uses port 995. It is POP3 over SSL/TLS, and it runs over TCP.",
      "1433": "MS-SQL uses port 1433. Microsoft SQL Server listens on this port over TCP.",
      "1645/1646": "RADIUS uses ports 1645 and 1646. These are its legacy ports.",
      "1812/1813": "RADIUS uses ports 1812 and 1813. Port 1812 is for authentication and port 1813 is for accounting.",
      "3306": "MySQL uses port 3306. The MySQL database listens on this port over TCP.",
      "3389": "RDP uses port 3389. The Remote Desktop Protocol runs over TCP.",
      "5060/5061": "SIP uses ports 5060 and 5061. The Session Initiation Protocol is used for VoIP over both TCP and UDP.",
      "6514": "Syslog TLS uses port 6514. It is Syslog over TLS, and it runs over TCP.",
      "8080": "HTTP Alt uses port 8080. HTTP proxies use this alternate HTTP port over TCP.",
    },
  },
};
