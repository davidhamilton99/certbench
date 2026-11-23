// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
    // The hint is read with the field.
    expect(address).toHaveAccessibleDescription(/pasted with its prefix/);
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

  it("fills both fields from an address pasted with its prefix", () => {
    render(<SubnetCalculator />);
    fireEvent.change(screen.getByLabelText("IP address"), { target: { value: "172.16.5.1/30" } });
    expect(screen.getByLabelText("IP address")).toHaveValue("172.16.5.1");
    expect(screen.getByLabelText("Prefix length")).toHaveValue("30");
    expect(fact("Usable hosts")).toBe("2");
    expect(fact("Usable host range")).toBe("172.16.5.1 to 172.16.5.2");
  });

  it("writes large counts the American way whatever the reader's settings", () => {
    render(<SubnetCalculator />);
    fireEvent.change(screen.getByLabelText("Prefix length"), { target: { value: "8" } });
    expect(fact("Usable hosts")).toBe("16,777,214");
    expect(fact("Total addresses")).toBe("16,777,216");
  });
});
