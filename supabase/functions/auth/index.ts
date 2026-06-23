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

async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function downloadAvatar(discordId: string, avatarUrl: string): Promise<string | null> {
  try {
    const res = await fetch(avatarUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) {
      console.error(`[Avatar Downloader] Failed to fetch avatar from Discord: HTTP ${res.status}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const dirs = ["../../dist/avatars", "../../public/avatars"];
    let saved = false;
    for (const dir of dirs) {
      try {
        await Deno.mkdir(dir, { recursive: true });
        const filePath = `${dir}/${discordId}.png`;
        await Deno.writeFile(filePath, uint8Array);
        console.log(`[Avatar Downloader] Saved avatar to ${filePath}`);
        saved = true;
      } catch (writeErr) {
        console.warn(`[Avatar Downloader] Failed to write to ${dir}:`, writeErr.message);
      }
    }
    return saved ? `/avatars/${discordId}.png` : null;
  } catch (err) {
    console.error("[Avatar Downloader] Error in downloadAvatar:", err);
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: CORS_HEADERS, status: 200 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "login";

  if (action === "discord") {
    const discordId = url.searchParams.get("id");
    if (!discordId) {
      return new Response(JSON.stringify({ error: "Missing Discord ID" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    try {
      const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
      if (!botToken) {
        return new Response(
          JSON.stringify({
            error: "DISCORD_BOT_TOKEN is not configured in Supabase Edge Functions environment variables. Please set it using 'supabase secrets set DISCORD_BOT_TOKEN=...'"
          }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          }
        );
      }

      const discordRes = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
        headers: {
          "Authorization": `Bot ${botToken.trim()}`,
          "User-Agent": "DiscordBot (https://avn-academy.ru, v1.0)"
        }
      });

      if (!discordRes.ok) {
        const errText = await discordRes.text();
        return new Response(
          JSON.stringify({
            error: `Discord API returned HTTP ${discordRes.status}: ${errText}`
          }),
          {
            status: 502,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          }
        );
      }

      const data = await discordRes.json();
      const avatarUrl = data.avatar 
        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
        : undefined;

      let finalAvatarUrl = avatarUrl;
      if (avatarUrl) {
        const localPath = await downloadAvatar(discordId, avatarUrl);
        if (localPath) {
          finalAvatarUrl = localPath;
          
          let dbClient;
          try {
            dbClient = await pool.connect();
            await dbClient.queryArray(
              `UPDATE ${SCHEMA}.users 
               SET avatar_url = $1 
               WHERE discord_id = $2 AND (avatar_url IS NULL OR avatar_url != $1)`,
              [localPath, discordId]
            );
            console.log(`[Avatar Downloader] Updated DB avatar_url to ${localPath} for discord_id=${discordId}`);
          } catch (dbErr) {
            console.error(`[Avatar Downloader] DB update failed for discord_id=${discordId}:`, dbErr);
          } finally {
            if (dbClient) dbClient.release();
          }
        }
      }

      return new Response(JSON.stringify({
        username: data.username,
        global_name: data.global_name || undefined,
        avatar: finalAvatarUrl ? { link: finalAvatarUrl } : undefined,
        avatarUrl: finalAvatarUrl
      }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }
  }

  let client;
  try {
    client = await pool.connect();

    // ===== REGISTER =====
    if (action === "register" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const static_id = String(body.static_id || "").trim();
      const password = String(body.password || "").trim();
      const name = String(body.name || "").trim();

      if (!static_id || !password || !name) {
        return new Response(JSON.stringify({ error: "Заполните все обязательные поля" }), {
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

      if (password.length < 4) {
        return new Response(JSON.stringify({ error: "Пароль должен содержать минимум 4 символа" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Check if static_id already taken
      const existingRes = await client.queryObject<{ id: number }>(
        `SELECT id FROM ${SCHEMA}.users WHERE static_id = $1`,
        [static_id]
      );
      if (existingRes.rows.length > 0) {
        return new Response(JSON.stringify({ error: "Пользователь с таким Static ID уже существует" }), {
          status: 409,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const passHash = await hashPassword(password);
      await client.queryArray(
        `INSERT INTO ${SCHEMA}.users (static_id, password_hash, name, rank, unit, role, is_whitelisted) VALUES ($1, $2, $3, 'Рядовой', '', 'cadet', false)`,
        [static_id, passHash, name]
      );

      return new Response(JSON.stringify({
        ok: true,
        message: "Заявка отправлена. Ожидайте подтверждения инструктором."
      }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== LOGIN =====
    if (action === "login" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const static_id = String(body.static_id || "").trim();
      const password = String(body.password || "").trim();

      if (!static_id || !password) {
        return new Response(JSON.stringify({ error: "Укажите Static ID и пароль" }), {
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

      const passHash = await hashPassword(password);
      const userRes = await client.queryObject<{
        id: number;
        name: string;
        rank: string;
        unit: string;
        role: string;
        is_whitelisted: boolean;
        created_at: Date;
        discord_id: string | null;
        avatar_url: string | null;
      }>(
        `SELECT id, name, rank, unit, role, is_whitelisted, created_at, discord_id, avatar_url FROM ${SCHEMA}.users WHERE static_id = $1 AND password_hash = $2`,
        [static_id, passHash]
      );

      if (userRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Неверный Static ID или пароль" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const user = userRes.rows[0];
      if (!user.is_whitelisted) {
        return new Response(JSON.stringify({ error: "Ваша заявка ожидает подтверждения инструктором. Пожалуйста, подождите." }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await client.queryArray(
        `INSERT INTO ${SCHEMA}.sessions (token, user_id, expires_at) VALUES ($1, $2, $3)`,
        [token, user.id, expiresAt.toISOString()]
      );

      return new Response(
        JSON.stringify({
          token,
          user: {
            id: user.id,
            static_id,
            name: user.name,
            rank: user.rank,
            unit: user.unit,
            role: user.role,
            discord_id: user.discord_id,
            avatar_url: user.avatar_url,
            created_at: new Date(user.created_at).toISOString()
          }
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        }
      );
    }

    if (action === "logout" && req.method === "POST") {
      const token = req.headers.get("X-Session-Token") || req.headers.get("x-session-token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Нет токена" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      await client.queryArray(
        `UPDATE ${SCHEMA}.sessions SET expires_at = NOW() WHERE token = $1`,
        [token]
      );

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (action === "me") {
      const token = req.headers.get("X-Session-Token") || req.headers.get("x-session-token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Нет токена" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const sessionRes = await client.queryObject<{
        id: number;
        static_id: string;
        name: string;
        rank: string;
        unit: string;
        role: string;
        created_at: Date;
        discord_id: string | null;
        avatar_url: string | null;
      }>(
        `SELECT u.id, u.static_id, u.name, u.rank, u.unit, u.role, u.created_at, u.discord_id, u.avatar_url
         FROM ${SCHEMA}.sessions s
         JOIN ${SCHEMA}.users u ON u.id = s.user_id
         WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_whitelisted = true`,
         [token]
      );

      if (sessionRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Сессия истекла" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const dbUser = sessionRes.rows[0];
      await client.queryArray(
        `UPDATE ${SCHEMA}.users SET last_seen = NOW() WHERE id = $1`,
        [dbUser.id]
      ).catch(console.error);

      const user = {
        id: dbUser.id,
        static_id: dbUser.static_id,
        name: dbUser.name,
        rank: dbUser.rank,
        unit: dbUser.unit,
        role: dbUser.role,
        discord_id: dbUser.discord_id,
        avatar_url: dbUser.avatar_url,
        created_at: new Date(dbUser.created_at).toISOString()
      };
      return new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (action === "instructors") {
      const token = req.headers.get("X-Session-Token") || req.headers.get("x-session-token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Нет токена" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const sessionRes = await client.queryArray(
        `SELECT id FROM ${SCHEMA}.sessions WHERE token = $1 AND expires_at > NOW()`,
        [token]
      );
      if (sessionRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Сессия истекла" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const instructorsRes = await client.queryObject<{
        id: number;
        static_id: string;
        name: string;
        rank: string;
        unit: string;
        role: string;
        created_at: Date;
        last_seen: Date | null;
        discord_id: string | null;
        avatar_url: string | null;
      }>(
        `SELECT id, static_id, name, rank, unit, role, created_at, last_seen, discord_id, avatar_url FROM ${SCHEMA}.users WHERE role IN ('instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor', 'deputy_head', 'senior_ufsvng') AND is_whitelisted = true ORDER BY name ASC`
      );

      const instructors = instructorsRes.rows.map(r => ({
        ...r,
        created_at: r.created_at.toISOString(),
        last_seen: r.last_seen ? r.last_seen.toISOString() : null
      }));

      return new Response(JSON.stringify({ instructors }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Неизвестное действие" }), {
      status: 400,
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
