import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A page's metadata and its body are built in one render, and each asks for
 * the same data: the objective, the hub, the readiness check, the practice
 * exam. A layout and the page under it both ask who is signed in. Each of
 * those loaders is wrapped in React's `cache`, so the second request in a
 * render is answered from the first and the database is asked once.
 *
 * React's `cache` remembers only inside a server render, which a unit test is
 * not: outside one it calls straight through. So React's `cache` is replaced
 * here by a stand-in that remembers by its arguments, as React does for one
 * render, and the test checks two things: that each loader IS the wrapped
 * function, and that asking twice reads once.
 */

type AnyFunction = (...args: never[]) => unknown;

const h = vi.hoisted(() => ({
  /** Every function that `cache` returned, in the order the modules made them. */
  wrapped: [] as unknown[],
  reads: { certification: 0, bank: 0, diagnosticQuestions: 0, client: 0, session: 0, plan: 0 },
  plan: { plan: "pro", status: "active" } as { plan: string; status: string } | null,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: (fn: AnyFunction) => {
      const remembered = new Map<string, unknown>();
      const cached = (...args: never[]) => {
        const key = JSON.stringify(args);
        if (!remembered.has(key)) remembered.set(key, fn(...args));
        return remembered.get(key);
      };
      h.wrapped.push(cached);
      return cached;
    },
  };
});

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

// The public pages' client: only the readiness check asks it for anything itself (a count).
vi.mock("@/server/supabase/anon", () => ({
  createAnonClient: () => ({
    from: () => {
      const builder = {
        select: () => builder,
        in: () => builder,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ count: 28, error: null }).then(resolve),
      };
      return builder;
    },
  }),
}));

// The signed-in client: one session check, and the plan read behind a Pro page.
vi.mock("@/server/supabase/server", () => ({
  createClient: async () => {
    h.reads.client += 1;
    return {
      auth: {
        getUser: async () => {
          h.reads.session += 1;
          return { data: { user: { id: "user-1" } } };
        },
      },
      from: () => {
        const builder = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: async () => {
            h.reads.plan += 1;
            return { data: h.plan, error: null };
          },
        };
        return builder;
      },
    };
  },
}));

const DOMAINS = [
  { id: "d1", domainNumber: "1.0", title: "General security concepts", examWeight: 12, sortOrder: 1 },
  { id: "d2", domainNumber: "2.0", title: "Threats, vulnerabilities and mitigations", examWeight: 22, sortOrder: 2 },
];
const SUBS = [
  { id: "s11", code: "1.1", title: "Compare and contrast security controls", domain_id: "d1" },
  { id: "s12", code: "1.2", title: "Summarize fundamental security concepts", domain_id: "d1" },
  { id: "s21", code: "2.1", title: "Compare threat actors and motivations", domain_id: "d2" },
];

vi.mock("@/server/data/certifications", () => ({
  getCertificationBySlug: async (_db: unknown, slug: string) => {
    h.reads.certification += 1;
    return { id: `id-of-${slug}`, slug, name: "CompTIA Security+", examCode: "SY0-701" };
  },
  listActiveCertifications: async () => [],
  listDomains: async () => DOMAINS,
  listSubObjectives: async () => SUBS,
}));

const question = (i: number, domain: string) => ({
  id: `q-${i}`,
  certification_id: "cert",
  domain_id: domain,
  sub_objective_id: "s12",
  question_text: `Question ${i}?`,
  options: [
    { text: "Right", is_correct: true },
    { text: "Wrong", is_correct: false },
  ],
  correct_index: 0,
  explanation: "Because.",
  difficulty: 1,
});

vi.mock("@/server/data/questions", () => ({
  countQuestionsBySubObjective: async () =>
    new Map([
      ["s11", 9],
      ["s12", 9],
      ["s21", 9],
    ]),
  listQuestionsBySubObjective: async () => [question(1, "d1"), question(2, "d1")],
  listDiagnosticQuestions: async () => {
    h.reads.diagnosticQuestions += 1;
    return Array.from({ length: 24 }, (_, i) => question(i, i % 2 ? "d1" : "d2"));
  },
}));

vi.mock("@/server/path/bank", () => ({
  loadPathBank: async () => {
    h.reads.bank += 1;
    return null;
  },
}));

const CERT = "security-plus-sy0-701";

beforeEach(() => {
  // A fresh copy of every module: what one render remembers is not carried into the next test.
  vi.resetModules();
  h.wrapped = [];
  h.reads = { certification: 0, bank: 0, diagnosticQuestions: 0, client: 0, session: 0, plan: 0 };
  h.plan = { plan: "pro", status: "active" };
});

describe("the loaders a page's metadata and body share", () => {
  it("are each the function React's cache returned", async () => {
    const { loadObjectivePage, loadObjectiveHub } = await import("@/server/seo/objective-data");
    const { loadReadinessCheck } = await import("@/server/seo/readiness-check-data");
    const { loadPublicTest } = await import("@/server/path/public-test");
    for (const loader of [loadObjectivePage, loadObjectiveHub, loadReadinessCheck, loadPublicTest]) {
      expect(h.wrapped).toContain(loader);
    }
  });

  it("read an objective page once for the two requests of one render", async () => {
    const { loadObjectivePage } = await import("@/server/seo/objective-data");
    const forMetadata = loadObjectivePage(CERT, "1-2");
    const forBody = loadObjectivePage(CERT, "1-2");
    expect(forBody).toBe(forMetadata);
    expect((await forBody)?.code).toBe("1.2");
    expect(h.reads.certification).toBe(1);
  });

  it("read each objective by itself: another objective is another read", async () => {
    const { loadObjectivePage } = await import("@/server/seo/objective-data");
    const [one, other] = await Promise.all([loadObjectivePage(CERT, "1-2"), loadObjectivePage(CERT, "2-1")]);
    expect(one?.code).toBe("1.2");
    expect(other?.code).toBe("2.1");
    expect(h.reads.certification).toBe(2);
  });

  it("read an exam's objective index once for the two requests of one render", async () => {
    const { loadObjectiveHub } = await import("@/server/seo/objective-data");
    const [forMetadata, forBody] = await Promise.all([loadObjectiveHub(CERT), loadObjectiveHub(CERT)]);
    expect(forBody).toBe(forMetadata);
    expect(forBody?.objectiveCount).toBe(3);
    expect(h.reads.certification).toBe(1);
  });

  it("download the readiness check's questions once for the two requests of one render", async () => {
    const { loadReadinessCheck } = await import("@/server/seo/readiness-check-data");
    const [forMetadata, forBody] = await Promise.all([loadReadinessCheck(CERT), loadReadinessCheck(CERT)]);
    expect(forBody).toBe(forMetadata);
    expect(forBody?.questions).toHaveLength(10);
    expect(forBody?.objectiveCount).toBe(28);
    expect(h.reads.diagnosticQuestions).toBe(1);
  });

  it("ask for the practice exam's question bank once for the two requests of one render", async () => {
    const { loadPublicTest } = await import("@/server/path/public-test");
    await Promise.all([loadPublicTest(CERT), loadPublicTest(CERT)]);
    expect(h.reads.bank).toBe(1);
    await loadPublicTest("network-plus-n10-009");
    expect(h.reads.bank).toBe(2);
  });
});

describe("the session a layout and its page share", () => {
  it("is the function React's cache returned", async () => {
    const { getPageSession } = await import("@/server/auth");
    expect(h.wrapped).toContain(getPageSession);
  });

  it("is checked with the sign-in service once, however many parts of the render ask", async () => {
    const { getPageSession, requireProPage, requireUserPage } = await import("@/server/auth");
    const inLayout = await getPageSession();
    const inPage = await requireProPage();
    const inAnotherPart = await requireUserPage();
    expect(inPage.user).toBe(inLayout.user);
    expect(inAnotherPart.db).toBe(inLayout.db);
    expect(h.reads.client).toBe(1);
    expect(h.reads.session).toBe(1);
  });

  it("reads the plan once for a render, not once for each Pro-only part", async () => {
    const { requireProPage } = await import("@/server/auth");
    await requireProPage();
    await requireProPage();
    await requireProPage();
    expect(h.reads.plan).toBe(1);
  });

  it("still sends a member without Pro to the study path", async () => {
    h.plan = { plan: "free", status: "active" };
    const { requireProPage } = await import("@/server/auth");
    await expect(requireProPage()).rejects.toThrow("redirect:/start");
  });
});
