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
}) {
  const webhookUrl = 
    import.meta.env.VITE_DISCORD_WEBHOOK_URL || 
    localStorage.getItem("avng_discord_webhook_url") || 
    (window as any).VITE_DISCORD_WEBHOOK_URL;

  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    console.log("Discord Webhook URL не задан или некорректен. Пропустили отправку.");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
  passport,
  rank,
  reason,
  photoUrl,
  staticId,
}: {
  name: string;
  passport: string;
  rank: string;
  reason: string;
  photoUrl: string;
  staticId: string;
}) {
  await sendDiscordEmbed({
    title: "🚨 Подан рапорт на увольнение из академии",
    color: 15548997, // Red
    fields: [
      { name: "Курсант", value: `${rank} ${name} (${staticId})`, inline: true },
      { name: "Паспорт", value: passport, inline: true },
      { name: "Причина", value: reason, inline: false },
      { name: "Ссылка на фотокарточку (удостоверение)", value: photoUrl, inline: false },
    ],
  });
}

// 2. Promotion report notification (Green)
export async function sendPromotionReportDiscord({
  name,
  rank,
  staticId,
  promotionTypeLabel,
}: {
  name: string;
  rank: string;
  staticId: string;
  promotionTypeLabel: string;
}) {
  await sendDiscordEmbed({
    title: "🟢 Подан рапорт на повышение в звании",
    color: 5763719, // Green
    fields: [
      { name: "Курсант", value: `${rank} ${name} (${staticId})`, inline: true },
      { name: "Желаемое звание", value: promotionTypeLabel, inline: true },
    ],
  });
}

// 3. Test completed notification (Blue / Purple)
export async function sendTestCompletedDiscord({
  name,
  rank,
  staticId,
  subject,
  score,
  totalQuestions,
  percent,
  passed,
}: {
  name: string;
  rank: string;
  staticId: string;
  subject: string;
  score: number;
  totalQuestions: number;
  percent: number;
  passed: boolean;
}) {
  await sendDiscordEmbed({
    title: passed ? "🎓 Тест успешно сдан!" : "❌ Тест не сдан",
    color: passed ? 3447003 : 10038562, // Blue for passed, Dark Red for failed
    fields: [
      { name: "Курсант", value: `${rank} ${name} (${staticId})`, inline: true },
      { name: "Дисциплина", value: subject, inline: true },
      { name: "Результат", value: `${score}/${totalQuestions} правильных ответов (${percent}%)`, inline: false },
      { name: "Статус аттестации", value: passed ? "Зачтено" : "Не зачтено (требуется пересдача)", inline: true },
    ],
  });
}

// 4. General Cadet Request Notification (Yellow / Blue)
export async function sendGeneralRequestDiscord({
  name,
  rank,
  staticId,
  typeLabel,
  subject,
  preferredDate,
  details,
}: {
  name: string;
  rank: string;
  staticId: string;
  typeLabel: string;
  subject: string;
  preferredDate: string;
  details?: string;
}) {
  const isPractice = typeLabel.toLowerCase().includes("практик");
  await sendDiscordEmbed({
    title: isPractice ? "🔧 Подан запрос на практику" : "💛 Подан запрос на лекцию",
    color: isPractice ? 3447003 : 15844367, // Blue for practice, Yellow for lecture
    fields: [
      { name: "Курсант", value: `${rank} ${name} (${staticId})`, inline: true },
      { name: "Категория", value: typeLabel, inline: true },
      { name: "Тема / Занятие", value: subject, inline: false },
      { name: "Желаемая дата", value: preferredDate, inline: true },
      ...(details ? [{ name: "Дополнительно / Доказательства", value: details.substring(0, 1024), inline: false }] : []),
    ],
  });
}
