import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  serverEnvOptional: () => undefined,
}));

import { RETRY_AFTER_MS, sendEmail } from "../resend";

const EMAIL = {
  to: "sam@example.com",
  subject: "7 days until your Security+ exam",
  html: "<p>Seven days.</p>",
  text: "Seven days.",
  headers: { "List-Unsubscribe": "<https://certbench.dev/api/email/unsubscribe?token=t>" },
};

const answer = (status: number, body = "") => new Response(body, { status });

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.useFakeTimers();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  consoleError.mockRestore();
});

describe("sendEmail", () => {
  it("answers true when the mail service accepts the email, after one request", async () => {
    fetchMock.mockResolvedValue(answer(200, '{"id":"1"}'));

    expect(await sendEmail(EMAIL)).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer re_test_key" });
    expect(JSON.parse(String(init.body))).toEqual({
      from: "CertBench <hello@certbench.dev>",
      to: ["sam@example.com"],
      subject: EMAIL.subject,
      html: EMAIL.html,
      text: EMAIL.text,
      headers: EMAIL.headers,
    });
    // Every request has a time limit, so that one slow answer cannot hold the daily run.
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("answers false without a request, and says why, when the key is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await sendEmail(EMAIL)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no RESEND_API_KEY"));
    warn.mockRestore();
  });

  it("answers false after one request when the service refuses the email", async () => {
    fetchMock.mockResolvedValue(answer(422, '{"message":"The to address is not valid."}'));

    expect(await sendEmail(EMAIL)).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("resend send failed (422)"));
  });

  it.each([429, 500, 503])("tries once more, one second later, after a %i", async (status) => {
    fetchMock.mockResolvedValueOnce(answer(status, "busy")).mockResolvedValueOnce(answer(200));

    const sending = sendEmail(EMAIL);
    await vi.advanceTimersByTimeAsync(RETRY_AFTER_MS - 1);
    expect(fetchMock).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(await sending).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The second request is the same email.
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body);
  });

  it("gives up after the second attempt", async () => {
    fetchMock.mockImplementation(async () => answer(429, "rate limit"));

    const sending = sendEmail(EMAIL);
    await vi.advanceTimersByTimeAsync(RETRY_AFTER_MS);
    expect(await sending).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // The email may have been accepted before the connection was lost, so a
  // second attempt could deliver it twice.
  it("answers false and does not throw or try again when the request gets no answer", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(sendEmail(EMAIL)).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith("resend send failed (no answer):", "TypeError: fetch failed");
  });
});
