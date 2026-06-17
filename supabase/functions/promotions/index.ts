import { Client } from "postgres";

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
    label: "Мл. Сержант",
    rank: "Мл. Сержант",
    items: [
      { category: "Подготовка", label: "Строевая подготовка", type: "practice", subject: "Строевая подготовка" },
      { category: "Подготовка", label: "Физическая подготовка (нормативы)", type: "practice", subject: "Физическая подготовка" },
      { category: "Подготовка", label: "Огневая подготовка", type: "practice", subject: "Огневая подготовка" },
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

async function getDbClient() {
  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = new Client(databaseUrl);
  await client.connect();
  return client;
}

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
    const found = isTest ? testMap.get(item.subject) : gradeMap.get(`${item.type}::${item.subject}`);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: CORS_HEADERS, status: 200 });
  }

  const token = req.headers.get("X-Session-Token") || req.headers.get("x-session-token");
  let client;

  try {
    client = await getDbClient();
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
        const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"].includes(r);
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
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== GET /promotions — список рапортов на повышение =====
    if (method === "GET" && !action) {
      let query = "";
      const params: any[] = [];
      const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"].includes(r);
      if (isInstructor(user.role)) {
        query = `
          SELECT pr.id, pr.promotion_type, pr.status, pr.instructor_comment,
                 pr.reviewed_at, pr.created_at,
                 u.name as cadet_name, u.rank as cadet_rank, u.static_id as cadet_static_id,
                 u.id as cadet_id,
                 rv.name as reviewer_name
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
                 rv.name as reviewer_name
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
         WHERE role IN ('instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor', 'deputy_head')`,
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

    // ===== PUT /promotions?action=review&id=N — инструктор рассматривает рапорт =====
    if (method === "PUT" && action === "review") {
        const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"].includes(r);
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
      await client.end().catch(console.error);
    }
  }
});
