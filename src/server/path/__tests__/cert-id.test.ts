import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  /** Slug to id, for the exams the database has. */
  certs: {} as Record<string, string>,
  failure: null as Error | null,
  reads: [] as string[],
}));

vi.mock("@/server/supabase/anon", () => ({ createAnonClient: () => ({}) }));
vi.mock("@/server/data/certifications", () => ({
  getCertificationBySlug: async (_db: unknown, slug: string) => {
    database.reads.push(slug);
    if (database.failure) throw database.failure;
    return database.certs[slug] ? { id: database.certs[slug], slug } : null;
  },
}));

import { certIdFor, forgetCertIds } from "../cert-id";

beforeEach(() => {
  forgetCertIds();
  database.certs = { "security-plus-sy0-701": "cert-701", "network-plus-n10-009": "cert-net" };
  database.failure = null;
  database.reads = [];
});

describe("certIdFor", () => {
  it("reads one row to learn an exam's id, and nothing more", async () => {
    expect(await certIdFor("security-plus-sy0-701")).toBe("cert-701");
    expect(database.reads).toEqual(["security-plus-sy0-701"]);
  });

  it("keeps the id: an id never changes, so later requests read nothing", async () => {
    await certIdFor("security-plus-sy0-701");
    await certIdFor("security-plus-sy0-701");
    await certIdFor("security-plus-sy0-701");
    expect(database.reads).toHaveLength(1);
  });

  it("keeps each exam's id apart", async () => {
    expect(await certIdFor("security-plus-sy0-701")).toBe("cert-701");
    expect(await certIdFor("network-plus-n10-009")).toBe("cert-net");
    expect(database.reads).toEqual(["security-plus-sy0-701", "network-plus-n10-009"]);
  });

  it("answers null for an exam the database does not have, and asks again next time", async () => {
    expect(await certIdFor("security-plus-sy0-801")).toBeNull();
    database.certs["security-plus-sy0-801"] = "cert-801";
    expect(await certIdFor("security-plus-sy0-801")).toBe("cert-801");
    expect(database.reads).toHaveLength(2);
  });

  it("fails when the database cannot be read, and keeps nothing from the failure", async () => {
    database.failure = new Error("connection refused");
    await expect(certIdFor("security-plus-sy0-701")).rejects.toThrow("connection refused");
    database.failure = null;
    expect(await certIdFor("security-plus-sy0-701")).toBe("cert-701");
  });
});
