import { Pool, Client } from "postgres";

const SCHEMA = "t_p29017774_avn_academy_training";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
};

interface ActivityDef {
  key: string;
  label: string;
  points: number;
  isAdditional?: boolean;
}

const DEFAULT_ACTIVITIES: ActivityDef[] = [
  { key: "raid", label: "Принять участие в рейде на криминальную организацию", points: 40 },
  { key: "excursion", label: "Провести экскурсию с лекцией о службе для гражданских лиц по территории ФСВНГ длительностью минимум в 30 минут", points: 20 },
  { key: "terror_prevention", label: "Принять участие в предотвращении теракта", points: 10 },
  { key: "global_event", label: "Участие в глобальном мероприятии между 3 фракциями", points: 15 },
  { key: "faction_event", label: "Участие во фракционном мероприятии (вечерка, лекция с 5+ участниками, любое внутрефракционное мероприятие с 5+ участниками, тренировка)", points: 5 },
  { key: "supply", label: "Принять участие в поставке", points: 20 },
  { key: "robbery_defense", label: "Успешное отбитие ограбления (скрин с краймовской матовозкой)", points: 7 },
  { key: "raid_defense", label: "Успешное отбитие налета", points: 7 },
  { key: "certification", label: "Проведение аттестации (дополнительно)", points: 10, isAdditional: true },
  { key: "interview", label: "Проведение собеседования (дополнительно)", points: 10, isAdditional: true },
  { key: "accept_to_unit", label: "Принятие в подразделение (дополнительно)", points: 10, isAdditional: true },
  { key: "promotion_report_check", label: "Проверка рапорта на повышение (дополнительно)", points: 10, isAdditional: true },
  { key: "oath", label: "Принятие присяги (дополнительно)", points: 5, isAdditional: true },
  { key: "lecture", label: "Проведение лекций (дополнительно)", points: 10, isAdditional: true },
];

async function getActivitiesConfig(client: any): Promise<ActivityDef[]> {
  try {
    const res = await client.queryObject<{ points_config: any }>(
      `SELECT points_config FROM ${SCHEMA}.weekly_reports_settings ORDER BY id DESC LIMIT 1`
    );
    if (res.rows.length > 0) {
      const cfg = res.rows[0].points_config;
      const parsed = typeof cfg === "string" ? JSON.parse(cfg) : cfg;
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // Backward compatibility with flat object structure
      if (parsed && typeof parsed === "object") {
        return Object.entries(parsed).map(([key, points]) => {
          const def = DEFAULT_ACTIVITIES.find(a => a.key === key);
          return {
            key,
            label: def ? def.label : key,
            points: Number(points),
            isAdditional: def ? !!def.isAdditional : false
          };
        });
      }
    }
  } catch (err) {
    console.error("Failed to load points config from database:", err);
  }
  return DEFAULT_ACTIVITIES;
}

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

    const isInstructor = (r: string) => [
      "instructor",
      "head_avng",
      "chief_instructor",
      "senior_instructor",
      "junior_instructor",
      "deputy_head",
      "senior_ufsvng"
    ].includes(r);

    if (!isInstructor(user.role)) {
      return new Response(JSON.stringify({ error: "Доступ запрещен. Раздел только для инструкторов." }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    const url = new URL(req.url);
    const method = req.method;
    const action = url.searchParams.get("action") || "";

    // ===== GET /weekly-reports?action=get_settings =====
    if (method === "GET" && action === "get_settings") {
      const activities = await getActivitiesConfig(client);
      return new Response(JSON.stringify({ activities }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== POST /weekly-reports?action=save_settings =====
    if (method === "POST" && action === "save_settings") {
      if (user.role !== "head_avng") {
        return new Response(JSON.stringify({ error: "Доступ разрешен только Начальнику АВНГ" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const body = await req.json().catch(() => ({}));
      const activities = body.activities;

      if (!activities || !Array.isArray(activities)) {
        return new Response(JSON.stringify({ error: "Неверный формат настроек (ожидается массив)" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      await client.queryArray(
        `INSERT INTO ${SCHEMA}.weekly_reports_settings (points_config) VALUES ($1)`,
        [JSON.stringify(activities)]
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== GET /weekly-reports?action=auto_fill =====
    if (method === "GET" && action === "auto_fill") {
      const weekStartStr = url.searchParams.get("week_start") || "";
      if (!weekStartStr || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartStr)) {
        return new Response(JSON.stringify({ error: "Неверный формат даты начала недели (YYYY-MM-DD)" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Calculate end of the week (7 days later)
      const d1 = new Date(weekStartStr);
      const d2 = new Date(d1.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weekEndStr = d2.toISOString().split("T")[0];

      // 1. Lectures count
      const lectureRes = await client.queryObject<{ count: number }>(
        `SELECT COUNT(id)::int as count 
         FROM ${SCHEMA}.grades 
         WHERE instructor_id = $1 AND type = 'lecture' AND graded_at >= $2::timestamp AND graded_at < $3::timestamp`,
        [user.id, weekStartStr, weekEndStr]
      );
      const lectureCount = Number(lectureRes.rows[0]?.count || 0);

      // 2. Certification count (type = 'exam')
      const certRes = await client.queryObject<{ count: number }>(
        `SELECT COUNT(id)::int as count 
         FROM ${SCHEMA}.grades 
         WHERE instructor_id = $1 AND type = 'exam' AND graded_at >= $2::timestamp AND graded_at < $3::timestamp`,
        [user.id, weekStartStr, weekEndStr]
      );
      const certificationCount = Number(certRes.rows[0]?.count || 0);

      // 3. Oath count (type = 'practice', subject = 'Присяга')
      const oathRes = await client.queryObject<{ count: number }>(
        `SELECT COUNT(id)::int as count 
         FROM ${SCHEMA}.grades 
         WHERE instructor_id = $1 AND type = 'practice' AND subject = 'Присяга' AND graded_at >= $2::timestamp AND graded_at < $3::timestamp`,
        [user.id, weekStartStr, weekEndStr]
      );
      const oathCount = Number(oathRes.rows[0]?.count || 0);

      // 4. Practice count (type = 'practice', subject != 'Присяга')
      const practiceRes = await client.queryObject<{ count: number }>(
        `SELECT COUNT(id)::int as count 
         FROM ${SCHEMA}.grades 
         WHERE instructor_id = $1 AND type = 'practice' AND subject != 'Присяга' AND graded_at >= $2::timestamp AND graded_at < $3::timestamp`,
        [user.id, weekStartStr, weekEndStr]
      );
      const practiceCount = Number(practiceRes.rows[0]?.count || 0);

      // 5. Reviewed promotion reports (both cadet and instructor promotion reports)
      const cadetPromoRes = await client.queryObject<{ count: number }>(
        `SELECT COUNT(id)::int as count 
         FROM ${SCHEMA}.promotion_reports 
         WHERE reviewed_by = $1 AND reviewed_at >= $2::timestamp AND reviewed_at < $3::timestamp`,
        [user.id, weekStartStr, weekEndStr]
      );
      const cadetPromoCount = Number(cadetPromoRes.rows[0]?.count || 0);

      const instPromoRes = await client.queryObject<{ count: number }>(
        `SELECT COUNT(id)::int as count 
         FROM ${SCHEMA}.instructor_promotion_reports 
         WHERE reviewed_by = $1 AND reviewed_at >= $2::timestamp AND reviewed_at < $3::timestamp`,
        [user.id, weekStartStr, weekEndStr]
      );
      const instPromoCount = Number(instPromoRes.rows[0]?.count || 0);

      const promoCheckCount = cadetPromoCount + instPromoCount;

      // Load active settings to match labels
      const activities = await getActivitiesConfig(client);
      const counts: Record<string, number> = {};

      activities.forEach(act => {
        const labelLower = act.label.toLowerCase();
        if (labelLower.includes("экзамен") || labelLower.includes("аттестац")) {
          counts[act.key] = certificationCount;
        } else if (labelLower.includes("присяг")) {
          counts[act.key] = oathCount;
        } else if (labelLower.includes("практик")) {
          counts[act.key] = practiceCount;
        } else if (labelLower.includes("лекц") && !labelLower.includes("экскурси") && !labelLower.includes("мероприяти")) {
          counts[act.key] = lectureCount;
        } else if (labelLower.includes("рапорт") && labelLower.includes("повышен")) {
          counts[act.key] = promoCheckCount;
        }
      });

      return new Response(JSON.stringify({ counts }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== GET /weekly-reports =====
    if (method === "GET" && !action) {
      let query = "";
      const params: any[] = [];

      const canReview = user.role === "head_avng" || user.role === "senior_ufsvng";
      if (canReview) {
        // Нач.АВНГ и Руководство УФСВНГ видят все отчеты для проверки
        query = `
          SELECT wr.id, wr.user_id, wr.week_start, wr.items, wr.total_points, wr.status,
                 wr.reviewer_comment, wr.reviewed_at, wr.created_at,
                 u.name as instructor_name, u.rank as instructor_rank, u.static_id as instructor_static_id,
                 rv.name as reviewer_name
          FROM ${SCHEMA}.weekly_reports wr
          JOIN ${SCHEMA}.users u ON wr.user_id = u.id
          LEFT JOIN ${SCHEMA}.users rv ON wr.reviewed_by = rv.id
          ORDER BY wr.week_start DESC, wr.created_at DESC
        `;
      } else {
        // Обычные инструкторы видят только свои отчеты
        query = `
          SELECT wr.id, wr.user_id, wr.week_start, wr.items, wr.total_points, wr.status,
                 wr.reviewer_comment, wr.reviewed_at, wr.created_at,
                 u.name as instructor_name, u.rank as instructor_rank, u.static_id as instructor_static_id,
                 rv.name as reviewer_name
          FROM ${SCHEMA}.weekly_reports wr
          JOIN ${SCHEMA}.users u ON wr.user_id = u.id
          LEFT JOIN ${SCHEMA}.users rv ON wr.reviewed_by = rv.id
          WHERE wr.user_id = $1
          ORDER BY wr.week_start DESC, wr.created_at DESC
        `;
        params.push(user.id);
      }

      const res = await client.queryObject<any>(query, params);
      const reports = res.rows.map(row => {
        const item = { ...row };
        if (item.created_at) item.created_at = new Date(item.created_at).toISOString();
        if (item.reviewed_at) item.reviewed_at = new Date(item.reviewed_at).toISOString();
        if (item.week_start) {
          // Format DATE as YYYY-MM-DD string
          const d = new Date(item.week_start);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          item.week_start = `${year}-${month}-${day}`;
        }
        if (typeof item.items === "string") {
          try {
            item.items = JSON.parse(item.items);
          } catch (_) {}
        }
        return item;
      });

      return new Response(JSON.stringify({ reports }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== POST /weekly-reports — подача отчёта =====
    if (method === "POST" && !action) {
      const body = await req.json().catch(() => ({}));
      const weekStartStr = String(body.week_start || "").trim();
      const items = body.items || {};

      if (!weekStartStr || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartStr)) {
        return new Response(JSON.stringify({ error: "Неверный формат даты начала недели (YYYY-MM-DD)" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // Рассчитываем баллы на сервере
      const activities = await getActivitiesConfig(client);
      let calculatedPoints = 0;
      for (const [key, val] of Object.entries(items)) {
        const itemVal = val as { count?: number; links?: string[] };
        const count = Math.max(0, Number(itemVal?.count || 0));
        const act = activities.find((a: any) => a.key === key);
        const factor = act ? act.points : 0;
        calculatedPoints += count * factor;
      }



      const insertRes = await client.queryObject<{ id: number }>(
        `INSERT INTO ${SCHEMA}.weekly_reports (user_id, week_start, items, total_points)
         VALUES ($1, $2, $3, $4) RETURNING id`,
         [user.id, weekStartStr, JSON.stringify(items), calculatedPoints]
      );
      const newId = insertRes.rows[0].id;

      // Уведомление руководству АВНГ и УФСВНГ о новом отчете
      await client.queryArray(
        `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
         SELECT id, 'weekly_report_submitted', $1, $2
         FROM ${SCHEMA}.users
         WHERE role IN ('head_avng', 'chief_instructor', 'deputy_head', 'senior_ufsvng')`,
        [
          `Новый еженедельный отчёт`,
          `Инструктор ${user.name} подал еженедельный отчёт за неделю с ${weekStartStr} (${calculatedPoints} баллов).`
        ]
      );

      return new Response(JSON.stringify({ success: true, id: newId }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // ===== PUT /weekly-reports?action=review&id=N — проверка отчёта =====
    if (method === "PUT" && action === "review") {
      const canReview = user.role === "head_avng" || user.role === "senior_ufsvng";
      if (!canReview) {
        return new Response(JSON.stringify({ error: "Доступ запрещен. Только Начальник АВНГ и Руководство УФСВНГ могут проверять отчёты." }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const reportId = url.searchParams.get("id");
      if (!reportId || !/^\d+$/.test(reportId)) {
        return new Response(JSON.stringify({ error: "Неверный ID отчета" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const body = await req.json().catch(() => ({}));
      const status = body.status;
      const comment = String(body.comment || "").trim();
      const items = body.items;

      if (status !== "approved" && status !== "rejected") {
        return new Response(JSON.stringify({ error: "Недопустимый статус. Должен быть approved или rejected" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const reportRes = await client.queryObject<{
        id: number;
        user_id: number;
        status: string;
        week_start: Date;
        total_points: number;
        items: any;
      }>(
        `SELECT id, user_id, status, week_start, total_points, items FROM ${SCHEMA}.weekly_reports WHERE id = $1`,
        [Number(reportId)]
      );

      if (reportRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Отчёт не найден" }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const report = reportRes.rows[0];
      if (report.status !== "pending") {
        return new Response(JSON.stringify({ error: "Отчёт уже проверен" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      let finalItems = report.items;
      if (typeof finalItems === "string") {
        try { finalItems = JSON.parse(finalItems); } catch (_) {}
      }
      let finalPoints = report.total_points;

      if (items && typeof items === "object") {
        finalItems = items;
        const activities = await getActivitiesConfig(client);
        let calculatedPoints = 0;
        for (const [key, val] of Object.entries(items)) {
          const itemVal = val as { count?: number; links?: string[] };
          const count = Math.max(0, Number(itemVal?.count || 0));
          const act = activities.find((a: any) => a.key === key);
          const factor = act ? act.points : 0;
          calculatedPoints += count * factor;
        }
        finalPoints = calculatedPoints;
      }

      // Обновить отчёт
      await client.queryArray(
        `UPDATE ${SCHEMA}.weekly_reports
         SET status = $1, reviewer_comment = $2, reviewed_by = $3, reviewed_at = NOW(), items = $4, total_points = $5
         WHERE id = $6`,
        [status, comment || null, user.id, JSON.stringify(finalItems), finalPoints, Number(reportId)]
      );

      const statusText = status === "approved" ? "одобрен" : "отклонён";
      const wDate = new Date(report.week_start);
      const wStr = `${wDate.getFullYear()}-${String(wDate.getMonth() + 1).padStart(2, '0')}-${String(wDate.getDate()).padStart(2, '0')}`;
      
      let notifMessage = `Ваш еженедельный отчёт за неделю с ${wStr} (${finalPoints} баллов) был ${statusText} проверяющим ${user.name}.`;
      if (comment) {
        notifMessage += ` Комментарий: ${comment}`;
      }

      // Уведомление инструктору
      await client.queryArray(
        `INSERT INTO ${SCHEMA}.notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)`,
        [report.user_id, "weekly_report_reviewed", `Отчёт ${statusText}`, notifMessage]
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
