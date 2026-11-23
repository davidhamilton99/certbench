import type { RecallDeckConfig } from "@/lib/recall/recall-deck";

/** Curated Recall decks for A+ Core 2 (220-1202). Unique cues; the rest auto. */
export const aPlusCore2RecallConfigs: RecallDeckConfig[] = [
  {
    id: "a2-windows",
    label: "Windows commands",
    blurb: "Name the command for the job.",
    tableId: "windows-commands",
    mode: "choice",
    ask: { key: "purpose", label: "purpose" },
    answer: { key: "command", label: "command" },
    detailKeys: ["type", "example"],
    // A purpose in the table is an instruction ("List the files and folders in
    // a directory"), which the template sets after "is used to". A row is
    // listed where its purpose does not read on from those words: two clauses,
    // a colon, a parenthesis, a slash, or a missing article.
    explain: {
      template: "The {command} command is used to {purpose:lowerFirst}.",
      by: "command",
      rows: {
        tracert: "The tracert command is used to trace the route packets take to a destination. It shows each hop.",
        pathping: "The pathping command combines ping and tracert. It shows packet loss at each hop over time.",
        chkdsk: "The chkdsk command is used to check a disk for file system errors and bad sectors.",
        rmdir:
          "The rmdir command is used to remove a directory. The directory must be empty unless the /s switch is used.",
        robocopy:
          "The robocopy command performs a robust file copy. It can resume failed transfers and mirror directories.",
        "net user":
          "The net user command is used to manage local user accounts. It can create, modify, delete and view them.",
        "/?": "Typing /? after a command's name shows that command's help, with its syntax and switches.",
        gpresult:
          "The gpresult command is used to display the Resultant Set of Policy (RSoP) applied to the computer or the user.",
        sfc: "The sfc command, the System File Checker, scans and repairs corrupted Windows system files. It must run as Administrator.",
      },
    },
  },
  {
    id: "a2-linux",
    label: "Linux commands",
    blurb: "Name the command for the job.",
    tableId: "linux-commands",
    mode: "choice",
    ask: { key: "purpose", label: "purpose" },
    answer: { key: "command", label: "command" },
    detailKeys: ["syntax", "example"],
    // As for the Windows commands. The syntax cell ("dig [name] [type]") is
    // notation and not words, so the sentence leaves it to the reference table.
    explain: {
      template: "The {command} command is used to {purpose:lowerFirst}.",
      by: "command",
      rows: {
        pwd: "The pwd command is used to print the full path of the current working directory.",
        chmod: "The chmod command is used to change the read, write and execute permissions of a file or directory.",
        chown: "The chown command is used to change the owner and group of a file.",
        grep: "The grep command is used to search text using patterns, which are regular expressions.",
        sudo: "The sudo command is used to execute a command as another user, typically root.",
        apt: "The apt command is the Debian and Ubuntu package manager. It installs, updates and removes packages.",
        dnf: "The dnf command is the Red Hat and Fedora package manager. It installs, updates and removes packages.",
        curl: "The curl command is used to transfer data to or from a URL. It can download files and test web services.",
        top: "The top command is a real-time interactive process viewer. It updates every few seconds.",
        nano: "The nano command is a simple terminal text editor. It is friendly to beginners.",
      },
    },
  },
  {
    id: "a2-tools",
    label: "Windows tools",
    blurb: "Name the tool for the job.",
    tableId: "windows-tools",
    mode: "choice",
    ask: { key: "purpose", label: "job" },
    answer: { key: "tool", label: "tool" },
    detailKeys: ["accessMethod"],
  },
  {
    id: "a2-security",
    label: "Security concepts",
    blurb: "Identify the concept from its description.",
    tableId: "security-concepts",
    mode: "choice",
    ask: { key: "description", label: "description" },
    answer: { key: "concept", label: "concept" },
    distractorGroupKey: "type",
    detailKeys: ["type", "example"],
  },
  {
    // The auto deck showed a bare step number ("4") as the cue; the action reads.
    id: "a2-malware",
    label: "Malware removal",
    blurb: "Place each action in the seven-step procedure.",
    tableId: "malware-removal",
    mode: "choice",
    ask: { key: "action", label: "action" },
    answer: { key: "step", label: "step" },
    detailKeys: ["description"],
  },
];
