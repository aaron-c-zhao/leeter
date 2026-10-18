const LC_BASE = "https://leetcode.com/graphql";

export class LcError extends Error {
  kind: "auth" | "network" | "unexpected";
  constructor(kind: "auth" | "network" | "unexpected", message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface LcCredentials {
  session: string;
  csrfToken: string;
}

export interface LcProblemListItem {
  lcId: number;
  title: string;
  slug: string;
  difficulty: string;
  tagSlugs: string[];
}

export interface LcProblemDetail extends LcProblemListItem {
  description: string;
}

export interface LcSubmissionItem {
  lcSubmissionId: number;
  code: string;
  lang: string;
  statusDisplay: string;
  runtime: string | null;
  memory: string | null;
  submittedAt: number;
}

export interface LcSubmissionDetail {
  code: string;
  lang: string;
  statusDisplay: string;
  runtime: string | null;
  memory: string | null;
  submittedAt: number;
}

export interface LcClient {
  listProblems(): Promise<LcProblemListItem[]>;
  problemDetail(slug: string): Promise<LcProblemDetail | null>;
  listSubmissions(slug: string): Promise<LcSubmissionItem[]>;
  submissionDetail(lcSubmissionId: number): Promise<LcSubmissionDetail | null>;
}

/** Escapes any occurrence of credential values inside a string. */
export function makeRedactor(credentials: LcCredentials): (s: string) => string {
  const secrets = [credentials.session, credentials.csrfToken].filter((v) => v && v.length > 8);
  return (s: string) => {
    let out = s;
    for (const secret of secrets) {
      out = out.split(secret).join("[REDACTED]");
    }
    return out;
  };
}

async function graphqlQuery<T>(
  credentials: LcCredentials,
  query: string,
  variables: Record<string, unknown>,
): Promise<{ data: T | null; errors: Array<{ message?: string }> | null }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Referer: "https://leetcode.com",
    Origin: "https://leetcode.com",
  };
  if (credentials.session && credentials.csrfToken) {
    headers["Cookie"] = `LEETCODE_SESSION=${credentials.session}; CSRFTOKEN=${credentials.csrfToken}`;
    headers["x-csrftoken"] = credentials.csrfToken;
  }

  let res: Response;
  try {
    res = await fetch(LC_BASE, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new LcError("network", `LeetCode unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (res.status === 401 || res.status === 403 || res.status === 429) {
    if (res.status === 429) {
      throw new LcError("unexpected", "LeetCode rate limit hit (429)");
    }
    throw new LcError("auth", "LeetCode rejected credentials; renew the session cookie");
  }

  const body = (await res.json().catch(() => null)) as
    | { data?: T | null; errors?: Array<{ message?: string }> | null }
    | null;
  if (!body) {
    throw new LcError("unexpected", `LeetCode returned non-JSON response (HTTP ${res.status})`);
  }

  const messages = (body.errors ?? []).map((e) => e.message ?? "unknown error");
  const authFailure = messages.some((m) =>
    /not logged in|authentication|login required|unauthenticated/i.test(m),
  );
  if (authFailure) {
    throw new LcError("auth", "LeetCode authentication failed; renew the session cookie");
  }
  if (messages.length > 0) {
    throw new LcError("unexpected", `LeetCode GraphQL error: ${messages.join("; ")}`);
  }
  return { data: body.data ?? null, errors: null };
}

const PROBLEM_LIST_QUERY = `
query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
    total: totalNum
    questions: data {
      questionId
      title
      titleSlug
      difficulty
      topicTags { slug }
    }
  }
}`;

const PROBLEM_DETAIL_QUERY = `
query questionDetail($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    title
    titleSlug
    difficulty
    content
    topicTags { slug }
  }
}`;

const SUBMISSION_DETAIL_QUERY = `
query submissionDetails($id: Int!) {
  submissionDetails(submissionId: $id) {
    id
    code
    runtime
    memory
    timestamp
  }
}`;

const SUBMISSION_LIST_QUERY = `
query submissionList($offset: Int!, $limit: Int!, $questionSlug: String!) {
  submissionList(offset: $offset, limit: $limit, questionSlug: $questionSlug) {
    submissions {
      id
      lang
      statusDisplay
      runtime
      memory
      timestamp
    }
  }
}`;

export function createLcClient(credentials: LcCredentials): LcClient {
  const redact = makeRedactor(credentials);
  const wrap = (err: LcError): LcError => new LcError(err.kind, redact(err.message));

  async function page<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    try {
      const result = await graphqlQuery<T>(credentials, query, variables);
      const data = result.data;
      if (!data) throw new LcError("unexpected", "LeetCode GraphQL returned no data");
      return data;
    } catch (err) {
      throw wrap(err as LcError);
    }
  }

  return {
    async listProblems(): Promise<LcProblemListItem[]> {      const out: LcProblemListItem[] = [];
      const limit = 100;
      let skip = 0;
      for (;;) {
        const data = await page<{
          problemsetQuestionList: {
            total: number;
            questions: Array<{
              questionId: string;
              title: string;
              titleSlug: string;
              difficulty: string;
              topicTags: Array<{ slug: string }> | null;
            }> | null;
          } | null;
        }>(PROBLEM_LIST_QUERY, { categorySlug: "all-code-essentials", limit, skip, filters: {} });
        const list = data.problemsetQuestionList;
        if (!list || !list.questions) break;
        for (const q of list.questions) {
          out.push({
            lcId: Number(q.questionId),
            title: q.title,
            slug: q.titleSlug,
            difficulty: q.difficulty,
            tagSlugs: (q.topicTags ?? []).map((t) => t.slug),
          });
        }
        skip += limit;
        if (out.length >= list.total || list.questions.length < limit) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      return out;
    },

    async problemDetail(slug: string): Promise<LcProblemDetail | null> {
      const data = await page<{ question: null | {
        questionId: string;
        title: string;
        titleSlug: string;
        difficulty: string;
        content: string | null;
        topicTags: Array<{ slug: string }> | null;
      } }>(PROBLEM_DETAIL_QUERY, { titleSlug: slug });
      const q = data.question;
      if (!q) return null;
      return {
        lcId: Number(q.questionId),
        title: q.title,
        slug: q.titleSlug,
        difficulty: q.difficulty,
        tagSlugs: (q.topicTags ?? []).map((t) => t.slug),
        description: q.content ?? "",
      };
    },

    async listSubmissions(slug: string): Promise<LcSubmissionItem[]> {
      const out: LcSubmissionItem[] = [];
      const limit = 20;
      let offset = 0;
      for (;;) {
        const data = await page<{
          submissionList: {
            submissions: Array<{
              id: string;
              code: string;
              lang: string;
              statusDisplay: string;
              runtime: string | null;
              memory: string | null;
              timestamp: string;
            }> | null;
          } | null;
        }>(SUBMISSION_LIST_QUERY, { offset, limit, questionSlug: slug });
        const subs = data.submissionList?.submissions ?? [];
        for (const s of subs) {
          out.push({
            lcSubmissionId: Number(s.id),
            code: "",
            lang: s.lang,
            statusDisplay: s.statusDisplay,
            runtime: s.runtime,
            memory: s.memory,
            submittedAt: Number(s.timestamp) * 1000,
          });
        }
        offset += limit;
        if (subs.length < limit || offset > 400) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      return out;
    },

    async submissionDetail(lcSubmissionId: number): Promise<LcSubmissionDetail | null> {
      const data = await page<{ submissionDetails: null | {
        id: number;
        code: string | null;
        lang: string | null;
        runtime: string | null;
        memory: string | null;
        timestamp: number | null;
      } }>(SUBMISSION_DETAIL_QUERY, { id: lcSubmissionId });
      const s = data.submissionDetails;
      if (!s) return null;
      return {
        code: s.code ?? "",
        lang: s.lang ?? "",
        statusDisplay: "",
        runtime: s.runtime ?? null,
        memory: s.memory ?? null,
        submittedAt: Number(s.timestamp ?? 0) * 1000,
      };
    },
  };
}
