// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/recall" }));
vi.mock("@/components/workspace/SignOutButton", () => ({
  SignOutButton: () => <button type="button">Sign out</button>,
}));

import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

const CERTS = [
  { slug: "security-plus-sy0-701", name: "Security+", examCode: "SY0-701" },
  { slug: "network-plus-n10-009", name: "Network+", examCode: "N10-009" },
];

function shell() {
  return render(
    <WorkspaceShell certs={CERTS} displayName="Ada Lovelace">
      <h1>Recall</h1>
    </WorkspaceShell>
  );
}

describe("WorkspaceShell", () => {
  it("has one main region that the skip link can reach and move the focus to", () => {
    shell();
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(within(main).getByRole("heading", { level: 1, name: "Recall" })).toBeInTheDocument();
  });

  it("names its navigation regions, and says which page is the one in hand", () => {
    shell();
    const navs = screen.getAllByRole("navigation", { name: "Workspace" });
    // One for the side bar and one for the row of links on a phone; CSS shows one at a time.
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      const current = within(nav)
        .getAllByRole("link")
        .filter((a) => a.getAttribute("aria-current") === "page");
      expect(current.map((a) => a.textContent)).toEqual(["Recall"]);
    }
  });

  it("uses the product's own words for its links", () => {
    shell();
    const side = screen.getAllByRole("navigation", { name: "Workspace" })[0];
    const names = within(side)
      .getAllByRole("link")
      .map((a) => a.textContent);
    expect(names).toEqual([
      "Your study path",
      "Study plan",
      "Hands-on labs",
      "Recall",
      "Review",
      "Reference",
      "Analytics",
      "Study sets",
      "Community",
    ]);
  });

  it("opens the study path of the first exam, and offers the other exam in its own region", () => {
    shell();
    const side = screen.getAllByRole("navigation", { name: "Workspace" })[0];
    expect(within(side).getByRole("link", { name: "Your study path" })).toHaveAttribute(
      "href",
      "/path/security-plus-sy0-701"
    );
    const switcher = screen.getByRole("navigation", { name: "Certification" });
    expect(within(switcher).getByRole("link", { name: "Network+" })).toHaveAttribute(
      "href",
      "/dashboard?cert=network-plus-n10-009"
    );
  });

  it("names the profile link by where it leads and by the visible name", () => {
    shell();
    // (The test's DOM library drops the space at the edge of an inline span; a browser keeps it.)
    expect(screen.getByRole("link", { name: /^Profile: ?Ada Lovelace$/ })).toHaveAttribute("href", "/profile");
  });
});
