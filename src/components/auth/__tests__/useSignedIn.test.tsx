// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";

type Heard = (event: string, session: { user: { id: string } } | null) => void;

/** The page's sign-in client, as far as the hook can see it. */
const page = vi.hoisted(() => ({
  /** Whether the browser holds a session cookie. */
  cookie: false,
  /** How many times the client's script was asked for. */
  loads: 0,
  /** Whether the client's script can be fetched. */
  offline: false,
  /** Whether the client is on the page already. */
  loaded: false,
  waiting: [] as (() => void)[],
  heard: [] as Heard[],
  unsubscribed: 0,
}));

vi.mock("@/lib/supabase-lazy", () => ({
  hasSessionCookie: () => page.cookie,
  loadBrowserClient: async () => {
    page.loads++;
    if (page.offline) throw new Error("the script could not be fetched");
    if (!page.loaded) {
      page.loaded = true;
      for (const listener of page.waiting.splice(0)) listener();
    }
    return {
      auth: {
        onAuthStateChange: (heard: Heard) => {
          page.heard.push(heard);
          return { data: { subscription: { unsubscribe: () => void page.unsubscribed++ } } };
        },
      },
    };
  },
  onBrowserClientLoaded: (listener: () => void) => {
    if (page.loaded) {
      listener();
      return () => {};
    }
    page.waiting.push(listener);
    return () => {
      page.waiting = page.waiting.filter((waiting) => waiting !== listener);
    };
  },
}));

import { loadBrowserClient } from "@/lib/supabase-lazy";
import { useSessionUserId, useSignedIn } from "@/components/auth/useSignedIn";

const session = (id: string) => ({ user: { id } });
/** Lets the promise of a client load settle. */
const settle = () => act(async () => {});

beforeEach(() => {
  Object.assign(page, { cookie: false, loads: 0, offline: false, loaded: false, waiting: [], heard: [], unsubscribed: 0 });
});

describe("with no session cookie", () => {
  it("says that nobody is signed in at once, and never loads the sign-in client", async () => {
    const { result } = renderHook(() => useSessionUserId());
    expect(result.current).toBeNull();
    await settle();
    expect(result.current).toBeNull();
    expect(page.loads).toBe(0);
  });

  it("notices a sign-in made later on the same page, once a form has loaded the client", async () => {
    const { result } = renderHook(() => useSessionUserId());
    expect(page.waiting).toHaveLength(1);

    // A sign-up form on the page loads the client when it is submitted.
    await act(async () => void (await loadBrowserClient()));
    await waitFor(() => expect(page.heard).toHaveLength(1));
    expect(result.current).toBeNull();

    act(() => page.heard[0]("SIGNED_IN", session("new-account")));
    expect(result.current).toBe("new-account");

    act(() => page.heard[0]("SIGNED_OUT", null));
    expect(result.current).toBeNull();
  });

  it("follows a client that something else on the page had loaded already", async () => {
    page.loaded = true;
    const { result } = renderHook(() => useSessionUserId());
    expect(result.current).toBeNull();
    await waitFor(() => expect(page.heard).toHaveLength(1));
    act(() => page.heard[0]("SIGNED_IN", session("u1")));
    expect(result.current).toBe("u1");
  });

  it("stops waiting for the client when the page is left", () => {
    const { unmount } = renderHook(() => useSessionUserId());
    expect(page.waiting).toHaveLength(1);
    unmount();
    expect(page.waiting).toHaveLength(0);
  });
});

describe("with a session cookie", () => {
  beforeEach(() => {
    page.cookie = true;
  });

  it("does not know who is signed in until the client reports, then follows it", async () => {
    const { result } = renderHook(() => useSessionUserId());
    expect(result.current).toBeUndefined();
    await waitFor(() => expect(page.heard).toHaveLength(1));
    expect(page.loads).toBe(1);
    expect(result.current).toBeUndefined();

    act(() => page.heard[0]("INITIAL_SESSION", session("member")));
    expect(result.current).toBe("member");

    act(() => page.heard[0]("SIGNED_OUT", null));
    expect(result.current).toBeNull();
  });

  it("says signed out when the cookie is stale and the client finds no session", async () => {
    const { result } = renderHook(() => useSessionUserId());
    await waitFor(() => expect(page.heard).toHaveLength(1));
    act(() => page.heard[0]("INITIAL_SESSION", null));
    expect(result.current).toBeNull();
  });

  it("says signed out when the client's script cannot be fetched", async () => {
    page.offline = true;
    const { result } = renderHook(() => useSessionUserId());
    await waitFor(() => expect(result.current).toBeNull());
    expect(page.loads).toBe(1);
  });

  it("stops listening when the page is left", async () => {
    const { unmount } = renderHook(() => useSessionUserId());
    await waitFor(() => expect(page.heard).toHaveLength(1));
    unmount();
    expect(page.unsubscribed).toBe(1);
  });
});

describe("useSignedIn", () => {
  it("is null while unknown, then true or false", async () => {
    page.cookie = true;
    const { result } = renderHook(() => useSignedIn());
    expect(result.current).toBeNull();
    await waitFor(() => expect(page.heard).toHaveLength(1));
    act(() => page.heard[0]("INITIAL_SESSION", session("member")));
    expect(result.current).toBe(true);
    act(() => page.heard[0]("SIGNED_OUT", null));
    expect(result.current).toBe(false);
  });

  it("is false at once when there is no session cookie", () => {
    const { result } = renderHook(() => useSignedIn());
    expect(result.current).toBe(false);
  });

  it("is unknown in the page as the server sends it, whatever the browser holds", () => {
    page.cookie = true;
    function Probe() {
      const signedIn = useSignedIn();
      return <p>{signedIn === null ? "unknown" : signedIn ? "signed in" : "signed out"}</p>;
    }
    expect(renderToString(<Probe />)).toContain("unknown");
    expect(page.loads).toBe(0);
  });
});
