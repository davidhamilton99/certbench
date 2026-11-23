// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; email?: string } } }));
vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: session.current } }),
      onAuthStateChange: (cb: (event: string, s: unknown) => void) => {
        queueMicrotask(() => cb("INITIAL_SESSION", session.current));
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  }),
}));
vi.mock("@/lib/api-client", () => ({
  api: async (contract: { method: string }) =>
    contract.method === "GET" ? { progress: { items: {}, rounds: 0 } } : { ok: true },
}));
const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/tools/port-numbers-quiz",
  useRouter: () => ({ push: vi.fn() }),
}));

import { PortQuiz, portRep } from "../PortQuiz";
import { PORT_ENTRIES, type PortEntry } from "@/lib/tools/port-quiz-data";

// Node's own experimental `localStorage` global shadows jsdom's.
const store = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

/**
 * Entries as the page hands them to the quiz. Each carries its explanation:
 * the sentences that the server took from the exam's own ports deck, which is
 * what a visitor reads after the verdict. None of them is the note in
 * `service`.
 */
const ENTRIES: PortEntry[] = [
  {
    port: "22",
    protocol: "SSH",
    service: "Secure Shell",
    transport: "TCP",
    explanation: "SSH uses port 22. Secure Shell is used for encrypted remote access, SCP and SFTP.",
  },
  {
    port: "53",
    protocol: "DNS",
    service: "Name resolution",
    transport: "TCP/UDP",
    explanation: "DNS uses port 53. The Domain Name System runs over both TCP and UDP.",
  },
  {
    port: "80",
    protocol: "HTTP",
    service: "Unencrypted web",
    transport: "TCP",
    explanation: "HTTP uses port 80. The Hypertext Transfer Protocol runs over TCP.",
  },
  {
    port: "443",
    protocol: "HTTPS",
    service: "HTTP over TLS",
    transport: "TCP",
    explanation: "HTTPS uses port 443. It is HTTP Secure, which uses TLS over TCP.",
  },
  {
    port: "3389",
    protocol: "RDP",
    service: "Remote Desktop",
    transport: "TCP",
    explanation: "RDP uses port 3389. The Remote Desktop Protocol runs over TCP.",
  },
];

/** Each entry's sentences, by its port. */
const SENTENCES: Record<string, string> = Object.fromEntries(ENTRIES.map((e) => [e.port, e.explanation!]));

/** The card's answers: a group named by the question, each answer a plain button. */
const answerGroup = () => screen.getByRole("group");
const answers = () => within(answerGroup());

/** The fact on the card on screen and its right answer, read off the cue the way a visitor would. */
function shown(): { entry: PortEntry; right: string } {
  const asksPort = screen.queryByText("Which port?") !== null;
  // The group is named by the prompt: a protocol, or a port.
  const prompt = document.getElementById(answerGroup().getAttribute("aria-labelledby")!)!.textContent!;
  const entry = ENTRIES.find((e) => (asksPort ? e.protocol : e.port) === prompt)!;
  return { entry, right: asksPort ? entry.port : entry.protocol };
}
const rightAnswer = () => shown().right;

function answer(right: boolean) {
  const target = rightAnswer();
  // An answer's text is its key (one character) and then the answer itself.
  const tile = answers()
    .getAllByRole("button")
    .find((t) => (t.textContent!.endsWith(target) && t.textContent!.length === target.length + 1) === right)!;
  fireEvent.click(tile);
}

/** The cookie the sign-in client keeps its session in: the drill reads the session only when one is there. */
const SESSION_COOKIE = "sb-test-auth-token";

/** Segments of the round's progress bar: R right, W wrong, C current, - to come. */
function bar(): string {
  const segments = document.querySelectorAll('[aria-hidden="true"] > span.flex-1');
  return [...segments]
    .map((s) =>
      ({ right: "R", wrong: "W", current: "C" } as Record<string, string>)[s.getAttribute("data-state") ?? ""] ?? "-"
    )
    .join("");
}

beforeEach(() => {
  store.clear();
  session.current = null;
  document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  track.mockClear();
});

describe("portRep", () => {
  const ssh = ENTRIES[0];
  const options = [ENTRIES[2], ssh, ENTRIES[3], ENTRIES[4]];

  it("asks a port the way the path asks a recall fact, ports in mono", () => {
    const rep = portRep({ direction: "port", answer: ssh, options });
    expect(rep).toMatchObject({
      type: "choice",
      label: "Recall",
      tier: "recall",
      prompt: "SSH",
      cue: "Which port?",
      options: ["80", "22", "443", "3389"],
      answer: 1,
      mono: true,
      takeaway: SENTENCES["22"],
    });
  });

  it("asks the protocol for a port the other way round", () => {
    const rep = portRep({ direction: "protocol", answer: ssh, options });
    expect(rep).toMatchObject({
      prompt: "22",
      cue: "Which protocol?",
      options: ["HTTP", "SSH", "HTTPS", "RDP"],
      answer: 1,
      mono: false,
      takeaway: SENTENCES["22"],
    });
  });

  it("prints the sentences an entry carries, the same whichever way it is asked", () => {
    for (const entry of ENTRIES) {
      for (const direction of ["port", "protocol"] as const) {
        const { takeaway } = portRep({ direction, answer: entry, options: ENTRIES });
        expect(takeaway).toBe(SENTENCES[entry.port]);
        // None ends on its note ("... over TCP. Secure Shell.").
        expect(takeaway.endsWith(entry.service + ".")).toBe(false);
      }
    }
  });

  it("prints its own exam's deck sentences for every port of the list the page really hands over", () => {
    expect(PORT_ENTRIES.length).toBeGreaterThanOrEqual(30);
    for (const entry of PORT_ENTRIES) {
      // Worked out on the server and carried by the entry: the quiz looks nothing up.
      expect(entry.explanation, entry.port).not.toBeNull();
      const others = PORT_ENTRIES.filter((e) => e.protocol !== entry.protocol).slice(0, 3);
      for (const direction of ["port", "protocol"] as const) {
        const { takeaway } = portRep({ direction, answer: entry, options: [entry, ...others] });
        expect(takeaway, entry.port).toBe(entry.explanation);
        // Two sentences: the port, and then what the protocol is and what it runs over.
        expect(takeaway.split(/(?<=\.)\s+/), takeaway).toHaveLength(2);
        // Neither sentence is the table's note with a full stop after it.
        expect(takeaway.split(/(?<=\.)\s+/), takeaway).not.toContain(entry.service + ".");
      }
    }
    const ftp = PORT_ENTRIES.find((e) => e.protocol === "FTP")!;
    expect(portRep({ direction: "port", answer: ftp, options: [ftp, ...options] }).takeaway).toBe(
      "FTP uses ports 20 and 21. The File Transfer Protocol uses port 20 for data and port 21 for control."
    );
    const https = PORT_ENTRIES.find((e) => e.protocol === "HTTPS")!;
    expect(portRep({ direction: "protocol", answer: https, options: [https, ...options] }).takeaway).toBe(
      "HTTPS uses port 443. It is HTTP Secure, which uses TLS over TCP."
    );
  });

  it("gives a port that no deck explains one plain sentence, and never the table's note", () => {
    const other: PortEntry = {
      port: "9999",
      protocol: "Example",
      service: "A note: not a sentence",
      transport: "TCP",
      explanation: null,
    };
    expect(portRep({ direction: "port", answer: other, options: [other, ...options] }).takeaway).toBe("Example uses port 9999 over TCP.");
    const bare = { ...other, transport: "" };
    expect(portRep({ direction: "protocol", answer: bare, options: [bare, ...options] }).takeaway).toBe("Example uses port 9999.");
  });
});

describe("PortQuiz", () => {
  it("plays a round on the path's card and ends on the exam's path, then the map to save", async () => {
    render(<PortQuiz entries={ENTRIES} />);
    await waitFor(() => expect(screen.getByText("Port numbers, round 1")).toBeInTheDocument());
    expect(screen.getByText("Question 1 of 20")).toBeInTheDocument();
    // The bank's own filing ("Recall question") is not printed over a port.
    expect(screen.queryByText("Recall question")).toBeNull();
    // What to do is said at the foot of the card until the question is answered.
    expect(screen.getByText(/^Choose an answer\. It is marked at once\./)).toBeInTheDocument();
    // The first question of a page as it loads takes no focus.
    expect(document.body).toHaveFocus();

    for (let i = 0; i < 20; i++) {
      const miss = i === 0 || i === 3;
      const { entry, right } = shown();
      answer(!miss);
      // The verdict is a sentence, read with the button that takes the focus,
      // and the ports deck's own sentences follow it.
      const next = screen.getByRole("button", { name: i === 19 ? /^View my result/ : /^Continue/ });
      expect(next).toHaveFocus();
      expect(next).toHaveAccessibleDescription(
        miss ? `Incorrect. The correct answer is ${right}. ${SENTENCES[entry.port]}` : `Correct. ${SENTENCES[entry.port]}`
      );
      if (i === 2) expect(bar().slice(0, 4)).toBe("WRR-");
      fireEvent.click(next);
      if (i < 19) {
        expect(screen.getByText(`Question ${i + 2} of 20`)).toBeInTheDocument();
        // A question that follows an answer takes the focus on its prompt, so it is read.
        expect(document.getElementById(answerGroup().getAttribute("aria-labelledby")!)).toHaveFocus();
      }
      if (i === 3) expect(bar().slice(0, 5)).toBe("WRRWC");
    }

    const result = await screen.findByRole("group", { name: "Port numbers: round 1 result" });
    expect(result).toHaveTextContent("18 of 20");
    // The card names Security+, Network+ and A+ Core 1. Network+ is set out by CertBench's own
    // topics, so the card does not say that the study path covers every exam objective.
    expect(result).toHaveTextContent(
      "Your study path works through the exam topic by topic, in short sets of questions like this one, up to a readiness checkpoint that shows where you stand."
    );
    expect(result).not.toHaveTextContent(/every (?:exam )?objective/i);
    // The way on is the exam's path, one tap per exam, ahead of the account ask.
    // (The account form below it links its own two documents, the terms and the privacy policy.)
    const links = within(result)
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href")!.startsWith("/path/"));
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Security+", "/path/security-plus-sy0-701"],
      ["Network+", "/path/network-plus-n10-009"],
      ["A+ Core 1", "/path/a-plus-core1-220-1201"],
    ]);
    const save = within(result).getByRole("heading", { name: "Save your progress and start round 2" });
    expect(links[0].compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(result).getByRole("heading", { name: "Your ports" })).toBeInTheDocument();

    expect(track).toHaveBeenCalledWith("drill_round_completed", {
      tool: "ports",
      round: 1,
      correct: 18,
      size: 20,
      signed_in: false,
    });
    expect(track).toHaveBeenCalledWith("drill_gate_viewed", { tool: "ports" });
    expect(track).toHaveBeenCalledWith("upsell_viewed", { context: "drill_bridge_ports" });
    links[1].addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(links[1]);
    expect(track).toHaveBeenCalledWith("upsell_clicked", {
      context: "drill_bridge_ports",
      href: "/path/network-plus-n10-009",
    });
  });

  it("picks a round back up after a reload, every answer still on its bar", async () => {
    const first = render(<PortQuiz entries={ENTRIES} />);
    await waitFor(() => expect(screen.getByText("Question 1 of 20")).toBeInTheDocument());
    answer(false);
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    answer(true);
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    first.unmount();

    render(<PortQuiz entries={ENTRIES} />);
    await waitFor(() => expect(screen.getByText("Question 3 of 20")).toBeInTheDocument());
    expect(bar().slice(0, 4)).toBe("WRC-");
  });

  it("lines up a round saved before answers were kept: its earlier answers show plain", async () => {
    store.set(
      "cb_drill_ports",
      JSON.stringify({
        v: 1,
        owner: null,
        progress: { items: {}, rounds: 0 },
        round: { queue: ENTRIES.map((e) => e.port).concat(ENTRIES.map((e) => e.port)), answered: 2, correct: 1, done: false },
      })
    );
    render(<PortQuiz entries={ENTRIES} />);
    await waitFor(() => expect(screen.getByText("Question 3 of 20")).toBeInTheDocument());
    expect(bar().slice(0, 4)).toBe("--C-");
    answer(true);
    expect(bar().slice(0, 4)).toBe("--R-");
  });

  it("lets someone signed in go straight on to the next round", async () => {
    session.current = { user: { id: "u1", email: "a@example.com" } };
    document.cookie = `${SESSION_COOKIE}=1; path=/`;
    render(<PortQuiz entries={ENTRIES} />);
    await waitFor(() => expect(screen.getByText("Question 1 of 20")).toBeInTheDocument());
    for (let i = 0; i < 20; i++) {
      answer(true);
      fireEvent.click(screen.getByRole("button", { name: i === 19 ? /^View my result/ : /^Continue/ }));
    }
    const result = await screen.findByRole("group", { name: "Port numbers: round 1 result" });
    expect(within(result).queryByRole("heading", { name: /Save your progress/ })).toBeNull();
    expect(result).toHaveTextContent("You answered 20 of 20 questions correctly.");
    // The result takes the focus, so it is read.
    await waitFor(() => expect(result).toHaveFocus());
    fireEvent.click(within(result).getByRole("button", { name: /Start round 2/ }));
    expect(await screen.findByText("Port numbers, round 2")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 20")).toBeInTheDocument();
    // A round started by a press on this page gives its first question the focus.
    expect(document.getElementById(answerGroup().getAttribute("aria-labelledby")!)).toHaveFocus();
  });
});
