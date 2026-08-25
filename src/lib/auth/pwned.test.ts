import { afterEach, describe, expect, it, vi } from "vitest";

import { checkPwnedPassword, pwnedPasswordMessage } from "@/lib/auth/pwned";

/**
 * `fetch` is stubbed throughout — a unit test must not depend on a third
 * party being up, and the whole point of this module is what it does when
 * that third party misbehaves.
 *
 * The k-anonymity property is asserted directly: whatever else changes here,
 * the password must never appear in an outbound request.
 */

const SHA1_PASSWORD123 = "CBFDAC6008F9CAB4083784CBD1874F76618D2A97";

function respondWith(body: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checkPwnedPassword", () => {
  it("sends only the first five hex characters of the digest", async () => {
    const fetchMock = respondWith(`${SHA1_PASSWORD123.slice(5)}:2266543`);
    vi.stubGlobal("fetch", fetchMock);

    await checkPwnedPassword("password123");

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${SHA1_PASSWORD123.slice(0, 5)}`);

    // The things that must never travel: the password, and the full hash.
    expect(url).not.toContain("password123");
    expect(url).not.toContain(SHA1_PASSWORD123);
    expect(JSON.stringify(fetchMock.mock.calls[0])).not.toContain("password123");
  });

  it("requests padded responses so the reply size leaks nothing", async () => {
    const fetchMock = respondWith("");
    vi.stubGlobal("fetch", fetchMock);

    await checkPwnedPassword("anything");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["Add-Padding"]).toBe("true");
  });

  it("flags a password found in the corpus", async () => {
    vi.stubGlobal("fetch", respondWith(`${SHA1_PASSWORD123.slice(5)}:2266543`));

    const result = await checkPwnedPassword("password123");

    expect(result).toEqual({ status: "pwned", count: 2_266_543 });
  });

  it("allows a password whose suffix is absent", async () => {
    vi.stubGlobal("fetch", respondWith("0000000000000000000000000000000000A:12\nFFFFF:3"));

    expect(await checkPwnedPassword("a-password-not-in-the-list")).toEqual({
      status: "ok",
    });
  });

  it("ignores padding entries, which come back with a count of zero", async () => {
    // HIBP pads the response with synthetic hashes at count 0. Treating one as
    // a hit would reject a perfectly good password.
    vi.stubGlobal("fetch", respondWith(`${SHA1_PASSWORD123.slice(5)}:0`));

    expect(await checkPwnedPassword("password123")).toEqual({ status: "ok" });
  });

  it("tolerates carriage returns in the response body", async () => {
    vi.stubGlobal("fetch", respondWith(`${SHA1_PASSWORD123.slice(5)}:5\r\nAAAAA:1\r\n`));

    expect(await checkPwnedPassword("password123")).toEqual({
      status: "pwned",
      count: 5,
    });
  });

  it("fails open when the service errors", async () => {
    // A third party's outage must not stop anyone registering.
    vi.stubGlobal("fetch", respondWith("", 503));

    expect(await checkPwnedPassword("password123")).toEqual({ status: "unavailable" });
  });

  it("fails open when the request throws or times out", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    expect(await checkPwnedPassword("password123")).toEqual({ status: "unavailable" });
  });

  it("does not call out at all for an empty password", async () => {
    const fetchMock = respondWith("");
    vi.stubGlobal("fetch", fetchMock);

    expect(await checkPwnedPassword("")).toEqual({ status: "ok" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("pwnedPasswordMessage", () => {
  it("scales the wording to the number of appearances", () => {
    expect(pwnedPasswordMessage(2_266_543)).toContain("millions of times");
    expect(pwnedPasswordMessage(3_196)).toContain("over 3,000 times");
    expect(pwnedPasswordMessage(1)).toContain("1 time");
    expect(pwnedPasswordMessage(5)).toContain("5 times");
  });

  it("reassures the user their account is not the thing that leaked", () => {
    // Otherwise this reads as "you have been hacked", which is both wrong and
    // alarming for someone who is only trying to sign up.
    expect(pwnedPasswordMessage(500)).toContain("doesn't mean your account was compromised");
  });
});
