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
import type { PortEntry } from "@/lib/tools/port-quiz-data";

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

const ENTRIES: PortEntry[] = [
  { port: "22", protocol: "SSH", service: "Secure Shell", transport: "TCP" },
  { port: "53", protocol: "DNS", service: "Name resolution", transport: "TCP/UDP" },
  { port: "80", protocol: "HTTP", service: "Unencrypted web", transport: "TCP" },
  { port: "443", protocol: "HTTPS", service: "HTTP over TLS", transport: "TCP" },
  { port: "3389", protocol: "RDP", service: "Remote Desktop", transport: "TCP" },
];

const answers = () => within(screen.getByRole("radiogroup", { name: "Answers" }));

/** The right answer to the card on screen, read off its cue the way a visitor would. */
function rightAnswer(): string {
  const asksPort = screen.queryByText("Which port?") !== null;
  const card = screen.getByRole("radiogroup", { name: "Answers" }).parentElement!;
  const prompt = card.querySelector("p")!.textContent!;
  const entry = ENTRIES.find((e) => (asksPort ? e.protocol : e.port) === prompt)!;
  return asksPort ? entry.port : entry.protocol;
}

function answer(right: boolean) {
  const target = rightAnswer();
  const tile = answers()
    .getAllByRole("radio")
    .find((t) => (t.textContent!.endsWith(target) && t.textContent!.length === target.length + 1) === right)!;
  fireEvent.click(tile);
}

/** Segments of the round's progress bar: R right, W wrong, C current, - to come. */
function bar(): string {
  const segments = document.querySelectorAll('[aria-hidden="true"] > span.flex-1');
  return [...segments]
    .map((s) =>
      s.className.includes("bg-success") ? "R" : s.className.includes("bg-warning") ? "W" : s.className.includes("bg-primary") ? "C" : "-"
    )
    .join("");
}

beforeEach(() => {
  store.clear();
  session.current = null;
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
      takeaway: "SSH → 22 over TCP · Secure Shell",
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
      takeaway: "22 → SSH over TCP · Secure Shell",
    });
  });
});

describe("PortQuiz", () => {
  it("plays a round on the path's card and ends on the exam's path, then the map to save", async () => {
    render(<PortQuiz entries={ENTRIES} />);
    await waitFor(() => expect(screen.getByText("Port numbers · round 1")).toBeInTheDocument());
    expect(screen.getByText("1 / 20")).toBeInTheDocument();
    expect(screen.getByText("Recall")).toBeInTheDocument();

    for (let i = 0; i < 20; i++) {
      const miss = i === 0 || i === 3;
      answer(!miss);
      expect(screen.getByRole("status")).toHaveTextContent(miss ? /^It's / : /^Right\./);
      if (i === 2) expect(bar().slice(0, 4)).toBe("WRR-");
      const label = i === 19 ? /^See my round/ : miss ? /^Got it/ : /^Next/;
      fireEvent.click(screen.getByRole("button", { name: label }));
      if (i < 19) expect(screen.getByText(`${i + 2} / 20`)).toBeInTheDocument();
      if (i === 3) expect(bar().slice(0, 5)).toBe("WRRWC");
    }

    const result = await screen.findByRole("group", { name: "Port numbers: round 1 result" });
    expect(result).toHaveTextContent("18 of 20");
    // The way on is the exam's path, one tap per exam, ahead of the account ask.
    const links = within(result).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Security+", "/path/security-plus-sy0-701"],
      ["Network+", "/path/network-plus-n10-009"],
      ["A+ Core 1", "/path/a-plus-core1-220-1201"],
    ]);
    const save = within(result).getByRole("heading", { name: "Save your map and play round 2" });
    expect(links[0].compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(result).getByRole("heading", { name: "Your port map" })).toBeInTheDocument();

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
    await waitFor(() => expect(screen.getByText("1 / 20")).toBeInTheDocument());
    answer(false);
    fireEvent.click(screen.getByRole("button", { name: /^Got it/ }));
    answer(true);
    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    first.unmount();

    render(<PortQuiz entries={ENTRIES} />);
    await waitFor(() => expect(screen.getByText("3 / 20")).toBeInTheDocument());
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
    await waitFor(() => expect(screen.getByText("3 / 20")).toBeInTheDocument());
    expect(bar().slice(0, 4)).toBe("--C-");
    answer(true);
    expect(bar().slice(0, 4)).toBe("--R-");
  });

  it("lets someone signed in go straight on to the next round", async () => {
    session.current = { user: { id: "u1", email: "a@example.com" } };
    render(<PortQuiz entries={ENTRIES} />);
    await waitFor(() => expect(screen.getByText("1 / 20")).toBeInTheDocument());
    for (let i = 0; i < 20; i++) {
      answer(true);
      fireEvent.click(screen.getByRole("button", { name: i === 19 ? /^See my round/ : /^Next/ }));
    }
    const result = await screen.findByRole("group", { name: "Port numbers: round 1 result" });
    expect(within(result).queryByRole("heading", { name: /Save your map/ })).toBeNull();
    expect(result).toHaveTextContent("Every one right.");
    fireEvent.click(within(result).getByRole("button", { name: /Start round 2/ }));
    expect(await screen.findByText("Port numbers · round 2")).toBeInTheDocument();
    expect(screen.getByText("1 / 20")).toBeInTheDocument();
  });
});
