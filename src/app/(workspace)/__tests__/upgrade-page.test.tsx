// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UserPlan } from "@/server/services/subscription";

const state = vi.hoisted(() => ({
  plan: null as unknown,
  requireUserPage: vi.fn(async () => ({ db: {}, user: { id: "u1" } })),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/server/auth", () => ({
  requireUserPage: state.requireUserPage,
  requireProPage: vi.fn(async () => {
    throw new Error("the billing page must be open to every account");
  }),
}));
vi.mock("@/server/services/subscription", () => ({
  FREE_DAILY_QUESTION_LIMIT: 20,
  getUserPlan: async () => state.plan,
}));
vi.mock("@/server/data/enrollments", () => ({
  listEnrollments: async () => [{ certificationId: "c1", examDate: null }],
}));
vi.mock("@/server/data/certifications", () => ({
  listActiveCertifications: async () => [
    { id: "c1", slug: "security-plus-sy0-701", name: "Security+", examCode: "SY0-701" },
    { id: "c2", slug: "network-plus-n10-009", name: "Network+", examCode: "N10-009" },
  ],
}));
vi.mock("@/components/billing/PlanPicker", () => ({ PlanPicker: () => <div data-testid="plan-chooser" /> }));
vi.mock("@/components/billing/AddCertButton", () => ({
  AddCertButton: ({ price }: { price: string }) => <button type="button">Add for {price}</button>,
}));
vi.mock("@/components/workspace/UpgradePanel", () => ({
  ManageBillingButton: () => <button type="button">Manage billing</button>,
}));

import UpgradePage from "../upgrade/page";

const FREE: UserPlan = {
  plan: "free",
  questionsUsedToday: 0,
  questionsLimitPerDay: 20,
  paymentPastDue: false,
  hasBillingAccount: false,
};

async function page(plan: UserPlan, searchParams: { reason?: string; added?: string } = {}) {
  state.plan = plan;
  return render(await UpgradePage({ searchParams: Promise.resolve(searchParams) }));
}

beforeEach(() => {
  state.requireUserPage.mockClear();
});

describe("the plan and billing page", () => {
  it("is open to every signed-in account, not only to Pro", async () => {
    await page(FREE);
    expect(state.requireUserPage).toHaveBeenCalledTimes(1);
  });

  it("offers the plans to an account with no plan and no billing record, and no billing button", async () => {
    await page(FREE);
    expect(screen.getByRole("heading", { level: 1, name: "CertBench Pro" })).toBeInTheDocument();
    expect(screen.getByTestId("plan-chooser")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manage billing" })).toBeNull();
  });

  it("says that the last payment failed and offers the billing page, not a second subscription", async () => {
    const { container } = await page({ ...FREE, paymentPastDue: true, hasBillingAccount: true });
    expect(container).toHaveTextContent(
      "Your last payment did not go through. Please update your payment method to keep CertBench Pro."
    );
    expect(screen.getByRole("heading", { level: 1, name: "Your plan" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Manage billing" })).toHaveLength(1);
    // The plans are not offered: a second subscription is not the way back.
    expect(screen.queryByTestId("plan-chooser")).toBeNull();
  });

  it("shows the billing button to an account whose plan has ended but which has a billing record", async () => {
    await page({ ...FREE, hasBillingAccount: true });
    expect(screen.getByTestId("plan-chooser")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage billing" })).toBeInTheDocument();
    expect(screen.queryByText(/Your last payment did not go through/)).toBeNull();
  });

  it("shows a Pro member what the plan covers, what can be added and the billing button", async () => {
    await page({ ...FREE, plan: "pro", questionsLimitPerDay: null, hasBillingAccount: true });
    expect(screen.getByRole("heading", { level: 1, name: "Your plan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Your certification" })).toBeInTheDocument();
    expect(screen.getByText("SY0-701")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Add a certification" })).toBeInTheDocument();
    // The offer says what the payment buys and how long it lasts, as the pricing page does.
    expect(
      screen.getByText(
        "You can add another exam for a single payment of $39. The exam stays open while your Pro plan is active."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("N10-009")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage billing" })).toBeInTheDocument();
    expect(screen.queryByTestId("plan-chooser")).toBeNull();
  });

  it("states the free plan's daily limit from the server's own figure", async () => {
    await page(FREE, { reason: "daily-limit" });
    expect(
      screen.getByText("You have reached the free plan's limit of 20 questions for today. Pro removes the limit.")
    ).toBeInTheDocument();
  });

  it("links the pass guarantee's terms as a link in running text", async () => {
    await page(FREE);
    const link = screen.getByRole("link", { name: "Read the guarantee terms" });
    expect(link).toHaveAttribute("href", "/terms#pass-guarantee");
    expect(link.className).toContain("cb-link");
  });
});
