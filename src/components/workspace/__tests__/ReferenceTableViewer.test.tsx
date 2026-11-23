// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReferenceTable } from "@/data/reference/types";
import { ReferenceTableViewer } from "@/components/workspace/ReferenceTableViewer";

const TABLES: ReferenceTable[] = [
  {
    id: "ports",
    title: "Ports and protocols",
    description: "The well-known ports that the exam asks about.",
    columnHeaders: [
      { key: "protocol", label: "Protocol" },
      { key: "port", label: "Port", mono: true },
    ],
    entries: [
      { columns: { protocol: "SSH", port: "22" } },
      { columns: { protocol: "HTTPS", port: "443" } },
      { columns: { protocol: "DNS", port: "53" } },
    ],
  },
  {
    id: "acronyms",
    title: "Acronyms",
    description: "Acronyms from the exam objectives.",
    columnHeaders: [
      { key: "short", label: "Acronym" },
      { key: "long", label: "Meaning" },
    ],
    entries: [{ columns: { short: "AAA", long: "Authentication, authorization and accounting" } }],
  },
];

function viewer() {
  return render(<ReferenceTableViewer tables={TABLES} certSlug="security-plus-sy0-701" drillableTableIds={["ports"]} />);
}

describe("ReferenceTableViewer", () => {
  it("chooses a table with real tabs: one is selected, and the arrow keys move between them", async () => {
    viewer();
    const list = screen.getByRole("tablist", { name: "Reference table" });
    const [ports, acronyms] = within(list).getAllByRole("tab");
    expect(ports).toHaveAttribute("aria-selected", "true");
    expect(acronyms).toHaveAttribute("aria-selected", "false");
    // One stop for the Tab key: the row of tabs, which hands the focus to the selected tab.
    expect(list).toHaveAttribute("tabindex", "0");
    expect(acronyms).toHaveAttribute("tabindex", "-1");

    act(() => ports.focus());
    expect(ports).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(ports, { key: "ArrowRight" });
    await waitFor(() => expect(acronyms).toHaveFocus());
    expect(acronyms).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Acronyms" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Acronyms" })).toBeInTheDocument();
  });

  it("labels the search field and says how many entries match, as a status", () => {
    viewer();
    expect(screen.getByRole("status")).toHaveTextContent("This table has 3 entries.");

    const search = screen.getByLabelText("Search this table");
    fireEvent.change(search, { target: { value: "ssh" } });
    expect(screen.getByRole("status")).toHaveTextContent('1 of 3 entries matches "ssh".');
    expect(screen.getAllByRole("row")).toHaveLength(2);

    fireEvent.change(search, { target: { value: "telnet" } });
    expect(screen.getByRole("status")).toHaveTextContent('0 of 3 entries match "telnet".');
    expect(screen.getByRole("cell", { name: 'No entries match "telnet".' })).toBeInTheDocument();
  });

  it("marks the table up as a table: a name, column headers, and a frame that can be scrolled from the keyboard", () => {
    viewer();
    const table = screen.getByRole("table", { name: "Ports and protocols" });
    expect(within(table).getAllByRole("columnheader").map((th) => th.textContent)).toEqual(["Protocol", "Port"]);
    const frame = screen.getByRole("region", { name: "Ports and protocols, table" });
    expect(frame).toHaveAttribute("tabindex", "0");
  });

  it("offers the drill only for a table that has one, in words that say where it leads", () => {
    viewer();
    const link = screen.getByRole("link", { name: "Practice this table in Recall" });
    expect(link).toHaveAttribute("href", "/recall?deck=ports&cert=security-plus-sy0-701");

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Acronyms" }), { button: 0 });
    expect(screen.queryByRole("link", { name: "Practice this table in Recall" })).toBeNull();
  });
});
