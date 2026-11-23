import { referenceRegistry } from "@/data/reference";
import { portExplanation } from "@/lib/recall/port-explanations";

/**
 * Merged port list for the free /tools/port-numbers-quiz page, built from
 * the ports-protocols reference tables across all certs (deduped by
 * protocol name — the Security+/Network+/A+ lists overlap heavily).
 *
 * This module reads the reference tables and the recall decks, so it is for
 * the server: the page builds the list and hands it to the quiz as data. The
 * quiz, which runs in the browser, imports only the type from here.
 */

export interface PortEntry {
  port: string;
  protocol: string;
  service: string;
  transport: string;
  /**
   * The sentences the quiz prints after an answer: those that the row's own
   * exam's ports deck gives it ("DNS uses port 53. The Domain Name System runs
   * over both TCP and UDP."). Null for a port that no deck explains. They are
   * worked out here, with the list, so that no deck travels to the browser.
   */
  explanation: string | null;
}

function collect(): PortEntry[] {
  // Dedupe by port number — the certs' tables overlap and sometimes name
  // the same port differently (SSH vs SSH/SCP/SFTP), and duplicate ports
  // would also produce identical answer options in the quiz.
  const byPort = new Map<string, PortEntry>();
  for (const tables of Object.values(referenceRegistry)) {
    const ports = tables.find((t) => t.id === "ports-protocols");
    if (!ports) continue;
    for (const entry of ports.entries) {
      const c = entry.columns;
      if (!c.port || !c.protocol) continue;
      if (!byPort.has(c.port)) {
        byPort.set(c.port, {
          port: c.port,
          protocol: c.protocol,
          service: c.service ?? "",
          transport: c.transport ?? "",
          explanation: portExplanation(c.port, c.protocol),
        });
      }
    }
  }
  return [...byPort.values()].sort(
    (a, b) => parseInt(a.port, 10) - parseInt(b.port, 10)
  );
}

export const PORT_ENTRIES: PortEntry[] = collect();
