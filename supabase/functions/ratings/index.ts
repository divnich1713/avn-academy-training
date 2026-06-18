import { Pool, Client } from "postgres";

const SCHEMA = "t_p29017774_avn_academy_training";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
};

const databaseUrl = Deno.env.get("DATABASE_URL");
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}
const pool = new Pool(databaseUrl, 5, true);

async function getUserByToken(client: Client, token: string | null) {
  if (!token) return null;
  const res = await client.queryObject<{
    id: number;
    name: string;
    rank: string;
    role: string;
  }>(
    `SELECT u.id, u.name, u.rank, u.role FROM ${SCHEMA}.sessions s
     JOIN ${SCHEMA}.users u ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_whitelisted = true`,
    [token]
  );
  if (res.rows.length > 0) {
    return res.rows[0];
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: CORS_HEADERS, status: 200 });
  }

  const token = req.headers.get("X-Session-Token") || req.headers.get("x-session-token");
  let client;

  try {
    client = await pool.connect();
    const user = await getUserByToken(client, token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Сессия истекла или не авторизован" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    const url = new URL(req.url);
    const method = req.method;
    const timeframe = url.searchParams.get("timeframe") || "weekly";

    if (method === "GET") {
      let intervalSql = "INTERVAL '7 days'";
      if (timeframe === "daily") {
        intervalSql = "INTERVAL '1 day'";
      } else if (timeframe === "monthly") {
        intervalSql = "INTERVAL '30 days'";
      } else if (timeframe === "yearly") {
        intervalSql = "INTERVAL '365 days'";
      }

      // Fetch all instructors
      const instsRes = await client.queryObject<{
        id: number;
        name: string;
        rank: string;
        unit: string;
        discord_id: string | null;
        avatar_url: string | null;
      }>(
        `SELECT id, name, rank, unit, discord_id, avatar_url FROM ${SCHEMA}.users WHERE role IN ('instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor', 'deputy_head', 'senior_ufsvng')`
      );

      // Fetch points statistics for the timeframe
      // 1. Grades issued by instructors: lectures (type='lecture'), practices (type='practice'), exams (type='exam')
      const gradesRes = await client.queryObject<{
        instructor_id: number;
        type: string;
        cnt: number;
      }>(
        `SELECT instructor_id, type, COUNT(id)::int as cnt FROM ${SCHEMA}.grades
         WHERE graded_at > NOW() - ${intervalSql}
         GROUP BY instructor_id, type`
      );

      // 2. Promotion reports reviewed by instructors
      const reviewsRes = await client.queryObject<{
        reviewed_by: number;
        cnt: number;
      }>(
        `SELECT reviewed_by, COUNT(id)::int as cnt FROM ${SCHEMA}.promotion_reports
         WHERE reviewed_at > NOW() - ${intervalSql} AND status != 'pending' AND reviewed_by IS NOT NULL
         GROUP BY reviewed_by`
      );

      // Map statistics
      const lectureStats = new Map<number, number>();
      const practiceStats = new Map<number, number>();
      const examStats = new Map<number, number>();
      const reviewStats = new Map<number, number>();

      for (const row of gradesRes.rows) {
        if (row.type === "lecture") lectureStats.set(row.instructor_id, row.cnt);
        if (row.type === "practice") practiceStats.set(row.instructor_id, row.cnt);
        if (row.type === "exam") examStats.set(row.instructor_id, row.cnt);
      }

      for (const row of reviewsRes.rows) {
        reviewStats.set(row.reviewed_by, row.cnt);
      }

      const instructors = instsRes.rows.map(inst => {
        const id = inst.id;
        const lectures = lectureStats.get(id) || 0;
        const practices = practiceStats.get(id) || 0;
        const exams = examStats.get(id) || 0;
        const reviews = reviewStats.get(id) || 0;

        // Points weighting: lectures (5), practices (5), exams (10), reviews (2)
        const points = (lectures * 5) + (practices * 5) + (exams * 10) + (reviews * 2);

        return {
          id,
          name: inst.name,
          rank: inst.rank,
          unit: inst.unit,
          discord_id: inst.discord_id,
          avatar_url: inst.avatar_url,
          points,
          lectures_count: lectures,
          practices_count: practices,
          exams_count: exams,
          reviews_count: reviews,
        };
      });

      // Sort by points descending
      instructors.sort((a, b) => b.points - a.points);

      return new Response(JSON.stringify({ instructors }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Метод не поддерживается" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "Внутренняя ошибка сервера" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});
