import { describe, expect, it } from "vitest";
import { ApiError } from "@/contracts/errors";
import {
  AUTH_ALREADY_REGISTERED,
  AUTH_LINK_EXPIRED,
  AUTH_TOO_MANY,
  AUTH_UNREACHABLE,
  AUTH_WEAK_PASSWORD,
  AUTH_WRONG_CREDENTIALS,
  CONNECTION_LOST,
  PAGE_OUT_OF_DATE,
  REQUEST_FAILED,
  REQUEST_TIMED_OUT,
  authMessage,
  isSentence,
  userMessage,
} from "../user-message";

describe("isSentence", () => {
  it("accepts a sentence written for a person", () => {
    expect(isSentence("You have used your 10 free questions for today.")).toBe(true);
    expect(isSentence("Do you want to try again?")).toBe(true);
  });

  it("rejects codes, fragments and library text", () => {
    expect(isSentence("rate_limited")).toBe(false);
    expect(isSentence("Something went wrong")).toBe(false);
    expect(isSentence("Request failed (502)")).toBe(false);
    expect(isSentence("")).toBe(false);
    expect(isSentence(undefined)).toBe(false);
  });
});

describe("userMessage", () => {
  it("shows an endpoint's own sentence", () => {
    const err = new ApiError("quota_exceeded", "You have used your 10 free questions for today.");
    expect(userMessage(err)).toBe("You have used your 10 free questions for today.");
  });

  it("never shows a bare code", () => {
    expect(userMessage(new ApiError("rate_limited"))).toBe(
      "Too many requests were made in a short time. Please wait a few minutes and try again."
    );
    expect(userMessage(new ApiError("unauthorized"))).toBe("You are signed out. Please sign in and try again.");
  });

  it("never shows an internal error's text", () => {
    expect(userMessage(new ApiError("internal", "Something went wrong"))).toBe(REQUEST_FAILED);
    expect(userMessage(new ApiError("internal", "Request failed (502)"))).toBe(REQUEST_FAILED);
    expect(userMessage(new ApiError("internal", "relation \"x\" does not exist."))).toBe(REQUEST_FAILED);
  });

  it("passes on the sentences the client writes itself", () => {
    expect(userMessage(new ApiError("internal", CONNECTION_LOST))).toBe(CONNECTION_LOST);
    expect(userMessage(new ApiError("internal", REQUEST_TIMED_OUT))).toBe(REQUEST_TIMED_OUT);
    expect(userMessage(new ApiError("internal", PAGE_OUT_OF_DATE))).toBe(PAGE_OUT_OF_DATE);
    // The request was carried out, so the sentence asks for a reload and never for another try.
    expect(PAGE_OUT_OF_DATE).toBe("This page is out of date. Please reload the page.");
  });

  it("uses the caller's fallback for anything unknown", () => {
    expect(userMessage(new Error("boom"), "Your answer could not be saved. Please try again.")).toBe(
      "Your answer could not be saved. Please try again."
    );
    expect(userMessage("boom")).toBe(REQUEST_FAILED);
  });

  it("recognizes a failed fetch", () => {
    expect(userMessage(new TypeError("Failed to fetch"))).toBe(CONNECTION_LOST);
  });

  it("writes every sentence in the house style", () => {
    const all = [
      CONNECTION_LOST,
      REQUEST_TIMED_OUT,
      REQUEST_FAILED,
      AUTH_UNREACHABLE,
      AUTH_WRONG_CREDENTIALS,
      AUTH_TOO_MANY,
      AUTH_ALREADY_REGISTERED,
      AUTH_WEAK_PASSWORD,
      AUTH_LINK_EXPIRED,
      ...(["unauthorized", "forbidden", "not_found", "rate_limited", "quota_exceeded", "validation_failed", "conflict"] as const).map(
        (code) => userMessage(new ApiError(code))
      ),
    ];
    for (const sentence of all) {
      expect(isSentence(sentence), sentence).toBe(true);
      expect(sentence, sentence).not.toMatch(/[!\u2014\u2013]|n't|'re|'ll/);
    }
  });
});

describe("authMessage", () => {
  it("names an unreachable service without the library's words", () => {
    expect(authMessage({ message: "fetch failed" })).toBe(AUTH_UNREACHABLE);
    expect(authMessage({ name: "AuthRetryableFetchError", status: 0, message: "" })).toBe(AUTH_UNREACHABLE);
    expect(authMessage(new TypeError("Failed to fetch"))).toBe(AUTH_UNREACHABLE);
  });

  it("maps the common refusals", () => {
    expect(authMessage({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe(AUTH_WRONG_CREDENTIALS);
    expect(authMessage({ message: "Invalid login credentials" })).toBe(AUTH_WRONG_CREDENTIALS);
    expect(authMessage({ status: 429, message: "Email rate limit exceeded" })).toBe(AUTH_TOO_MANY);
    expect(authMessage({ code: "over_email_send_rate_limit" })).toBe(AUTH_TOO_MANY);
    expect(authMessage({ message: "User already registered" })).toBe(AUTH_ALREADY_REGISTERED);
    expect(authMessage({ code: "weak_password" })).toBe(AUTH_WEAK_PASSWORD);
    expect(authMessage({ code: "otp_expired", message: "Email link is invalid or has expired" })).toBe(AUTH_LINK_EXPIRED);
  });

  it("falls back to the caller's sentence and never to the raw text", () => {
    expect(authMessage({ message: "Database error saving new user" }, "Your account could not be created. Please try again.")).toBe(
      "Your account could not be created. Please try again."
    );
    expect(authMessage(null)).toBe("You could not be signed in. Please try again.");
  });
});
