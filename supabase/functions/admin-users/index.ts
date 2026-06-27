import { Pool, Client } from "postgres";

const SCHEMA = "t_p29017774_avn_academy_training";

async function writeAuditLog(
  client: Client,
  operatorId: number,
  operatorName: string,
  action: string,
  targetId: string | null,
  targetName: string | null,
  details: any
) {
  try {
    await client.queryArray(
      `INSERT INTO ${SCHEMA}.audit_logs (operator_id, operator_name, action, target_id, target_name, details, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [operatorId, operatorName, action, targetId, targetName, JSON.stringify(details)]
    );
  } catch (err) {
    console.error("Error writing audit log:", err);
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
};

const databaseUrl = Deno.env.get("DATABASE_URL");
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}
const pool = new Pool(databaseUrl, 5, true);

async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getRequester(client: Client, token: string | null): Promise<{ id: number; role: string; name: string } | null> {
  if (!token) return null;
  const res = await client.queryObject<{ id: number; role: string; name: string }>(
    `SELECT u.id, u.role, u.name FROM ${SCHEMA}.sessions s
     JOIN ${SCHEMA}.users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_whitelisted = true`,
    [token]
  );
  if (res.rows.length > 0 && (res.rows[0].role === "instructor" || res.rows[0].role === "head_avng" || res.rows[0].role === "chief_instructor" || res.rows[0].role === "senior_instructor" || res.rows[0].role === "junior_instructor" || res.rows[0].role === "deputy_head" || res.rows[0].role === "senior_ufsvng")) {
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
      if (requester.role !== "head_avng" && requester.role !== "deputy_head" && requester.role !== "senior_ufsvng") {
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

      if (role !== "cadet" && role !== "instructor" && role !== "head_avng" && role !== "chief_instructor" && role !== "senior_instructor" && role !== "junior_instructor" && role !== "deputy_head" && role !== "dismissed" && role !== "senior_ufsvng") {
        return new Response(JSON.stringify({ error: "Неверная роль" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "senior_ufsvng"].includes(r);
      if (isInstructor(role) && requester.role !== "head_avng" && requester.role !== "deputy_head" && requester.role !== "senior_ufsvng") {
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
        const newId = insertRes.rows[0].id;

        await writeAuditLog(
          client,
          requester.id,
          requester.name,
          "create_user",
          String(newId),
          name,
          { static_id, role, rank, unit }
        );

        return new Response(JSON.stringify({ ok: true, id: newId }), {
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
      if (requester.role !== "head_avng" && requester.role !== "deputy_head" && requester.role !== "senior_ufsvng") {
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
      if (body.role && (body.role === "cadet" || body.role === "instructor" || body.role === "head_avng" || body.role === "chief_instructor" || body.role === "senior_instructor" || body.role === "junior_instructor" || body.role === "deputy_head" || body.role === "dismissed" || body.role === "senior_ufsvng")) {
        if (requester.role !== "head_avng" && requester.role !== "deputy_head" && requester.role !== "senior_ufsvng") {
          const curUserRes = await client.queryObject<{ role: string }>(
            `SELECT role FROM ${SCHEMA}.users WHERE id = $1`,
            [Number(userId)]
          );
          const currentRole = curUserRes.rows[0]?.role;
          if (currentRole !== body.role) {
            const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "senior_ufsvng"].includes(r);
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

      const targetUserRes = await client.queryObject<{ name: string }>(
        `SELECT name FROM ${SCHEMA}.users WHERE id = $1`,
        [Number(userId)]
      );
      const targetName = targetUserRes.rows[0]?.name || "Неизвестный";

      await client.queryArray(
        `UPDATE ${SCHEMA}.users SET ${fields.join(", ")} WHERE id = $${idx}`,
        values
      );

      await writeAuditLog(
        client,
        requester.id,
        requester.name,
        "update_user",
        userId,
        targetName,
        { updated_fields: Object.keys(body).filter(k => k !== "password") }
      );

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (method === "DELETE") {
      const userId = url.searchParams.get("id");
      if (!userId || !/^\d+$/.test(userId)) {
        return new Response(JSON.stringify({ error: "Не указан ID пользователя" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      if (requester.role !== "head_avng") {
        return new Response(JSON.stringify({ error: "Доступ запрещён. Удалять пользователей может только Начальник АВНГ." }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const targetRes = await client.queryObject<{ role: string, name: string }>(
        `SELECT role, name FROM ${SCHEMA}.users WHERE id = $1`,
        [Number(userId)]
      );
      if (targetRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Пользователь не найден" }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
      
      const targetUser = targetRes.rows[0];
      if (targetUser.role !== "cadet") {
        return new Response(JSON.stringify({ error: "Разрешено удалять только курсантов" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Start transaction for cascade deletion
      await client.queryArray("BEGIN");
      try {
        await client.queryArray(`DELETE FROM ${SCHEMA}.sessions WHERE user_id = $1`, [Number(userId)]);
        await client.queryArray(`DELETE FROM ${SCHEMA}.grades WHERE user_id = $1 OR instructor_id = $1`, [Number(userId)]);
        await client.queryArray(`DELETE FROM ${SCHEMA}.requests WHERE user_id = $1 OR reviewed_by = $1 OR instructor_id = $1`, [Number(userId)]);
        await client.queryArray(`DELETE FROM ${SCHEMA}.notifications WHERE user_id = $1`, [Number(userId)]);
        await client.queryArray(`DELETE FROM ${SCHEMA}.student_elo WHERE user_id = $1`, [Number(userId)]);
        await client.queryArray(`DELETE FROM ${SCHEMA}.test_attempts WHERE user_id = $1`, [Number(userId)]);
        await client.queryArray(`DELETE FROM ${SCHEMA}.instructor_ratings WHERE cadet_id = $1 OR instructor_id = $1`, [Number(userId)]);
        await client.queryArray(`DELETE FROM ${SCHEMA}.instructor_promotion_reports WHERE user_id = $1 OR reviewed_by = $1`, [Number(userId)]);
        await client.queryArray(`DELETE FROM ${SCHEMA}.promotion_reports WHERE user_id = $1 OR reviewed_by = $1`, [Number(userId)]);
        await client.queryArray(`DELETE FROM ${SCHEMA}.users WHERE id = $1`, [Number(userId)]);

        await writeAuditLog(
          client,
          requester.id,
          requester.name,
          "delete_user",
          userId,
          targetUser.name,
          { role: targetUser.role }
        );

        await client.queryArray("COMMIT");
      } catch (dbErr) {
        await client.queryArray("ROLLBACK");
        throw dbErr;
      }

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
      client.release();
    }
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
