// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase-browser", () => ({ createClient: () => ({ auth: {} }) }));
vi.mock("@/lib/api-client", () => ({ api: vi.fn() }));
const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

import { OnboardingFlow } from "@/components/auth/OnboardingFlow";

const CERTS = [
  { id: "c-sec", name: "CompTIA Security+", examCode: "SY0-701" },
  { id: "c-net", name: "CompTIA Network+", examCode: "N10-009" },
];

beforeEach(() => track.mockClear());

describe("OnboardingFlow", () => {
  it("asks which exam when none is preset", () => {
    render(<OnboardingFlow certifications={CERTS} />);
    expect(screen.getByRole("heading", { name: "Which exam?" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("onboarding_started", {});
    expect(track).not.toHaveBeenCalledWith("onboarding_step", expect.anything());
  });

  it("opens on the next question with the exam from the readiness check already picked", () => {
    render(<OnboardingFlow certifications={CERTS} initialCertId="c-net" />);
    expect(screen.getByRole("heading", { name: "What's the goal?" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Which exam?" })).toBeNull();
    // The preset still counts as the "cert" step, so the funnel has no hole.
    expect(track).toHaveBeenCalledWith("onboarding_started", {});
    expect(track).toHaveBeenCalledWith("onboarding_step", { step: "cert", value: "N10-009" });
  });

  it("ignores an unknown exam and asks instead", () => {
    render(<OnboardingFlow certifications={CERTS} initialCertId="nope" />);
    expect(screen.getByRole("heading", { name: "Which exam?" })).toBeInTheDocument();
  });

  it("keeps a resume on the offer, preset or not", () => {
    render(
      <OnboardingFlow
        certifications={CERTS}
        initialCertId="c-net"
        resume={{ certId: "c-sec", why: "career", examDate: null }}
      />
    );
    expect(screen.queryByRole("heading", { name: "What's the goal?" })).toBeNull();
    expect(track).not.toHaveBeenCalledWith("onboarding_started", {});
  });
});
