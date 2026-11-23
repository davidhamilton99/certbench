import { isDataRate, type RecallDeckConfig } from "@/lib/recall/recall-deck";

/** Curated Recall decks for A+ Core 1 (220-1201). Unique cues; the rest auto. */
export const aPlusCore1RecallConfigs: RecallDeckConfig[] = [
  {
    id: "a1-ports",
    label: "Ports and protocols",
    blurb: "Match protocols to their port numbers.",
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
        SSH: "SSH uses port 22. Secure Shell provides encrypted remote access.",
        Telnet: "Telnet uses port 23. It is a legacy protocol that provides unencrypted, insecure remote access.",
        SMTP: "SMTP uses port 25. The Simple Mail Transfer Protocol sends outbound email.",
        DNS: "DNS uses port 53. The Domain Name System resolves hostnames to IP addresses.",
        DHCP: "DHCP uses ports 67 and 68. The Dynamic Host Configuration Protocol server uses port 67, and the client uses port 68.",
        HTTP: "HTTP uses port 80. The Hypertext Transfer Protocol carries unencrypted web traffic.",
        POP3: "POP3 uses port 110. Post Office Protocol version 3 is used to retrieve and delete email.",
        "NetBIOS/NetBT":
          "NetBIOS/NetBT uses ports 137 to 139. NetBIOS over TCP/IP provides name, datagram and session services for legacy Windows networking.",
        IMAP: "IMAP uses port 143. The Internet Message Access Protocol is used to synchronize email on the server.",
        LDAP: "LDAP uses port 389. LDAP stands for Lightweight Directory Access Protocol.",
        HTTPS: "HTTPS uses port 443. It is HTTP Secure, which runs over TLS/SSL.",
        SMB: "SMB uses port 445. Server Message Block (CIFS) provides Windows file and printer sharing.",
        RDP: "RDP uses port 3389. The Remote Desktop Protocol provides a remote GUI for Windows.",
      },
    },
  },
  {
    id: "a1-cables",
    label: "Cable types",
    blurb: "Recall each cable's max speed.",
    tableId: "cable-types",
    mode: "choice",
    ask: { key: "cable", label: "cable" },
    answer: { key: "maxSpeed", label: "max speed" },
    distractorGroupKey: "category",
    detailKeys: ["maxDistance", "connector"],
    only: (row) => isDataRate(row.maxSpeed),
    // A row is listed where its speed or its distance is a note in the table
    // ("100+ Gbps", "15 m (passive)", "55 m (10G) / 100 m (1G)"), and eSATA is
    // listed because a sentence cannot open with its small "e".
    explain: {
      template: "{cable} has a maximum speed of {maxSpeed}. Its maximum distance is {maxDistance}.",
      rows: {
        "Cat 6": "Cat 6 has a maximum speed of 10 Gbps. That speed reaches 55 m, and 1 Gbps reaches 100 m.",
        "Single-mode fiber (SMF)": "Single-mode fiber (SMF) carries 100 Gbps or more. It reaches 40 km or more.",
        "Multimode fiber (MMF)":
          "Multimode fiber (MMF) has a maximum speed of 10 Gbps. That speed reaches 300 m on OM3 and 400 m on OM4.",
        "USB Type-C":
          "USB Type-C carries up to 40 Gbps with Thunderbolt 4 (TB4). Passive cables reach 0.8 m and active cables reach 2 m.",
        "Thunderbolt 3":
          "Thunderbolt 3 has a maximum speed of 40 Gbps. A passive cable reaches 0.5 m and an active cable reaches 2 m.",
        "Thunderbolt 4":
          "Thunderbolt 4 has a maximum speed of 40 Gbps. A passive cable reaches 0.8 m and an active cable reaches 2 m.",
        Lightning: "Lightning has a maximum speed of 480 Mbps, which is USB 2.0 speed. Its maximum distance is 2 m.",
        "HDMI 1.4": "HDMI 1.4 has a maximum speed of 10.2 Gbps. Its maximum distance is 15 m with a passive cable.",
        "HDMI 2.0": "HDMI 2.0 has a maximum speed of 18 Gbps. Its maximum distance is 15 m with a passive cable.",
        "HDMI 2.1": "HDMI 2.1 has a maximum speed of 48 Gbps. Its maximum distance is 10 m with a passive cable.",
        "DisplayPort 1.2":
          "DisplayPort 1.2 has a maximum speed of 21.6 Gbps. Its maximum distance is 3 m with a passive cable.",
        "DisplayPort 1.4":
          "DisplayPort 1.4 has a maximum speed of 32.4 Gbps. Its maximum distance is 3 m with a passive cable.",
        "DVI-D": "DVI-D has a maximum speed of about 9.9 Gbps. Its maximum distance is 5 m.",
        "DVI-I": "DVI-I has a maximum speed of about 9.9 Gbps. Its maximum distance is 5 m.",
        eSATA: "An eSATA cable has a maximum speed of 6 Gbps. Its maximum distance is 2 m.",
      },
    },
  },
  {
    id: "a1-storage",
    label: "Storage",
    blurb: "Recall each storage device's speed.",
    tableId: "storage-types",
    mode: "choice",
    ask: { key: "type", label: "storage type" },
    answer: { key: "maxSpeed", label: "max speed" },
    detailKeys: ["interface", "formFactor"],
    // RAID levels describe a speed-up ("Good read; moderate write"); they aren't one.
    only: (row) => isDataRate(row.maxSpeed),
  },
  {
    id: "a1-wireless",
    label: "Wireless",
    blurb: "Recall each standard's max speed.",
    tableId: "wireless-standards",
    mode: "choice",
    ask: { key: "standard", label: "standard" },
    answer: { key: "maxSpeed", label: "max speed" },
    detailKeys: ["frequency", "name"],
    only: (row) => isDataRate(row.maxSpeed),
  },
];
