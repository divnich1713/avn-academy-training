// Helper to send Webhook notifications to a Discord channel
// Supports VITE_DISCORD_WEBHOOK_URL env variable and localStorage fallback for convenience

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
}, targetType?: "dismissal" | "promotion" | "test" | "request") {
  let webhookUrl = "";

  // Try to find target-specific webhook URL
  if (targetType === "dismissal") {
    webhookUrl = import.meta.env.VITE_DISCORD_DISMISSAL_WEBHOOK_URL || localStorage.getItem("avng_discord_dismissal_webhook_url") || "";
  } else if (targetType === "promotion") {
    webhookUrl = import.meta.env.VITE_DISCORD_PROMOTION_WEBHOOK_URL || localStorage.getItem("avng_discord_promotion_webhook_url") || "";
  } else if (targetType === "test") {
    webhookUrl = import.meta.env.VITE_DISCORD_TEST_WEBHOOK_URL || localStorage.getItem("avng_discord_test_webhook_url") || "";
  } else if (targetType === "request") {
    webhookUrl = import.meta.env.VITE_DISCORD_REQUEST_WEBHOOK_URL || localStorage.getItem("avng_discord_request_webhook_url") || "";
  }

  // Fallback to general webhook URL
  if (!webhookUrl) {
    webhookUrl = 
      import.meta.env.VITE_DISCORD_WEBHOOK_URL || 
      localStorage.getItem("avng_discord_webhook_url") || 
      (window as any).VITE_DISCORD_WEBHOOK_URL;
  }

  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    console.log(`Discord Webhook URL для ${targetType || "general"} не задан или некорректен. Пропустили отправку.`);
    return;
  }

  try {
    const pingRoleId = localStorage.getItem("avng_discord_ping_role_id") || import.meta.env.VITE_DISCORD_PING_ROLE_ID || "";
    const content = pingRoleId ? `<@&${pingRoleId.replace(/\D/g, "")}>` : undefined;
    const token = localStorage.getItem("avng_token") || "";
    const isMock = import.meta.env.VITE_USE_MOCK === "true";

    let response;
    if (isMock) {
      response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          embeds: [
            {
              title: payload.title,
              description: payload.description || "",
              color: payload.color,
              fields: payload.fields || [],
              timestamp: new Date().toISOString(),
              footer: {
                text: "Академия Росгвардии AVNG",
              },
            },
          ],
        }),
      });
    } else {
      // Proxy through Supabase Edge Function to bypass regional blocks in Russia
      response = await fetch(`/supabase-api/notifications?action=discord`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": token,
        },
        body: JSON.stringify({
          webhookUrl,
          payload: {
            content,
            embeds: [
              {
                title: payload.title,
                description: payload.description || "",
                color: payload.color,
                fields: payload.fields || [],
                timestamp: new Date().toISOString(),
                footer: {
                  text: "Академия Росгвардии AVNG",
                },
              },
            ],
          }
        }),
      });
    }

    if (!response.ok) {
      console.error(`Ошибка при отправке в Discord Webhook: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Ошибка сети при отправке в Discord:", error);
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
}) {
  const formattedStaticId = fmtStaticId(staticId);
  const description = `**Курсант:** ${name} | ${formattedStaticId}
**Звание:** ${rank || "—"}
**Подразделение:** ${unit || "АВНГ"}
**Причина:** ${reason}

Ссылка на фотокарточку (удостоверение)
${photoUrl}`;

  await sendDiscordEmbed({
    title: "🚨 Подан рапорт на увольнение из академии",
    description,
    color: 15548997, // Red
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
}: {
  name: string;
  rank: string;
  staticId: string;
  promotionType: "junior_sergeant" | "sergeant";
  promotionTypeLabel: string;
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
        "• Лекция ФЗ о ФСВНГ и Уставу;",
        "• Строевая, физическая и огневая подготовка;",
        "• Присяга;",
        "• Вышка — 30 мин (доклад каждые 10 мин);",
        "• Патруль по территории — 30 мин (доклад каждые 10 мин);",
        "• Заполнение личного дела;",
        "• Тест: ФЗ о ФСВНГ и Внутреннему Уставу;"
      ];

  const dateStr = new Date().toLocaleDateString("ru-RU");
  const signature = name.split(" ")[0] || "";
  const formattedStaticId = fmtStaticId(staticId);

  const reportText = `**ФЕДЕРАЛЬНАЯ СЛУЖБА ВОЙСК НАЦИОНАЛЬНОЙ ГВАРДИИ**
**РОССИЙСКОЙ ФЕДЕРАЦИИ (ФСВНГ России)**
**Академия Войск Национальной Гвардии (АВНГ)**

Начальнику Академии Войск Национальной Гвардии
подполковнику — Нач.АВНГ | Артем Панарин

Копия:
Заместителю начальника АВНГ — Зам.Нач.АВНГ | Данила Моралис
Заместителю начальника АВНГ — Зам.Нач.АВНГ | Илья Росса
Заместителю начальника АВНГ — Зам.Нач.АВНГ | Иван Андрейченко

От курсанта: ${name}
Табельный номер: ${formattedStaticId}
Звание: ${rank}

**РАПОРТ**
Прошу Вашего ходатайства перед вышестоящим командованием о присвоении мне очередного воинского звания «${promotionTypeLabel}».

К рапорту прилагаю:
${attachments.join("\n")}

Дата: ${dateStr}
Подпись: *${signature}*`;

  await sendDiscordEmbed({
    title: "🟢 Подан рапорт на повышение в звании",
    description: reportText,
    color: 5763719, // Green
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

  const systemUrl = typeof window !== "undefined" ? window.location.origin : "https://avn-academy-training-netlify-app.ru";
  const formattedPercent = typeof percent === "number" ? (percent % 1 === 0 ? percent.toString() : percent.toFixed(2)) : percent;

  const reportText = passed
    ? `**[РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ АВНГ]**
**Курсант:** ${name} | ${formattedStaticId}
**Звание:** ${rank}
**Подразделение:** ${unit || "АВНГ"}
**Тема:** ${subject}
**Результат:** 🟢 СДАН
**Оценка:** ${grade !== undefined ? grade : "—"}
**Верные ответы:** ${score} из ${totalQuestions} (${formattedPercent}%)
**Дата сдачи:** ${fullDateStr}
**Ссылка на систему:** ${systemUrl}`
    : `**[РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ АВНГ]**
**Курсант:** ${name} | ${formattedStaticId}
**Звание:** ${rank}
**Подразделение:** ${unit || "АВНГ"}
**Результат:** 🔴 НЕ СДАН
**Оценка:** ${grade !== undefined ? grade : "—"}
**Процент верных:** ${formattedPercent}%
**Дата сдачи:** ${fullDateStr}
**Ссылка на систему:** ${systemUrl}`;

  await sendDiscordEmbed({
    title: "🎓 Результат тестирования АВНГ",
    description: reportText,
    color: passed ? 3447003 : 10038562, // Blue for passed, Dark Red for failed
  }, "test");
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
}: {
  name: string;
  rank: string;
  staticId: string;
  unit?: string;
  typeLabel: string;
  subject: string;
  preferredDate: string;
  details?: string;
}) {
  if (shouldSkipDiscord(subject)) {
    console.log(`Пропускаем отправку уведомления в Discord для темы: ${subject}`);
    return;
  }

  const typeLower = typeLabel.toLowerCase();
  const subjectLower = subject.toLowerCase();
  
  const isExam = typeLower.includes("экзамен") || subjectLower.includes("экзамен");
  const isPractice = typeLower.includes("практик") || typeLower === "практика";
  
  let title = "💛 Подан запрос на лекцию";
  let color = 15844367; // Yellow for lecture
  let targetType: "request" | "test" = "request";

  if (isExam) {
    title = "📋 Подан запрос на экзамен";
    color = 10181046; // Purple
    targetType = "test";
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
**Желаемая дата:**
  ${preferredDate}`;

  await sendDiscordEmbed({
    title,
    description,
    color,
    fields: details ? [{ name: "Дополнительно / Доказательства", value: details.substring(0, 1024), inline: false }] : [],
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
}: {
  name: string;
  rank: string;
  staticId: string;
  typeLabel: string;
  subject: string;
  status: "approved" | "rejected";
  reviewerName: string;
  comment?: string;
}) {
  if (shouldSkipDiscord(subject)) {
    console.log(`Пропускаем отправку уведомления в Discord для темы: ${subject}`);
    return;
  }

  const typeLower = typeLabel.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const isExam = typeLower.includes("экзамен") || subjectLower.includes("экзамен");
  const targetType = isExam ? "test" : "request";

  const isApproved = status === "approved";
  const title = isApproved 
    ? (isExam ? "🎓 Экзамен разрешен (Запрос одобрен)" : "✅ Запрос одобрен")
    : (isExam ? "🎓 Экзамен запрещен (Запрос отклонен)" : "❌ Запрос отклонен");
  const color = isApproved ? 5763719 : 15548997; // Green for approved, Red for rejected

  await sendDiscordEmbed({
    title,
    description: `**Курсант:** ${name} | ${fmtStaticId(staticId)}\n**Звание:** ${rank || "—"}\n**Категория:** ${typeLabel}`,
    color,
    fields: [
      { name: "Тема / Занятие", value: subject, inline: false },
      { name: "Проверил", value: reviewerName, inline: true },
      { name: "Статус", value: isApproved ? "Зачтено / Выполнено" : "Отклонено", inline: true },
      ...(comment ? [{ name: "Комментарий инструктора", value: comment.substring(0, 1024), inline: false }] : []),
    ],
  }, targetType);
}

// 6. Promotion approved notification (Plain text matching user template)
export async function sendPromotionApprovedDiscord({
  name,
  staticId,
  promotionType,
  reportId,
}: {
  name: string;
  staticId: string;
  promotionType: "junior_sergeant" | "sergeant";
  reportId: number;
}) {
  const webhookUrl = 
    import.meta.env.VITE_DISCORD_PROMOTION_APPROVED_WEBHOOK_URL || 
    "https://discord.com/api/webhooks/1517165782377697330/dmXqCUJzD_2xp8HE-bwFsLtuOUTAtgjR6vxGeuyG5GT-NJ0ddHAWhAO5i9PDxLjzB9WH";

  const formattedStaticId = fmtStaticId(staticId);
  const targetRankLabel = promotionType === "junior_sergeant" ? "Мл. Сержанта" : "Сержанта";
  const systemUrl = typeof window !== "undefined" ? window.location.origin : "https://avn-academy-training-netlify-app.ru";
  const reportLink = `${systemUrl}/?tab=promotions&reportId=${reportId}`;

  const content = `${name} | ${formattedStaticId} повышен до ${targetRankLabel} согласно [рапорту](${reportLink}) АВНГ`;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
      }),
    });
  } catch (error) {
    console.error("Ошибка при отправке в Discord Webhook о повышении:", error);
  }
}
