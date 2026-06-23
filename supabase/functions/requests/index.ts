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
    rank: string;
    unit: string;
    role: string;
  }>(
    `SELECT u.id, u.name, u.rank, u.unit, u.role FROM ${SCHEMA}.sessions s
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
    const action = url.searchParams.get("action") || "";

    // ===== GET /requests — список запросов =====
    if (method === "GET" && !action) {
      let query = "";
      const params: any[] = [];
      const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "senior_ufsvng"].includes(r);
      if (isInstructor(user.role)) {
        query = `
          SELECT r.id, r.type, r.subject, r.description, r.preferred_date,
                 r.status, r.instructor_comment, r.created_at, r.updated_at,
                 r.instructor_id,
                 u.name as cadet_name, u.rank as cadet_rank, u.static_id as cadet_static_id,
                 u.id as cadet_id, u.discord_id as cadet_discord_id,
                 rv.name as reviewer_name,
                 inst.name as target_instructor_name, inst.rank as target_instructor_rank
          FROM ${SCHEMA}.requests r
          JOIN ${SCHEMA}.users u ON r.user_id = u.id
          LEFT JOIN ${SCHEMA}.users rv ON r.reviewed_by = rv.id
          LEFT JOIN ${SCHEMA}.users inst ON r.instructor_id = inst.id
          ORDER BY r.created_at DESC
        `;
      } else {
        query = `
          SELECT r.id, r.type, r.subject, r.description, r.preferred_date,
                 r.status, r.instructor_comment, r.created_at, r.updated_at,
                 r.instructor_id,
                 u.name as cadet_name, u.rank as cadet_rank, u.static_id as cadet_static_id,
                 u.id as cadet_id, u.discord_id as cadet_discord_id,
                 rv.name as reviewer_name,
                 inst.name as target_instructor_name, inst.rank as target_instructor_rank
          FROM ${SCHEMA}.requests r
          JOIN ${SCHEMA}.users u ON r.user_id = u.id
          LEFT JOIN ${SCHEMA}.users rv ON r.reviewed_by = rv.id
          LEFT JOIN ${SCHEMA}.users inst ON r.instructor_id = inst.id
          WHERE r.user_id = $1
          ORDER BY r.created_at DESC
        `;
        params.push(user.id);
      }

      const res = await client.queryObject<any>(query, params);
      const requests = res.rows.map(row => {
        const item = { ...row };
        if (item.created_at) item.created_at = new Date(item.created_at).toISOString();
        if (item.updated_at) item.updated_at = new Date(item.updated_at).toISOString();
        if (item.preferred_date) item.preferred_date = new Date(item.preferred_date).toISOString();
        return item;
      });

      return new Response(JSON.stringify({ requests }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== POST /requests — создать запрос (курсант) =====
    if (method === "POST" && !action) {
      const body = await req.json().catch(() => ({}));
      const req_type = body.type;
      const subject = String(body.subject || "").trim();
      const description = String(body.description || "").trim();
      const preferred_date = body.preferred_date || null;
      const instructor_id = body.instructor_id ? Number(body.instructor_id) : null;

      if (!req_type || !["lecture", "practice", "exam", "report"].includes(req_type)) {
        return new Response(JSON.stringify({ error: "Неверный тип запроса" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
      if (!subject) {
        return new Response(JSON.stringify({ error: "Укажите тему" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const discord_message_id = body.discord_message_id || null;
      const discord_channel_id = body.discord_channel_id || null;

      const insertRes = await client.queryObject<{ id: number }>(
        `INSERT INTO ${SCHEMA}.requests (user_id, type, subject, description, preferred_date, discord_message_id, discord_channel_id, instructor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [user.id, req_type, subject, description || null, preferred_date, discord_message_id, discord_channel_id, instructor_id]
      );
      const newId = insertRes.rows[0].id;

      // Уведомление всем инструкторам
      const typeMap: Record<string, string> = { lecture: "лекция", practice: "практика", exam: "экзамен", report: "рапорт" };
      const typeText = typeMap[req_type] || req_type;

      let instName = "";
      if (instructor_id) {
        const instRes = await client.queryObject<{ name: string }>(
          `SELECT name FROM ${SCHEMA}.users WHERE id = $1`,
          [instructor_id]
        );
        if (instRes.rows.length > 0) {
          instName = instRes.rows[0].name;
        }
      }

      const msgText = instName 
        ? `${user.rank} ${user.name} подал запрос на тему "${subject}" (${typeText}). Выбранный инструктор: ${instName}.`
        : `${user.rank} ${user.name} подал запрос на тему "${subject}" (${typeText}).`;

      await client.queryArray(
        `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
         SELECT id, 'new_request', $1, $2
         FROM ${SCHEMA}.users
         WHERE role IN ('instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor', 'deputy_head', 'senior_ufsvng')`,
        [
          `Новый запрос: ${typeText}`,
          msgText
        ]
      );

      return new Response(JSON.stringify({ success: true, id: newId }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== PUT /requests?action=start_review — инструктор берет на рассмотрение =====
    if (method === "PUT" && action === "start_review") {
      const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "senior_ufsvng"].includes(r);
      if (!isInstructor(user.role)) {
        return new Response(JSON.stringify({ error: "Только для инструкторов" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const requestId = url.searchParams.get("id");
      if (!requestId || !/^\d+$/.test(requestId)) {
        return new Response(JSON.stringify({ error: "Неверный ID запроса" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Check current request status
      const checkRes = await client.queryObject<{ status: string, user_id: number, subject: string, type: string }>(
        `SELECT status, user_id, subject, type FROM ${SCHEMA}.requests WHERE id = $1`,
        [Number(requestId)]
      );
      if (checkRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Запрос не найден" }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const reqInfo = checkRes.rows[0];

      // Update request: set status to pending and instructor_id to current instructor
      await client.queryArray(
        `UPDATE ${SCHEMA}.requests
         SET status = 'pending', instructor_id = $1, reviewed_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [user.id, Number(requestId)]
      );

      // Create notification for cadet with Surname, Name and channel instructions
      const cadetId = reqInfo.user_id;
      const subject = reqInfo.subject;
      const reqType = reqInfo.type;

      let channelName = "кабинет руководства";
      if (reqType === "lecture") {
        channelName = "Ожидание лекций";
      } else if (reqType === "practice") {
        channelName = "Ожидание практик";
      } else if (reqType === "exam") {
        channelName = "Ожидание экзамена";
      }

      const notifTitle = "Заявка на рассмотрении";
      const notifMessage = `Инструктор ${user.name} принял ваш запрос на тему "${subject}" на рассмотрение. Пожалуйста, зайдите в голосовой канал "${channelName}".`;

      await client.queryArray(
        `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)`,
        [cadetId, "request_reviewed", notifTitle, notifMessage]
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== PUT /requests?action=review — инструктор одобряет/отклоняет =====
    if (method === "PUT" && action === "review") {
      const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "senior_ufsvng"].includes(r);
      if (!isInstructor(user.role)) {
        return new Response(JSON.stringify({ error: "Только для инструкторов" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const requestId = url.searchParams.get("id");
      if (!requestId || !/^\d+$/.test(requestId)) {
        return new Response(JSON.stringify({ error: "Неверный ID запроса" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const body = await req.json().catch(() => ({}));
      const status = body.status;
      const comment = String(body.comment || "").trim();

      if (status !== "approved" && status !== "rejected") {
        return new Response(JSON.stringify({ error: "Статус: approved или rejected" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const checkRes = await client.queryObject<{ instructor_id: number | null }>(
        `SELECT instructor_id FROM ${SCHEMA}.requests WHERE id = $1`,
        [Number(requestId)]
      );
      if (checkRes.rows.length > 0) {
        const targetInstId = checkRes.rows[0].instructor_id;
        if (targetInstId && targetInstId !== user.id) {
          return new Response(JSON.stringify({ error: "Этот запрос адресован конкретному инструктору" }), {
            status: 403,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
      }

      await client.queryArray(
        `UPDATE ${SCHEMA}.requests
         SET status = $1, instructor_comment = $2, reviewed_by = $3,
             reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $4`,
        [status, comment || null, user.id, Number(requestId)]
      );

      const reqRes = await client.queryObject<{ 
        user_id: number; 
        subject: string; 
        type: string;
        discord_message_id: string | null;
        discord_channel_id: string | null;
      }>(
        `SELECT user_id, subject, type, discord_message_id, discord_channel_id FROM ${SCHEMA}.requests WHERE id = $1`,
        [Number(requestId)]
      );

      if (reqRes.rows.length > 0) {
        const cadetId = reqRes.rows[0].user_id;
        const subject = reqRes.rows[0].subject;
        const reqType = reqRes.rows[0].type;
        const msgId = reqRes.rows[0].discord_message_id;
        const chanId = reqRes.rows[0].discord_channel_id;
        const statusText = status === "approved" ? "одобрен" : "отклонён";
        let notifMessage = `Инструктор ${user.name} ${statusText} ваш запрос на тему "${subject}".`;
        if (comment) {
          notifMessage += ` Комментарий: ${comment}`;
        }

        await client.queryArray(
          `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
           VALUES ($1, $2, $3, $4)`,
          [cadetId, "request_reviewed", `Запрос ${statusText}`, notifMessage]
        );

        // Add ❌ reaction to original Discord message if the request is a rejected dismissal report (non-blocking)
        if (status === "rejected" && subject === "Рапорт на увольнение из академии" && msgId && chanId) {
          const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
          if (botToken) {
            (async () => {
              try {
                const url = `https://discord.com/api/v10/channels/${chanId}/messages/${msgId}/reactions/%E2%9D%8C/@me`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout limit
                
                const dRes = await fetch(url, {
                  method: "PUT",
                  headers: {
                    "Authorization": `Bot ${botToken}`,
                    "Content-Type": "application/json"
                  },
                  signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (!dRes.ok) {
                  const errText = await dRes.text();
                  console.error(`Discord reaction error: ${dRes.status} ${errText}`);
                } else {
                  console.log(`Successfully reacted ❌ to message ${msgId} in channel ${chanId}`);
                }
              } catch (err) {
                console.error(`Failed to add Discord reaction: ${err.message}`);
              }
            })();
          } else {
            console.warn("DISCORD_BOT_TOKEN not found in environment, skipped Discord reaction");
          }
        }

        // Auto-grade if type is lecture, practice, or exam
        if (reqType === "lecture" || reqType === "practice" || reqType === "exam") {
          // Check if grade already exists for this request to prevent duplicates
          const existingGrade = await client.queryObject<{ id: number }>(
            `SELECT id FROM ${SCHEMA}.grades WHERE request_id = $1`,
            [Number(requestId)]
          );
          const gradeVal = status === "approved" ? 5 : 1;
          const gradeComment = comment || (status === "approved" ? "Автоматический зачет по запросу" : "Автоматический незачет по запросу");
          if (existingGrade.rows.length === 0) {
            await client.queryArray(
              `INSERT INTO ${SCHEMA}.grades (user_id, instructor_id, request_id, subject, type, grade, comment)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [cadetId, user.id, Number(requestId), subject, reqType, gradeVal, gradeComment]
            );
          } else {
            await client.queryArray(
              `UPDATE ${SCHEMA}.grades 
               SET grade = $1, comment = $2, instructor_id = $3
               WHERE request_id = $4`,
              [gradeVal, gradeComment, user.id, Number(requestId)]
            );
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== GET /requests?action=grades — оценки =====
    if (method === "GET" && action === "grades") {
      let query = "";
      const params: any[] = [];

      const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "senior_ufsvng"].includes(r);
      if (isInstructor(user.role)) {
        query = `
          SELECT g.id, g.subject, g.type, g.grade, g.comment, g.graded_at,
                 u.name as cadet_name, u.rank as cadet_rank, u.id as cadet_id,
                 i.name as instructor_name, g.instructor_promo_used
          FROM ${SCHEMA}.grades g
          JOIN ${SCHEMA}.users u ON g.user_id = u.id
          JOIN ${SCHEMA}.users i ON g.instructor_id = i.id
          ORDER BY g.graded_at DESC
        `;
      } else {
        query = `
          SELECT g.id, g.subject, g.type, g.grade, g.comment, g.graded_at,
                 u.name as cadet_name, u.rank as cadet_rank, u.id as cadet_id,
                 i.name as instructor_name
          FROM ${SCHEMA}.grades g
          JOIN ${SCHEMA}.users u ON g.user_id = u.id
          JOIN ${SCHEMA}.users i ON g.instructor_id = i.id
          WHERE g.user_id = $1
          ORDER BY g.graded_at DESC
        `;
        params.push(user.id);
      }

      const res = await client.queryObject<any>(query, params);
      const grades = res.rows.map(row => {
        const item = { ...row };
        if (item.graded_at) item.graded_at = new Date(item.graded_at).toISOString();
        return item;
      });

      return new Response(JSON.stringify({ grades }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== POST /requests?action=grade — инструктор ставит оценку =====
    if (method === "POST" && action === "grade") {
      const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "senior_ufsvng"].includes(r);
      if (!isInstructor(user.role)) {
        return new Response(JSON.stringify({ error: "Только для инструкторов" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const body = await req.json().catch(() => ({}));
      const cadetId = Number(body.cadet_id || 0);
      const subject = String(body.subject || "").trim();
      const gradeType = body.type;
      const gradeVal = Number(body.grade || 0);
      const comment = String(body.comment || "").trim();
      const requestId = body.request_id ? Number(body.request_id) : null;

      if (!cadetId || !subject) {
        return new Response(JSON.stringify({ error: "Укажите курсанта и тему" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
      if (!["lecture", "practice", "exam"].includes(gradeType)) {
        return new Response(JSON.stringify({ error: "Неверный тип оценки" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
      if (gradeVal !== 1 && gradeVal !== 5) {
        return new Response(JSON.stringify({ error: "Неверная оценка (должна быть 1 или 5)" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      if (requestId) {
        const checkRes = await client.queryObject<{ instructor_id: number | null }>(
          `SELECT instructor_id FROM ${SCHEMA}.requests WHERE id = $1`,
          [requestId]
        );
        if (checkRes.rows.length > 0) {
          const targetInstId = checkRes.rows[0].instructor_id;
          if (targetInstId && targetInstId !== user.id) {
            return new Response(JSON.stringify({ error: "Этот запрос адресован конкретному инструктору" }), {
              status: 403,
              headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
            });
          }
        }
      }

      const insertRes = await client.queryObject<{ id: number }>(
        `INSERT INTO ${SCHEMA}.grades (user_id, instructor_id, request_id, subject, type, grade, comment)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [cadetId, user.id, requestId, subject, gradeType, gradeVal, comment || null]
      );
      const newId = insertRes.rows[0].id;

      if (requestId) {
        await client.queryArray(
          `UPDATE ${SCHEMA}.requests
           SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [user.id, requestId]
        );
      }

      const typeMap: Record<string, string> = { lecture: "лекция", practice: "практика", exam: "экзамен" };
      const typeText = typeMap[gradeType] || gradeType;
      const resultText = gradeVal === 5 ? "Зачтено" : "Не зачтено";
      let notifMessage = `Инструктор ${user.name} выставил решение "${resultText}" по предмету "${subject}" (${typeText}).`;
      if (comment) {
        notifMessage += ` Комментарий: ${comment}`;
      }

      await client.queryArray(
        `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)`,
        [cadetId, "grade_added", `Новое решение: ${resultText}`, notifMessage]
      );

      return new Response(JSON.stringify({ success: true, id: newId }), {
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
}

if (import.meta.main) {
  Deno.serve(handler);
}
