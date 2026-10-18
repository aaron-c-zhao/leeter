import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LcError, createLcClient, makeRedactor } from "../server/lc/client";

const SESSION = "secret-session-cookie-value-123456";
const CSRF = "secret-csrf-token-value-678901";

function gqlResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

describe("lc-client", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        expect(init?.headers).toBeDefined();
        return gqlResponse({
          data: {
            problemsetQuestionList: {
              total: 1,
              questions: [
                {
                  questionId: "1",
                  title: "Two Sum",
                  titleSlug: "two-sum",
                  difficulty: "Easy",
                  topicTags: [{ slug: "array" }],
                },
              ],
            },
          },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends cookie/CSRF auth headers", async () => {
    const client = createLcClient({ session: SESSION, csrfToken: CSRF });
    await client.listProblems();
    const call = vi.mocked(fetch).mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["Cookie"]).toContain(`LEETCODE_SESSION=${SESSION}`);
    expect(headers["Cookie"]).toContain(`CSRFTOKEN=${CSRF}`);
    expect(headers["x-csrftoken"]).toBe(CSRF);
  });

  it("parses the problem list", async () => {
    const client = createLcClient({ session: SESSION, csrfToken: CSRF });
    const problems = await client.listProblems();
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ lcId: 1, title: "Two Sum", slug: "two-sum", difficulty: "Easy" });
    expect(problems[0].tagSlugs).toEqual(["array"]);
  });

  it("detects auth failure and does not leak the cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        gqlResponse({ errors: [{ message: `User is not logged in (${SESSION})` }] }),
      ),
    );
    const client = createLcClient({ session: SESSION, csrfToken: CSRF });
    const err = await client.listProblems().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LcError);
    expect((err as LcError).kind).toBe("auth");
    const message = (err as Error).message;
    expect(message).not.toContain(SESSION);
    expect(message).not.toContain(CSRF);
  });

  it("redacts credentials echoed back in error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        gqlResponse({
          errors: [{ message: `internal error while processing cookie ${SESSION}` }],
        }),
      ),
    );
    const client = createLcClient({ session: SESSION, csrfToken: CSRF });
    const err = await client.listProblems().catch((e: unknown) => e);
    expect((err as LcError).kind).toBe("unexpected");
    const message = (err as Error).message;
    expect(message).not.toContain(SESSION);
    expect(message).toContain("[REDACTED]");
  });

  it("classifies HTTP 401/403 as auth failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    const client = createLcClient({ session: SESSION, csrfToken: CSRF });
    const err = await client.listProblems().catch((e: unknown) => e);
    expect((err as LcError).kind).toBe("auth");
  });

  it("classifies connection failures as network errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));
    const client = createLcClient({ session: SESSION, csrfToken: CSRF });
    const err = await client.listProblems().catch((e: unknown) => e);
    expect((err as LcError).kind).toBe("network");
  });

  it("makeRedactor scrubs every credential occurrence", () => {
    const redact = makeRedactor({ session: SESSION, csrfToken: CSRF });
    const input = `Cookie: LEETCODE_SESSION=${SESSION}; CSRFTOKEN=${CSRF}; x=1`;
    const out = redact(input);
    expect(out).not.toContain(SESSION);
    expect(out).not.toContain(CSRF);
    expect(out).toContain("[REDACTED]");
  });
});
