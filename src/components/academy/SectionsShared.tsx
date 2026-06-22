import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { StatusBadge, SectionHeader } from "./UIComponents";
import { User } from "@/lib/api";
import { createRequest, TrainingRequest } from "@/lib/api";
import { sendDismissalReportDiscord, sendGeneralRequestDiscord } from "@/lib/discord";
import { useRequests, useInstructors } from "@/lib/useQueries";

export const TYPE_LABEL: Record<string, string> = {
  lecture: "Лекция",
  practice: "Практика",
  exam: "Экзамен",
  report: "Рапорт",
  dismissal: "Увольнение (7 дн.)",
};

export function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU");
}

export function avg(grades: { grade: number }[]) {
  if (!grades.length) return "—";
  return (grades.reduce((s, g) => s + g.grade, 0) / grades.length).toFixed(1);
}

export function fmtStaticId(id: string | null | undefined): string {
  if (!id) return "—";
  const clean = id.replace(/\D/g, "").slice(0, 6);
  if (clean.length > 3) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <Icon name="Loader2" size={24} className="text-primary animate-spin" />
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <Icon name="Inbox" size={28} className="mb-2 opacity-40" />
      <p className="text-sm font-mono">{text}</p>
    </div>
  );
}

export function RequestCard({
  r,
  icon,
  highlight,
  onInstructorReview,
}: {
  r: TrainingRequest;
  icon: string;
  highlight?: boolean;
  onInstructorReview?: (r: TrainingRequest) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (highlight) setExpanded(true);
  }, [highlight]);

  const getCardStyle = (type: string, subject: string) => {
    const isDismissal = type === "dismissal" || (type === "report" && subject === "Рапорт на увольнение из академии");
    if (isDismissal) {
      return {
        bg: "bg-red-950/20 border-red-500/80 shadow-[0_0_10px_rgba(220,38,38,0.15)]",
        iconBg: "bg-red-950 border-red-500 text-red-500",
        iconName: "UserMinus",
        badgeColor: "text-red-400 border-red-800 bg-red-950/40",
        titleColor: "text-red-200 font-semibold",
        nameColor: "text-red-400"
      };
    }
    switch (type) {
      case "practice":
        return {
          bg: "bg-blue-950/20 border-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.15)]",
          iconBg: "bg-blue-950 border-blue-500 text-blue-500",
          iconName: "Wrench",
          badgeColor: "text-blue-400 border-blue-800 bg-blue-950/40",
          titleColor: "text-blue-200 font-semibold",
          nameColor: "text-blue-400"
        };
      case "lecture":
        return {
          bg: "bg-yellow-950/20 border-yellow-500/80 shadow-[0_0_10px_rgba(234,179,8,0.15)]",
          iconBg: "bg-yellow-950 border-yellow-500 text-yellow-500",
          iconName: "BookOpen",
          badgeColor: "text-yellow-400 border-yellow-800 bg-yellow-950/40",
          titleColor: "text-yellow-200 font-semibold",
          nameColor: "text-yellow-400"
        };
      case "exam":
        return {
          bg: "bg-purple-950/20 border-purple-500/80 shadow-[0_0_10px_rgba(168,85,247,0.15)]",
          iconBg: "bg-purple-950 border-purple-500 text-purple-500",
          iconName: "ClipboardList",
          badgeColor: "text-purple-400 border-purple-800 bg-purple-950/40",
          titleColor: "text-purple-200 font-semibold",
          nameColor: "text-purple-400"
        };
      default:
        return {
          bg: "bg-tactical-card border-tactical-border hover:border-primary/30",
          iconBg: "bg-primary/10 border-primary/20 text-primary",
          iconName: icon || "User",
          badgeColor: "text-muted-foreground bg-tactical-panel border-tactical-border",
          titleColor: "text-foreground",
          nameColor: "text-foreground"
        };
    }
  };

  const style = getCardStyle(r.type, r.subject);

  return (
    <div
      className={`border p-4 transition-colors cursor-pointer ${style.bg} ${
        highlight ? "border-primary animate-pulse-once" : ""
      }`}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 border flex items-center justify-center flex-shrink-0 mt-0.5 ${style.iconBg}`}>
            <Icon name={style.iconName} fallback="FileText" size={14} />
          </div>
          <div>
            <h4 className={`font-ibm text-sm font-medium ${style.titleColor}`}>{r.subject}</h4>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              <span className={`rank-badge px-1.5 py-0.5 border mr-1.5 ${style.badgeColor}`}>{TYPE_LABEL[r.type]}</span>
              {fmt(r.created_at)}
              {r.preferred_date && fmt(r.created_at) !== fmt(r.preferred_date) && ` · Дата: ${fmt(r.preferred_date)}`}
            </p>
            {r.cadet_name && (
              <p className={`text-xs font-mono mt-1 ${style.nameColor}`}>{r.cadet_rank} {r.cadet_name}</p>
            )}
            {r.target_instructor_name && (
              <p className="text-xs font-mono mt-1 text-yellow-500">Желаемый инструктор: {r.target_instructor_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={r.status} />
          <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-muted-foreground" />
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-tactical-border space-y-2 animate-fade-in">
          {r.description && (
            <div className="text-xs text-muted-foreground font-ibm">
              <span className="text-foreground font-semibold">Пояснение / Доказательства:</span>
              <div className="mt-1 space-y-1 bg-tactical-panel border border-tactical-border/60 p-2 font-mono whitespace-pre-line text-[11px] leading-relaxed">
                {r.description.split("\n").map((line, idx) => {
                  // Check if line contains a URL
                  const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                  if (urlMatch) {
                    const url = urlMatch[0];
                    const label = line.substring(0, line.indexOf(url));
                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-1">
                        {label && <span className="text-muted-foreground">{label}</span>}
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline flex items-center gap-0.5 break-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {url}
                          <Icon name="ExternalLink" size={10} className="inline flex-shrink-0" />
                        </a>
                      </div>
                    );
                  }
                  return <div key={idx}>{line}</div>;
                })}
              </div>
            </div>
          )}
          {r.instructor_comment && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              <span className="text-foreground font-semibold not-italic">Комментарий инструктора: </span>
              "{renderTextWithLinks(r.instructor_comment)}"
            </p>
          )}
          {r.reviewer_name && (
            <p className="text-xs text-muted-foreground font-mono">Рассмотрел: {r.reviewer_name}</p>
          )}
          {onInstructorReview && r.status === "pending" && (
            <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
              <button
                className="bg-green-700 hover:bg-green-600 text-white font-oswald text-xs tracking-widest uppercase py-1.5 px-3 transition-colors"
                onClick={() => onInstructorReview(r)}
              >
                Перейти к рассмотрению
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RequestForm({
  authUser,
  type,
  subjectOptions,
  onSubmit,
  onClose,
  completedSubjects = [],
}: {
  authUser: User;
  type: "lecture" | "practice" | "exam" | "report";
  subjectOptions: string[];
  onSubmit: () => void;
  onClose: () => void;
  completedSubjects?: string[];
}) {
  const { data: instructors = [] } = useInstructors();
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const isOptionDisabled = (opt: string) => {
    if (opt.startsWith("──")) return true;
    if (opt === "Рапорт на увольнение из академии") return false;
    return completedSubjects.includes(opt);
  };

  const firstValidOption = subjectOptions.find((opt) => !isOptionDisabled(opt)) || "";
  console.log("[AVNG DEBUG] RequestForm render:", { 
    subjectOptions, 
    completedSubjects, 
    firstValidOption, 
    isOptionDisabledDismissal: isOptionDisabled("Рапорт на увольнение из академии") 
  });
  const [subject, setSubject] = useState(firstValidOption);
  const [description, setDescription] = useState("");
  // Get current local date in YYYY-MM-DD format
  const today = new Date().toLocaleDateString("sv-SE");
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // States for dismissal report
  const [dismissalName, setDismissalName] = useState(authUser?.name || "");
  const [dismissalPassport, setDismissalPassport] = useState(fmtStaticId(authUser?.static_id) || "");
  const [dismissalRank, setDismissalRank] = useState(authUser?.rank || "Рядовой");
  const [dismissalReason, setDismissalReason] = useState("ПСЖ");
  const [dismissalTag, setDismissalTag] = useState("Начальник АВНГ Заместитель начальника АВНГ");
  const [dismissalPhotoUrl, setDismissalPhotoUrl] = useState("");

  // Update initial subject if the list updates or disabled options change
  useEffect(() => {
    if (subject && subjectOptions.includes(subject) && !isOptionDisabled(subject)) {
      return;
    }
    const valid = subjectOptions.find((opt) => !isOptionDisabled(opt)) || "";
    setSubject(valid);
  }, [completedSubjects, subjectOptions, subject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) {
      setError("Нет доступных для выбора тем");
      return;
    }
    if (subject === "Рапорт на увольнение из академии") {
      if (!dismissalName.trim()) {
        setError("Имя и Фамилия обязательны!");
        return;
      }
      if (!dismissalPassport.trim()) {
        setError("Номер паспорта обязателен!");
        return;
      }
      if (!dismissalPhotoUrl.trim()) {
        setError("Ссылка на фотокарточку удостоверения обязательна!");
        return;
      }
    }
    setError("");
    setLoading(true);
    try {
      // Gather dynamic proofs
      const proofUrls: string[] = [];
      for (let i = 0; i < 5; i++) {
        const el = document.getElementById(`proof_img_${i}`) as HTMLInputElement | null;
        if (el && el.value.trim()) {
          proofUrls.push(el.value.trim());
        }
      }
      
      let finalDescription = description;
      if (subject === "Рапорт на увольнение из академии") {
        finalDescription = `${dismissalName.trim()} | ${dismissalPassport.trim()}
Звание: ${dismissalRank.trim()}
Причина: ${dismissalReason.trim()}
Тег руководства: ${dismissalTag.trim()}
Фотокарточка удостоверения (боди-камера): ${dismissalPhotoUrl.trim()}`;
      } else if (proofUrls.length > 0) {
        const labelsMap: Record<string, string[]> = {
          "Вышка — 30 мин": ["Начало", "10 мин", "20 мин", "30 мин", "Конец"],
          "Патруль по территории — 30 мин": ["Начало", "10 мин", "20 мин", "30 мин", "Конец"],
          "Наряд на КПП-1 — 30 мин": ["Начало", "10 мин", "20 мин", "30 мин", "Конец"],
          "Наряд на КПП-2 — 1 час": ["Начало", "20 мин", "40 мин", "60 мин", "Конец"],
          "Участие в досмотровых мероприятиях": ["Начало", "Конец"],
          "Участие в досмотрах на 2 собеседованиях": ["Начало собеседования", "Конец собеседования"],
        };

        // Determine if it's one of the listed subjects
        let currentLabelSet = ["Ссылка 1", "Ссылка 2", "Ссылка 3", "Ссылка 4", "Ссылка 5"];
        for (const [key, labels] of Object.entries(labelsMap)) {
          if (subject.startsWith(key)) {
            currentLabelSet = labels;
            break;
          }
        }

        if (subject.startsWith("Заполнение личного дела")) {
          currentLabelSet = ["Discord Ссылка"];
        } else if (subject.includes("государственной поставке") || subject.startsWith("Участие в гос. поставке")) {
          currentLabelSet = ["Скриншот с желтой линией"];
        }

        const formattedUrls = proofUrls
          .map((url, index) => `${currentLabelSet[index] || `Скриншот ${index + 1}`}: ${url}`)
          .join("\n");
        finalDescription = `[Доказательства]\n${formattedUrls}${description ? `\n\n[Комментарий]\n${description}` : ""}`;
      }

      let discord_message_id: string | undefined = undefined;
      let discord_channel_id: string | undefined = undefined;

      // Trigger Discord notifications
      if (subject === "Рапорт на увольнение из академии") {
        try {
          const discordRes = await sendDismissalReportDiscord({
            name: dismissalName,
            rank: dismissalRank,
            reason: dismissalReason,
            photoUrl: dismissalPhotoUrl,
            staticId: authUser.static_id,
            unit: authUser.unit || "АВНГ"
          });
          if (discordRes) {
            discord_message_id = discordRes.messageId;
            discord_channel_id = discordRes.channelId;
          }
        } catch (err) {
          console.error("Discord error:", err);
        }
      } else {
        const selectedInst = instructors.find(i => i.id === Number(selectedInstructorId));
        const instructorName = selectedInst ? `${selectedInst.rank} ${selectedInst.name}` : undefined;

        sendGeneralRequestDiscord({
          name: authUser.name,
          rank: authUser.rank,
          staticId: authUser.static_id,
          unit: authUser.unit || "АВНГ",
          typeLabel: TYPE_LABEL[type],
          subject,
          preferredDate: date || "Не указана",
          details: finalDescription,
          cadetDiscordId: authUser.discord_id || undefined,
          instructorName
        }).catch(err => console.error("Discord error:", err));
      }

      await createRequest({ 
        type, 
        subject, 
        description: finalDescription, 
        preferred_date: date || undefined,
        discord_message_id,
        discord_channel_id,
        instructor_id: selectedInstructorId ? Number(selectedInstructorId) : undefined
      });

      onSubmit();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-tactical-card border border-primary/40 p-4 animate-fade-in space-y-3">
      <h3 className="font-oswald text-sm tracking-widest uppercase text-primary">
        Новый запрос — {TYPE_LABEL[type]}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="rank-badge text-muted-foreground block mb-1">Тема</label>
          <select
            className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary transition-colors"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            {subjectOptions.map((s) => {
              const isCompleted = completedSubjects.includes(s) && s !== "Рапорт на увольнение из академии";
              return (
                <option key={s} value={s} disabled={isOptionDisabled(s)}>
                  {s} {isCompleted ? " (Выполнено)" : ""}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="rank-badge text-muted-foreground block mb-1">Предпочтительная дата</label>
          <input
            type="date"
            className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary transition-colors"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      {/* Dynamic proofs inputs based on selected subject */}
      {(() => {
        if (subject.startsWith("Вышка — 30 мин") || 
            subject.startsWith("Патруль по территории — 30 мин") ||
            subject.startsWith("Наряд на КПП-1 — 30 мин")) {
          return (
            <div className="bg-tactical-panel border border-tactical-border p-3 space-y-2">
              <label className="rank-badge text-primary block mb-1">Доказательства (5 скриншотов: начало, 10, 20, 30 мин, конец)</label>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {["Начало", "10 минут", "20 минут", "30 минут", "Конец"].map((label, idx) => (
                  <div key={idx}>
                    <input
                      type="url"
                      required
                      placeholder={`Ссылка ${label}`}
                      id={`proof_img_${idx}`}
                      className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (subject.startsWith("Наряд на КПП-2 — 1 час")) {
          return (
            <div className="bg-tactical-panel border border-tactical-border p-3 space-y-2">
              <label className="rank-badge text-primary block mb-1">Доказательства (5 скриншотов: начало, 20, 40, 60 мин, конец)</label>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {["Начало", "20 минут", "40 минут", "60 минут", "Конец"].map((label, idx) => (
                  <div key={idx}>
                    <input
                      type="url"
                      required
                      placeholder={`Ссылка ${label}`}
                      id={`proof_img_${idx}`}
                      className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (subject.includes("государственной поставке") || subject.startsWith("Участие в гос. поставке")) {
          return (
            <div className="bg-tactical-panel border border-tactical-border p-3 space-y-2">
              <label className="rank-badge text-primary block mb-1">Доказательства (Скриншот с желтой линией)</label>
              <input
                type="url"
                required
                placeholder="Ссылка на скриншот (желтая линия)"
                id="proof_img_0"
                className="w-full bg-tactical-card border border-tactical-border px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
              />
            </div>
          );
        }
        if (subject.includes("досмотровых мероприятиях") || subject.startsWith("Участие в досмотрах на 2 собеседованиях")) {
          return (
            <div className="bg-tactical-panel border border-tactical-border p-3 space-y-2">
              <label className="rank-badge text-primary block mb-1">Доказательства (2 скриншота: начало и конец собеседования)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {["Начало собеседования", "Конец собеседования"].map((label, idx) => (
                  <div key={idx}>
                    <input
                      type="url"
                      required
                      placeholder={`Ссылка ${label}`}
                      id={`proof_img_${idx}`}
                      className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (subject.startsWith("Заполнение личного дела")) {
          return (
            <div className="bg-tactical-panel border border-tactical-border p-3 space-y-2">
              <label className="rank-badge text-primary block mb-1">Ссылка из Discord</label>
              <input
                type="url"
                required
                placeholder="https://discord.com/channels/..."
                id="proof_img_0"
                className="w-full bg-tactical-card border border-tactical-border px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
              />
            </div>
          );
        }
        return null;
      })()}

      {subject === "Рапорт на увольнение из академии" && (
        <div className="bg-tactical-panel border border-tactical-border p-4 space-y-3">
          <p className="rank-badge text-primary block border-b border-tactical-border/60 pb-1.5 uppercase font-semibold">
            Форма рапорта на увольнение
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="rank-badge text-muted-foreground block mb-1">Имя Фамилия</label>
              <input
                type="text"
                required
                className="w-full bg-tactical-card border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary"
                value={dismissalName}
                onChange={(e) => setDismissalName(e.target.value)}
                placeholder="Иван Иванов"
              />
            </div>
            
            <div>
              <label className="rank-badge text-muted-foreground block mb-1">Номер паспорта (ОБЯЗАТЕЛЬНО)</label>
              <input
                type="text"
                required
                className="w-full bg-tactical-card border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary"
                value={dismissalPassport}
                onChange={(e) => setDismissalPassport(e.target.value)}
                placeholder="323-565"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="rank-badge text-muted-foreground block mb-1">Звание</label>
              <input
                type="text"
                required
                className="w-full bg-tactical-card border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary"
                value={dismissalRank}
                onChange={(e) => setDismissalRank(e.target.value)}
                placeholder="Рядовой"
              />
            </div>

            <div>
              <label className="rank-badge text-muted-foreground block mb-1">Причина</label>
              <input
                type="text"
                required
                className="w-full bg-tactical-card border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary"
                value={dismissalReason}
                onChange={(e) => setDismissalReason(e.target.value)}
                placeholder="ПСЖ"
              />
            </div>
          </div>

          <div>
            <label className="rank-badge text-muted-foreground block mb-1">Тег своего руководства подразделения</label>
            <input
              type="text"
              required
              className="w-full bg-tactical-card border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary"
              value={dismissalTag}
              onChange={(e) => setDismissalTag(e.target.value)}
              placeholder="Начальник АВНГ Заместитель начальника АВНГ"
            />
          </div>

          <div>
            <label className="rank-badge text-muted-foreground block mb-1">
              Фотокарточка удостоверения с боди-камерой (ОБЯЗАТЕЛЬНО, Полная без обрезаний!)
            </label>
            <input
              type="url"
              required
              className="w-full bg-tactical-card border border-tactical-border px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
              value={dismissalPhotoUrl}
              onChange={(e) => setDismissalPhotoUrl(e.target.value)}
              placeholder="https://i.imgur.com/... (ссылка на скриншот)"
            />
          </div>
        </div>
      )}

      {subject !== "Рапорт на увольнение из академии" && (
        <div>
          <label className="rank-badge text-muted-foreground block mb-1">Пояснение (необязательно)</label>
          <textarea
            className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary transition-colors resize-none"
            rows={2}
            placeholder="Опишите цель..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-800 px-3 py-2">
          <Icon name="AlertTriangle" size={13} className="text-red-400" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground font-oswald text-sm tracking-widest uppercase py-2 px-6 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Отправка..." : "Отправить"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="border border-tactical-border text-muted-foreground font-oswald text-sm tracking-widest uppercase py-2 px-4 hover:border-primary/40 transition-colors"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

export function RequestSection({
  authUser,
  type,
  icon,
  title,
  sub,
  subjectOptions,
  newLabel,
  emptyText,
  highlightRequestId,
}: {
  authUser: User;
  type: "lecture" | "practice" | "exam" | "report";
  icon: string;
  title: string;
  sub: string;
  subjectOptions: string[];
  newLabel: string;
  emptyText: string;
  highlightRequestId?: number;
}) {
  const { data: allRequests = [], isLoading: loading, refetch } = useRequests();
  const [showForm, setShowForm] = useState(false);
  const isInstructor = authUser.role !== "cadet";

  const requests = useMemo(() => {
    return allRequests.filter((r) => r.type === type);
  }, [allRequests, type]);

  // Find all subjects that have already been approved
  const completedSubjects = useMemo(() => {
    return requests
      .filter((r) => r.status === "approved")
      .map((r) => r.subject);
  }, [requests]);

  console.log("[AVNG DEBUG] RequestSection render:", { 
    type, 
    title, 
    isInstructor, 
    showForm, 
    allRequestsCount: allRequests.length,
    requestsCount: requests.length,
    completedSubjects 
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title={title} sub={sub} />
        {!isInstructor && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-primary-foreground font-oswald text-sm tracking-widest uppercase py-2 px-4 hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Icon name="Plus" size={14} />{newLabel}
          </button>
        )}
      </div>
      {!isInstructor && showForm && (
        <RequestForm
          authUser={authUser}
          type={type}
          subjectOptions={subjectOptions}
          completedSubjects={completedSubjects}
          onSubmit={() => { setShowForm(false); refetch(); }}
          onClose={() => setShowForm(false)}
        />
      )}
      {loading ? <Spinner /> : requests.length === 0 ? <Empty text={emptyText} /> : (
        <div className="space-y-2">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              r={r}
              icon={icon}
              highlight={r.id === highlightRequestId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function renderTextWithLinks(text: string | null | undefined) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.match(/^https?:\/\//)) {
          return (
            <a
              key={idx}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5 break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
              <Icon name="ExternalLink" size={10} className="inline flex-shrink-0" />
            </a>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}
