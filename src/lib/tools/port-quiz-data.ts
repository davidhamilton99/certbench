import { referenceRegistry } from "@/data/reference";

/**
 * Merged port list for the free /tools/port-numbers-quiz page, built from
 * the ports-protocols reference tables across all certs (deduped by
 * protocol name — the Security+/Network+/A+ lists overlap heavily).
 */

export interface PortEntry {
  port: string;
  protocol: string;
  service: string;
  transport: string;
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
        });
      }
    }
  }
  return [...byPort.values()].sort(
    (a, b) => parseInt(a.port, 10) - parseInt(b.port, 10)
  );
}

export const PORT_ENTRIES: PortEntry[] = collect();
