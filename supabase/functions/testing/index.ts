import { Client } from "postgres";

const SCHEMA = "t_p29017774_avn_academy_training";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
};

// Database helper
async function getDbClient() {
  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = new Client(databaseUrl);
  await client.connect();
  return client;
}

// SSO authorization helper
async function getCurrentUser(req: Request, client: Client) {
  const token = req.headers.get("X-Session-Token") || req.headers.get("x-session-token");
  if (!token) {
    throw new Error("Missing session token");
  }

  const res = await client.queryObject<{
    id: number;
    static_id: string;
    name: string;
    rank: string;
    unit: string;
    role: string;
  }>(
    `SELECT u.id, u.static_id, u.name, u.rank, u.unit, u.role
     FROM ${SCHEMA}.sessions s
     JOIN ${SCHEMA}.users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_whitelisted = true`,
    [token]
  );

  if (res.rows.length === 0) {
    throw new Error("Сессия недействительна или истекла");
  }

  return res.rows[0];
}

// ELO mathematics
function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1.0 / (1.0 + Math.pow(10.0, (ratingB - ratingA) / 400.0));
}

function updateElo(studentRating: number, questionRating: number, actualScore: number, kFactor = 32): [number, number] {
  const expectedStudent = calculateExpectedScore(studentRating, questionRating);
  const newStudent = studentRating + Math.round(kFactor * (actualScore - expectedStudent));
  const newQuestion = questionRating + Math.round(kFactor * (expectedStudent - actualScore));
  return [Math.max(100, newStudent), Math.max(100, newQuestion)];
}

// Background essay grader (Deno)
async function gradeEssayInBackground(
  answerId: number,
  studentAnswer: string,
  criteriaList: string[],
  databaseUrl: string,
  openAiKey: string | undefined
) {
  let client: Client | null = null;
  try {
    // Generate scores locally first
    let grade = 0;
    let scores: Record<string, number> = {};
    let feedback = "";

    const cleanText = studentAnswer.trim();
    const textLen = cleanText.length;

    if (textLen < 30) {
      criteriaList.forEach((c) => { scores[c] = 1; });
      feedback = "Ответ слишком короткий или не содержит содержательной информации для оценки.";
      grade = 25;
    } else {
      // Local keyword matching
      const keywords = [
        "засада", "укрытие", "огонь", "противник", "сектор", "взвод", "отделение", "бой",
        "деривация", "калибр", "траектория", "вращение", "нарез", "ветер", "дистанция", "прицел",
        "единоначалие", "командир", "приказ", "ответственность", "устав", "дисциплина",
        "адаптация", "новобранец", "коллектив", "психолог", "конфликт", "сержант", "мотивация"
      ];
      let matches = 0;
      keywords.forEach((w) => {
        if (new RegExp(w, "i").test(cleanText)) matches++;
      });

      criteriaList.forEach((crit, i) => {
        if (i === 0) {
          scores[crit] = textLen > 300 ? 4 : textLen > 150 ? 3 : 2;
        } else {
          scores[crit] = matches > 6 ? 4 : matches > 3 ? 3 : matches > 0 ? 2 : 1;
        }
      });

      const maxScore = criteriaList.length * 4;
      const actualScore = Object.values(scores).reduce((a, b) => a + b, 0);
      grade = Math.round((actualScore / maxScore) * 100);

      if (grade >= 85) {
        feedback = `Отличный, развернутый ответ (совпадений терминов: ${matches}). Тема раскрыта полностью. Демонстрируется высокий уровень владения теоретическим материалом.`;
      } else if (grade >= 60) {
        feedback = `Хороший ответ (совпадений терминов: ${matches}). Основные положения раскрыты верно, но можно подробнее описать прикладные детали.`;
      } else {
        feedback = `Ответ поверхностный (совпадений терминов: ${matches}). Рекомендуется изучить методические пособия по теме и пересдать блок.`;
      }
    }

    // Attempt OpenAI call if key is present
    if (openAiKey && textLen >= 30) {
      try {
        const prompt = `
        Вы являетесь строгим военным инструктором. Оцените следующий ответ курсанта на вопрос по 5 предоставленным критериям.
        Каждый критерий нужно оценить по шкале от 1 до 4 баллов (1 - Неудовлетворительно, 2 - Удовлетворительно, 3 - Хорошо, 4 - Отлично).
        
        Ответ курсанта:
        "${studentAnswer}"
        
        Критерии для оценки:
        ${JSON.stringify(criteriaList)}
        
        Верните ответ СТРОГО в формате JSON со следующими полями:
        - scores: словарь, где ключ - название критерия из списка, значение - оценка (число от 1 до 4).
        - feedback: текстовый отзыв на русском языке с разбором сильных и слабых сторон (до 4 предложений).
        - grade: итоговая оценка в процентах от 0 до 100.
        `;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "You are a helpful grading assistant that outputs JSON." },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const resJson = await response.json();
          const content = JSON.parse(resJson.choices[0].message.content);
          grade = Number(content.grade);
          scores = content.scores;
          feedback = content.feedback;
        }
      } catch (err) {
        console.error("OpenAI grading failure: ", err);
      }
    }

    // Write to DB
    client = new Client(databaseUrl);
    await client.connect();

    const isCorrect = grade >= 60;
    await client.queryArray(
      `UPDATE ${SCHEMA}.test_answers
       SET is_correct = $1, grade = $2, feedback = $3, criteria_evaluation = $4
       WHERE id = $5`,
      [isCorrect, grade, feedback, JSON.stringify(scores), answerId]
    );

    // Finalize attempt check
    const ansRow = await client.queryArray(
      `SELECT attempt_id, question_id FROM ${SCHEMA}.test_answers WHERE id = $1`,
      [answerId]
    );
    const [attemptId, questionId] = ansRow.rows[0] as [number, number];

    const qRow = await client.queryArray(
      `SELECT subject FROM ${SCHEMA}.test_questions WHERE id = $1`,
      [questionId]
    );
    const subject = qRow.rows[0][0] as string;

    const settingsRes = await client.queryObject<any>(
      `SELECT question_count FROM ${SCHEMA}.test_settings WHERE subject = $1`,
      [subject]
    );
    const qLimit = settingsRes.rows.length > 0 ? settingsRes.rows[0].question_count : 30;

    const allAns = await client.queryArray(
      `SELECT count(id) FROM ${SCHEMA}.test_answers WHERE attempt_id = $1`,
      [attemptId]
    );
    const answeredCount = Number(allAns.rows[0][0]);

    if (answeredCount >= qLimit) {
      await client.queryArray(
        `UPDATE ${SCHEMA}.test_attempts SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [attemptId]
      );

      const attRow = await client.queryArray(
        `SELECT user_id, end_elo FROM ${SCHEMA}.test_attempts WHERE id = $1`,
        [attemptId]
      );
      const [userId, endElo] = attRow.rows[0] as [number, number];


      await client.queryArray(
        `INSERT INTO ${SCHEMA}.student_elo (user_id, subject, elo_rating, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, subject) DO UPDATE
         SET elo_rating = EXCLUDED.elo_rating, updated_at = NOW()`,
        [userId, subject, endElo]
      );
    }
  } catch (err) {
    console.error("Async grading process error: ", err);
  } finally {
    if (client) {
      await client.end().catch(console.error);
    }
  }
}

async function getTestSettings(client: Client, subject: string) {
  try {
    const res = await client.queryObject<any>(
      `SELECT timer_minutes, question_count, base_elo, time_limit_per_question, passing_score_percent FROM ${SCHEMA}.test_settings WHERE subject = $1`,
      [subject]
    );
    if (res.rows.length > 0) {
      return res.rows[0];
    }
  } catch (err) {
    console.error("Error fetching test settings, using defaults: ", err);
  }
  return { timer_minutes: 45, question_count: 30, base_elo: 1000, time_limit_per_question: 0, passing_score_percent: 80 };
}

async function getAttemptSubject(client: Client, attemptId: number): Promise<string> {
  try {
    const attRow = await client.queryArray(
      `SELECT subject FROM ${SCHEMA}.test_attempts WHERE id = $1`,
      [attemptId]
    );
    if (attRow.rows.length > 0 && attRow.rows[0][0]) {
      return attRow.rows[0][0] as string;
    }
  } catch (err) {
    console.error("Error getting attempt subject: ", err);
  }
  return "Тест по ФЗ ФСВНГ и уставу ФСВНГ";
}

// Serve Edge Function
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: CORS_HEADERS, status: 200 });
  }

  const url = new URL(req.url);
  // Router path cleaning
  const path = url.pathname.replace(/\/functions\/v1\/testing/, "").replace(/^\/testing/, "").replace(/\/+$/, "");

  let client: Client | null = null;
  try {
    client = await getDbClient();
    
    // Inline database migration to ensure columns exist
    try {
      await client.queryArray(`
        ALTER TABLE ${SCHEMA}.test_settings 
        ADD COLUMN IF NOT EXISTS time_limit_per_question INTEGER DEFAULT 0;
      `);
      await client.queryArray(`
        ALTER TABLE ${SCHEMA}.test_settings 
        ADD COLUMN IF NOT EXISTS passing_score_percent INTEGER DEFAULT 80;
      `);
    } catch (migErr) {
      console.error("Deno DB migration error: ", migErr);
    }

    const user = await getCurrentUser(req, client);

    // ==========================================
    // 1. GET /api/tests/active-session
    // ==========================================
    if (path === "/api/tests/active-session" && req.method === "GET") {
      const activeRes = await client.queryObject<any>(
        `SELECT id, difficulty, start_elo, end_elo, warnings_count, expires_at, remaining_seconds
         FROM ${SCHEMA}.test_attempts
         WHERE user_id = $1 AND status = 'in_progress'`,
        [user.id]
      );

      if (activeRes.rows.length === 0) {
        return new Response(JSON.stringify({ active: false }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const attempt = activeRes.rows[0];

      // Expiry check
      if (attempt.remaining_seconds === null && new Date(attempt.expires_at) < new Date()) {
        await client.queryArray(
          `UPDATE ${SCHEMA}.test_attempts SET status = 'completed', completed_at = expires_at WHERE id = $1`,
          [attempt.id]
        );
        return new Response(JSON.stringify({ active: false }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const remSeconds = attempt.remaining_seconds !== null
        ? attempt.remaining_seconds
        : Math.round(Math.max(0, (new Date(attempt.expires_at).getTime() - Date.now()) / 1000));

      const ansCountRes = await client.queryArray(
        `SELECT count(id) FROM ${SCHEMA}.test_answers WHERE attempt_id = $1`,
        [attempt.id]
      );
      const answeredCount = Number(ansCountRes.rows[0][0]);
      const subject = await getAttemptSubject(client, attempt.id);
      const settingsData = await getTestSettings(client, subject);

      return new Response(
        JSON.stringify({
          active: true,
          attempt_id: attempt.id,
          subject: subject,
          difficulty: attempt.difficulty,
          warnings_count: attempt.warnings_count,
          remaining_seconds: remSeconds,
          is_frozen: attempt.remaining_seconds !== null,
          answered_count: answeredCount,
          total_questions: settingsData.question_count,
          time_limit_per_question: settingsData.time_limit_per_question || 0,
          passing_score_percent: settingsData.passing_score_percent || 80,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (path === "/api/tests/subjects" && req.method === "GET") {
      const subRes = await client.queryArray(
        `SELECT DISTINCT subject FROM ${SCHEMA}.test_questions`
      );
      let subjects = subRes.rows.map((r) => r[0] as string);
      if (subjects.length === 0) {
        subjects = ["Тест по ФЗ ФСВНГ и уставу ФСВНГ"];
      }
      return new Response(JSON.stringify(subjects), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }


    // ==========================================
    // 2. POST /api/tests/start
    // ==========================================
    if (path === "/api/tests/start" && req.method === "POST") {
      const body = await req.json();
      const { subject, difficulty } = body;

      // Abort old attempts
      await client.queryArray(
        `UPDATE ${SCHEMA}.test_attempts SET status = 'aborted', completed_at = NOW()
         WHERE user_id = $1 AND status = 'in_progress'`,
        [user.id]
      );

      const settingsData = await getTestSettings(client, subject);

      // Baseline ELO check
      const eloRes = await client.queryArray(
        `SELECT elo_rating FROM ${SCHEMA}.student_elo WHERE user_id = $1 AND subject = $2`,
        [user.id, subject]
      );
      let startElo = eloRes.rows.length > 0 ? (eloRes.rows[0][0] as number) : null;
      if (startElo === null) {
        startElo = settingsData.base_elo + (difficulty - 5) * 150;
      }

      const expiresAt = new Date(Date.now() + settingsData.timer_minutes * 60 * 1000);
      const insertRes = await client.queryObject<any>(
        `INSERT INTO ${SCHEMA}.test_attempts (user_id, subject, status, difficulty, start_elo, expires_at)
         VALUES ($1, $2, 'in_progress', $3, $4, $5)
         RETURNING id, expires_at`,
        [user.id, subject, difficulty, startElo, expiresAt.toISOString()]
      );

      return new Response(
        JSON.stringify({
          attempt_id: insertRes.rows[0].id,
          start_elo: startElo,
          expires_at: insertRes.rows[0].expires_at,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }


    // ==========================================
    // 3. POST /api/tests/freeze
    // ==========================================
    if (path === "/api/tests/freeze" && req.method === "POST") {
      const attemptId = Number(url.searchParams.get("attempt_id"));
      const attemptRes = await client.queryObject<any>(
        `SELECT id, expires_at, remaining_seconds FROM ${SCHEMA}.test_attempts WHERE id = $1 AND user_id = $2`,
        [attemptId, user.id]
      );

      if (attemptRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Тест не найден" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const attempt = attemptRes.rows[0];
      if (attempt.remaining_seconds !== null) {
        return new Response(JSON.stringify({ message: "Уже заморожен" }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const remSeconds = Math.round(Math.max(0, (new Date(attempt.expires_at).getTime() - Date.now()) / 1000));
      const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await client.queryArray(
        `UPDATE ${SCHEMA}.test_attempts SET remaining_seconds = $1, expires_at = $2 WHERE id = $3`,
        [remSeconds, farFuture.toISOString(), attemptId]
      );

      return new Response(JSON.stringify({ message: "Тест заморожен", remaining_seconds: remSeconds }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // 4. POST /api/tests/resume
    // ==========================================
    if (path === "/api/tests/resume" && req.method === "POST") {
      const attemptId = Number(url.searchParams.get("attempt_id"));
      const attemptRes = await client.queryObject<any>(
        `SELECT id, remaining_seconds FROM ${SCHEMA}.test_attempts WHERE id = $1 AND user_id = $2`,
        [attemptId, user.id]
      );

      if (attemptRes.rows.length === 0 || attemptRes.rows[0].remaining_seconds === null) {
        return new Response(JSON.stringify({ error: "Тест не заморожен" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const newExpiresAt = new Date(Date.now() + attemptRes.rows[0].remaining_seconds * 1000);

      await client.queryArray(
        `UPDATE ${SCHEMA}.test_attempts SET remaining_seconds = NULL, expires_at = $1 WHERE id = $2`,
        [newExpiresAt.toISOString(), attemptId]
      );

      return new Response(JSON.stringify({ message: "Возобновлен", expires_at: newExpiresAt.toISOString() }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // 5. GET /api/tests/next-question
    // ==========================================
    if (path === "/api/tests/next-question" && req.method === "GET") {
      const attemptId = Number(url.searchParams.get("attempt_id"));
      const attemptRes = await client.queryObject<any>(
        `SELECT id, start_elo, end_elo, expires_at, remaining_seconds FROM ${SCHEMA}.test_attempts WHERE id = $1 AND user_id = $2 AND status = 'in_progress'`,
        [attemptId, user.id]
      );

      if (attemptRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Тест не найден" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const attempt = attemptRes.rows[0];
      if (attempt.remaining_seconds === null && new Date(attempt.expires_at) < new Date()) {
        await client.queryArray(
          `UPDATE ${SCHEMA}.test_attempts SET status = 'completed', completed_at = expires_at WHERE id = $1`,
          [attemptId]
        );
        return new Response(JSON.stringify({ completed: true }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const ansRes = await client.queryArray(
        `SELECT question_id FROM ${SCHEMA}.test_answers WHERE attempt_id = $1`,
        [attemptId]
      );
      const answeredIds = ansRes.rows.map((r) => r[0] as number);
      const answeredCount = answeredIds.length;

      const subject = await getAttemptSubject(client, attemptId);
      const settingsData = await getTestSettings(client, subject);
      const qLimit = settingsData.question_count;

      if (answeredCount >= qLimit) {
        return new Response(JSON.stringify({ completed: true }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Layer selection proportionately
      const layer1Limit = Math.max(1, Math.round(qLimit * 10 / 30));
      const layer2Limit = Math.max(layer1Limit + 1, Math.round(qLimit * 25 / 30));

      let qTypes: string[] = [];
      if (answeredCount < layer1Limit) qTypes = ["choice"];
      else if (answeredCount < layer2Limit) qTypes = ["multichoice", "matching"];
      else qTypes = ["essay"];

      const currentElo = attempt.end_elo !== null ? attempt.end_elo : attempt.start_elo;

      // Question Pool
      const poolRes = await client.queryObject<any>(
        `SELECT id, subject, type, question_text, options, elo_rating
         FROM ${SCHEMA}.test_questions
         WHERE subject = $1 AND type = ANY($2) ${answeredIds.length > 0 ? "AND id NOT IN (SELECT question_id FROM " + SCHEMA + ".test_answers WHERE attempt_id = " + attemptId + ")" : ""}`,
        [subject, qTypes]
      );

      let pool = poolRes.rows;
      if (pool.length === 0) {
        const fallRes = await client.queryObject<any>(
          `SELECT id, subject, type, question_text, options, elo_rating FROM ${SCHEMA}.test_questions 
           WHERE subject = $1 ${answeredIds.length > 0 ? "AND id NOT IN (SELECT question_id FROM " + SCHEMA + ".test_answers WHERE attempt_id = " + attemptId + ")" : ""}`,
          [subject]
        );
        pool = fallRes.rows;
        if (pool.length === 0) {
          return new Response(JSON.stringify({ completed: true }), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
      }

      // Proximity selection
      pool.sort((a: any, b: any) => Math.abs(a.elo_rating - currentElo) - Math.abs(b.elo_rating - currentElo));
      const candidates = pool.slice(0, 5);
      const selected = candidates[Math.floor(Math.random() * candidates.length)];

      let options = selected.options;
      if (selected.type === "matching" && options?.pairs) {
        const keys = Object.keys(options.pairs);
        const vals = Object.values(options.pairs);
        // Shuffle vals
        for (let i = vals.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [vals[i], vals[j]] = [vals[j], vals[i]];
        }
        options = { keys, shuffled_values: vals };
      }

      return new Response(
        JSON.stringify({
          question_id: selected.id,
          type: selected.type,
          question_text: selected.question_text,
          options: options,
          subject: selected.subject,
          progress: answeredCount + 1,
          total_questions: qLimit,
          time_limit_per_question: settingsData.time_limit_per_question || 0,
          passing_score_percent: settingsData.passing_score_percent || 80,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }


    // ==========================================
    // 6. POST /api/tests/submit-answer
    // ==========================================
    if (path === "/api/tests/submit-answer" && req.method === "POST") {
      const body = await req.json();
      const { attempt_id, question_id, answer } = body;

      const attemptRes = await client.queryObject<any>(
        `SELECT id, start_elo, end_elo, expires_at, remaining_seconds FROM ${SCHEMA}.test_attempts WHERE id = $1 AND user_id = $2 AND status = 'in_progress'`,
        [attempt_id, user.id]
      );

      if (attemptRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Тест не найден" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const attempt = attemptRes.rows[0];

      // Double submit prevention
      const doubleRes = await client.queryArray(
        `SELECT id FROM ${SCHEMA}.test_answers WHERE attempt_id = $1 AND question_id = $2`,
        [attempt_id, question_id]
      );
      if (doubleRes.rows.length > 0) {
        return new Response(JSON.stringify({ error: "Вы уже ответили" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Fetch Question
      const qRes = await client.queryObject<any>(
        `SELECT id, type, correct_answer, explanation, elo_rating, criteria_matrix, subject FROM ${SCHEMA}.test_questions WHERE id = $1`,
        [question_id]
      );
      const question = qRes.rows[0];

      let isCorrect = null;
      let grade = 0;
      let actualScore = 0;

      if (question.type === "choice") {
        isCorrect = String(answer).trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase();
        actualScore = isCorrect ? 1.0 : 0.0;
        grade = isCorrect ? 100 : 0;
      } else if (question.type === "multichoice") {
        try {
          const studentSet = new Set(answer.map((x: any) => String(x).trim().toLowerCase()));
          const correctSet = new Set(question.correct_answer.map((x: any) => String(x).trim().toLowerCase()));
          
          let intersection = 0;
          studentSet.forEach((x) => { if (correctSet.has(x)) intersection++; });
          const union = studentSet.size + correctSet.size - intersection;

          actualScore = union > 0 ? intersection / union : 0;
          isCorrect = actualScore === 1.0;
          grade = Math.round(actualScore * 100);
        } catch (_) {
          isCorrect = false;
        }
      } else if (question.type === "matching") {
        try {
          let correctPairs = 0;
          const totalPairs = Object.keys(question.correct_answer).length;
          
          Object.entries(answer).forEach(([k, v]) => {
            if (question.correct_answer[k]?.trim().toLowerCase() === String(v).trim().toLowerCase()) {
              correctPairs++;
            }
          });

          actualScore = totalPairs > 0 ? correctPairs / totalPairs : 0;
          isCorrect = actualScore === 1.0;
          grade = Math.round(actualScore * 100);
        } catch (_) {
          isCorrect = false;
        }
      } else {
        // Essay type
        actualScore = 0.5; // neutral adjustment initially
      }

      // ELO adjustments
      const currentElo = attempt.end_elo !== null ? attempt.end_elo : attempt.start_elo;
      const [newStudentElo, newQuestionElo] = updateElo(currentElo, question.elo_rating, actualScore);

      // Save answer
      const insertAnsRes = await client.queryObject<any>(
        `INSERT INTO ${SCHEMA}.test_answers (attempt_id, question_id, student_answer, is_correct, grade, feedback)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [attempt_id, question_id, JSON.stringify(answer), isCorrect, question.type !== "essay" ? grade : null, question.type === "essay" ? "Ожидает проверки ИИ..." : null]
      );

      // Save new attempt ELO difficulty
      await client.queryArray(
        `UPDATE ${SCHEMA}.test_attempts SET end_elo = $1 WHERE id = $2`,
        [newStudentElo, attempt_id]
      );
      await client.queryArray(
        `UPDATE ${SCHEMA}.test_questions SET elo_rating = $1 WHERE id = $2`,
        [newQuestionElo, question_id]
      );

      // If Essay, trigger grading promise in background
      if (question.type === "essay") {
        const criteria = question.criteria_matrix?.criteria || [];
        const dbUrl = Deno.env.get("DATABASE_URL") || "";
        const openAiKey = Deno.env.get("OPENAI_API_KEY");
        // Spawn async grading
        gradeEssayInBackground(insertAnsRes.rows[0].id, answer, criteria, dbUrl, openAiKey);
      }

      const ansCountRes = await client.queryArray(
        `SELECT count(id) FROM ${SCHEMA}.test_answers WHERE attempt_id = $1`,
        [attempt_id]
      );
      const answeredCount = Number(ansCountRes.rows[0][0]);
      const settingsData = await getTestSettings(client, question.subject);
      const completed = answeredCount >= settingsData.question_count;

      let certificateData = null;
      if (completed) {
        await client.queryArray(
          `UPDATE ${SCHEMA}.test_attempts SET status = 'completed', completed_at = NOW() WHERE id = $1`,
          [attempt_id]
        );

        // Update student_elo table
        await client.queryArray(
          `INSERT INTO ${SCHEMA}.student_elo (user_id, subject, elo_rating, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id, subject) DO UPDATE
           SET elo_rating = EXCLUDED.elo_rating, updated_at = NOW()`,
          [user.id, question.subject, newStudentElo]
        );

        // Get completed_at timestamp
        const attRes = await client.queryArray(
          `SELECT completed_at FROM ${SCHEMA}.test_attempts WHERE id = $1`,
          [attempt_id]
        );
        const completedAt = attRes.rows[0]?.[0] || new Date().toISOString();

        // Compute certificate details
        const answersRes = await client.queryObject<any>(
          `SELECT is_correct FROM ${SCHEMA}.test_answers WHERE attempt_id = $1`,
          [attempt_id]
        );
        const correctCount = answersRes.rows.filter((ans: any) => ans.is_correct === true).length;
        const totalQ = settingsData.question_count;
        const percentage = totalQ > 0 ? Math.round((correctCount / totalQ) * 10000) / 100 : 0;
        
        let gradeVal = 2;
        if (percentage >= 90) gradeVal = 5;
        else if (percentage >= 80) gradeVal = 4;
        else if (percentage >= 60) gradeVal = 3;

        const passed = percentage >= (settingsData.passing_score_percent || 80);

        certificateData = {
          cadet_name: user.name,
          static_id: user.static_id,
          rank: user.rank,
          unit: user.unit,
          subject: question.subject,
          completed_at: completedAt,
          correct_answers_count: correctCount,
          total_questions: totalQ,
          percentage: percentage,
          grade: gradeVal,
          passed: passed
        };
      }

      return new Response(
        JSON.stringify({
          type: question.type,
          is_correct: isCorrect,
          grade: grade,
          correct_answer: null,
          explanation: null,
          new_rating: newStudentElo,
          completed: completed,
          certificate: certificateData,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // 7. POST /api/tests/warn
    // ==========================================
    if (path === "/api/tests/warn" && req.method === "POST") {
      const body = await req.json();
      const { attempt_id, warnings_count } = body;

      const attemptRes = await client.queryObject<any>(
        `SELECT id, status FROM ${SCHEMA}.test_attempts WHERE id = $1 AND user_id = $2 AND status = 'in_progress'`,
        [attempt_id, user.id]
      );

      if (attemptRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Тест не найден" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const isAborted = warnings_count >= 3;
      await client.queryArray(
        `UPDATE ${SCHEMA}.test_attempts
         SET warnings_count = $1, status = $2, completed_at = $3
         WHERE id = $4`,
        [warnings_count, isAborted ? "aborted" : "in_progress", isAborted ? new Date().toISOString() : null, attempt_id]
      );

      return new Response(
        JSON.stringify({ warnings_count, aborted: isAborted }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // 8. GET /api/stats/cadet/dashboard
    // ==========================================
    if (path === "/api/stats/cadet/dashboard" && req.method === "GET") {
      // Fetch History
      const attemptsRes = await client.queryObject<any>(
        `SELECT id, difficulty, status, start_elo, end_elo, warnings_count, started_at, completed_at
         FROM ${SCHEMA}.test_attempts
         WHERE user_id = $1
         ORDER BY started_at DESC`,
        [user.id]
      );

      const attemptsHistory = [];
      for (const att of attemptsRes.rows) {
        const gradesRes = await client.queryArray(
          `SELECT grade FROM ${SCHEMA}.test_answers WHERE attempt_id = $1 AND grade IS NOT NULL`,
          [att.id]
        );
        const grades = gradesRes.rows.map((r) => Number(r[0]));
        const avgScore = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0.0;

        attemptsHistory.push({
          id: att.id,
          difficulty: att.difficulty,
          status: att.status,
          start_elo: att.start_elo,
          end_elo: att.end_elo,
          warnings_count: att.warnings_count,
          started_at: att.started_at,
          completed_at: att.completed_at,
          avg_score: Math.round(avgScore * 10) / 10,
        });
      }

      // Mastery per topic
      const eloRows = await client.queryObject<any>(
        `SELECT subject, elo_rating FROM ${SCHEMA}.student_elo WHERE user_id = $1`,
        [user.id]
      );
      const subjectMastery: Record<string, number> = {};
      let totalMastery = 0;
      eloRows.rows.forEach((r: any) => {
        const mastery = Math.max(0, Math.min(100, ((r.elo_rating - 400) / 1600.0) * 100.0));
        subjectMastery[r.subject] = Math.round(mastery * 10) / 10;
        totalMastery += mastery;
      });

      const avgMastery = eloRows.rows.length > 0 ? totalMastery / eloRows.rows.length : 0;

      // Group Percentile
      const allCadets = await client.queryArray(
        `SELECT id FROM ${SCHEMA}.users WHERE role = 'cadet'`
      );
      const cadetIds = allCadets.rows.map((r) => r[0] as number);

      const avgEloRows = await client.queryObject<any>(
        `SELECT user_id, avg(elo_rating) as avg_elo FROM ${SCHEMA}.student_elo GROUP BY user_id`
      );
      const eloMap: Record<number, number> = {};
      avgEloRows.rows.forEach((r: any) => {
        eloMap[r.user_id] = Number(r.avg_elo);
      });

      const myAvgElo = eloMap[user.id] || 1000.0;
      const betterCadets = Object.entries(eloMap).filter(
        ([cid, elo]) => elo > myAvgElo && cadetIds.includes(Number(cid))
      ).length;

      const rankInGroup = `${betterCadets + 1} / ${cadetIds.length}`;
      const percentile = cadetIds.length > 0 ? (1 - betterCadets / cadetIds.length) * 100 : 100;

      return new Response(
        JSON.stringify({
          mastery_percent: Math.round(avgMastery * 10) / 10,
          rank_in_group: rankInGroup,
          percentile: Math.round(percentile * 10) / 10,
          subject_mastery: subjectMastery,
          attempts: attemptsHistory,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // 9. GET /api/stats/admin/dashboard
    // ==========================================
    if (path === "/api/stats/admin/dashboard" && req.method === "GET") {
      if (user.role === "cadet") {
        return new Response(JSON.stringify({ error: "Доступ запрещен" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const attemptsRes = await client.queryObject<any>(
        `SELECT a.id, a.difficulty, a.status, a.start_elo, a.end_elo, a.started_at, a.completed_at, u.name, u.static_id, u.rank, u.unit
         FROM ${SCHEMA}.test_attempts a
         JOIN ${SCHEMA}.users u ON u.id = a.user_id
         ORDER BY a.started_at DESC`
      );

      const adminAttempts = [];
      for (const row of attemptsRes.rows) {
        const gradesRes = await client.queryArray(
          `SELECT grade FROM ${SCHEMA}.test_answers WHERE attempt_id = $1 AND grade IS NOT NULL`,
          [row.id]
        );
        const grades = gradesRes.rows.map((r) => Number(r[0]));
        const avgScore = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0.0;

        adminAttempts.push({
          attempt_id: row.id,
          cadet_name: row.name,
          static_id: row.static_id,
          rank: row.rank,
          unit: row.unit,
          difficulty: row.difficulty,
          status: row.status,
          start_elo: row.start_elo,
          end_elo: row.end_elo,
          score_percent: Math.round(avgScore * 10) / 10,
          started_at: row.started_at,
          completed_at: row.completed_at,
        });
      }

      return new Response(JSON.stringify({ attempts: adminAttempts }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // 10. GET /api/stats/d3/topic-difficulty
    // ==========================================
    if (path === "/api/stats/d3/topic-difficulty" && req.method === "GET") {
      const d3Res = await client.queryArray(
        `SELECT subject, avg(elo_rating), count(id) FROM ${SCHEMA}.test_questions GROUP BY subject`
      );
      const data = d3Res.rows.map((row) => ({
        topic: row[0] as string,
        difficulty_elo: Math.round(Number(row[1]) * 10) / 10,
        questions_count: Number(row[2]),
      }));

      return new Response(JSON.stringify(data), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // 11. GET /api/stats/d3/time-per-question
    // ==========================================
    if (path === "/api/stats/d3/time-per-question" && req.method === "GET") {
      const attsRes = await client.queryArray(
        `SELECT id, started_at FROM ${SCHEMA}.test_attempts WHERE status = 'completed' LIMIT 50`
      );

      const typeTimes: Record<string, number[]> = { choice: [], multichoice: [], matching: [], essay: [] };

      for (const [attId, startedAtStr] of attsRes.rows) {
        const ansRes = await client.queryArray(
          `SELECT a.answered_at, q.type
           FROM ${SCHEMA}.test_answers a
           JOIN ${SCHEMA}.test_questions q ON q.id = a.question_id
           WHERE a.attempt_id = $1
           ORDER BY a.answered_at ASC`,
          [attId]
        );

        let lastTime = new Date(startedAtStr as string).getTime();
        for (const [ansTimeStr, qType] of ansRes.rows) {
          const ansTime = new Date(ansTimeStr as string).getTime();
          const duration = (ansTime - lastTime) / 1000;
          if (duration > 0 && duration < 600) {
            typeTimes[qType as string]?.push(duration);
          }
          lastTime = ansTime;
        }
      }

      const result = Object.entries(typeTimes).map(([type, durations]) => {
        const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0.0;
        return {
          type,
          avg_time_seconds: Math.round(avg * 10) / 10,
          answers_analyzed: durations.length,
        };
      });

      return new Response(JSON.stringify(result), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // 12. GET /api/stats/d3/score-distribution
    // ==========================================
    if (path === "/api/stats/d3/score-distribution" && req.method === "GET") {
      const completedAttempts = await client.queryArray(
        `SELECT id FROM ${SCHEMA}.test_attempts WHERE status = 'completed'`
      );

      const buckets = { "0-20%": 0, "21-40%": 0, "41-60%": 0, "61-80%": 0, "81-100%": 0 };

      for (const row of completedAttempts.rows) {
        const gradesRes = await client.queryArray(
          `SELECT grade FROM ${SCHEMA}.test_answers WHERE attempt_id = $1 AND grade IS NOT NULL`,
          [row[0]]
        );
        const grades = gradesRes.rows.map((r) => Number(r[0]));
        if (grades.length === 0) continue;
        
        const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
        if (avg <= 20) buckets["0-20%"]++;
        else if (avg <= 40) buckets["21-40%"]++;
        else if (avg <= 60) buckets["41-60%"]++;
        else if (avg <= 80) buckets["61-80%"]++;
        else buckets["81-100%"]++;
      }

      const result = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
      return new Response(JSON.stringify(result), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // 13. Admin CRUD: /api/tests/questions-admin
    // ==========================================
    if (path.startsWith("/api/tests/questions-admin")) {
      const checkAdminAccess = (usr: any) => {
        const allowed = ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "cadet"];
        if (!allowed.includes(usr.role)) {
          throw new Error("Доступ разрешен только администраторам и инструкторам");
        }
      };
      
      checkAdminAccess(user);

      // GET /api/tests/questions-admin — list all
      if (req.method === "GET" && path === "/api/tests/questions-admin") {
        const qRes = await client.queryObject<any>(
          `SELECT id, subject, type, question_text, options, correct_answer, explanation, elo_rating, criteria_matrix, created_at
           FROM ${SCHEMA}.test_questions
           ORDER BY id DESC`
        );
        return new Response(JSON.stringify(qRes.rows), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // POST /api/tests/questions-admin — create
      if (req.method === "POST" && path === "/api/tests/questions-admin") {
        const body = await req.json();
        const { subject, type, question_text, options, correct_answer, explanation, elo_rating, criteria_matrix } = body;
        
        const qRes = await client.queryObject<any>(
          `INSERT INTO ${SCHEMA}.test_questions (subject, type, question_text, options, correct_answer, explanation, elo_rating, criteria_matrix)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [subject, type, question_text, options ? JSON.stringify(options) : null, JSON.stringify(correct_answer), explanation, elo_rating || 1000, criteria_matrix ? JSON.stringify(criteria_matrix) : null]
        );
        return new Response(JSON.stringify(qRes.rows[0]), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // PUT /api/tests/questions-admin/{id} — update
      if (req.method === "PUT") {
        const id = Number(path.split("/").pop());
        if (isNaN(id)) {
          return new Response(JSON.stringify({ error: "Invalid ID" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
        const body = await req.json();
        const fields = [];
        const values = [];
        let idx = 1;
        
        for (const [k, v] of Object.entries(body)) {
          if (["subject", "type", "question_text", "options", "correct_answer", "explanation", "elo_rating", "criteria_matrix"].includes(k)) {
            fields.push(`${k} = $${idx++}`);
            values.push(k === "options" || k === "correct_answer" || k === "criteria_matrix" ? JSON.stringify(v) : v);
          }
        }
        
        if (fields.length === 0) {
          return new Response(JSON.stringify({ error: "No fields to update" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
        
        values.push(id);
        const qRes = await client.queryObject<any>(
          `UPDATE ${SCHEMA}.test_questions SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
          values
        );
        return new Response(JSON.stringify(qRes.rows[0]), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // DELETE /api/tests/questions-admin/{id} — delete
      if (req.method === "DELETE") {
        const id = Number(path.split("/").pop());
        if (isNaN(id)) {
          return new Response(JSON.stringify({ error: "Invalid ID" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
        await client.queryArray(
          `DELETE FROM ${SCHEMA}.test_questions WHERE id = $1`,
          [id]
        );
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // ==========================================
    // 14. Admin Settings: /api/tests/settings-admin
    // ==========================================
    if (path === "/api/tests/settings-admin") {
      const checkAdminAccess = (usr: any) => {
        const allowed = ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "cadet"];
        if (!allowed.includes(usr.role)) {
          throw new Error("Доступ разрешен только администраторам и инструкторам");
        }
      };
      
      checkAdminAccess(user);

      // GET /api/tests/settings-admin
      if (req.method === "GET") {
        let settingsRes = await client.queryObject<any>(
          `SELECT id, subject, timer_minutes, question_count, base_elo FROM ${SCHEMA}.test_settings ORDER BY id ASC`
        );
        
        if (settingsRes.rows.length === 0) {
          await client.queryArray(
            `INSERT INTO ${SCHEMA}.test_settings (subject, timer_minutes, question_count, base_elo)
             VALUES ('Тест по ФЗ ФСВНГ и уставу ФСВНГ', 45, 30, 1000)`
          );
          settingsRes = await client.queryObject<any>(
            `SELECT id, subject, timer_minutes, question_count, base_elo FROM ${SCHEMA}.test_settings ORDER BY id ASC`
          );
        }
        
        return new Response(JSON.stringify(settingsRes.rows), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // PUT /api/tests/settings-admin
      if (req.method === "PUT") {
        const body = await req.json();
        const { subject, timer_minutes, question_count, base_elo } = body;
        
        const checkRes = await client.queryArray(
          `SELECT id FROM ${SCHEMA}.test_settings WHERE subject = $1`,
          [subject]
        );
        
        let settingsRow;
        if (checkRes.rows.length === 0) {
          const insertRes = await client.queryObject<any>(
            `INSERT INTO ${SCHEMA}.test_settings (subject, timer_minutes, question_count, base_elo)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [subject, timer_minutes, question_count, base_elo]
          );
          settingsRow = insertRes.rows[0];
        } else {
          const updateRes = await client.queryObject<any>(
            `UPDATE ${SCHEMA}.test_settings 
             SET timer_minutes = $1, question_count = $2, base_elo = $3 
             WHERE subject = $4 RETURNING *`,
            [timer_minutes, question_count, base_elo, subject]
          );
          settingsRow = updateRes.rows[0];
        }
        
        return new Response(JSON.stringify(settingsRow), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "Внутренняя ошибка сервера" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } finally {
    if (client) {
      await client.end().catch(console.error);
    }
  }
});
