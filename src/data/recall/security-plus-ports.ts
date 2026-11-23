import type { RecallDeckConfig } from "@/lib/recall/recall-deck";

/**
 * The Security+ SY0-701 ports deck. It has a file of its own because the
 * public port quiz loads it in the browser (src/lib/recall/port-explanations.ts),
 * and the sentences of the other Security+ decks should not travel with it.
 * It takes its place among the Security+ decks in security-plus-sy0-701.ts.
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
  // The template serves a row that holds one port. A row that holds a pair or
  // a range of ports has sentences of its own, which say which port is which
  // where the table says it. A row is named by its port, because RADIUS has
  // two rows.
  explain: {
    template: "{protocol} uses port {port}.",
    by: "port",
    rows: {
      "20/21": "FTP uses ports 20 and 21. The File Transfer Protocol uses port 20 for data and port 21 for control.",
      "67/68": "DHCP uses ports 67 and 68.",
      "137-139": "NetBIOS uses ports 137 to 139.",
      "161/162": "SNMP uses ports 161 and 162.",
      "1645/1646": "RADIUS uses ports 1645 and 1646. These are its legacy ports.",
      "1812/1813": "RADIUS uses ports 1812 and 1813. Port 1812 is for authentication and port 1813 is for accounting.",
      "5060/5061": "SIP uses ports 5060 and 5061.",
    },
  },
};
