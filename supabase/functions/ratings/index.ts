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

export default async function handler(req: Request): Promise<Response> {
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

      // Fetch ratings using a single combined query
      const res = await client.queryObject<{
        id: number;
        name: string;
        rank: string;
        unit: string;
        discord_id: string | null;
        avatar_url: string | null;
        lectures_count: number;
        practices_count: number;
        exams_count: number;
        reviews_count: number;
      }>(
        `SELECT 
            u.id, 
            u.name, 
            u.rank, 
            u.unit, 
            u.discord_id, 
            u.avatar_url,
            COALESCE((SELECT COUNT(g.id)::int FROM ${SCHEMA}.grades g WHERE g.instructor_id = u.id AND g.type = 'lecture' AND g.graded_at > NOW() - ${intervalSql}), 0) as lectures_count,
            COALESCE((SELECT COUNT(g.id)::int FROM ${SCHEMA}.grades g WHERE g.instructor_id = u.id AND g.type = 'practice' AND g.graded_at > NOW() - ${intervalSql}), 0) as practices_count,
            COALESCE((SELECT COUNT(g.id)::int FROM ${SCHEMA}.grades g WHERE g.instructor_id = u.id AND g.type = 'exam' AND g.graded_at > NOW() - ${intervalSql}), 0) as exams_count,
            COALESCE((SELECT COUNT(pr.id)::int FROM ${SCHEMA}.promotion_reports pr WHERE pr.reviewed_by = u.id AND pr.status != 'pending' AND pr.reviewed_at > NOW() - ${intervalSql}), 0) as reviews_count
         FROM ${SCHEMA}.users u
         WHERE u.role IN ('instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor', 'deputy_head', 'senior_ufsvng')`
      );

      const instructors = res.rows.map(inst => {
        const lectures = Number(inst.lectures_count);
        const practices = Number(inst.practices_count);
        const exams = Number(inst.exams_count);
        const reviews = Number(inst.reviews_count);

        // Points weighting: lectures (5), practices (5), exams (10), reviews (2)
        const points = (lectures * 5) + (practices * 5) + (exams * 10) + (reviews * 2);

        return {
          id: inst.id,
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
}

if (import.meta.main) {
  Deno.serve(handler);
}
