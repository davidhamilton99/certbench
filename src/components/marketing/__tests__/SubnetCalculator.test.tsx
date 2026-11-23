// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubnetCalculator } from "../SubnetCalculator";

/** The value printed beside a label in the results. */
const fact = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent;

describe("SubnetCalculator", () => {
  it("labels both fields in words that stay on screen", () => {
    render(<SubnetCalculator />);
    const address = screen.getByLabelText("IP address");
    const prefix = screen.getByLabelText("Prefix length");
    expect(screen.getByText("IP address", { selector: "label" })).toBeInTheDocument();
    expect(screen.getByText("Prefix length", { selector: "label" })).toBeInTheDocument();
    // No placeholder stands in for a label, and nothing is named only by aria-label.
    expect(address).not.toHaveAttribute("placeholder");
    expect(address).not.toHaveAttribute("aria-label");
    expect(prefix).not.toHaveAttribute("aria-label");
    expect(prefix.tagName).toBe("SELECT");
    // The list is set at 18px like the field beside it. Under 16px a phone zooms the page when it opens.
    expect(prefix.className).toMatch(/(^|\s)text-lg(\s|$)/);
    expect(prefix.className).not.toMatch(/text-(sm|small|xs|note)\b/);
    expect(address.className).toMatch(/(^|\s)text-lg(\s|$)/);
    // The hint is read with the field, and it is true of typing as well as of a paste.
    expect(address).toHaveAccessibleDescription(/typed or pasted with its prefix/);
  });

  it("works the default subnet as the page loads", () => {
    render(<SubnetCalculator />);
    expect(screen.getByLabelText("IP address")).toHaveValue("192.168.1.0");
    expect(screen.getByLabelText("Prefix length")).toHaveValue("24");
    expect(fact("Usable hosts")).toBe("254");
    expect(fact("Network address")).toBe("192.168.1.0");
    expect(fact("Broadcast address")).toBe("192.168.1.255");
    expect(fact("Usable host range")).toBe("192.168.1.1 to 192.168.1.254");
    // Nothing is in error, so the field is not marked and nothing is announced.
    expect(screen.getByLabelText("IP address")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("says an unreadable address in a sentence, tied to the field and announced", () => {
    render(<SubnetCalculator />);
    const address = screen.getByLabelText("IP address");
    fireEvent.change(address, { target: { value: "300.1.1" } });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Enter a valid IPv4 address, for example 192.168.1.0.");
    expect(address).toHaveAttribute("aria-invalid", "true");
    expect(address).toHaveAccessibleDescription(/Enter a valid IPv4 address, for example 192\.168\.1\.0\./);
    // No results are shown for an address that cannot be read.
    expect(screen.queryByText("Usable hosts")).toBeNull();

    // A good address clears it again.
    fireEvent.change(address, { target: { value: "10.0.0.50" } });
    expect(address).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(fact("Network address")).toBe("10.0.0.0");
  });

  it("fills both fields from an address pasted with its prefix, and keeps what was pasted in the field", () => {
    render(<SubnetCalculator />);
    fireEvent.change(screen.getByLabelText("IP address"), { target: { value: "172.16.5.1/30" } });
    // The field keeps the address as it was written; the list takes its prefix length.
    expect(screen.getByLabelText("IP address")).toHaveValue("172.16.5.1/30");
    expect(screen.getByLabelText("Prefix length")).toHaveValue("30");
    expect(fact("Usable hosts")).toBe("2");
    expect(fact("Usable host range")).toBe("172.16.5.1 to 172.16.5.2");
  });

  it("works an address typed key by key with its prefix, and never takes the prefix's digits into the address", async () => {
    const user = userEvent.setup();
    render(<SubnetCalculator />);
    const address = screen.getByLabelText("IP address");
    await user.clear(address);
    await user.type(address, "10.1.1.1/16");
    expect(address).toHaveValue("10.1.1.1/16");
    expect(screen.getByLabelText("Prefix length")).toHaveValue("16");
    expect(fact("Network address")).toBe("10.1.0.0");
    expect(fact("Broadcast address")).toBe("10.1.255.255");
    expect(fact("Usable hosts")).toBe("65,534");
    expect(fact("CIDR notation")).toBe("10.1.0.0/16");
    expect(address).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("works the narrow prefixes typed key by key, where a wrong reading showed 254 hosts", async () => {
    const user = userEvent.setup();
    render(<SubnetCalculator />);
    const address = screen.getByLabelText("IP address");
    await user.clear(address);
    await user.type(address, "10.10.10.1/30");
    expect(screen.getByLabelText("Prefix length")).toHaveValue("30");
    expect(fact("Network address")).toBe("10.10.10.0");
    expect(fact("Usable hosts")).toBe("2");
  });

  it("says a prefix length out of range in its own sentence, typed or pasted, and shows no result", async () => {
    const user = userEvent.setup();
    render(<SubnetCalculator />);
    const address = screen.getByLabelText("IP address");
    await user.clear(address);
    await user.type(address, "10.0.0.0/33");
    expect(screen.getByRole("status")).toHaveTextContent("Enter a prefix length from 0 to 32 after the slash.");
    expect(address).toHaveAttribute("aria-invalid", "true");
    expect(address).toHaveAccessibleDescription(/Enter a prefix length from 0 to 32 after the slash\./);
    expect(screen.queryByText("Usable hosts")).toBeNull();

    // The same address pasted whole is not worked at another prefix length either.
    await user.clear(address);
    await user.paste("10.0.0.0/33");
    expect(screen.getByRole("status")).toHaveTextContent("Enter a prefix length from 0 to 32 after the slash.");
    expect(screen.queryByText("Usable hosts")).toBeNull();
  });

  it("waits while a slash has nothing after it, and says what is missing once the field is left", async () => {
    const user = userEvent.setup();
    render(<SubnetCalculator />);
    const address = screen.getByLabelText("IP address");
    await user.clear(address);
    await user.type(address, "10.1.1.1/");
    // Still being typed: no sentence, and the result stands as it was before the slash.
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(address).not.toHaveAttribute("aria-invalid");
    expect(fact("Network address")).toBe("10.1.1.0");

    await user.tab();
    expect(screen.getByRole("status")).toHaveTextContent("Enter a prefix length from 0 to 32 after the slash.");
    expect(address).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps the field and the list in agreement when the list changes after a typed prefix", async () => {
    const user = userEvent.setup();
    render(<SubnetCalculator />);
    const address = screen.getByLabelText("IP address");
    await user.clear(address);
    await user.type(address, "10.1.1.1/16");
    await user.selectOptions(screen.getByLabelText("Prefix length"), "24");
    expect(address).toHaveValue("10.1.1.1/24");
    expect(screen.getByLabelText("Prefix length")).toHaveValue("24");
    expect(fact("Network address")).toBe("10.1.1.0");
    expect(fact("CIDR notation")).toBe("10.1.1.0/24");
  });

  it("writes large counts the American way whatever the reader's settings", () => {
    render(<SubnetCalculator />);
    fireEvent.change(screen.getByLabelText("Prefix length"), { target: { value: "8" } });
    expect(fact("Usable hosts")).toBe("16,777,214");
    expect(fact("Total addresses")).toBe("16,777,216");
  });
});
