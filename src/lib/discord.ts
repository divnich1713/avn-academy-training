// Helper to send Webhook notifications to a Discord channel
// Supports VITE_DISCORD_WEBHOOK_URL env variable and localStorage fallback for convenience

import { fetchInstructors } from "./api";

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export async function sendDiscordEmbed(payload: {
  title: string;
  description?: string;
  color: number; // Decimal color code
  fields?: DiscordEmbedField[];
  content?: string;
  reportId?: number;
}, targetType?: "dismissal" | "promotion" | "promotion_reviewed" | "instructor_promotion" | "test" | "request" | "lecture_test"): Promise<{ messageId?: string; channelId?: string } | undefined> {
  try {
    const token = localStorage.getItem("avng_token") || "";
    const pingRoleId = localStorage.getItem("avng_discord_ping_role_id") || import.meta.env.VITE_DISCORD_PING_ROLE_ID || "1516926223400435864";
    const content = payload.content !== undefined ? payload.content : (pingRoleId ? `<@&${pingRoleId.replace(/\D/g, "")}>` : undefined);
    
    // We send a generic_embed event to our FastAPI backend which routes it to Redis for the bot client
    const response = await fetch(`/fastapi-api/api/stats/admin/discord/publish-event-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Token": token,
      },
      body: JSON.stringify({
        event_type: "generic_embed",
        data: {
          title: payload.title,
          description: payload.description || "",
          color: payload.color,
          fields: payload.fields || [],
          content,
          channel_type: targetType || "requests",
          report_id: payload.reportId
        }
      })
    });
    
    if (response.ok) {
      return { messageId: "bot_msg", channelId: "bot_chan" };
    } else {
      console.error(`Ошибка при отправке события в Discord бот: ${response.status}`);
    }
  } catch (error) {
    console.error("Ошибка сети при обращении к Discord-боту:", error);
  }
}

// ─── Event Specific Helpers ──────────────────────────────────────────────────

// 1. Dismissal report notification (Red)
export async function sendDismissalReportDiscord({
  name,
  rank,
  reason,
  photoUrl,
  staticId,
  unit,
}: {
  name: string;
  rank: string;
  reason: string;
  photoUrl: string;
  staticId: string;
  unit?: string;
}): Promise<{ messageId?: string; channelId?: string } | undefined> {
  const formattedStaticId = fmtStaticId(staticId);

  const headAvngRoleId = localStorage.getItem("avng_discord_head_avng_role_id") || import.meta.env.VITE_DISCORD_HEAD_AVNG_ROLE_ID || "1517487209173876796";
  const deputyHeadRoleId = localStorage.getItem("avng_discord_deputy_head_role_id") || import.meta.env.VITE_DISCORD_DEPUTY_HEAD_ROLE_ID || "1517493040346828860";

  // Determine Head AVNG role mention
  let headAvngMention = "@Начальник АВНГ";
  if (headAvngRoleId) {
    headAvngMention = `<@&${headAvngRoleId.replace(/\D/g, "")}>`;
  }

  // Determine Deputy Head AVNG role mention
  let deputyHeadMention = "@Заместитель начальника АВНГ";
  if (deputyHeadRoleId) {
    deputyHeadMention = `<@&${deputyHeadRoleId.replace(/\D/g, "")}>`;
  }

  const description = `1. ${name} | ${formattedStaticId}
2. ${rank || "—"}
3. ${reason}
4. Приложил фотокарточку       удостоверения: ${photoUrl}`;

  return await sendDiscordEmbed({
    title: "🚨 Рапорт на увольнение",
    description,
    color: 15548997, // Red
    content: `${headAvngMention} ${deputyHeadMention}`,
  }, "dismissal");
}

function fmtStaticId(id: string | null | undefined): string {
  if (!id) return "—";
  const clean = id.replace(/\D/g, "").slice(0, 6);
  if (clean.length > 3) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

// 2. Promotion report notification (Green)
export async function sendPromotionReportDiscord({
  name,
  rank,
  staticId,
  promotionType,
  promotionTypeLabel,
  cadetDiscordId,
  reportId,
}: {
  name: string;
  rank: string;
  staticId: string;
  promotionType: "junior_sergeant" | "sergeant";
  promotionTypeLabel: string;
  cadetDiscordId?: string;
  reportId?: number;
}) {
  const isSergeant = promotionType === "sergeant";
  
  const attachments = isSergeant 
    ? [
        "• Отчёт о патрулировании прилегающей территорий;",
        "• Наряд на КПП-1;",
        "• Наряд на КПП-2 (Внутренний пост);",
        "• Участие в государственной поставке в количестве 4-ёх шт. В сопровождение инструктора АВНГ | СС;",
        "• Принять участие в досмотровых мероприятиях на двух собеседованиях;",
        "• Отчёт о прослушанных лекциях \"УК, ПК, КоАП\";",
        "• Лекция: О ФЗ закрытых территорий;",
        "• Отчёт о прохождений практического экзамена \"Штраф, Задержание, Арест\";",
        "• Отчёт о сдаче тестов УК/ПК/КоАП;"
      ]
    : [
        "• Вступительная лекция;",
        "• Лекция о Федеральном законе о Федеральной службе войск национальной гвардии и Уставе;",
        "• Строевая, физическая и огневая подготовка;",
        "• Присяга;",
        "• Вышка — 30 минут (доклад каждые 10 минут);",
        "• Патрулирование территории — 30 минут (доклад каждые 10 минут);",
        "• Заполнение личного дела;",
        "• Тест: Федеральный закон о Федеральной службе войск национальной гвардии и Устав;"
      ];

  const dateStr = new Date().toLocaleDateString("ru-RU");
  const signature = name.split(" ")[0] || "";
  const formattedStaticId = fmtStaticId(staticId);

  const formattedCurrentRank = isSergeant ? "младший сержант полиции" : "рядовой полиции";
  const formattedTargetRank = isSergeant ? "Сержант полиции" : "Младший сержант полиции";

  const headAvngRoleId = localStorage.getItem("avng_discord_head_avng_role_id") || import.meta.env.VITE_DISCORD_HEAD_AVNG_ROLE_ID || "1517487209173876796";
  const deputyHeadRoleId = localStorage.getItem("avng_discord_deputy_head_role_id") || import.meta.env.VITE_DISCORD_DEPUTY_HEAD_ROLE_ID || "1517493040346828860";

  let headAvngMention = "@Начальник АВНГ";
  if (headAvngRoleId) {
    headAvngMention = `<@&${headAvngRoleId.replace(/\D/g, "")}>`;
  }

  let deputyHeadMention = "@Заместитель начальника АВНГ";
  if (deputyHeadRoleId) {
    deputyHeadMention = `<@&${deputyHeadRoleId.replace(/\D/g, "")}>`;
  }

  let deputyHeadMention1 = deputyHeadMention;
  let deputyHeadMention2 = deputyHeadMention;
  let deputyHeadMention3 = deputyHeadMention;

  try {
    const instructorsList = await fetchInstructors();
    
    // Find Head of AVNG user
    const headAvngUser = instructorsList.find(u => u.role === "head_avng");
    if (headAvngUser?.discord_id) {
      headAvngMention = `<@${headAvngUser.discord_id.replace(/\D/g, "")}>`;
    }

    // Find Deputy Head users
    const deputyHeadUsers = instructorsList.filter(u => u.role === "deputy_head");
    if (deputyHeadUsers[0]?.discord_id) {
      deputyHeadMention1 = `<@${deputyHeadUsers[0].discord_id.replace(/\D/g, "")}>`;
    }
    if (deputyHeadUsers[1]?.discord_id) {
      deputyHeadMention2 = `<@${deputyHeadUsers[1].discord_id.replace(/\D/g, "")}>`;
    }
    if (deputyHeadUsers[2]?.discord_id) {
      deputyHeadMention3 = `<@${deputyHeadUsers[2].discord_id.replace(/\D/g, "")}>`;
    }
  } catch (err) {
    console.error("Error fetching instructors for mentions:", err);
  }

  const pingRoleId = localStorage.getItem("avng_discord_ping_role_id") || import.meta.env.VITE_DISCORD_PING_ROLE_ID || "1516926223400435864";
  let embedContent = "";
  if (pingRoleId) {
    embedContent += `<@&${pingRoleId.replace(/\D/g, "")}> `;
  }

  const reportText = `ФЕДЕРАЛЬНАЯ СЛУЖБА ВОЙСК НАЦИОНАЛЬНОЙ ГВАРДИИ

РОССИЙСКОЙ ФЕДЕРАЦИИ (ФСВНГ России)

Академия войск национальной гвардии (АВНГ)

Начальнику Академии войск Национальной гвардии

подполковнику —  ${headAvngMention}

Копия:
заместителю начальника АВНГ — ${deputyHeadMention1}
заместителю начальника АВНГ — ${deputyHeadMention2}
заместителю начальника АВНГ — ${deputyHeadMention3}

От курсанта: ${name}
Порядковый номер: ${formattedStaticId}
Звание: ${rank}

Рапорт
Я, ${formattedCurrentRank} ${name}. Прошу рассмотреть мой рапорт о повышении по службе в Академии Войск Национальной Гвардии УФСВНГ России, согласно установленной системе. В соответствии с правилами системы повышения, к рапорту прилагаю:
Выполненные условия для повышения: 

К рапорту прилагаю:

${attachments.join("\n")}

Согласно установленной системе, мною были выполнены необходимые критерии, что дает мне право претендовать на присвоение очередного специального звания ${formattedTargetRank}. Прошу учесть мои заслуги и присвоить очередное специальное звание.
Даю согласие, в случае обмана руководства, понести за это наказание, в виде дисциплинарных взысканий вплоть до понижения в звании.

Дата: ${dateStr}

Подпись: ${signature}`;

  await sendDiscordEmbed({
    title: "🟢 Подан рапорт на повышение в звании",
    description: reportText,
    color: 5763719, // Green
    content: embedContent || undefined,
    reportId: reportId
  }, "promotion");
}

// 3. Test completed notification (Blue / Purple)
export async function sendTestCompletedDiscord({
  name,
  rank,
  staticId,
  unit,
  subject,
  score,
  totalQuestions,
  percent,
  grade,
  passed,
  cadetDiscordId,
}: {
  name: string;
  rank: string;
  staticId: string;
  unit?: string;
  subject: string;
  score: number;
  totalQuestions: number;
  percent: number;
  grade?: number;
  passed: boolean;
  cadetDiscordId?: string;
}) {
  const formattedStaticId = fmtStaticId(staticId);

  // Date formatting: 18 июня 2026 г. в 01:20
  const dateObj = new Date();
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const dateFormatted = dateObj.toLocaleDateString("ru-RU", options);
  const timeFormatted = dateObj.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  let baseDate = dateFormatted;
  if (!baseDate.includes("г.")) {
    baseDate = `${baseDate} г.`;
  }
  const fullDateStr = `${baseDate} в ${timeFormatted}`;

  const systemUrl = typeof window !== "undefined" ? window.location.origin : "https://avn-academy.ru";
  const formattedPercent = typeof percent === "number" ? (percent % 1 === 0 ? percent.toString() : percent.toFixed(2)) : percent;

  const reportText = passed
    ? `Курсант: ${name} | ${formattedStaticId}

Звание: ${rank}
Подразделение: ${unit || "АВНГ"}

Тема: ${subject}
Результат: 🟢 СДАН

Оценка: ${grade !== undefined ? grade : "—"}
Верные ответы: ${score} из ${totalQuestions} (${formattedPercent}%)

Дата сдачи: ${fullDateStr}
Ссылка на систему: ${systemUrl}`
    : `Курсант: ${name} | ${formattedStaticId}

Звание: ${rank}
Подразделение: ${unit || "АВНГ"}

Тема: ${subject}
Результат: 🔴 НЕ СДАН

Оценка: ${grade !== undefined ? grade : "—"}
Процент верных: ${formattedPercent}%

Дата сдачи: ${fullDateStr}
Ссылка на систему: ${systemUrl}`;

  const cadetMention = cadetDiscordId ? `<@${cadetDiscordId.replace(/\D/g, "")}>` : "";
  const pingRoleId = localStorage.getItem("avng_discord_ping_role_id") || import.meta.env.VITE_DISCORD_PING_ROLE_ID || "1516926223400435864";
  const roleMention = pingRoleId ? `<@&${pingRoleId.replace(/\D/g, "")}>` : "";
  const outerContent = passed 
    ? [roleMention, cadetMention].filter(Boolean).join(" ") 
    : cadetMention;

  const finalTargetType = "test";

  const title = passed ? "✅Экзамен тестирования проведен" : "❌Результат тестирования АВНГ";

  await sendDiscordEmbed({
    title,
    description: reportText,
    color: passed ? 3447003 : 10038562, // Blue for passed, Dark Red for failed
    content: outerContent || undefined,
  }, finalTargetType);
}

const SKIPPED_SUBJECTS = [
  "Заполнение личного дела",
  "Вышка — 30 мин",
  "Патруль по территории — 30 мин",
  "Наряд на КПП-1 — 30 мин",
  "Наряд на КПП-2 — 1 час",
  "Участие в досмотровых мероприятиях",
  "Участие в государственной поставке"
];

function shouldSkipDiscord(subject: string): boolean {
  if (!subject) return false;
  const s = subject.trim().toLowerCase();
  return SKIPPED_SUBJECTS.some(skipped => {
    const sk = skipped.trim().toLowerCase();
    return s.includes(sk) || sk.includes(s);
  });
}

// 4. General Cadet Request Notification (Yellow / Blue / Purple)
export async function sendGeneralRequestDiscord({
  name,
  rank,
  staticId,
  unit,
  typeLabel,
  subject,
  preferredDate,
  details,
  cadetDiscordId,
  instructorName,
  request_id,
  requestType
}: {
  name: string;
  rank: string;
  staticId: string;
  unit?: string;
  typeLabel: string;
  subject: string;
  preferredDate: string;
  details?: string;
  cadetDiscordId?: string;
  instructorName?: string;
  request_id?: number;
  requestType?: string;
}) {
  if (shouldSkipDiscord(subject)) {
    console.log(`Пропускаем отправку уведомления в Discord для темы: ${subject}`);
    return;
  }

  // Если есть ID запроса, шлем специальное событие "request_created" для отображения кнопок!
  if (request_id) {
    const token = localStorage.getItem("avng_token") || "";
    try {
      await fetch(`/fastapi-api/api/stats/admin/discord/publish-event-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": token,
        },
        body: JSON.stringify({
          event_type: "request_created",
          data: {
            request_id,
            user_name: name,
            user_static_id: staticId,
            type: requestType || "lecture",
            subject
          }
        })
      });
      return;
    } catch (error) {
      console.error("Ошибка отправки request_created:", error);
    }
  }

  const typeLower = typeLabel.toLowerCase();
  const subjectLower = subject.toLowerCase();
  
  const isExam = typeLower.includes("экзамен") || subjectLower.includes("экзамен");
  const isPractice = typeLower.includes("практик") || typeLower === "практика";
  
  let title = "💛 Подан запрос на лекцию";
  let color = 15844367; // Yellow for lecture
  const targetType = "request";

  if (isExam) {
    title = "📋 Подан запрос на экзамен";
    color = 10181046; // Purple
  } else if (isPractice) {
    title = "🔧 Подан запрос на практику";
    color = 3447003; // Blue
  }

  const formattedStaticId = fmtStaticId(staticId);
  const description = `**Курсант:** ${name} | ${formattedStaticId}
**Звание:** ${rank || "—"}
**Подразделение:** ${unit || "АВНГ"}
**Тема / Занятие:**
  ${subject}
${instructorName ? `**Выбранный инструктор:**\n  ${instructorName}\n` : ""}**Желаемая дата:**
  ${preferredDate}`;

  const cadetMention = cadetDiscordId ? `<@${cadetDiscordId.replace(/\D/g, "")}>` : "";
  const pingRoleId = localStorage.getItem("avng_discord_ping_role_id") || import.meta.env.VITE_DISCORD_PING_ROLE_ID || "1516926223400435864";
  const roleMention = pingRoleId ? `<@&${pingRoleId.replace(/\D/g, "")}>` : "";
  const outerContent = [roleMention, cadetMention].filter(Boolean).join(" ");

  await sendDiscordEmbed({
    title,
    description,
    color,
    fields: details ? [{ name: "Дополнительно / Доказательства", value: details.substring(0, 1024), inline: false }] : [],
    content: outerContent || undefined,
  }, targetType);
}

// 5. Request Reviewed Notification (Green / Red)
export async function sendRequestReviewedDiscord({
  name,
  rank,
  staticId,
  typeLabel,
  subject,
  status,
  reviewerName,
  comment,
  cadetDiscordId,
  reviewerDiscordId,
}: {
  name: string;
  rank: string;
  staticId: string;
  typeLabel: string;
  subject: string;
  status: "approved" | "rejected";
  reviewerName: string;
  comment?: string;
  cadetDiscordId?: string;
  reviewerDiscordId?: string;
}) {
  if (shouldSkipDiscord(subject)) {
    console.log(`Пропускаем отправку уведомления в Discord для темы: ${subject}`);
    return;
  }

  const typeLower = typeLabel.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const isExam = typeLower.includes("экзамен") || subjectLower.includes("экзамен");
  const isLecture = typeLower.includes("лекци") || subjectLower.includes("лекци");
  const isPractice = typeLower.includes("практик") || subjectLower.includes("практик");
  const isDismissal = typeLower.includes("увольн") || subjectLower.includes("увольн");
  const isApproved = status === "approved";
  
  let targetType = "request";
  if (isExam) {
    targetType = "test";
  } else if (isLecture || isPractice) {
    targetType = "lecture_test";
  } else if (isDismissal) {
    targetType = "dismissal";
  }

  let title = "✅ Запрос одобрен";
  if (isApproved) {
    if (isExam) {
      title = "✅ Экзамен проведен инструктором:";
    } else if (isLecture) {
      title = "✅ Лекция проведена инструктором:";
    } else if (isPractice) {
      title = "✅ Практика проведена инструктором:";
    } else if (isDismissal) {
      title = "✅ Рапорт на увольнение одобрен:";
    }
  } else {
    if (isExam) {
      title = "❌ Экзамен отклонен инструктором:";
    } else if (isLecture) {
      title = "❌ Лекция отклонена инструктором:";
    } else if (isPractice) {
      title = "❌ Практика отклонена инструктором:";
    } else if (isDismissal) {
      title = "❌ Рапорт на увольнение отклонен:";
    } else {
      title = "❌ Запрос отклонен";
    }
  }
  const color = isApproved ? 5763719 : 15548997; // Green for approved, Red for rejected

  const cadetMention = cadetDiscordId ? `<@${cadetDiscordId.replace(/\D/g, "")}>` : name;
  const reviewerMention = reviewerDiscordId ? `<@${reviewerDiscordId.replace(/\D/g, "")}>` : reviewerName;

  const commentText = comment && comment.trim() 
    ? `\n\nКомментарий инструктора\n${comment.trim()}` 
    : "";

  const descriptionText = `Курсант: ${cadetMention} | ${fmtStaticId(staticId)}
Звание: ${rank || "—"}

Категория: ${typeLabel}
Тема / Занятие
${subject}

Проверил
${reviewerMention}

Статус
${isApproved ? "Зачтено / Выполнено" : "Отклонено"}${commentText}`;

  await sendDiscordEmbed({
    title,
    description: descriptionText,
    color,
    fields: [],
    content: "",
  }, targetType);
}

// 6. Promotion reviewed notification (Plain text matching user template)
export async function sendPromotionReviewedDiscord({
  name,
  staticId,
  promotionType,
  status,
  comment,
  reportId,
  cadetDiscordId,
}: {
  name: string;
  staticId: string;
  promotionType: "junior_sergeant" | "sergeant";
  status: "approved" | "rejected";
  comment?: string;
  reportId: number;
  cadetDiscordId?: string;
}) {
  const formattedStaticId = fmtStaticId(staticId);
  const targetRankLabel = promotionType === "junior_sergeant" ? "Младшего сержанта" : "Сержанта";
  const systemUrl = typeof window !== "undefined" ? window.location.origin : "https://avn-academy.ru";
  const reportLink = `${systemUrl}/?tab=promotions&reportId=${reportId}`;

  const mention = cadetDiscordId ? `<@${cadetDiscordId.replace(/\D/g, "")}>` : `@Курсант ${name}`;

  const isApproved = status === "approved";
  let content = isApproved
    ? `${name} | ${formattedStaticId} повышен до ${targetRankLabel} согласно [рапорту](${reportLink}) АВНГ ${mention}`
    : `${name} | ${formattedStaticId} отказано в повышении до ${targetRankLabel} согласно [рапорту](${reportLink}) АВНГ ${mention}`;

  if (comment && comment.trim()) {
    content += `\n**Комментарий:** ${comment.trim()}`;
  }

  const title = isApproved ? "✅ Рапорт на повышение одобрен" : "❌ Рапорт на повышение отклонен";
  const color = isApproved ? 5763719 : 15548997; // Green or Red

  await sendDiscordEmbed({
    title,
    description: content,
    color,
    content: "",
    reportId: reportId
  }, "promotion_reviewed");
}

// 7. Instructor Promotion Report Notification (Green)
export async function sendInstructorPromotionReportDiscord({
  name,
  rank,
  staticId,
  targetRank,
  totalPoints,
  itemsListText,
  instructorDiscordId,
}: {
  name: string;
  rank: string;
  staticId: string;
  targetRank: string;
  totalPoints: number;
  itemsListText: string;
  instructorDiscordId?: string;
}) {
  const formattedStaticId = fmtStaticId(staticId);
  
  const INSTRUCTOR_FLOW_POINTS: Record<string, number> = {
    "Старший Сержант": 300,
    "Старшина": 400,
    "Прапорщик": 500,
    "Старший Прапорщик": 600,
    "Младший Лейтенант": 700,
    "Лейтенант": 800,
    "Старший Лейтенант": 900,
    "Капитан": 1200
  };
  const neededPoints = INSTRUCTOR_FLOW_POINTS[targetRank] || 0;

  const formattedCurrentRank = `${rank.toLowerCase()} полиции`;
  const formattedTargetRank = targetRank ? `${targetRank.charAt(0).toUpperCase() + targetRank.slice(1).toLowerCase()} полиции` : "";

  const chiefInstructorRoleId = localStorage.getItem("avng_discord_chief_instructor_role_id") || import.meta.env.VITE_DISCORD_CHIEF_INSTRUCTOR_ROLE_ID || "1517764461388238860";
  const headAvngRoleId = localStorage.getItem("avng_discord_head_avng_role_id") || import.meta.env.VITE_DISCORD_HEAD_AVNG_ROLE_ID || "1517487209173876796";
  const deputyHeadRoleId = localStorage.getItem("avng_discord_deputy_head_role_id") || import.meta.env.VITE_DISCORD_DEPUTY_HEAD_ROLE_ID || "1517493040346828860";

  let headAvngMention = "@Начальник АВНГ";
  if (headAvngRoleId) {
    headAvngMention = `<@&${headAvngRoleId.replace(/\D/g, "")}>`;
  }

  let deputyHeadMention = "@Заместитель начальника АВНГ";
  if (deputyHeadRoleId) {
    deputyHeadMention = `<@&${deputyHeadRoleId.replace(/\D/g, "")}>`;
  }

  let deputyHeadMention1 = deputyHeadMention;
  let deputyHeadMention2 = deputyHeadMention;
  let deputyHeadMention3 = deputyHeadMention;

  try {
    const instructorsList = await fetchInstructors();
    
    // Find Head of AVNG user
    const headAvngUser = instructorsList.find(u => u.role === "head_avng");
    if (headAvngUser?.discord_id) {
      headAvngMention = `<@${headAvngUser.discord_id.replace(/\D/g, "")}>`;
    }

    // Find Deputy Head users
    const deputyHeadUsers = instructorsList.filter(u => u.role === "deputy_head");
    if (deputyHeadUsers[0]?.discord_id) {
      deputyHeadMention1 = `<@${deputyHeadUsers[0].discord_id.replace(/\D/g, "")}>`;
    }
    if (deputyHeadUsers[1]?.discord_id) {
      deputyHeadMention2 = `<@${deputyHeadUsers[1].discord_id.replace(/\D/g, "")}>`;
    }
    if (deputyHeadUsers[2]?.discord_id) {
      deputyHeadMention3 = `<@${deputyHeadUsers[2].discord_id.replace(/\D/g, "")}>`;
    }
  } catch (err) {
    console.error("Error fetching instructors for mentions:", err);
  }

  let embedContent = "";
  if (chiefInstructorRoleId) {
    embedContent += `<@&${chiefInstructorRoleId.replace(/\D/g, "")}> `;
  }
  if (headAvngRoleId) {
    embedContent += `<@&${headAvngRoleId.replace(/\D/g, "")}> `;
  }
  if (deputyHeadRoleId) {
    embedContent += `<@&${deputyHeadRoleId.replace(/\D/g, "")}> `;
  }

  const reportText = `ФЕДЕРАЛЬНАЯ СЛУЖБА ВОЙСК НАЦИОНАЛЬНОЙ ГВАРДИИ

РОССИЙСКОЙ ФЕДЕРАЦИИ (ФСВНГ России)

Академия войск национальной гвардии (АВНГ)

Начальнику Академии войск Национальной гвардии

подполковнику —  ${headAvngMention}

Копия:
заместителю начальника АВНГ — ${deputyHeadMention1}
заместителю начальника АВНГ — ${deputyHeadMention2}
заместителю начальника АВНГ — ${deputyHeadMention3}

От инструктора: ${name}
Порядковый номер: ${formattedStaticId}
Звание: ${rank}

Рапорт
Я, ${formattedCurrentRank} ${name}. Прошу рассмотреть мой рапорт о повышении по службе в Академии Войск Национальной Гвардии УФСВНГ России, согласно установленной системе. В соответствии с правилами системы повышения, к рапорту прилагаю:
Выполненные условия для повышения: 

К рапорту прилагаю:

${itemsListText.substring(0, 1500)}
Итого:  всего ${totalPoints} (${neededPoints} нужно)

Согласно установленной системе, мною были выполнены необходимые критерии, что дает мне право претендовать на присвоение очередного специального звания ${formattedTargetRank}. Прошу учесть мои заслуги и присвоить очередное специальное звание.
Даю согласие, в случае обмана руководства, понести за это наказание, в виде дисциплинарных взысканий вплоть до понижения в звании.

Дата: ${new Date().toLocaleDateString("ru-RU")}

Подпись: ${name.split(" ")[0]}`;

  await sendDiscordEmbed({
    title: "🟢 Подан рапорт на повышение инструктора",
    description: reportText,
    color: 5763719, // Green
    content: embedContent || undefined,
  }, "instructor_promotion");
}

// 8. Instructor Promotion Reviewed Notification
export async function sendInstructorPromotionReviewedDiscord({
  name,
  staticId,
  targetRank,
  status,
  comment,
  reportId,
  instructorDiscordId,
}: {
  name: string;
  staticId: string;
  targetRank: string;
  status: "approved" | "rejected";
  comment?: string;
  reportId: number;
  instructorDiscordId?: string;
}) {
  const webhookUrl = import.meta.env.VITE_DISCORD_PROMOTION_APPROVED_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("Discord instructor promotion approved webhook is not configured.");
    return;
  }

  const formattedStaticId = fmtStaticId(staticId);
  const systemUrl = typeof window !== "undefined" ? window.location.origin : "https://avn-academy.ru";
  const reportLink = `${systemUrl}/?tab=promotions&instructorReportId=${reportId}`;

  const mention = instructorDiscordId ? `<@${instructorDiscordId.replace(/\D/g, "")}>` : `@Инструктор ${name}`;

  const isApproved = status === "approved";
  let content = isApproved
    ? `Инструктор ${name} | ${formattedStaticId} повышен до ${targetRank} согласно [рапорту](${reportLink}) АВНГ ${mention}`
    : `Инструктор ${name} | ${formattedStaticId} отказано в повышении до ${targetRank} согласно [рапорту](${reportLink}) АВНГ ${mention}`;

  if (comment && comment.trim()) {
    content += `\n**Комментарий:** ${comment.trim()}`;
  }

  try {
    const token = localStorage.getItem("avng_token") || "";
    const isMock = import.meta.env.VITE_USE_MOCK === "true";

    if (isMock) {
      const urlWithWait = webhookUrl.includes("?") ? `${webhookUrl}&wait=true` : `${webhookUrl}?wait=true`;
      await fetch(urlWithWait, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } else {
      await fetch(`/supabase-api/notifications?action=discord`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": token,
        },
        body: JSON.stringify({
          webhookUrl,
          payload: { content },
        }),
      });
    }
  } catch (error) {
    console.error("Ошибка при отправке в Discord Webhook о проверке рапорта инструктора:", error);
  }
}
