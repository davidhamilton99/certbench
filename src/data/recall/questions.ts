/**
 * The question that a recall deck asks, as a sentence that names the term:
 * "Which port does POP3S use?", where the card once printed the bare term
 * ("POP3S") with "Which port?" under it. These are the decks of the
 * introductory questions of Network+ and of both A+ cores, the first questions
 * a visitor answers on those exams' public pages.
 *
 * `ask` is the question when the deck's cue column is the cue, and `reverse`,
 * for a deck asked both ways, the question when its answer column is. In each,
 * {value} is replaced by the cue as the table has it. A cue that does not fit
 * its template as it stands (a pair of ports written "20/21", a purpose
 * written as a note) has a question of its own in `rows`, under the cue.
 *
 * Only the words of the question are here. A question's id is made from the
 * deck and the row (src/core/path/rep-id.ts), never from these words, so they
 * can change without retiring an answer anyone has given.
 */
export interface DeckQuestionText {
  ask: string;
  reverse?: string;
  rows?: Readonly<Record<string, string>>;
}

/** Ports and protocols: the same table in Network+ and A+ Core 1. */
const PORTS: DeckQuestionText = {
  ask: "Which port does {value} use?",
  reverse: "Which protocol uses port {value}?",
  rows: {
    FTP: "Which ports does FTP use?",
    DHCP: "Which ports does DHCP use?",
    SNMP: "Which ports does SNMP use?",
    SIP: "Which ports does SIP use?",
    "NetBIOS/NetBT": "Which ports does NetBIOS/NetBT use?",
    "20/21": "Which protocol uses ports 20 and 21?",
    "67/68": "Which protocol uses ports 67 and 68?",
    "161/162": "Which protocol uses ports 161 and 162?",
    "5060/5061": "Which protocol uses ports 5060 and 5061?",
    "137-139": "Which protocol uses ports 137 to 139?",
  },
};

export const RECALL_QUESTIONS: Readonly<Record<string, DeckQuestionText>> = {
  "net-ports": PORTS,
  "a1-ports": PORTS,
  "net-osi": {
    ask: "Which layer number is the {value} layer in the OSI model?",
    reverse: "Which layer of the OSI model is layer {value}?",
  },
  "a1-cables": {
    ask: "What is the maximum speed of {value}?",
    rows: {
      // Common nouns that open their cell with a capital.
      "Single-mode fiber (SMF)": "What is the maximum speed of single-mode fiber (SMF)?",
      "Multimode fiber (MMF)": "What is the maximum speed of multimode fiber (MMF)?",
      "Serial (RS-232)": "What is the maximum speed of a serial (RS-232) connection?",
      Lightning: "What is the maximum speed of a Lightning connection?",
    },
  },
  "a2-windows": {
    ask: "Which Windows command is used to {value:lowerFirst}?",
    rows: {
      "Trace the route packets take to a destination; shows each hop":
        "Which Windows command traces the route that packets take to a destination and shows each hop?",
      "Combines ping and tracert; shows packet loss at each hop over time":
        "Which Windows command combines ping and tracert, and shows the packet loss at each hop over time?",
      "Check disk for file system errors and bad sectors":
        "Which Windows command is used to check a disk for file system errors and bad sectors?",
      "Remove a directory (must be empty, or use /s)": "Which Windows command is used to remove a directory?",
      "Robust file copy: resumes failed transfers, mirrors directories":
        "Which Windows command copies files robustly, resuming failed transfers and mirroring directories?",
      "Manage local user accounts: create, modify, delete, view":
        "Which Windows command is used to create, change, delete and view local user accounts?",
      "Show a command's help (syntax and switches), typed after the command's name":
        "What is typed after a command's name in Windows to show its help, with its syntax and switches?",
      "Display the Resultant Set of Policy (RSoP) applied to the computer/user":
        "Which Windows command is used to display the Resultant Set of Policy (RSoP) applied to the computer and the user?",
      "System File Checker: scan and repair corrupted Windows system files":
        "Which Windows command is the System File Checker, which scans and repairs corrupted Windows system files?",
    },
  },
  "a2-linux": {
    ask: "Which Linux command is used to {value:lowerFirst}?",
    rows: {
      "Print current working directory (full path)":
        "Which Linux command is used to print the full path of the current working directory?",
      "Change file or directory permissions (read/write/execute)":
        "Which Linux command is used to change the read, write and execute permissions of a file or directory?",
      "Change file owner and group": "Which Linux command is used to change the owner and group of a file?",
      "Debian/Ubuntu package manager: install, update, remove packages":
        "Which Linux command is the package manager of Debian and Ubuntu, used to install, update and remove packages?",
      "Red Hat/Fedora package manager: install, update, remove packages":
        "Which Linux command is the package manager of Red Hat and Fedora, used to install, update and remove packages?",
      "Transfer data to or from a URL: download files, test web services":
        "Which Linux command transfers data to or from a URL, to download files or to test web services?",
      "Real-time interactive process viewer: updates every few seconds":
        "Which Linux command is a real-time, interactive process viewer that updates every few seconds?",
      "Simple terminal text editor: beginner friendly":
        "Which Linux command opens a simple terminal text editor that is suited to beginners?",
    },
  },
};
