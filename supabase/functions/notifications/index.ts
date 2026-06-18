import { Pool, Client } from "postgres";

const SCHEMA = "t_p29017774_avn_academy_training";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
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
    role: string;
  }>(
    `SELECT u.id, u.name, u.role FROM ${SCHEMA}.sessions s
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
    const action = url.searchParams.get("action") || "";

    if (method === "GET") {
      const res = await client.queryObject<{
        id: number;
        type: string;
        title: string;
        message: string;
        is_read: boolean;
        created_at: Date;
        unread_count: number;
      }>(
        `SELECT id, type, title, message, is_read, created_at,
                (SELECT COUNT(*)::int FROM ${SCHEMA}.notifications WHERE user_id = $1 AND is_read = FALSE) as unread_count
         FROM ${SCHEMA}.notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [user.id]
      );

      const unread_count = res.rows.length > 0 ? Number(res.rows[0].unread_count) : 0;
      const notifications = res.rows.map(({ unread_count: _, ...row }) => ({
        ...row,
        created_at: row.created_at.toISOString()
      }));

      return new Response(JSON.stringify({ notifications, unread_count }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (method === "PUT" && action === "read") {
      await client.queryArray(
        `UPDATE ${SCHEMA}.notifications SET is_read = TRUE WHERE user_id = $1`,
        [user.id]
      );
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (method === "PUT" && action === "read_one") {
      const notifId = url.searchParams.get("id");
      if (!notifId || !/^\d+$/.test(notifId)) {
        return new Response(JSON.stringify({ error: "Неверный ID уведомления" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      await client.queryArray(
        `UPDATE ${SCHEMA}.notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
        [Number(notifId), user.id]
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Не найдено" }), {
      status: 404,
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
