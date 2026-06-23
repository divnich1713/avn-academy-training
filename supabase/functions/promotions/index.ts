import { Pool, Client } from "postgres";

const SCHEMA = "t_p29017774_avn_academy_training";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
};

const PROMOTION_REQUIREMENTS: Record<string, {
  label: string;
  rank: string;
  items: { category: string; label: string; type: string; subject: string }[];
}> = {
  junior_sergeant: {
    label: "Младший Сержант",
    rank: "Младший Сержант",
    items: [
      { category: "Подготовка", label: "Строевая, физическая и огневая подготовка", type: "practice", subject: "Строевая, физическая и огневая подготовка" },
      { category: "Подготовка", label: "Присяга", type: "practice", subject: "Присяга" },
      { category: "Теория", label: "Вступительная лекция", type: "lecture", subject: "Прослушать вступительную лекцию" },
      { category: "Теория", label: "Лекция ФЗ о ФСВНГ и Уставу", type: "lecture", subject: "Лекция ФЗ о ФСВНГ и Внутреннему Уставу" },
      { category: "Практика", label: "Вышка — 30 мин (доклад каждые 10 мин)", type: "practice", subject: "Вышка — 30 мин" },
      { category: "Практика", label: "Патруль по территории — 30 мин (доклад каждые 10 мин)", type: "practice", subject: "Патруль по территории — 30 мин" },
      { category: "Дополнительно", label: "Заполнение личного дела", type: "practice", subject: "Заполнение личного дела" },
      { category: "Аттестация", label: "Тест: ФЗ о ФСВНГ и Внутреннему Уставу", type: "test", subject: "Тест по ФЗ ФСВНГ и уставу ФСВНГ" },
    ],
  },
  sergeant: {
    label: "Сержант",
    rank: "Сержант",
    items: [
      { category: "Подготовка", label: "Отработка Штраф Задержание Ареста на инструкторе", type: "practice", subject: "Отработка Штраф Задержание Ареста на инструкторе" },
      { category: "Практика", label: "Наряд на КПП-1 — 30 мин (доклад каждые 10 мин)", type: "practice", subject: "Наряд на КПП-1 — 30 мин" },
      { category: "Практика", label: "Наряд на КПП-2 — 1 час (доклад каждые 20 мин)", type: "practice", subject: "Наряд на КПП-2 — 1 час" },
      { category: "Практика", label: "Участие в гос. поставке (4 шт, с инструктором)", type: "practice", subject: "Участие в государственной поставке" },
      { category: "Практика", label: "Участие в досмотрах на 2 собеседованиях", type: "practice", subject: "Участие в досмотровых мероприятиях" },
      { category: "Теория", label: "Лекция: УК / ПК / КоАП", type: "lecture", subject: "Лекция УК, ПК и КоАП" },
      { category: "Теория", label: "Лекция: О ФЗ закрытых территорий", type: "lecture", subject: "Лекция: О ФЗ закрытых территорий" },
      { category: "Аттестация", label: "Экзамен процедуры практики — Штраф — Задержание — Арест", type: "exam", subject: "Экзамен процедуры практики — Штраф — Задержание — Арест" },
      { category: "Аттестация", label: "Тест: УК, ПК, КоАП", type: "test", subject: "Тест по \"УК и КоАП, ПК\"" },
    ],
  },
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

async function handleUploadEvidence(req: Request, userId: number): Promise<Response> {
  try {
    const contentType = req.headers.get("content-type") || "image/png";
    const extension = contentType.split("/")[1] || "png";
    const arrayBuffer = await req.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const filename = `inst_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && serviceRoleKey && supabaseUrl.includes("supabase.co")) {
      console.log(`Uploading to Supabase Storage: ${filename}`);
      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/instructor-evidence/${filename}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": contentType,
          },
          body: uint8Array,
        }
      );
      if (uploadRes.ok) {
        return new Response(JSON.stringify({ 
          success: true, 
          url: `/supabase-api/storage/v1/object/public/instructor-evidence/${filename}` 
        }), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      } else {
        console.warn("Supabase Storage upload failed, trying local fallback", await uploadRes.text());
      }
    }

    // Local fallback: write to filesystem
    try {
      const publicUploadsDir = "/app/public/uploads";
      await Deno.mkdir(publicUploadsDir, { recursive: true });
      const filepath = `${publicUploadsDir}/${filename}`;
      await Deno.writeFile(filepath, uint8Array);
      console.log(`Local file saved: ${filepath}`);
      return new Response(JSON.stringify({ 
        success: true, 
        url: `/uploads/${filename}` 
      }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    } catch (fsErr) {
      console.error("Local file system upload failed:", fsErr);
      return new Response(JSON.stringify({ error: "Не удалось сохранить файл" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }
  } catch (err) {
    console.error("Upload error:", err);
    return new Response(JSON.stringify({ error: err.message || "Ошибка при загрузке файла" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
}

async function checkRequirements(
  client: Client,
  userId: number,
  promotionType: string
) {
  const reqs = PROMOTION_REQUIREMENTS[promotionType];
  if (!reqs) return null;

  // Query manual/instructor grades
  const gradesRes = await client.queryObject<{
    subject: string;
    type: string;
    grade: number;
    graded_at: Date;
  }>(
    `SELECT subject, type, grade, graded_at FROM ${SCHEMA}.grades
     WHERE user_id = $1 AND grade >= 3`,
    [userId]
  );

  const gradeMap = new Map<string, { grade: number; graded_at: Date }>();
  for (const row of gradesRes.rows) {
    const key = `${row.type}::${row.subject}`;
    gradeMap.set(key, { grade: row.grade, graded_at: row.graded_at });
  }

  // Query online test attempts and compute average score percentage
  const testAttemptsRes = await client.queryObject<{
    subject: string;
    completed_at: Date;
    score_percent: number;
  }>(
    `SELECT a.subject, a.completed_at, COALESCE(AVG(ans.grade), 0) as score_percent
     FROM ${SCHEMA}.test_attempts a
     LEFT JOIN ${SCHEMA}.test_answers ans ON a.id = ans.attempt_id
     WHERE a.user_id = $1 AND a.status = 'completed'
     GROUP BY a.id, a.subject, a.completed_at`,
    [userId]
  );

  const testMap = new Map<string, { grade: number; graded_at: Date }>();
  for (const row of testAttemptsRes.rows) {
    const score = Number(row.score_percent);
    if (score >= 80) {
      // Map score percentage to display grade (e.g. 5 for >= 90%, 4 for >= 80%, 3 for >= 60%)
      let displayGrade = 3;
      if (score >= 90) displayGrade = 5;
      else if (score >= 80) displayGrade = 4;

      // Keep the attempt with the highest score or the latest completed one
      const existing = testMap.get(row.subject);
      if (!existing || displayGrade > existing.grade) {
        testMap.set(row.subject, { grade: displayGrade, graded_at: row.completed_at });
      }
    }
  }

  let completedCount = 0;
  const items = reqs.items.map((item) => {
    const isTest = item.type === "test";
    let found = isTest ? testMap.get(item.subject) : gradeMap.get(`${item.type}::${item.subject}`);
    if (!found && !isTest && item.subject === "Строевая, физическая и огневая подготовка") {
      found = gradeMap.get(`${item.type}::Строевая подготовка`) ||
              gradeMap.get(`${item.type}::Физическая подготовка`) ||
              gradeMap.get(`${item.type}::Огневая подготовка`);
    }
    const completed = !!found;
    if (completed) completedCount++;
    return {
      category: item.category,
      label: item.label,
      type: item.type,
      subject: item.subject,
      completed,
      grade: found ? found.grade : null,
      graded_at: found ? new Date(found.graded_at).toISOString() : null,
    };
  });

  return {
    promotion_type: promotionType,
    label: reqs.label,
    items,
    completed_count: completedCount,
    total_count: reqs.items.length,
    all_completed: completedCount === reqs.items.length,
  };
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

    // ===== GET /promotions?action=requirements — список требований =====
    if (method === "GET" && action === "requirements") {
      return new Response(JSON.stringify({ requirements: PROMOTION_REQUIREMENTS }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== GET /promotions?action=instructor_config — получить настройки повышения инструкторов =====
    if (method === "GET" && action === "instructor_config") {
      const res = await client.queryObject<{
        points_config: string;
        ranks_flow: string;
      }>(
        `SELECT points_config, ranks_flow FROM ${SCHEMA}.instructor_promotion_settings LIMIT 1`
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        let points_config = row.points_config;
        let ranks_flow = row.ranks_flow;
        if (typeof points_config === "string") {
          try { points_config = JSON.parse(points_config); } catch (_) {}
        }
        if (typeof ranks_flow === "string") {
          try { ranks_flow = JSON.parse(ranks_flow); } catch (_) {}
        }
        return new Response(JSON.stringify({ points_config, ranks_flow }), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ points_config: null, ranks_flow: null }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== GET /promotions?action=available_activities — получить неиспользованные активности =====
    if (method === "GET" && action === "available_activities") {
      const gradesRes = await client.queryObject<{
        id: number;
        subject: string;
        type: string;
        grade: number;
        graded_at: Date;
        cadet_name: string;
      }>(
        `SELECT g.id, g.subject, g.type, g.grade, g.graded_at, u.name as cadet_name
         FROM ${SCHEMA}.grades g
         JOIN ${SCHEMA}.users u ON g.user_id = u.id
         WHERE g.instructor_id = $1 AND g.instructor_promo_used = FALSE`,
        [user.id]
      );

      const reportsRes = await client.queryObject<{
        id: number;
        promotion_type: string;
        status: string;
        reviewed_at: Date;
        cadet_name: string;
      }>(
        `SELECT pr.id, pr.promotion_type, pr.status, pr.reviewed_at, u.name as cadet_name
         FROM ${SCHEMA}.promotion_reports pr
         JOIN ${SCHEMA}.users u ON pr.user_id = u.id
         WHERE pr.reviewed_by = $1 AND pr.status IN ('approved', 'rejected') AND pr.instructor_promo_used = FALSE`,
        [user.id]
      );

      const grades = gradesRes.rows.map(row => {
        const item = { ...row };
        if (item.graded_at) item.graded_at = new Date(item.graded_at).toISOString();
        return item;
      });

      const reports = reportsRes.rows.map(row => {
        const item = { ...row };
        if (item.reviewed_at) item.reviewed_at = new Date(item.reviewed_at).toISOString();
        return item;
      });

      return new Response(JSON.stringify({ grades, reports }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== GET /promotions?action=warnings — получить выговоры пользователя =====
    if (method === "GET" && action === "warnings") {
      let targetUserId = user.id;
      const userIdParam = url.searchParams.get("user_id");
      if (userIdParam) {
        targetUserId = Number(userIdParam);
      }

      const res = await client.queryObject<any>(
        `SELECT w.id, w.user_id, w.reason, w.is_active, w.created_at,
                u.name as issued_by_name
         FROM ${SCHEMA}.instructor_warnings w
         JOIN ${SCHEMA}.users u ON w.issued_by = u.id
         WHERE w.user_id = $1
         ORDER BY w.created_at DESC`,
        [targetUserId]
      );

      const warnings = res.rows.map((row: any) => {
        const item = { ...row };
        if (item.created_at) item.created_at = new Date(item.created_at).toISOString();
        return item;
      });

      return new Response(JSON.stringify({ warnings }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== GET /promotions?action=check&type=... — проверка прогресса =====
    if (method === "GET" && action === "check") {
      const promotionType = url.searchParams.get("type") || "";
      if (!PROMOTION_REQUIREMENTS[promotionType]) {
        return new Response(JSON.stringify({ error: "Неверный тип повышения" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      let targetUserId = user.id;
      const cadetIdParam = url.searchParams.get("cadet_id");
      if (cadetIdParam) {
        const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "senior_ufsvng"].includes(r);
        if (!isInstructor(user.role)) {
          return new Response(JSON.stringify({ error: "Только для инструкторов" }), {
            status: 403,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
        targetUserId = Number(cadetIdParam);
        if (!targetUserId || isNaN(targetUserId)) {
          return new Response(JSON.stringify({ error: "Неверный ID курсанта" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
      }

      const result = await checkRequirements(client, targetUserId, promotionType);
      
      // Добавим информацию об активных выговорах
      const warningsRes = await client.queryObject<{ count: number }>(
        `SELECT COUNT(id)::int as count FROM ${SCHEMA}.instructor_warnings WHERE user_id = $1 AND is_active = TRUE`,
        [targetUserId]
      );
      const activeWarningsCount = Number(warningsRes.rows[0]?.count || 0);

      return new Response(JSON.stringify({ ...result, active_warnings_count: activeWarningsCount }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== GET /promotions?action=instructor_reports =====
    if (method === "GET" && action === "instructor_reports") {
      let query = "";
      const params: any[] = [];
      const isLeadership = (r: string) => ["head_avng", "chief_instructor", "deputy_head"].includes(r);
      if (isLeadership(user.role)) {
        query = `
          SELECT ipr.id, ipr.current_rank, ipr.target_rank, ipr.total_points, ipr.items_completed,
                 ipr.status, ipr.instructor_comment, ipr.reviewed_at, ipr.created_at,
                 u.name as instructor_name, u.static_id as instructor_static_id,
                 u.id as instructor_id, u.discord_id as instructor_discord_id,
                 rv.name as reviewer_name
          FROM ${SCHEMA}.instructor_promotion_reports ipr
          JOIN ${SCHEMA}.users u ON ipr.user_id = u.id
          LEFT JOIN ${SCHEMA}.users rv ON ipr.reviewed_by = rv.id
          ORDER BY ipr.created_at DESC
        `;
      } else {
        query = `
          SELECT ipr.id, ipr.current_rank, ipr.target_rank, ipr.total_points, ipr.items_completed,
                 ipr.status, ipr.instructor_comment, ipr.reviewed_at, ipr.created_at,
                 u.name as instructor_name, u.static_id as instructor_static_id,
                 u.id as instructor_id, u.discord_id as instructor_discord_id,
                 rv.name as reviewer_name
          FROM ${SCHEMA}.instructor_promotion_reports ipr
          JOIN ${SCHEMA}.users u ON ipr.user_id = u.id
          LEFT JOIN ${SCHEMA}.users rv ON ipr.reviewed_by = rv.id
          WHERE ipr.user_id = $1
          ORDER BY ipr.created_at DESC
        `;
        params.push(user.id);
      }

      const res = await client.queryObject<any>(query, params);
      const reports = res.rows.map(row => {
        const item = { ...row };
        if (item.created_at) item.created_at = new Date(item.created_at).toISOString();
        if (item.reviewed_at) item.reviewed_at = new Date(item.reviewed_at).toISOString();
        if (typeof item.items_completed === "string") {
          try {
            item.items_completed = JSON.parse(item.items_completed);
          } catch (_) {}
        }
        return item;
      });

      return new Response(JSON.stringify({ reports }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== GET /promotions — список рапортов на повышение =====
    if (method === "GET" && !action) {
      let query = "";
      const params: any[] = [];
      const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "senior_ufsvng"].includes(r);
      if (isInstructor(user.role)) {
        query = `
          SELECT pr.id, pr.promotion_type, pr.status, pr.instructor_comment,
                 pr.reviewed_at, pr.created_at,
                 u.name as cadet_name, u.rank as cadet_rank, u.static_id as cadet_static_id,
                 u.id as cadet_id,
                 u.discord_id as cadet_discord_id,
                 rv.name as reviewer_name, pr.instructor_promo_used
          FROM ${SCHEMA}.promotion_reports pr
          JOIN ${SCHEMA}.users u ON pr.user_id = u.id
          LEFT JOIN ${SCHEMA}.users rv ON pr.reviewed_by = rv.id
          ORDER BY pr.created_at DESC
        `;
      } else {
        query = `
          SELECT pr.id, pr.promotion_type, pr.status, pr.instructor_comment,
                 pr.reviewed_at, pr.created_at,
                 u.name as cadet_name, u.rank as cadet_rank, u.static_id as cadet_static_id,
                 u.id as cadet_id,
                 u.discord_id as cadet_discord_id,
                 rv.name as reviewer_name, pr.instructor_promo_used
          FROM ${SCHEMA}.promotion_reports pr
          JOIN ${SCHEMA}.users u ON pr.user_id = u.id
          LEFT JOIN ${SCHEMA}.users rv ON pr.reviewed_by = rv.id
          WHERE pr.user_id = $1
          ORDER BY pr.created_at DESC
        `;
        params.push(user.id);
      }

      const res = await client.queryObject<any>(query, params);
      const reports = res.rows.map(row => {
        const item = { ...row };
        if (item.created_at) item.created_at = new Date(item.created_at).toISOString();
        if (item.reviewed_at) item.reviewed_at = new Date(item.reviewed_at).toISOString();
        return item;
      });

      return new Response(JSON.stringify({ reports }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== POST /promotions — курсант подаёт рапорт на повышение =====
    if (method === "POST" && !action) {
      if (user.role !== "cadet") {
        return new Response(JSON.stringify({ error: "Только для курсантов" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const body = await req.json().catch(() => ({}));
      const promotionType = body.promotion_type;

      if (!promotionType || !PROMOTION_REQUIREMENTS[promotionType]) {
        return new Response(JSON.stringify({ error: "Неверный тип повышения" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Проверка: все требования выполнены
      const checkResult = await checkRequirements(client, user.id, promotionType);
      if (!checkResult || !checkResult.all_completed) {
        return new Response(JSON.stringify({ error: "Не все требования выполнены", check: checkResult }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Проверка: нет pending рапорта такого же типа
      const pendingRes = await client.queryObject<{ id: number }>(
        `SELECT id FROM ${SCHEMA}.promotion_reports
         WHERE user_id = $1 AND promotion_type = $2 AND status = 'pending'`,
        [user.id, promotionType]
      );
      if (pendingRes.rows.length > 0) {
        return new Response(JSON.stringify({ error: "У вас уже есть ожидающий рапорт на это повышение" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Проверка: нет approved рапорта такого же типа (уже повышен)
      const approvedRes = await client.queryObject<{ id: number }>(
        `SELECT id FROM ${SCHEMA}.promotion_reports
         WHERE user_id = $1 AND promotion_type = $2 AND status = 'approved'`,
        [user.id, promotionType]
      );
      if (approvedRes.rows.length > 0) {
        return new Response(JSON.stringify({ error: "Вы уже получили это повышение" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const insertRes = await client.queryObject<{ id: number }>(
        `INSERT INTO ${SCHEMA}.promotion_reports (user_id, promotion_type)
         VALUES ($1, $2) RETURNING id`,
        [user.id, promotionType]
      );
      const newId = insertRes.rows[0].id;

      // Уведомление всем инструкторам
      const reqs = PROMOTION_REQUIREMENTS[promotionType];
      await client.queryArray(
        `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
         SELECT id, 'promotion_request', $1, $2
         FROM ${SCHEMA}.users
         WHERE role IN ('instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor', 'deputy_head', 'senior_ufsvng')`,
        [
          `Рапорт на повышение: ${reqs.label}`,
          `${user.rank} ${user.name} подал рапорт на повышение до ${reqs.label}.`
        ]
      );

      return new Response(JSON.stringify({ success: true, id: newId }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== POST /promotions?action=save_instructor_config — сохранить настройки повышения инструкторов =====
    if (method === "POST" && action === "save_instructor_config") {
      if (user.role !== "head_avng") {
        return new Response(JSON.stringify({ error: "Доступ запрещён. Настраивать систему повышения может только Начальник АВНГ." }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const body = await req.json().catch(() => ({}));
      const points_config = body.points_config;
      const ranks_flow = body.ranks_flow;

      if (!points_config || !ranks_flow) {
        return new Response(JSON.stringify({ error: "Неверные параметры конфигурации" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Check if row exists
      const existRes = await client.queryObject<{ id: number }>(
        `SELECT id FROM ${SCHEMA}.instructor_promotion_settings LIMIT 1`
      );

      if (existRes.rows.length > 0) {
        await client.queryArray(
          `UPDATE ${SCHEMA}.instructor_promotion_settings
           SET points_config = $1, ranks_flow = $2, updated_at = NOW()
           WHERE id = $3`,
          [JSON.stringify(points_config), JSON.stringify(ranks_flow), existRes.rows[0].id]
        );
      } else {
        await client.queryArray(
          `INSERT INTO ${SCHEMA}.instructor_promotion_settings (points_config, ranks_flow)
           VALUES ($1, $2)`,
          [JSON.stringify(points_config), JSON.stringify(ranks_flow)]
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== POST /promotions?action=upload_evidence — загрузить скриншот доказательства =====
    if (method === "POST" && action === "upload_evidence") {
      return await handleUploadEvidence(req, user.id);
    }

    // ===== POST /promotions?action=issue_warning — выдать выговор инструктору =====
    if (method === "POST" && action === "issue_warning") {
      const isLeadership = (r: string) => ["head_avng", "deputy_head"].includes(r);
      if (!isLeadership(user.role)) {
        return new Response(JSON.stringify({ error: "Только Начальник АВНГ и его Заместители могут выдавать выговоры" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const body = await req.json().catch(() => ({}));
      const targetUserId = Number(body.user_id || 0);
      const reason = String(body.reason || "").trim();

      if (!targetUserId || !reason) {
        return new Response(JSON.stringify({ error: "Укажите ID пользователя и причину выговора" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      await client.queryArray(
        `INSERT INTO ${SCHEMA}.instructor_warnings (user_id, reason, issued_by)
         VALUES ($1, $2, $3)`,
        [targetUserId, reason, user.id]
      );

      // Уведомление пользователю
      await client.queryArray(
        `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)`,
        [
          targetUserId,
          "warning_issued",
          `Выдан выговор`,
          `Вам был выдан дисциплинарный выговор. Причина: ${reason}. Выдача рапортов заблокирована до снятия выговора.`
        ]
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== POST /promotions?action=submit_instructor_report =====
    if (method === "POST" && action === "submit_instructor_report") {
      const body = await req.json().catch(() => ({}));
      const currentRank = String(body.current_rank || "").trim();
      const targetRank = String(body.target_rank || "").trim();
      const totalPoints = Number(body.total_points || 0);
      const itemsCompleted = body.items_completed || [];

      if (!currentRank || !targetRank || totalPoints <= 0) {
        return new Response(JSON.stringify({ error: "Неверные параметры рапорта" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Проверка: нет активных выговоров
      const warningsRes = await client.queryObject<{ count: number }>(
        `SELECT COUNT(id)::int as count FROM ${SCHEMA}.instructor_warnings WHERE user_id = $1 AND is_active = TRUE`,
        [user.id]
      );
      if (Number(warningsRes.rows[0]?.count || 0) > 0) {
        return new Response(JSON.stringify({ error: "Подача рапорта заблокирована: у вас есть активный выговор" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Проверка: нет pending рапорта
      const pendingRes = await client.queryObject<{ id: number }>(
        `SELECT id FROM ${SCHEMA}.instructor_promotion_reports
         WHERE user_id = $1 AND status = 'pending'`,
        [user.id]
      );
      if (pendingRes.rows.length > 0) {
        return new Response(JSON.stringify({ error: "У вас уже есть ожидающий рапорт на рассмотрении" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const insertRes = await client.queryObject<{ id: number }>(
        `INSERT INTO ${SCHEMA}.instructor_promotion_reports (user_id, current_rank, target_rank, total_points, items_completed)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.id, currentRank, targetRank, totalPoints, JSON.stringify(itemsCompleted)]
      );
      const newId = insertRes.rows[0].id;

      // Уведомление руководству
      await client.queryArray(
        `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
         SELECT id, 'instructor_promotion_request', $1, $2
         FROM ${SCHEMA}.users
         WHERE role IN ('head_avng', 'chief_instructor', 'deputy_head')`,
        [
          `Рапорт инструктора: ${targetRank}`,
          `${user.rank} ${user.name} подал рапорт на повышение до ${targetRank} (${totalPoints} баллов).`
        ]
      );

      return new Response(JSON.stringify({ success: true, id: newId }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== PUT /promotions?action=review&id=N — инструктор рассматривает рапорт =====
    if (method === "PUT" && action === "review") {
        const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "senior_ufsvng"].includes(r);
        if (!isInstructor(user.role)) {
          return new Response(JSON.stringify({ error: "Только для инструкторов" }), {
            status: 403,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }

      const reportId = url.searchParams.get("id");
      if (!reportId || !/^\d+$/.test(reportId)) {
        return new Response(JSON.stringify({ error: "Неверный ID рапорта" }), {
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

      // Получить рапорт
      const reportRes = await client.queryObject<{
        id: number;
        user_id: number;
        promotion_type: string;
        status: string;
      }>(
        `SELECT id, user_id, promotion_type, status FROM ${SCHEMA}.promotion_reports WHERE id = $1`,
        [Number(reportId)]
      );

      if (reportRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Рапорт не найден" }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const report = reportRes.rows[0];
      if (report.status !== "pending") {
        return new Response(JSON.stringify({ error: "Рапорт уже рассмотрен" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Обновить рапорт
      await client.queryArray(
        `UPDATE ${SCHEMA}.promotion_reports
         SET status = $1, instructor_comment = $2, reviewed_by = $3, reviewed_at = NOW()
         WHERE id = $4`,
        [status, comment || null, user.id, Number(reportId)]
      );

      // Если одобрено — обновить звание курсанта
      if (status === "approved") {
        const reqs = PROMOTION_REQUIREMENTS[report.promotion_type];
        if (reqs) {
          await client.queryArray(
            `UPDATE ${SCHEMA}.users SET rank = $1 WHERE id = $2`,
            [reqs.rank, report.user_id]
          );
        }
      }

      // Уведомление курсанту
      const reqs = PROMOTION_REQUIREMENTS[report.promotion_type];
      const statusText = status === "approved" ? "одобрен" : "отклонён";
      let notifMessage = `Инструктор ${user.name} ${statusText} ваш рапорт на повышение до ${reqs?.label || report.promotion_type}.`;
      if (comment) {
        notifMessage += ` Комментарий: ${comment}`;
      }

      await client.queryArray(
        `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)`,
        [report.user_id, "promotion_reviewed", `Рапорт ${statusText}`, notifMessage]
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== PUT /promotions?action=review_instructor_report =====
    if (method === "PUT" && action === "review_instructor_report") {
      const isLeadership = (r: string) => ["head_avng", "chief_instructor", "deputy_head"].includes(r);
      if (!isLeadership(user.role)) {
        return new Response(JSON.stringify({ error: "Только для руководства АВНГ" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const reportId = url.searchParams.get("id");
      if (!reportId || !/^\d+$/.test(reportId)) {
        return new Response(JSON.stringify({ error: "Неверный ID рапорта" }), {
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

      // Получить рапорт
      const reportRes = await client.queryObject<{
        id: number;
        user_id: number;
        target_rank: string;
        status: string;
      }>(
        `SELECT id, user_id, target_rank, status FROM ${SCHEMA}.instructor_promotion_reports WHERE id = $1`,
        [Number(reportId)]
      );

      if (reportRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Рапорт не найден" }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const report = reportRes.rows[0];
      if (report.status !== "pending") {
        return new Response(JSON.stringify({ error: "Рапорт уже рассмотрен" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Обновить рапорт
      await client.queryArray(
        `UPDATE ${SCHEMA}.instructor_promotion_reports
         SET status = $1, instructor_comment = $2, reviewed_by = $3, reviewed_at = NOW()
         WHERE id = $4`,
        [status, comment || null, user.id, Number(reportId)]
      );

      // Если одобрено — обновить звание инструктора и пометить выбранные активности как использованные
      if (status === "approved") {
        await client.queryArray(
          `UPDATE ${SCHEMA}.users SET rank = $1 WHERE id = $2`,
          [report.target_rank, report.user_id]
        );

        // Помечаем активности как использованные
        try {
          const fullReportRes = await client.queryObject<{ items_completed: any }>(
            `SELECT items_completed FROM ${SCHEMA}.instructor_promotion_reports WHERE id = $1`,
            [Number(reportId)]
          );
          if (fullReportRes.rows.length > 0) {
            const rawItems = fullReportRes.rows[0].items_completed;
            const items = typeof rawItems === "string" ? JSON.parse(rawItems) : rawItems;
            if (Array.isArray(items)) {
              const metaEntry = items.find(e => e.num === 101);
              if (metaEntry && metaEntry.metadata) {
                const gradeIds = metaEntry.metadata.grade_ids || [];
                const reportIds = metaEntry.metadata.report_ids || [];
                
                if (gradeIds.length > 0) {
                  await client.queryArray(
                    `UPDATE ${SCHEMA}.grades SET instructor_promo_used = TRUE WHERE id = ANY($1)`,
                    [gradeIds]
                  );
                }
                if (reportIds.length > 0) {
                  await client.queryArray(
                    `UPDATE ${SCHEMA}.promotion_reports SET instructor_promo_used = TRUE WHERE id = ANY($1)`,
                    [reportIds]
                  );
                }
                console.log(`Marked activities as used for report ${reportId}. Grades: ${gradeIds.length}, Reports: ${reportIds.length}`);
              }
            }
          }
        } catch (actErr) {
          console.error("Failed to mark activities as used:", actErr);
        }
      }

      // Уведомление инструктору
      const statusText = status === "approved" ? "одобрен" : "отклонён";
      let notifMessage = `Руководство АВНГ ${statusText} ваш рапорт на повышение до ${report.target_rank}.`;
      if (comment) {
        notifMessage += ` Комментарий: ${comment}`;
      }

      await client.queryArray(
        `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)`,
        [report.user_id, "promotion_reviewed", `Рапорт ${statusText}`, notifMessage]
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== PUT /promotions?action=dismiss_warning — снять выговор инструктору =====
    if (method === "PUT" && action === "dismiss_warning") {
      const isLeadership = (r: string) => ["head_avng", "deputy_head"].includes(r);
      if (!isLeadership(user.role)) {
        return new Response(JSON.stringify({ error: "Только Начальник АВНГ и его Заместители могут снимать выговоры" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const body = await req.json().catch(() => ({}));
      const warningId = Number(body.warning_id || 0);

      if (!warningId) {
        return new Response(JSON.stringify({ error: "Укажите ID выговора" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const warnRes = await client.queryObject<{ user_id: number }>(
        `SELECT user_id FROM ${SCHEMA}.instructor_warnings WHERE id = $1`,
        [warningId]
      );

      if (warnRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Выговор не найден" }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const warn = warnRes.rows[0];

      await client.queryArray(
        `UPDATE ${SCHEMA}.instructor_warnings
         SET is_active = FALSE
         WHERE id = $1`,
        [warningId]
      );

      // Уведомление пользователю
      await client.queryArray(
        `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)`,
        [
          warn.user_id,
          "warning_dismissed",
          `Выговор снят`,
          `Ваш дисциплинарный выговор был снят руководством АВНГ. Подача рапортов снова доступна.`
        ]
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
}

if (import.meta.main) {
  Deno.serve(handler);
}
