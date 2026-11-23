// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ api }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AdminTestimonialsList } from "@/components/workspace/AdminTestimonialsList";
import { moderateTestimonial } from "@/contracts/testimonials";

const PASSED = {
  id: "9b2f6c1e-3a4d-4e9b-8c55-0d1e2f3a4b5c",
  passed: true,
  quote: "The checkpoint showed me what to study.",
  displayName: "Sam K.",
  certName: "CompTIA Security+",
};
const DID_NOT_PASS = {
  id: "7c1d9a2b-5e6f-4a3b-8c9d-1e2f3a4b5c6d",
  passed: false,
  quote: "Subnetting was the hard part for me.",
  displayName: "Lee P.",
  certName: "CompTIA Network+",
};

beforeEach(() => {
  api.mockReset();
  api.mockResolvedValue({ moderated: true });
  refresh.mockReset();
});

/** The row of the queue that holds a quote. */
const row = (quote: string) => screen.getByText(quote).closest("li") as HTMLElement;

// The queue used to show every comment alike, with Approve and Hide, so a
// comment from someone who did not pass looked like a testimonial and one press
// of Approve made it readable by anyone with the site's public key.
describe("AdminTestimonialsList", () => {
  it("says on each row whether the person passed", () => {
    render(<AdminTestimonialsList items={[PASSED, DID_NOT_PASS]} />);
    expect(within(row(PASSED.quote)).getByText("Passed")).toBeInTheDocument();
    expect(within(row(DID_NOT_PASS.quote)).getByText("Did not pass")).toBeInTheDocument();
  });

  it("offers Approve and Hide for a pass story, and only Hide for a comment from someone who did not pass", () => {
    render(<AdminTestimonialsList items={[PASSED, DID_NOT_PASS]} />);
    expect(within(row(PASSED.quote)).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Approve: the testimonial from Sam K.",
      "Hide: the testimonial from Sam K.",
    ]);
    expect(within(row(DID_NOT_PASS.quote)).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Hide: the testimonial from Lee P.",
    ]);
  });

  it("hides a comment from someone who did not pass", async () => {
    render(<AdminTestimonialsList items={[DID_NOT_PASS]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Hide: the testimonial from Lee P." }));
    });
    expect(api).toHaveBeenCalledExactlyOnceWith(moderateTestimonial, { id: DID_NOT_PASS.id, status: "hidden" });
    expect(refresh).toHaveBeenCalledOnce();
  });
});
