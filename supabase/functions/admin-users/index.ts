import { Client } from "postgres";

const SCHEMA = "t_p29017774_avn_academy_training";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
};

async function getDbClient() {
  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = new Client(databaseUrl);
  await client.connect();
  return client;
}

async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getRequester(client: Client, token: string | null): Promise<{ id: number; role: string } | null> {
  if (!token) return null;
  const res = await client.queryObject<{ id: number; role: string }>(
    `SELECT u.id, u.role FROM ${SCHEMA}.sessions s
     JOIN ${SCHEMA}.users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_whitelisted = true`,
    [token]
  );
  if (res.rows.length > 0 && (res.rows[0].role === "instructor" || res.rows[0].role === "head_avng" || res.rows[0].role === "chief_instructor" || res.rows[0].role === "senior_instructor" || res.rows[0].role === "junior_instructor" || res.rows[0].role === "deputy_head")) {
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
    client = await getDbClient();
    const requester = await getRequester(client, token);
    if (!requester) {
      return new Response(JSON.stringify({ error: "Доступ запрещён" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    const url = new URL(req.url);
    const method = req.method;

    if (method === "GET") {
      const res = await client.queryObject<{
        id: number;
        static_id: string;
        name: string;
        rank: string;
        unit: string;
        role: string;
        is_whitelisted: boolean;
        created_at: Date;
        last_seen: Date | null;
        discord_id: string | null;
        avatar_url: string | null;
      }>(
        `SELECT id, static_id, name, rank, unit, role, is_whitelisted, created_at, last_seen, discord_id, avatar_url FROM ${SCHEMA}.users ORDER BY created_at DESC`
      );

      const users = res.rows.map(r => ({
        ...r,
        created_at: r.created_at.toISOString(),
        last_seen: r.last_seen ? r.last_seen.toISOString() : null
      }));

      return new Response(JSON.stringify({ users }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (method === "POST") {
      if (requester.role !== "head_avng" && requester.role !== "deputy_head") {
        return new Response(JSON.stringify({ error: "Доступ запрещён" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
      const body = await req.json().catch(() => ({}));
      const static_id = String(body.static_id || "").trim();
      const password = String(body.password || "").trim();
      const name = String(body.name || "").trim();
      const rank = String(body.rank || "Рядовой").trim();
      const unit = String(body.unit || "").trim();
      const role = String(body.role || "cadet").trim();
      const is_whitelisted = body.is_whitelisted !== undefined ? Boolean(body.is_whitelisted) : true;
      const discord_id = body.discord_id ? String(body.discord_id).trim() : null;
      const avatar_url = body.avatar_url ? String(body.avatar_url).trim() : null;

      if (!static_id || !password || !name) {
        return new Response(JSON.stringify({ error: "Заполните все поля" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      if (static_id.length !== 6 || !/^\d+$/.test(static_id)) {
        return new Response(JSON.stringify({ error: "Static ID должен содержать 6 цифр" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      if (role !== "cadet" && role !== "instructor" && role !== "head_avng" && role !== "chief_instructor" && role !== "senior_instructor" && role !== "junior_instructor" && role !== "deputy_head") {
        return new Response(JSON.stringify({ error: "Неверная роль" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"].includes(r);
      if (isInstructor(role) && requester.role !== "head_avng" && requester.role !== "deputy_head") {
        return new Response(JSON.stringify({ error: "Только Начальник АВНГ или его Заместитель может назначать инструкторов" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const passHash = await hashPassword(password);
      try {
        const insertRes = await client.queryObject<{ id: number }>(
          `INSERT INTO ${SCHEMA}.users (static_id, password_hash, name, rank, unit, role, is_whitelisted, discord_id, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [static_id, passHash, name, rank, unit, role, is_whitelisted, discord_id, avatar_url]
        );
        return new Response(JSON.stringify({ ok: true, id: insertRes.rows[0].id }), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      } catch (err) {
        // Unique violation check
        if (err.message && err.message.includes("unique constraint")) {
          return new Response(JSON.stringify({ error: "Пользователь с таким Static ID уже существует" }), {
            status: 409,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
        throw err;
      }
    }

    if (method === "PUT") {
      const userId = url.searchParams.get("id");
      if (!userId || !/^\d+$/.test(userId)) {
        return new Response(JSON.stringify({ error: "Не указан ID пользователя" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const body = await req.json().catch(() => ({}));
      if (requester.role !== "head_avng" && requester.role !== "deputy_head") {
        const keys = Object.keys(body);
        const disallowed = keys.filter(k => k !== "is_whitelisted");
        if (disallowed.length > 0) {
          return new Response(JSON.stringify({ error: "Недостаточно прав для изменения этих полей" }), {
            status: 403,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
      }
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (body.is_whitelisted !== undefined) {
        fields.push(`is_whitelisted = $${idx++}`);
        values.push(Boolean(body.is_whitelisted));
      }
      if (body.role && (body.role === "cadet" || body.role === "instructor" || body.role === "head_avng" || body.role === "chief_instructor" || body.role === "senior_instructor" || body.role === "junior_instructor" || body.role === "deputy_head")) {
        if (requester.role !== "head_avng" && requester.role !== "deputy_head") {
          const curUserRes = await client.queryObject<{ role: string }>(
            `SELECT role FROM ${SCHEMA}.users WHERE id = $1`,
            [Number(userId)]
          );
          const currentRole = curUserRes.rows[0]?.role;
          if (currentRole !== body.role) {
            const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"].includes(r);
            if (isInstructor(body.role) || isInstructor(currentRole)) {
              return new Response(JSON.stringify({ error: "Только Начальник АВНГ или его Заместитель может изменять роли инструкторов" }), {
                status: 403,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
              });
            }
          }
        }
        fields.push(`role = $${idx++}`);
        values.push(body.role);
      }
      if (body.name && String(body.name).trim()) {
        fields.push(`name = $${idx++}`);
        values.push(String(body.name).trim());
      }
      if (body.rank && String(body.rank).trim()) {
        fields.push(`rank = $${idx++}`);
        values.push(String(body.rank).trim());
      }
      if (body.unit !== undefined) {
        fields.push(`unit = $${idx++}`);
        values.push(String(body.unit).trim());
      }
      if (body.password && String(body.password).trim()) {
        const passHash = await hashPassword(String(body.password).trim());
        fields.push(`password_hash = $${idx++}`);
        values.push(passHash);
      }
      if (body.created_at !== undefined) {
        fields.push(`created_at = $${idx++}`);
        values.push(body.created_at);
      }
      if (body.discord_id !== undefined) {
        fields.push(`discord_id = $${idx++}`);
        values.push(body.discord_id ? String(body.discord_id).trim() : null);
      }
      if (body.avatar_url !== undefined) {
        fields.push(`avatar_url = $${idx++}`);
        values.push(body.avatar_url ? String(body.avatar_url).trim() : null);
      }

      if (fields.length === 0) {
        return new Response(JSON.stringify({ error: "Нет данных для обновления" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      fields.push(`updated_at = NOW()`);
      values.push(Number(userId));

      await client.queryArray(
        `UPDATE ${SCHEMA}.users SET ${fields.join(", ")} WHERE id = $${idx}`,
        values
      );

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (method === "DELETE") {
      if (requester.role !== "head_avng" && requester.role !== "deputy_head") {
        return new Response(JSON.stringify({ error: "Доступ запрещён" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
      const userId = url.searchParams.get("id");
      if (!userId || !/^\d+$/.test(userId)) {
        return new Response(JSON.stringify({ error: "Не указан ID пользователя" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      await client.queryArray(`UPDATE ${SCHEMA}.sessions SET expires_at = NOW() WHERE user_id = $1`, [Number(userId)]);
      await client.queryArray(`UPDATE ${SCHEMA}.users SET is_whitelisted = FALSE, updated_at = NOW() WHERE id = $1`, [Number(userId)]);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
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
      await client.end().catch(console.error);
    }
  }
});
