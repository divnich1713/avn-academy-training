import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { SectionHeader, StatusBadge } from "./UIComponents";
import {
  User,
  PromotionType,
  PromotionCheckResult,
  PromotionReport,
  checkPromotionRequirements,
  fetchPromotionReports,
  createPromotionReport,
  reviewPromotionReport,
  InstructorPromotionReport,
  fetchInstructorPromotionReports,
  submitInstructorPromotionReport,
  reviewInstructorPromotionReport,
  uploadEvidenceFile,
  fetchAvailableActivities,
  fetchUserWarnings,
  issueWarning,
  dismissWarning,
  InstructorWarning,
  fetchInstructors,
} from "@/lib/api";
import { fmt, Spinner, Empty, fmtStaticId } from "./SectionsShared";
import {
  sendPromotionReportDiscord,
  sendPromotionReviewedDiscord,
  sendInstructorPromotionReportDiscord,
  sendInstructorPromotionReviewedDiscord,
} from "@/lib/discord";
import { useInstructorPromotionConfig, useSaveInstructorPromotionConfig } from "@/lib/useQueries";

const PROMOTION_LABELS: Record<PromotionType, string> = {
  junior_sergeant: "Младший Сержант",
  sergeant: "Сержант",
};

export function MilitaryReport({
  cadetName,
  cadetStaticId,
  cadetRank: _cadetRank,
  promotionType,
  date,
}: {
  cadetName: string;
  cadetStaticId: string;
  cadetRank: string;
  promotionType: PromotionType;
  date: string;
}) {
  const isSergeant = promotionType === "sergeant";
  const currentRank = isSergeant ? "Младший Сержант" : "Рядовой";

  const formattedCurrentRank = isSergeant ? "младший сержант полиции" : "рядовой полиции";
  const formattedTargetRank = isSergeant ? "Сержант полиции" : "Младший сержант полиции";

  return (
    <div className="bg-white border border-gray-200 text-black p-8 font-mono text-[11px] max-w-2xl mx-auto shadow-[0_4px_12px_rgba(0,0,0,0.15)] leading-relaxed select-all space-y-4 text-left">
      <div className="space-y-4">
        <p className="font-bold">ФЕДЕРАЛЬНАЯ СЛУЖБА ВОЙСК НАЦИОНАЛЬНОЙ ГВАРДИИ</p>
        <p className="font-bold">РОССИЙСКОЙ ФЕДЕРАЦИИ (ФСВНГ России)</p>
        <p className="font-bold">Академия войск национальной гвардии (АВНГ)</p>
      </div>

      <div className="pt-2 space-y-4">
        <p className="font-semibold">Начальнику Академии войск Национальной гвардии</p>
        <p>подполковнику — нач. АВНГ | Артем Панарин</p>
      </div>

      <div className="pt-2 space-y-4">
        <p className="font-semibold">Копия:</p>
        <p>заместителю начальника АВНГ — зам. нач. АВНГ | Данила Моралис</p>
        <p>заместителю начальника АВНГ — зам. нач. АВНГ | Илья Росса</p>
        <p>заместителю начальника АВНГ — зам. нач. АВНГ | Иван Андрейченко</p>
      </div>

      <div className="pt-2 space-y-4">
        <p>От курсанта: {cadetName}</p>
        <p>Порядковый номер: {fmtStaticId(cadetStaticId)}</p>
        <p>Звание: {currentRank}</p>
      </div>

      <div className="text-center font-bold text-sm tracking-widest pt-4 uppercase">
        Рапорт
      </div>

      <div className="space-y-4">
        <p>
          Я, {formattedCurrentRank} {cadetName}. Прошу рассмотреть мой рапорт о повышении по службе в Академии Войск Национальной Гвардии УФСВНГ России, согласно установленной системе. В соответствии с правилами системы повышения, к рапорту прилагаю:
        </p>
        <p className="font-semibold">Выполненные условия для повышения: </p>
        <p className="font-semibold">К рапорту прилагаю:</p>
        {isSergeant ? (
          <ul className="space-y-4">
            <li>• Отчёт о патрулировании прилегающей территорий;</li>
            <li>• Наряд на КПП-1;</li>
            <li>• Наряд на КПП-2 (Внутренний пост);</li>
            <li>• Участие в государственной поставке в количестве 4-ёх шт. В сопровождение инструктора АВНГ | СС;</li>
            <li>• Принять участие в досмотровых мероприятиях на двух собеседованиях;</li>
            <li>• Отчёт о прослушанных лекциях "УК, ПК, КоАП";</li>
            <li>• Лекция: О ФЗ закрытых территорий;</li>
            <li>• Отчёт о прохождений практического экзамена "Штраф, Задержание, Арест";</li>
            <li>• Отчёт о сдаче тестов УК/ПК/КоАП;</li>
          </ul>
        ) : (
          <ul className="space-y-4">
            <li>• Вступительная лекция;</li>
            <li>• Лекция о Федеральном законе о Федеральной службе войск национальной гвардии и Уставе;</li>
            <li>• Строевая, физическая и огневая подготовка;</li>
            <li>• Присяга;</li>
            <li>• Вышка — 30 минут (доклад каждые 10 минут);</li>
            <li>• Патрулирование территории — 30 минут (доклад каждые 10 минут);</li>
            <li>• Заполнение личного дела;</li>
            <li>• Тест: Федеральный закон о Федеральной службе войск национальной гвардии и Устав;</li>
          </ul>
        )}

        <p>
          Согласно установленной системе, мною были выполнены необходимые критерии, что дает мне право претендовать на присвоение очередного специального звания {formattedTargetRank}. Прошу учесть мои заслуги и присвоить очередное специальное звание.
        </p>
        <p>
          Даю согласие, в случае обмана руководства, понести за это наказание, в виде дисциплинарных взысканий вплоть до понижения в звании.
        </p>
      </div>

      <div className="pt-4 space-y-4">
        <p>Дата: {date}</p>
        <p>
          Подпись:{" "}
          <span className="italic border-b border-black/60 px-4 min-w-[100px] inline-block text-center text-black">
            {cadetName.split(" ")[0]}
          </span>
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTION SECTION (CADET VIEW)
// ═══════════════════════════════════════════════════════════════════════════════
export function PromotionSection({ authUser, onReloadUser }: { authUser: User; onReloadUser?: () => void }) {
  useEffect(() => {
    if (onReloadUser) {
      onReloadUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authUser.role !== "cadet") {
    return <InstructorPromotionSection authUser={authUser} />;
  }
  return <CadetPromotionSection authUser={authUser} />;
}

function CadetPromotionSection({ authUser }: { authUser: User }) {
  const isInstructor = false;

  const [selected, setSelected] = useState<PromotionType | null>(null);
  const [checkResult, setCheckResult] = useState<PromotionCheckResult | null>(null);
  const [reports, setReports] = useState<PromotionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submittedReportLink, setSubmittedReportLink] = useState("");

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    const r = await fetchPromotionReports().catch(() => []);
    setReports(r);
    setReportsLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleSelect = async (type: PromotionType) => {
    if (selected === type) {
      setSelected(null);
      setCheckResult(null);
      return;
    }
    setSelected(type);
    setLoading(true);
    setError("");
    setSuccess("");
    setSubmittedReportLink("");
    try {
      const result = await checkPromotionRequirements(type);
      setCheckResult(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки требований");
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selected || !checkResult?.all_completed) return;
    setSubmitLoading(true);
    setError("");
    setSuccess("");
    setSubmittedReportLink("");
    try {
      const res = await createPromotionReport(selected);
      
      // Trigger Discord notification
      sendPromotionReportDiscord({
        name: authUser.name,
        rank: authUser.rank,
        staticId: authUser.static_id,
        promotionType: selected,
        promotionTypeLabel: PROMOTION_LABELS[selected],
        cadetDiscordId: authUser.discord_id || undefined,
      }).catch(err => console.error("Discord error:", err));

      const reportId = res?.id || Date.now();
      const link = `${window.location.origin}/?tab=promotions&reportId=${reportId}`;
      setSubmittedReportLink(link);
      setSuccess("Рапорт на повышение успешно подан!");
      setSelected(null);
      setCheckResult(null);
      await loadReports();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка подачи рапорта");
    }
    setSubmitLoading(false);
  };

  // Group items by category
  const groupedItems = checkResult
    ? checkResult.items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, typeof checkResult.items>)
    : {};

  const hasPendingReport = (type: PromotionType) =>
    reports.some((r) => r.promotion_type === type && r.status === "pending");

  const hasApprovedReport = (type: PromotionType) =>
    reports.some((r) => r.promotion_type === type && r.status === "approved");

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        title="Повышение в звании"
        sub={!isInstructor ? "Подача рапорта на присвоение очередного звания" : undefined}
      />

      {/* Two promotion cards */}
      {!isInstructor && (
        <div className="grid md:grid-cols-2 gap-4">
          {(["junior_sergeant", "sergeant"] as PromotionType[]).map((type) => {
            const isSelected = selected === type;
            const hasPending = hasPendingReport(type);
            const isMlSergeant = authUser.rank && (authUser.rank.toLowerCase().includes("мл.") || authUser.rank.toLowerCase().includes("младший"));
            const isLocked = type === "sergeant" && !isMlSergeant;

            return (
              <button
                key={type}
                onClick={() => {
                  if (isInstructor) return;
                  if (isLocked) {
                    setError("Подача рапорта на звание Сержант доступна только в звании Младший Сержант");
                    setSuccess("");
                    setSelected(null);
                    setCheckResult(null);
                    return;
                  }
                  handleSelect(type);
                }}
                disabled={isInstructor}
                className={`corner-mark bg-tactical-card border p-6 text-left transition-all group ${
                  isSelected
                    ? "border-primary card-glow"
                    : isLocked
                      ? "border-tactical-border/60 opacity-40 cursor-not-allowed"
                      : "border-tactical-border hover:border-primary/40"
                } ${isInstructor ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary/20 border-primary"
                        : isLocked
                          ? "bg-red-950/20 border-red-500/20"
                          : "bg-primary/10 border-primary/20 group-hover:bg-primary/15"
                    }`}
                  >
                    <Icon name={isLocked ? "Lock" : "Medal"} size={28} className={isLocked ? "text-red-500" : "text-primary"} />
                  </div>
                  <div>
                    <h3 className="font-oswald text-lg tracking-wide text-foreground">
                      {PROMOTION_LABELS[type]}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Рапорт на повышение в звании
                    </p>
                    {isLocked ? (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-red-400 font-mono">
                        <Icon name="Lock" size={11} /> Требуется звание Младший Сержант
                      </span>
                    ) : hasPending ? (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-yellow-400 font-mono">
                        <Icon name="Clock" size={11} /> На рассмотрении
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-mono">
                  {isLocked ? (
                    <>
                      <Icon name="Lock" size={12} className="text-red-400" />
                      <span className="text-red-400">Недоступно</span>
                    </>
                  ) : (
                    <>
                      <Icon name={isSelected ? "ChevronUp" : "ChevronDown"} size={12} className="text-primary" />
                      <span className="text-primary">{isSelected ? "Скрыть требования" : "Показать требования"}</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Requirements checklist */}
      {!isInstructor && selected && (
        <div className="animate-fade-in space-y-4">
          {loading ? (
            <Spinner />
          ) : checkResult ? (
            <>
              {/* Progress bar */}
              <div className="bg-tactical-card border border-tactical-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground">
                    Прогресс выполнения
                  </h3>
                  <span className="font-mono text-sm text-foreground">
                    <span className={checkResult.all_completed ? "text-green-400" : "text-primary"}>
                      {checkResult.completed_count}
                    </span>
                    /{checkResult.total_count}
                  </span>
                </div>
                <div className="w-full h-2 bg-tactical-panel border border-tactical-border">
                  <div
                    className={`h-full transition-all duration-500 ${
                      checkResult.all_completed ? "bg-green-500" : "bg-primary"
                    }`}
                    style={{
                      width: `${(checkResult.completed_count / checkResult.total_count) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Grouped requirements */}
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="bg-tactical-card border border-tactical-border">
                  <div className="px-4 py-3 border-b border-tactical-border bg-tactical-panel">
                    <h4 className="font-oswald text-xs tracking-widest uppercase text-muted-foreground">
                      {category}
                    </h4>
                  </div>
                  <div className="divide-y divide-tactical-border">
                    {items.map((item, i) => (
                      <div
                        key={i}
                        className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                          item.completed ? "bg-green-900/5" : ""
                        }`}
                      >
                        <div
                          className={`w-6 h-6 border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            item.completed
                              ? "bg-green-500/20 border-green-500 text-green-400"
                              : "border-tactical-border text-transparent"
                          }`}
                        >
                          {item.completed && <Icon name="Check" size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-ibm ${
                              item.completed ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {item.label}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {item.type === "lecture" ? "Лекция" : item.type === "practice" ? "Практика" : item.type === "test" ? "Тест" : "Экзамен"}
                            {item.completed && item.graded_at && ` · ${fmt(item.graded_at)}`}
                          </p>
                        </div>
                        {item.completed ? (
                          <span className="rank-badge text-green-400 border border-green-800 px-2 py-0.5 flex-shrink-0">
                            Зачтено
                          </span>
                        ) : (
                          <span className="rank-badge text-muted-foreground border border-tactical-border px-2 py-0.5 flex-shrink-0">
                            Не пройдено
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Military Report Document Preview */}
              <div className="bg-tactical-card border border-tactical-border p-4 space-y-3">
                <h4 className="font-oswald text-xs tracking-widest uppercase text-muted-foreground">
                  Предпросмотр документа рапорта
                </h4>
                <MilitaryReport
                  cadetName={authUser.name}
                  cadetStaticId={authUser.static_id}
                  cadetRank={authUser.rank}
                  promotionType={selected}
                  date={new Date().toLocaleDateString("ru-RU")}
                />
              </div>

              {/* Submit button */}
              {!isInstructor && (
                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    onClick={handleSubmit}
                    disabled={!checkResult.all_completed || submitLoading || hasPendingReport(selected) || hasApprovedReport(selected)}
                    className="bg-primary text-primary-foreground font-oswald text-sm tracking-widest uppercase py-3 px-8 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Icon name="Send" size={14} />
                    {submitLoading ? "Отправка..." : "Подать рапорт"}
                  </button>
                  {!checkResult.all_completed && (
                    <p className="text-xs text-muted-foreground font-ibm">
                      Выполните все требования для подачи рапорта
                    </p>
                  )}
                  {hasPendingReport(selected) && (
                    <p className="text-xs text-yellow-400 font-ibm">
                      У вас уже есть рапорт на рассмотрении
                    </p>
                  )}
                  {hasApprovedReport(selected) && (
                    <p className="text-xs text-green-400 font-ibm">
                      Вы уже получили это повышение (рапорт одобрен)
                    </p>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-800 px-4 py-3">
          <Icon name="AlertTriangle" size={14} className="text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}


      {success && (
        <div className="flex flex-col gap-3 bg-green-900/20 border border-green-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Icon name="CheckCircle" size={14} className="text-green-400" />
            <p className="text-sm text-green-400 font-semibold">{success}</p>
          </div>
          {submittedReportLink && (
            <div className="mt-1 space-y-1.5 bg-black/40 p-3 border border-tactical-border/60">
              <p className="text-xs text-muted-foreground font-mono">
                Ссылка на ваш рапорт (скопируйте и отправьте в Discord):
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={submittedReportLink}
                  className="bg-tactical-panel border border-tactical-border px-2 py-1 text-xs text-foreground font-mono flex-1 select-all focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(submittedReportLink);
                    alert("Ссылка скопирована в буфер обмена!");
                  }}
                  className="bg-primary text-primary-foreground font-oswald text-xs tracking-wider uppercase px-3 py-1.5 hover:bg-primary/90 transition-colors flex items-center gap-1"
                >
                  <Icon name="Copy" size={11} />
                  Копировать
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submitted reports history */}
      <div className="space-y-3">
        <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground">
          Поданные рапорты
        </h3>
        {reportsLoading ? (
          <Spinner />
        ) : reports.length === 0 ? (
          <Empty text="Рапортов на повышение пока нет" />
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div
                key={r.id}
                className="bg-green-950/20 border border-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.15)] p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-950 border border-green-500 text-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon name="Medal" size={14} />
                    </div>
                    <div>
                      <h4 className="font-ibm text-sm font-medium text-green-200">
                        Повышение до {PROMOTION_LABELS[r.promotion_type]}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {fmt(r.created_at)}
                        {r.cadet_name && ` · ${r.cadet_rank} ${r.cadet_name}`}
                      </p>
                      {r.instructor_comment && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          <span className="text-foreground font-semibold not-italic">Комментарий: </span>
                          "{r.instructor_comment}"
                        </p>
                      )}
                      {r.reviewer_name && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          Рассмотрел: {r.reviewer_name}
                        </p>
                      )}
                      {/* Copy Link Button for Discord */}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => {
                            const reportLink = `${window.location.origin}/?tab=promotions&reportId=${r.id}`;
                            navigator.clipboard.writeText(reportLink);
                            alert("Ссылка на рапорт скопирована!");
                          }}
                          className="text-[10px] text-primary hover:underline font-mono uppercase tracking-wider flex items-center gap-1"
                        >
                          <Icon name="Copy" size={10} />
                          Скопировать ссылку для Discord
                        </button>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSTRUCTOR PROMOTION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const INSTRUCTOR_RANKS = [
  "Сержант",
  "Старший Сержант",
  "Старшина",
  "Прапорщик",
  "Старший Прапорщик",
  "Младший Лейтенант",
  "Лейтенант",
  "Старший Лейтенант",
  "Капитан"
];

const DEFAULT_INSTRUCTOR_POINTS_CONFIG = [
  { num: 1, name: "Участие в ГМП", points: 40, desc: "3 и более фракций, включая ФСВНГ в т.ч отбитие нападения на ИК, похищения, теракты и т.д." },
  { num: 2, name: "Участие в поставке", points: 35 },
  { num: 3, name: "Участие в отбитии налёта/ограбления", points: 20, hasSubPoints: true, bonusPoints: 15, bonusLabel: "Успешное отбитие (+15 баллов)" },
  { num: 4, name: "Участие в отбитии КРАЗА", points: 20, hasSubPoints: true, bonusPoints: 15, bonusLabel: "Успешная доставка КРАЗА (+15 баллов)", desc: "Фотокарточка грузовика + скрин доставления грузовика на наш титул" },
  { num: 5, name: "Проведение тренировки", points: 15 },
  { num: 7, name: "Арест человека", points: 20, desc: "Фотокарточка посадки в тюрьму" },
  { num: 8, name: "Штраф", points: 15, desc: "Фотокарточка оплаты штрафа" },
  { num: 10, name: "Проведение лекций (дополнительно)", points: 10 },
  { num: 11, name: "Пост на территории ФСВНГ КПП или Вышки", points: 30, desc: "в час, доклады каждые 20 минут" },
  { num: 12, name: "Присутствие на вечерней поверке", points: 10, desc: "Фотокарточка начала и конца поверки" },
  { num: 13, name: "Участие в собеседовании", points: 40 },
  { num: 14, name: "Проведение экзамена (дополнительно)", points: 15 },
  { num: 15, name: "Проверка рапорта на повышение (дополнительно)", points: 5 },
  { num: 17, name: "Принятие присяги (дополнительно)", points: 10 },
  { num: 18, name: "Проведение практики (дополнительно)", points: 10 },
];

const DEFAULT_INSTRUCTOR_RANKS_FLOW = [
  {
    from: "Сержант",
    to: "Старший Сержант",
    points: 300,
    mandatory: [
      { num: 2, count: 3, name: "Участие в поставке" },
      { num: 14, count: 3, name: "Проведение экзамена (дополнительно)" },
      { num: 10, count: 3, name: "Проведение лекций (дополнительно)" }
    ]
  },
  {
    from: "Старший Сержант",
    to: "Старшина",
    points: 400,
    mandatory: [
      { num: 2, count: 5, name: "Участие в поставке" },
      { num: 3, count: 1, name: "Участие в отбитии налёта/ограбления" },
      { num: 13, count: 3, name: "Участие в собеседовании" },
      { num: 14, count: 4, name: "Проведение экзамена (дополнительно)" },
      { num: 10, count: 3, name: "Проведение лекций (дополнительно)" }
    ]
  },
  {
    from: "Старшина",
    to: "Прапорщик",
    points: 500,
    mandatory: [
      { num: 2, count: 7, name: "Участие в поставке" },
      { num: 3, count: 2, name: "Участие в отбитии налёта/ограбления" },
      { num: 13, count: 4, name: "Участие в собеседовании" },
      { num: 14, count: 5, name: "Проведение экзамена (дополнительно)" },
      { num: 10, count: 3, name: "Проведение лекций (дополнительно)" }
    ]
  },
  {
    from: "Прапорщик",
    to: "Старший Прапорщик",
    points: 600,
    mandatory: [
      { num: 2, count: 9, name: "Участие в поставке" },
      { num: 3, count: 3, name: "Участие в отбитии налёта/ограбления" },
      { num: 13, count: 8, name: "Участие в собеседовании" },
      { num: 14, count: 7, name: "Проведение экзамена (дополнительно)" },
      { num: 10, count: 4, name: "Проведение лекций (дополнительно)" }
    ]
  },
  {
    from: "Старший Прапорщик",
    to: "Младший Лейтенант",
    points: 700,
    mandatory: [
      { num: 2, count: 11, name: "Участие в поставке" },
      { num: 3, count: 3, name: "Участие в отбитии налёта/ограбления" },
      { num: 13, count: 10, name: "Участие в собеседовании" },
      { num: 14, count: 8, name: "Проведение экзамена (дополнительно)" },
      { num: 10, count: 5, name: "Проведение лекций (дополнительно)" }
    ]
  },
  {
    from: "Младший Лейтенант",
    to: "Лейтенант",
    points: 800,
    mandatory: [
      { num: 2, count: 12, name: "Участие в поставке" },
      { num: 3, count: 3, name: "Участие в отбитии налёта/ограбления" },
      { num: 13, count: 13, name: "Участие в собеседовании" },
      { num: 14, count: 9, name: "Проведение экзамена (дополнительно)" },
      { num: 10, count: 6, name: "Проведение лекций (дополнительно)" }
    ]
  },
  {
    from: "Лейтенант",
    to: "Старший Лейтенант",
    points: 900,
    mandatory: [
      { num: 2, count: 13, name: "Участие в поставке" },
      { num: 3, count: 3, name: "Участие в отбитии налёта/ограбления" },
      { num: 13, count: 15, name: "Участие в собеседовании" },
      { num: 14, count: 10, name: "Проведение экзамена (дополнительно)" },
      { num: 10, count: 5, name: "Проведение лекций (дополнительно)" }
    ]
  },
  {
    from: "Старший Лейтенант",
    to: "Капитан",
    points: 1200,
    mandatory: [
      { num: 2, count: 15, name: "Участие в поставке" },
      { num: 3, count: 5, name: "Участие в отбитии налёта/ограбления" },
      { num: 13, count: 15, name: "Участие в собеседовании" },
      { num: 14, count: 15, name: "Проведение экзамена (дополнительно)" },
      { num: 10, count: 10, name: "Проведение лекций (дополнительно)" }
    ]
  }
];

export function InstructorMilitaryReport({
  name,
  staticId,
  currentRank,
  targetRank,
  totalPoints,
  entries,
  gratitude,
  gratitudeLink,
  date,
  pointsConfig = DEFAULT_INSTRUCTOR_POINTS_CONFIG,
  ranksFlow = DEFAULT_INSTRUCTOR_RANKS_FLOW,
  replacements,
  replacementLinks,
  onImageClick,
}: {
  name: string;
  staticId: string;
  currentRank: string;
  targetRank: string;
  totalPoints: number;
  entries: any[];
  gratitude: boolean;
  gratitudeLink: string;
  date: string;
  pointsConfig?: any[];
  ranksFlow?: any[];
  replacements?: Record<number, number>;
  replacementLinks?: Record<number, string>;
  onImageClick?: (images: string[], index: number) => void;
}) {
  const flow = ranksFlow.find(f => f.from === currentRank && f.to === targetRank);
  const neededPoints = flow ? flow.points : 0;

  const formattedCurrentRank = `${currentRank.toLowerCase()} полиции`;
  const formattedTargetRank = targetRank ? `${targetRank.charAt(0).toUpperCase() + targetRank.slice(1).toLowerCase()} полиции` : "";

  return (
    <div className="bg-white border border-gray-200 text-black p-8 font-mono text-[11px] max-w-2xl mx-auto shadow-[0_4px_12px_rgba(0,0,0,0.15)] leading-relaxed select-all space-y-4 text-left">
      <div className="space-y-4">
        <p className="font-bold">ФЕДЕРАЛЬНАЯ СЛУЖБА ВОЙСК НАЦИОНАЛЬНОЙ ГВАРДИИ</p>
        <p className="font-bold">РОССИЙСКОЙ ФЕДЕРАЦИИ (ФСВНГ России)</p>
        <p className="font-bold">Академия войск национальной гвардии (АВНГ)</p>
      </div>

      <div className="pt-2 space-y-4">
        <p className="font-semibold">Начальнику Академии войск Национальной гвардии</p>
        <p>подполковнику — нач. АВНГ | Артем Панарин</p>
      </div>

      <div className="pt-2 space-y-4">
        <p className="font-semibold">Копия:</p>
        <p>заместителю начальника АВНГ — зам. нач. АВНГ | Данила Моралис</p>
        <p>заместителю начальника АВНГ — зам. нач. АВНГ | Илья Росса</p>
        <p>заместителю начальника АВНГ — зам. нач. АВНГ | Иван Андрейченко</p>
      </div>

      <div className="pt-2 space-y-4">
        <p>От инструктора: {name}</p>
        <p>Порядковый номер: {fmtStaticId(staticId)}</p>
        <p>Звание: {currentRank}</p>
      </div>

      <div className="text-center font-bold text-sm tracking-widest pt-4 uppercase">
        Рапорт
      </div>

      <div className="space-y-4">
        <p>
          Я, {formattedCurrentRank} {name}. Прошу рассмотреть мой рапорт о повышении по службе в Академии Войск Национальной Гвардии УФСВНГ России, согласно установленной системе. В соответствии с правилами системы повышения, к рапорту прилагаю:
        </p>
        <p className="font-semibold">Выполненные условия для повышения: </p>
        <p className="font-semibold">К рапорту прилагаю:</p>
        <ul className="space-y-4">
          {entries.map((e, idx) => {
            const config = pointsConfig.find(c => c.num === e.num);
            if (!config) return null;
            const successText = config.hasSubPoints && e.successCount > 0 ? `, успешных: ${e.successCount}` : "";
            return (
              <li key={idx} className="space-y-1">
                <p>• {config.name} ({e.count} шт{successText}) — {e.count * config.points + e.successCount * (config.bonusPoints || 0)} б.;</p>
                <div className="pl-4 text-black space-y-0.5 font-mono">
                  {e.links.map((link: string, lIdx: number) => {
                    const allImages = [
                      ...entries.flatMap(entry => entry.links),
                      gratitude ? gratitudeLink : "",
                      ...Object.values(replacementLinks || {})
                    ].filter(Boolean);

                    return (
                      <p key={lIdx} className="break-all">
                        - Доказательство {lIdx + 1}:{" "}
                        {link ? (
                          onImageClick ? (
                            <span
                              onClick={() => {
                                const idxInAll = allImages.indexOf(link);
                                onImageClick(allImages, idxInAll !== -1 ? idxInAll : 0);
                              }}
                              className="underline text-blue-600 hover:text-blue-800 cursor-pointer font-bold select-none"
                            >
                              {link}
                            </span>
                          ) : (
                            <a href={link} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 break-all font-bold">
                              {link}
                            </a>
                          )
                        ) : (
                          "(ссылка отсутствует)"
                        )}
                      </p>
                    );
                  })}
                </div>
              </li>
            );
          })}
          {gratitude && (
            <li className="space-y-1">
              <p>• Благодарность от старшего состава — 50 б.;</p>
              <p className="pl-4 text-black break-all font-mono">
                - Ссылка:{" "}
                {gratitudeLink ? (
                  onImageClick ? (
                    <span
                      onClick={() => {
                        const allImages = [
                          ...entries.flatMap(entry => entry.links),
                          gratitudeLink,
                          ...Object.values(replacementLinks || {})
                        ].filter(Boolean);
                        const idxInAll = allImages.indexOf(gratitudeLink);
                        onImageClick(allImages, idxInAll !== -1 ? idxInAll : 0);
                      }}
                      className="underline text-blue-600 hover:text-blue-800 cursor-pointer font-bold select-none"
                    >
                      {gratitudeLink}
                    </span>
                  ) : (
                    <a href={gratitudeLink} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 break-all font-bold">
                      {gratitudeLink}
                    </a>
                  )
                ) : (
                  "(ссылка отсутствует)"
                )}
              </p>
            </li>
          )}
          {replacements && Object.keys(replacements).length > 0 && (
            <li className="space-y-1">
              <p className="font-semibold">• Замены обязательных пунктов:</p>
              <div className="pl-4 text-black space-y-1 font-mono text-[10px]">
                {Object.entries(replacements).map(([origStr, replStr]) => {
                  const origNum = Number(origStr);
                  const replNum = Number(replStr);
                  const origConf = pointsConfig.find(p => p.num === origNum);
                  const replConf = pointsConfig.find(p => p.num === replNum);
                  const origName = origConf ? origConf.name : `Пункт ${origNum}`;
                  const replName = replConf ? replConf.name : `Пункт ${replNum}`;
                  const link = replacementLinks?.[origNum];
                  return (
                    <div key={origNum}>
                      <p>{origName} ➔ Заменен на: {replName}</p>
                      <p className="pl-2 text-gray-600 break-all">
                        - Доказательство замены:{" "}
                        {link ? (
                          onImageClick ? (
                            <span
                              onClick={() => {
                                const allImages = [
                                  ...entries.flatMap(entry => entry.links),
                                  gratitude ? gratitudeLink : "",
                                  ...Object.values(replacementLinks || {})
                                ].filter(Boolean);
                                const idxInAll = allImages.indexOf(link);
                                onImageClick(allImages, idxInAll !== -1 ? idxInAll : 0);
                              }}
                              className="underline text-blue-600 hover:text-blue-800 cursor-pointer font-bold select-none"
                            >
                              {link}
                            </span>
                          ) : (
                            <a href={link} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 break-all font-bold">
                              {link}
                            </a>
                          )
                        ) : (
                          "(ссылка отсутствует)"
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </li>
          )}
        </ul>
        <p className="font-bold pt-2">Итого:  всего {totalPoints} ({neededPoints} нужно)</p>
        <p>
          Согласно установленной системе, мною были выполнены необходимые критерии, что дает мне право претендовать на присвоение очередного специального звания {formattedTargetRank}. Прошу учесть мои заслуги и присвоить очередное специальное звание.
        </p>
        <p>
          Даю согласие, в случае обмана руководства, понести за это наказание, в виде дисциплинарных взысканий вплоть до понижения в звании.
        </p>
      </div>

      <div className="pt-4 space-y-4">
        <p>Дата: {date}</p>
        <p>
          Подпись:{" "}
          <span className="italic border-b border-black/60 px-4 min-w-[100px] inline-block text-center text-black">
            {name.split(" ")[0]}
          </span>
        </p>
      </div>
    </div>
  );
}

function getPromoDraft(userId: number) {
  try {
    const key = `instructor_promo_draft_${userId}`;
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed && parsed.savedAt) {
      const savedAt = new Date(parsed.savedAt).getTime();
      const twoWeeks = 14 * 24 * 60 * 60 * 1000;
      if (Date.now() - savedAt > twoWeeks) {
        localStorage.removeItem(key);
        return null;
      }
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

export function InstructorPromotionSection({ authUser }: { authUser: User }) {
  const [activeSubTab, setActiveSubTab] = useState<"submit" | "review" | "settings">("submit");
  const [reports, setReports] = useState<InstructorPromotionReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState<Record<number, boolean>>({});
  const [reviewComment, setReviewComment] = useState<Record<number, string>>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetReport, setRejectTargetReport] = useState<InstructorPromotionReport | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [selectedUnit, setSelectedUnit] = useState<string>(() => {
    return authUser.unit || "АВНГ";
  });

  const { data: configData } = useInstructorPromotionConfig(selectedUnit);
  const saveConfigMutation = useSaveInstructorPromotionConfig();

  const pointsConfig = useMemo(() => {
    return configData?.points_config || DEFAULT_INSTRUCTOR_POINTS_CONFIG;
  }, [configData]);

  const ranksFlow = useMemo(() => {
    return configData?.ranks_flow || DEFAULT_INSTRUCTOR_RANKS_FLOW;
  }, [configData]);

  const [editPoints, setEditPoints] = useState<any[]>([]);
  const [editRanks, setEditRanks] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (activeSubTab === "settings") {
      setEditPoints(JSON.parse(JSON.stringify(pointsConfig)));
      setEditRanks(JSON.parse(JSON.stringify(ranksFlow)));
    }
  }, [activeSubTab, pointsConfig, ranksFlow]);

  const addPointConfig = () => {
    const nextNum = editPoints.length > 0 ? Math.max(...editPoints.map(p => p.num)) + 1 : 1;
    setEditPoints(prev => [
      ...prev,
      {
        num: nextNum,
        name: "Новая активность",
        points: 10,
        desc: "",
        hasSubPoints: false,
        bonusPoints: 0,
        bonusLabel: ""
      }
    ]);
  };

  const addRankFlow = () => {
    setEditRanks(prev => [
      ...prev,
      {
        from: "Сержант",
        to: "Старший Сержант",
        points: 100,
        mandatory: []
      }
    ]);
  };

  const addMandatory = (flowIdx: number) => {
    const updated = [...editRanks];
    const firstPointNum = editPoints.length > 0 ? editPoints[0].num : 1;
    if (!updated[flowIdx].mandatory) {
      updated[flowIdx].mandatory = [];
    }
    updated[flowIdx].mandatory.push({ num: firstPointNum, count: 1 });
    setEditRanks(updated);
  };

  const deleteMandatory = (flowIdx: number, mIdx: number) => {
    const updated = [...editRanks];
    updated[flowIdx].mandatory.splice(mIdx, 1);
    setEditRanks(updated);
  };

  const hasDuplicateNums = useMemo(() => {
    const nums = editPoints.map(p => p.num);
    return new Set(nums).size !== nums.length;
  }, [editPoints]);

  const handleSaveConfig = async () => {
    if (hasDuplicateNums) {
      setSaveStatus({ error: "Ошибка: Присутствуют дубликаты номеров пунктов активности!" });
      return;
    }
    for (const p of editPoints) {
      if (!p.name.trim()) {
        setSaveStatus({ error: "Ошибка: Название активности не может быть пустым!" });
        return;
      }
      if (p.points <= 0) {
        setSaveStatus({ error: "Ошибка: Баллы за активность должны быть больше нуля!" });
        return;
      }
    }
    
    try {
      setSaveStatus(null);
      await saveConfigMutation.mutateAsync({
        points_config: editPoints,
        ranks_flow: editRanks,
        unit: selectedUnit
      });
      setSaveStatus({ success: true });
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err: any) {
      setSaveStatus({ error: err.message || "Не удалось сохранить конфигурацию" });
    }
  };
  
  const [currentRank, _setCurrentRank] = useState<string>(() => {
    const draft = getPromoDraft(authUser.id);
    if (draft && draft.currentRank) return draft.currentRank;
    const matched = INSTRUCTOR_RANKS.find(r => r.toLowerCase() === authUser.rank.toLowerCase());
    return matched || "Сержант";
  });
  
  const [targetRank, setTargetRank] = useState<string>(() => {
    const draft = getPromoDraft(authUser.id);
    if (draft && draft.targetRank) return draft.targetRank;
    return "Старший Сержант";
  });

  const [gratitude, setGratitude] = useState(() => {
    const draft = getPromoDraft(authUser.id);
    if (draft && draft.gratitude !== undefined) return draft.gratitude;
    return false;
  });

  const [gratitudeLink, setGratitudeLink] = useState(() => {
    const draft = getPromoDraft(authUser.id);
    if (draft && draft.gratitudeLink !== undefined) return draft.gratitudeLink;
    return "";
  });
  
  const [entries, setEntries] = useState<Array<{
    id: string;
    num: number;
    count: number;
    successCount: number;
    links: string[];
    isAuto?: boolean;
  }>>(() => {
    const draft = getPromoDraft(authUser.id);
    if (draft && draft.entries) {
      return draft.entries.filter((e: any) => !e.isAuto);
    }
    return [];
  });

  const [_autoLoading, setAutoLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submittedReportLink, setSubmittedReportLink] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const [replacements, setReplacements] = useState<Record<number, number>>(() => {
    const draft = getPromoDraft(authUser.id);
    if (draft && draft.replacements) return draft.replacements;
    return {};
  });

  const [replacementLinks, setReplacementLinks] = useState<Record<number, string>>(() => {
    const draft = getPromoDraft(authUser.id);
    if (draft && draft.replacementLinks) return draft.replacementLinks;
    return {};
  });

  const [activeWarnings, setActiveWarnings] = useState<InstructorWarning[]>([]);
  const [availableGrades, setAvailableGrades] = useState<any[]>([]);
  const [availableReports, setAvailableReports] = useState<any[]>([]);
  const [selectedGradeIds, setSelectedGradeIds] = useState<Record<number, boolean>>({});
  const [selectedReportIds, setSelectedReportIds] = useState<Record<number, boolean>>({});
  
  // Warnings issue form state (for leadership)
  const [warningTargetUserId, setWarningTargetUserId] = useState<number | "">("");
  const [warningReason, setWarningReason] = useState("");
  const [warningIssueLoading, setWarningIssueLoading] = useState(false);
  const [warningDismissLoading, setWarningDismissLoading] = useState<Record<number, boolean>>({});
  
  const [instructors, setInstructors] = useState<User[]>([]);
  const [warningsList, setWarningsList] = useState<InstructorWarning[]>([]);
  const [warningsLoading, setWarningsLoading] = useState(false);
  
  // Gallery Lightbox Modal State
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (galleryImages.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGalleryImages([]);
      } else if (e.key === "ArrowRight") {
        setGalleryIndex(prev => (prev + 1) % galleryImages.length);
      } else if (e.key === "ArrowLeft") {
        setGalleryIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [galleryImages]);

  const loadTargetWarnings = useCallback(async (userId: number) => {
    setWarningsLoading(true);
    try {
      const wrns = await fetchUserWarnings(userId);
      setWarningsList(wrns || []);
    } catch (err) {
      console.error("Failed to load warnings:", err);
    } finally {
      setWarningsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (warningTargetUserId) {
      loadTargetWarnings(Number(warningTargetUserId));
    } else {
      setWarningsList([]);
    }
  }, [warningTargetUserId, loadTargetWarnings]);

  // Uploading progress states
  const [uploadingLink, setUploadingLink] = useState<string | null>(null);
  const [uploadingGratitude, setUploadingGratitude] = useState(false);
  const [uploadingReplacements, setUploadingReplacements] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      const draft = {
        currentRank,
        targetRank,
        gratitude,
        gratitudeLink,
        entries: entries.filter(e => !e.isAuto),
        replacements,
        replacementLinks
      };
      localStorage.setItem(`instructor_promo_draft_${authUser.id}`, JSON.stringify(draft));
    } catch (e) {
      console.warn("Failed to save promotion draft", e);
    }
  }, [currentRank, targetRank, gratitude, gratitudeLink, entries, replacements, replacementLinks, authUser.id]);

  const isLeadership = ["head_avng", "chief_instructor", "deputy_head", "senior_ufsvng", "chief_sobr", "deputy_chief_sobr", "chief_omon", "deputy_chief_omon", "chief_uvo", "deputy_chief_uvo"].includes(authUser.role);
  const isGlobalAdmin = ["head_avng", "deputy_head", "senior_ufsvng"].includes(authUser.role);

  useEffect(() => {
    const matched = INSTRUCTOR_RANKS.find(r => r.toLowerCase() === authUser.rank.toLowerCase());
    if (matched) {
      _setCurrentRank(matched);
    }
  }, [authUser.rank]);

  useEffect(() => {
    const idx = INSTRUCTOR_RANKS.indexOf(currentRank);
    if (idx !== -1 && idx < INSTRUCTOR_RANKS.length - 1) {
      setTargetRank(INSTRUCTOR_RANKS[idx + 1]);
    }
  }, [currentRank]);

  useEffect(() => {
    setReplacements({});
    setReplacementLinks({});
  }, [currentRank, targetRank]);

  const loadData = useCallback(async () => {
    setReportsLoading(true);
    setAutoLoading(true);
    try {
      const [allInstReports, acts, wrns, insts] = await Promise.all([
        fetchInstructorPromotionReports().catch(() => []),
        fetchAvailableActivities().catch(() => ({ grades: [], reports: [] })),
        fetchUserWarnings().catch(() => []),
        fetchInstructors().catch(() => [])
      ]);
      setReports(allInstReports);
      setAvailableGrades(acts.grades || []);
      setAvailableReports(acts.reports || []);
      setActiveWarnings(wrns || []);
      setInstructors(insts || []);

      // Auto check new grades/reports by default on first fetch
      setSelectedGradeIds(prev => {
        const next = { ...prev };
        (acts.grades || []).forEach((g: any) => {
          if (next[g.id] === undefined) {
            next[g.id] = true;
          }
        });
        return next;
      });

      setSelectedReportIds(prev => {
        const next = { ...prev };
        (acts.reports || []).forEach((r: any) => {
          if (next[r.id] === undefined) {
            next[r.id] = true;
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to load promotion data:", err);
    } finally {
      setReportsLoading(false);
      setAutoLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    const selectedGrades = availableGrades.filter(g => selectedGradeIds[g.id]);
    const selectedReports = availableReports.filter(r => selectedReportIds[r.id]);

    const lecturesCount = selectedGrades.filter((g) => g.type === "lecture").length;
    const examsCount = selectedGrades.filter((g) => g.type === "exam").length;
    const oathsCount = selectedGrades.filter(
      (g) => g.type === "practice" && g.subject.toLowerCase().includes("присяга")
    ).length;
    const practicesCount = selectedGrades.filter(
      (g) => g.type === "practice" && !g.subject.toLowerCase().includes("присяга")
    ).length;
    const myReviewsCount = selectedReports.length;

    const lectureConfig = pointsConfig.find(c => c.name.toLowerCase().includes("лекц"));
    const examConfig = pointsConfig.find(c => c.name.toLowerCase().includes("экзамен") || c.name.toLowerCase().includes("аттестац"));
    const reviewConfig = pointsConfig.find(c => c.name.toLowerCase().includes("рапорт"));
    const oathConfig = pointsConfig.find(c => c.name.toLowerCase().includes("присяг"));
    const practiceConfig = pointsConfig.find(c => c.name.toLowerCase().includes("практик"));

    const lectureNum = lectureConfig ? lectureConfig.num : 10;
    const examNum = examConfig ? examConfig.num : 14;
    const reviewNum = reviewConfig ? reviewConfig.num : 15;
    const oathNum = oathConfig ? oathConfig.num : 17;
    const practiceNum = practiceConfig ? practiceConfig.num : 18;

    const autoEntries: typeof entries = [];

    if (lecturesCount > 0 && lectureConfig) {
      autoEntries.push({
        id: "auto_lecture",
        num: lectureNum,
        count: lecturesCount,
        successCount: 0,
        links: Array(lecturesCount).fill("[Автоподтверждение из БД]"),
        isAuto: true,
      });
    }
    if (examsCount > 0 && examConfig) {
      autoEntries.push({
        id: "auto_exam",
        num: examNum,
        count: examsCount,
        successCount: 0,
        links: Array(examsCount).fill("[Автоподтверждение из БД]"),
        isAuto: true,
      });
    }
    if (myReviewsCount > 0 && reviewConfig) {
      autoEntries.push({
        id: "auto_review",
        num: reviewNum,
        count: myReviewsCount,
        successCount: 0,
        links: Array(myReviewsCount).fill("[Автоподтверждение из БД]"),
        isAuto: true,
      });
    }
    if (oathsCount > 0 && oathConfig) {
      autoEntries.push({
        id: "auto_oath",
        num: oathNum,
        count: oathsCount,
        successCount: 0,
        links: Array(oathsCount).fill("[Автоподтверждение из БД]"),
        isAuto: true,
      });
    }
    if (practicesCount > 0 && practiceConfig) {
      autoEntries.push({
        id: "auto_practice",
        num: practiceNum,
        count: practicesCount,
        successCount: 0,
        links: Array(practicesCount).fill("[Автоподтверждение из БД]"),
        isAuto: true,
      });
    }

    setEntries((prev) => {
      const manualEntries = prev.filter((e) => !e.isAuto);
      return [...autoEntries, ...manualEntries];
    });
  }, [availableGrades, availableReports, selectedGradeIds, selectedReportIds, pointsConfig]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const instReportIdParam = params.get("instructorReportId");
    if (instReportIdParam && reports.length > 0) {
      setExpandedId(Number(instReportIdParam));
      setActiveSubTab("review");
      
      params.delete("instructorReportId");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [reports]);

  const addEntry = () => {
    setEntries(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        num: 2, // default to Поставка
        count: 1,
        successCount: 0,
        links: [""]
      }
    ]);
  };

  const updateEntryField = (id: string, field: string, value: any) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id !== id || entry.isAuto) return entry;
      const updated = { ...entry, [field]: value };
      if (field === "count") {
        const newCount = Math.max(1, Number(value));
        updated.count = newCount;
        const newLinks = [...entry.links];
        while (newLinks.length < newCount) newLinks.push("");
        if (newLinks.length > newCount) newLinks.length = newCount;
        updated.links = newLinks;
        if (updated.successCount > newCount) updated.successCount = newCount;
      }
      return updated;
    }));
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id || entry.isAuto));
  };

  const handleIssueWarning = async () => {
    if (!warningTargetUserId || !warningReason.trim()) return;
    setWarningIssueLoading(true);
    try {
      await issueWarning(Number(warningTargetUserId), warningReason.trim());
      setWarningReason("");
      await loadTargetWarnings(Number(warningTargetUserId));
      await loadData();
      alert("Выговор успешно выдан!");
    } catch (err: any) {
      alert("Ошибка при выдаче выговора: " + err.message);
    } finally {
      setWarningIssueLoading(false);
    }
  };

  const handleDismissWarning = async (warningId: number) => {
    setWarningDismissLoading(prev => ({ ...prev, [warningId]: true }));
    try {
      await dismissWarning(warningId);
      if (warningTargetUserId) {
        await loadTargetWarnings(Number(warningTargetUserId));
      }
      await loadData();
      alert("Выговор успешно снят!");
    } catch (err: any) {
      alert("Ошибка при снятии выговора: " + err.message);
    } finally {
      setWarningDismissLoading(prev => ({ ...prev, [warningId]: false }));
    }
  };

  const totalPoints = useMemo(() => {
    let pts = 0;
    entries.forEach(e => {
      const config = pointsConfig.find(c => c.num === e.num);
      if (!config) return;
      pts += e.count * config.points;
      if (config.hasSubPoints) {
        pts += e.successCount * (config.bonusPoints || 0);
      }
    });
    if (gratitude) {
      pts += 50;
    }
    return pts;
  }, [entries, gratitude, pointsConfig]);

  const activeFlowConfig = useMemo(() => {
    return ranksFlow.find(f => f.from === currentRank && f.to === targetRank);
  }, [currentRank, targetRank, ranksFlow]);

  const checklistStatus = useMemo(() => {
    if (!activeFlowConfig) return { allCompleted: true, pointsCompleted: true, items: [] };
    
    let allCompleted = true;
    const items = activeFlowConfig.mandatory.map((m: any) => {
      const resolvedNum = replacements[m.num] || m.num;
      const matchingEntries = entries.filter(e => e.num === resolvedNum);
      const totalEnteredCount = matchingEntries.reduce((sum, e) => sum + e.count, 0);
      const linksCount = matchingEntries.reduce((sum, e) => sum + e.links.filter(link => link.trim().length > 0).length, 0);
      
      const replacementActive = replacements[m.num] && replacements[m.num] !== m.num;
      const replacementLinkValid = !replacementActive || (replacementLinks[m.num] && replacementLinks[m.num].trim().length > 0);
      
      const completed = totalEnteredCount >= m.count && linksCount >= m.count && replacementLinkValid;
      
      if (!completed) allCompleted = false;
      
      const activity = pointsConfig.find(p => p.num === resolvedNum);
      const resolvedName = activity ? activity.name : (m.name || `Пункт ${resolvedNum}`);
      
      const originalActivity = pointsConfig.find(p => p.num === m.num);
      const originalName = originalActivity ? originalActivity.name : `Пункт ${m.num}`;
      
      return {
        ...m,
        resolvedNum,
        name: resolvedName,
        originalName,
        isReplaced: resolvedNum !== m.num,
        enteredCount: totalEnteredCount,
        linksCount,
        completed
      };
    });
    
    const pointsCompleted = totalPoints >= activeFlowConfig.points;
    if (!pointsCompleted) allCompleted = false;
    
    return {
      allCompleted,
      pointsCompleted,
      items
    };
  }, [activeFlowConfig, entries, totalPoints, pointsConfig, replacements, replacementLinks]);

  const handleSubmit = async () => {
    if (activeWarnings.some(w => w.is_active)) {
      setError("Подача рапорта заблокирована: у вас есть активные дисциплинарные выговоры.");
      return;
    }
    if (!checklistStatus.allCompleted) return;
    setSubmitLoading(true);
    setError("");
    setSuccess("");
    setSubmittedReportLink("");
    
    let itemsText = "";
    entries.forEach((e) => {
      const config = pointsConfig.find(c => c.num === e.num);
      if (!config) return;
      const successText = config.hasSubPoints && e.successCount > 0 ? `, успешных: ${e.successCount}` : "";
      itemsText += `• ${config.name} (${e.count} шт${successText}) — ${e.count * config.points + e.successCount * (config.bonusPoints || 0)} б.;\n`;
      e.links.forEach((link, lIdx) => {
        itemsText += `  - Доказательство ${lIdx + 1}: ${link || "(ссылка отсутствует)"}\n`;
      });
    });
    if (gratitude) {
      itemsText += `• Благодарность от старшего состава — 50 б.;\n  - Ссылка: ${gratitudeLink || "(ссылка отсутствует)"}\n`;
    }

    const replacementEntries = Object.entries(replacements);
    if (replacementEntries.length > 0) {
      itemsText += `\n**Замены обязательных пунктов:**\n`;
      replacementEntries.forEach(([originalStr, replacedStr]) => {
        const origNum = Number(originalStr);
        const replNum = Number(replacedStr);
        const origConf = pointsConfig.find(p => p.num === origNum);
        const replConf = pointsConfig.find(p => p.num === replNum);
        const origName = origConf ? origConf.name : `Пункт ${origNum}`;
        const replName = replConf ? replConf.name : `Пункт ${replNum}`;
        const screenshotLink = replacementLinks[origNum] || "(ссылка отсутствует)";
        itemsText += `• ${origName} ➔ Заменен на: ${replName}\n  - Доказательство замены: ${screenshotLink}\n`;
      });
    }

    const itemsCompletedPayload = entries.map(e => ({
      num: e.num,
      count: e.count,
      successCount: e.successCount,
      links: e.links
    }));
    
    if (gratitude) {
      itemsCompletedPayload.push({
        num: 99,
        count: 1,
        successCount: 0,
        links: [gratitudeLink]
      });
    }
    
    if (replacementEntries.length > 0) {
      itemsCompletedPayload.push({
        num: 100,
        count: 0,
        successCount: 0,
        links: [],
        metadata: { replacements, replacementLinks }
      } as any);
    }

    // Собираем ID выбранных для зачета оценок и рапортов
    const selectedGrades = availableGrades.filter(g => selectedGradeIds[g.id]);
    const selectedReports = availableReports.filter(r => selectedReportIds[r.id]);
    const gradeIds = selectedGrades.map(g => g.id);
    const reportIds = selectedReports.map(r => r.id);

    itemsCompletedPayload.push({
      num: 101,
      count: 0,
      successCount: 0,
      links: [],
      metadata: { grade_ids: gradeIds, report_ids: reportIds }
    } as any);

    try {
      const res = await submitInstructorPromotionReport({
        current_rank: currentRank,
        target_rank: targetRank,
        total_points: totalPoints,
        items_completed: itemsCompletedPayload
      });

      sendInstructorPromotionReportDiscord({
        name: authUser.name,
        rank: currentRank,
        staticId: authUser.static_id,
        targetRank,
        totalPoints,
        itemsListText: itemsText,
        instructorDiscordId: authUser.discord_id || undefined
      }).catch(err => console.error("Discord error:", err));

      const reportId = res?.id || Date.now();
      const link = `${window.location.origin}/?tab=promotions&instructorReportId=${reportId}`;
      setSubmittedReportLink(link);
      setSuccess("Рапорт на повышение успешно подан!");
      setEntries([]);
      setReplacements({});
      setReplacementLinks({});
      setGratitude(false);
      setGratitudeLink("");
      setSelectedGradeIds({});
      setSelectedReportIds({});
      try {
        localStorage.removeItem(`instructor_promo_draft_${authUser.id}`);
      } catch (_) {}
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка подачи рапорта");
    }
    setSubmitLoading(false);
  };

  const handleReviewClick = async (report: InstructorPromotionReport, status: "approved" | "rejected") => {
    setReviewLoading(prev => ({ ...prev, [report.id]: true }));
    try {
      await reviewInstructorPromotionReport(report.id, status, reviewComment[report.id] || "");
      
      sendInstructorPromotionReviewedDiscord({
        name: report.instructor_name || "",
        staticId: report.instructor_static_id || "",
        targetRank: report.target_rank,
        status,
        comment: reviewComment[report.id] || "",
        reportId: report.id,
        instructorDiscordId: report.instructor_discord_id || undefined
      }).catch(err => console.error("Discord error:", err));

      await loadData();
      setExpandedId(null);
    } catch (err: any) {
      alert("Ошибка проверки: " + err.message);
    }
    setReviewLoading(prev => ({ ...prev, [report.id]: false }));
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetReport || !rejectReason.trim()) return;
    setReviewComment(prev => ({ ...prev, [rejectTargetReport.id]: rejectReason }));
    setIsRejectModalOpen(false);
    await handleReviewClick(rejectTargetReport, "rejected");
    setRejectTargetReport(null);
    setRejectReason("");
  };

  const hasPendingReport = reports.some(r => r.instructor_id === authUser.id && r.status === "pending");

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      return true;
    });
  }, [reports, filterStatus]);

  const maxRankReached = currentRank === "Капитан";

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        title="Повышение инструкторского состава"
        sub="Балловая система повышения квалификации и воинских званий"
      />

      {/* Sub Tabs for Leadership */}
      {isLeadership && (
        <div className="flex border-b border-tactical-border/60">
          <button
            onClick={() => setActiveSubTab("submit")}
            className={`px-4 py-2 text-xs tracking-wider uppercase font-oswald border-b-2 transition-colors ${
              activeSubTab === "submit"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Подать рапорт
          </button>
          <button
            onClick={() => setActiveSubTab("review")}
            className={`px-4 py-2 text-xs tracking-wider uppercase font-oswald border-b-2 transition-colors relative ${
              activeSubTab === "review"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Проверка рапортов
            {reports.filter(r => r.status === "pending").length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          {isLeadership && (
            <button
              onClick={() => setActiveSubTab("settings")}
              className={`px-4 py-2 text-xs tracking-wider uppercase font-oswald border-b-2 transition-colors ${
                activeSubTab === "settings"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Настройка системы
            </button>
          )}
        </div>
      )}

      {activeSubTab === "submit" ? (
        maxRankReached ? (
          <div className="bg-tactical-card border border-tactical-border p-6 text-center text-yellow-500 corner-mark">
            <Icon name="Award" className="mx-auto text-yellow-500 mb-2" size={32} />
            <h3 className="font-oswald text-lg uppercase tracking-wider">Максимальное звание</h3>
            <p className="text-xs font-mono mt-1 text-muted-foreground">Вы уже достигли максимального воинского звания Капитан!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Warning block */}
            {activeWarnings.some(w => w.is_active) && (
              <div className="bg-red-950/45 border-2 border-red-500/80 p-5 text-left corner-mark space-y-3 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse">
                <div className="flex items-center gap-2">
                  <Icon name="AlertTriangle" size={20} className="text-red-500" />
                  <h4 className="font-oswald text-sm font-bold uppercase tracking-wider text-red-400">
                    Подача рапорта заблокирована
                  </h4>
                </div>
                <p className="text-xs text-red-200/90 font-ibm leading-relaxed">
                  У вас есть активные дисциплинарные выговоры. Подача рапортов полностью заблокирована руководством до снятия выговоров.
                </p>
                <div className="border-t border-red-500/25 pt-2.5 space-y-2">
                  <span className="text-[10px] uppercase font-mono text-red-400 font-bold block">Список активных выговоров:</span>
                  <div className="space-y-1.5 font-mono text-[11px] text-red-300">
                    {activeWarnings.filter(w => w.is_active).map((w, idx) => (
                      <div key={idx} className="bg-black/30 border border-red-500/30 p-2.5 rounded-sm">
                        <p className="font-semibold">• Выговор #{w.id}</p>
                        <p className="pl-3 text-red-200">Причина: {w.reason}</p>
                        <p className="pl-3 text-muted-foreground/80 text-[10px]">Выдал: {w.issued_by_name} · {fmt(w.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              {/* Left side - input form */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-tactical-card border border-tactical-border/60 p-6 corner-mark space-y-4">
                  <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground border-b border-tactical-border pb-2">
                    1. Звание для повышения
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-muted-foreground">Текущее звание</label>
                      <input
                        readOnly
                        value={currentRank}
                        className="w-full bg-tactical-panel/50 border border-tactical-border px-3 py-2 text-xs text-muted-foreground font-ibm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-muted-foreground">Целевое звание</label>
                      <input
                        readOnly
                        value={targetRank}
                        className="w-full bg-tactical-panel/50 border border-tactical-border px-3 py-2 text-xs text-muted-foreground font-ibm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Available Activities (Rollover Checkboxes) */}
                <div className="bg-tactical-card border border-tactical-border/60 p-6 corner-mark space-y-4">
                  <div className="flex items-center justify-between border-b border-tactical-border pb-2">
                    <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground">
                      1.5. Автоматические активности для зачета (Rollover)
                    </h3>
                    {(availableGrades.length > 0 || availableReports.length > 0) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const nextGrades = { ...selectedGradeIds };
                            availableGrades.forEach(g => { nextGrades[g.id] = true; });
                            setSelectedGradeIds(nextGrades);

                            const nextReports = { ...selectedReportIds };
                            availableReports.forEach(r => { nextReports[r.id] = true; });
                            setSelectedReportIds(nextReports);
                          }}
                          className="text-[9px] uppercase font-mono text-primary hover:underline"
                        >
                          Выбрать все
                        </button>
                        <span className="text-muted-foreground/30 text-[9px] font-mono">|</span>
                        <button
                          onClick={() => {
                            const nextGrades = { ...selectedGradeIds };
                            availableGrades.forEach(g => { nextGrades[g.id] = false; });
                            setSelectedGradeIds(nextGrades);

                            const nextReports = { ...selectedReportIds };
                            availableReports.forEach(r => { nextReports[r.id] = false; });
                            setSelectedReportIds(nextReports);
                          }}
                          className="text-[9px] uppercase font-mono text-primary hover:underline"
                        >
                          Снять все
                        </button>
                      </div>
                    )}
                  </div>

                  {availableGrades.length === 0 && availableReports.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic font-ibm text-center py-4">
                      Нет неиспользованных автоматических активностей в базе данных (лекций, экзаменов, практик, принятых рапортов).
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                      {availableGrades.map((g) => (
                        <label
                          key={`grade_${g.id}`}
                          className="flex items-start gap-2.5 p-2 border border-tactical-border/40 bg-tactical-panel/20 hover:bg-tactical-panel/40 cursor-pointer select-none rounded-sm transition-all text-left"
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedGradeIds[g.id]}
                            onChange={(e) => {
                              setSelectedGradeIds(prev => ({ ...prev, [g.id]: e.target.checked }));
                            }}
                            className="rounded border-tactical-border text-primary focus:ring-0 focus:ring-offset-0 bg-tactical-panel mt-0.5"
                          />
                          <div className="text-left text-xs font-mono">
                            <span className="text-primary font-bold">
                              [{g.type === "lecture" ? "Лекция" : g.type === "exam" ? "Экзамен" : g.subject.toLowerCase().includes("присяга") ? "Присяга" : "Практика"}]
                            </span>{" "}
                            <span className="text-foreground">{g.subject}</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5 font-ibm">
                              Курсант: {g.cadet_name} (Оценка: {g.grade}) · {fmt(g.graded_at)}
                            </div>
                          </div>
                        </label>
                      ))}

                      {availableReports.map((r) => (
                        <label
                          key={`report_${r.id}`}
                          className="flex items-start gap-2.5 p-2 border border-tactical-border/40 bg-tactical-panel/20 hover:bg-tactical-panel/40 cursor-pointer select-none rounded-sm transition-all text-left"
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedReportIds[r.id]}
                            onChange={(e) => {
                              setSelectedReportIds(prev => ({ ...prev, [r.id]: e.target.checked }));
                            }}
                            className="rounded border-tactical-border text-primary focus:ring-0 focus:ring-offset-0 bg-tactical-panel mt-0.5"
                          />
                          <div className="text-left text-xs font-mono">
                            <span className="text-green-400 font-bold">[Проверка рапорта]</span>{" "}
                            <span className="text-foreground">Рапорт на {PROMOTION_LABELS[r.promotion_type as PromotionType] || r.promotion_type}</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5 font-ibm">
                              Курсант: {r.cadet_name} · {fmt(r.reviewed_at)}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

              {/* Point Calculator items */}
              <div className="bg-tactical-card border border-tactical-border/60 p-6 corner-mark space-y-6">
                <div className="flex items-center justify-between border-b border-tactical-border pb-2">
                  <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground">
                    2. Выполненная работа
                  </h3>
                  <button
                    onClick={addEntry}
                    className="rank-badge text-primary border border-primary px-3 py-1 hover:bg-primary/10 transition-all flex items-center gap-1 text-[10px]"
                  >
                    <Icon name="Plus" size={10} /> Добавить пункт
                  </button>
                </div>

                {entries.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-tactical-border/40 text-muted-foreground">
                    <p className="text-xs font-ibm">Нет добавленной работы. Нажмите кнопку выше для добавления записей.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {entries.map((entry) => {
                      const selectedConfig = pointsConfig.find(c => c.num === entry.num);
                      return (
                        <div key={entry.id} className={`bg-tactical-panel border p-4 relative space-y-3 ${entry.isAuto ? "border-green-500/40" : "border-tactical-border/80"}`}>
                          {!entry.isAuto ? (
                            <button
                              onClick={() => removeEntry(entry.id)}
                              title="Удалить запись"
                              className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <Icon name="Trash2" size={14} />
                            </button>
                          ) : (
                            <span className="absolute top-3 right-3 rank-badge text-green-400 border border-green-800 bg-green-950/40 px-1.5 py-0.5 text-[9px] flex items-center gap-0.5 select-none">
                              <Icon name="CheckCircle" size={9} />
                              Автоподтверждено
                            </span>
                          )}

                          <div className="grid sm:grid-cols-12 gap-3 pr-6">
                            <div className="sm:col-span-8 space-y-1">
                              <label className="text-[9px] uppercase font-mono text-muted-foreground">Тип активности</label>
                              <select
                                value={entry.num}
                                disabled={entry.isAuto}
                                onChange={(e) => updateEntryField(entry.id, "num", Number(e.target.value))}
                                className={`w-full bg-tactical-panel border border-tactical-border px-2 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary ${
                                  entry.isAuto ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                                }`}
                              >
                                {pointsConfig.map(c => (
                                  <option key={c.num} value={c.num}>
                                    Пункт {c.num}. {c.name} ({c.points} б.)
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-4 space-y-1">
                              <label className="text-[9px] uppercase font-mono text-muted-foreground">Количество</label>
                              <input
                                type="number"
                                min="1"
                                disabled={entry.isAuto}
                                value={entry.count}
                                onChange={(e) => updateEntryField(entry.id, "count", Number(e.target.value))}
                                className={`w-full bg-tactical-panel border border-tactical-border px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary ${
                                  entry.isAuto ? "opacity-60 cursor-not-allowed" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {selectedConfig?.desc && (
                            <p className="text-[10px] text-muted-foreground italic font-ibm">{selectedConfig.desc}</p>
                          )}

                          {/* Sub points (Success bonus) */}
                          {selectedConfig?.hasSubPoints && (
                            <div className="flex items-center gap-3">
                              <label className="text-[10px] uppercase font-mono text-muted-foreground">
                                {selectedConfig.bonusLabel || "Успешные:"}
                              </label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  disabled={entry.isAuto}
                                  onClick={() => updateEntryField(entry.id, "successCount", Math.max(0, entry.successCount - 1))}
                                  className={`w-5 h-5 border border-tactical-border bg-tactical-panel flex items-center justify-center text-xs hover:border-primary ${
                                    entry.isAuto ? "opacity-40 cursor-not-allowed" : ""
                                  }`}
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs w-6 text-center">{entry.successCount}</span>
                                <button
                                  disabled={entry.isAuto}
                                  onClick={() => updateEntryField(entry.id, "successCount", Math.min(entry.count, entry.successCount + 1))}
                                  className={`w-5 h-5 border border-tactical-border bg-tactical-panel flex items-center justify-center text-xs hover:border-primary ${
                                    entry.isAuto ? "opacity-40 cursor-not-allowed" : ""
                                  }`}
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-[10px] text-muted-foreground">(макс. {entry.count})</span>
                            </div>
                          )}

                          {/* Links block */}
                          <div className="space-y-1.5 border-t border-tactical-border/40 pt-2">
                            <span className="text-[9px] uppercase font-mono text-muted-foreground block font-bold">Ссылки на скриншоты (доказательства)</span>
                            {entry.links.map((link, linkIdx) => {
                              const isUploading = uploadingLink === `${entry.id}_${linkIdx}`;
                              return (
                                <div key={linkIdx} className="flex items-center gap-2">
                                  <input
                                    type={entry.isAuto ? "text" : "url"}
                                    placeholder={`Ссылка на скриншот №${linkIdx + 1}...`}
                                    disabled={entry.isAuto || isUploading}
                                    value={link}
                                    onChange={(e) => {
                                      const newLinks = [...entry.links];
                                      newLinks[linkIdx] = e.target.value;
                                      updateEntryField(entry.id, "links", newLinks);
                                    }}
                                    className={`w-full bg-tactical-panel border border-tactical-border px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary ${
                                      entry.isAuto ? "opacity-60 cursor-not-allowed" : ""
                                    }`}
                                  />
                                  {!entry.isAuto && (
                                    <label className="bg-tactical-panel border border-tactical-border hover:border-primary px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center gap-1 flex-shrink-0">
                                      {isUploading ? (
                                        <>
                                          <Icon name="Loader2" size={12} className="animate-spin text-primary" />
                                          <span>...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Icon name="Upload" size={12} />
                                          <span>Загрузить</span>
                                        </>
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={isUploading}
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const linkKey = `${entry.id}_${linkIdx}`;
                                          setUploadingLink(linkKey);
                                          try {
                                            const url = await uploadEvidenceFile(file);
                                            const newLinks = [...entry.links];
                                            newLinks[linkIdx] = url;
                                            updateEntryField(entry.id, "links", newLinks);
                                          } catch (uploadErr: any) {
                                            alert("Ошибка загрузки: " + uploadErr.message);
                                          }                                          finally {
                                            setUploadingLink(null);
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Gratitude item */}
                <div className="border-t border-tactical-border/60 pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="gratitude_checkbox"
                      checked={gratitude}
                      onChange={(e) => setGratitude(e.target.checked)}
                      className="rounded border-tactical-border text-primary focus:ring-primary bg-tactical-panel"
                    />
                    <label htmlFor="gratitude_checkbox" className="text-xs font-ibm text-foreground cursor-pointer select-none">
                      Использовать благодарность от старшего состава (+50 баллов, не более одной)
                    </label>
                  </div>
                  {gratitude && (
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="Ссылка на скриншот благодарности..."
                        disabled={uploadingGratitude}
                        value={gratitudeLink}
                        onChange={(e) => setGratitudeLink(e.target.value)}
                        className="bg-tactical-panel border border-tactical-border px-3 py-1.5 text-xs text-foreground font-mono flex-1 focus:outline-none focus:border-primary"
                      />
                      <label className="bg-tactical-panel border border-tactical-border hover:border-primary px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center gap-1 flex-shrink-0">
                        {uploadingGratitude ? (
                          <>
                            <Icon name="Loader2" size={12} className="animate-spin text-primary" />
                            <span>...</span>
                          </>
                        ) : (
                          <>
                            <Icon name="Upload" size={12} />
                            <span>Загрузить</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingGratitude}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingGratitude(true);
                            try {
                              const url = await uploadEvidenceFile(file);
                              setGratitudeLink(url);
                            } catch (err: any) {
                              alert("Ошибка загрузки: " + err.message);
                            } finally {
                              setUploadingGratitude(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - status and preview */}
            <div className="lg:col-span-5 space-y-6">
              {/* Checklist and points */}
              {activeFlowConfig && (
                <div className="bg-tactical-card border border-tactical-border/60 p-6 corner-mark space-y-4">
                  <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground border-b border-tactical-border pb-2">
                    Требования для повышения
                  </h3>
                  
                  {/* Points requirement */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span>Набрано баллов:</span>
                      <span className={checklistStatus.pointsCompleted ? "text-green-400 font-bold" : "text-primary"}>
                        {totalPoints} / {activeFlowConfig.points}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-tactical-panel border border-tactical-border rounded-sm overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          checklistStatus.pointsCompleted ? "bg-green-500" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(100, (totalPoints / activeFlowConfig.points) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Mandatory items checklist */}
                  <div className="space-y-2 pt-2 border-t border-tactical-border/40">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground block">Обязательное выполнение пунктов:</span>
                    <div className="space-y-2">
                      {checklistStatus.items.map((item: any, idx: number) => {
                        const isReplaced = item.isReplaced;
                        return (
                          <div key={idx} className="bg-tactical-panel/30 border border-tactical-border/30 p-2.5 rounded-sm space-y-2 text-left">
                            <div className="flex items-start justify-between text-xs gap-2">
                              <div className="flex items-start gap-2 text-muted-foreground flex-1 min-w-0">
                                <Icon
                                  name={item.completed ? "CheckCircle2" : "Circle"}
                                  size={14}
                                  className={`mt-0.5 flex-shrink-0 ${item.completed ? "text-green-400" : "text-muted-foreground/40"}`}
                                />
                                <div className="min-w-0">
                                  <span className={item.completed ? "text-green-300" : "text-foreground"}>
                                    Пункт {item.resolvedNum}. {item.name}
                                  </span>
                                  {isReplaced && (
                                    <span className="block text-[10px] text-yellow-500 font-mono mt-0.5">
                                      (Заменено с: {item.originalName})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`font-mono text-xs px-2.5 py-1 rounded border font-extrabold flex-shrink-0 ml-2 shadow-[0_0_10px_rgba(0,0,0,0.3)] ${
                                item.completed 
                                  ? "bg-green-500/25 text-green-400 border-green-500/60 shadow-[0_0_10px_rgba(34,197,94,0.25)]" 
                                  : "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                              }`}>
                                {item.enteredCount} / {item.count}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pl-5 pt-1 border-t border-tactical-border/20">
                              <span className="text-[10px] text-muted-foreground font-mono">Альтернатива:</span>
                              <div className="flex items-center gap-1.5 flex-1 max-w-[180px]">
                                <select
                                  value={replacements[item.num] || item.num}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val === item.num) {
                                      const updated = { ...replacements };
                                      delete updated[item.num];
                                      setReplacements(updated);
                                      setReplacementLinks(prev => {
                                        const next = { ...prev };
                                        delete next[item.num];
                                        return next;
                                      });
                                    } else {
                                      setReplacements(prev => ({ ...prev, [item.num]: val }));
                                    }
                                  }}
                                  className="w-full bg-tactical-panel border border-tactical-border/60 text-[10px] font-ibm py-0.5 px-1.5 focus:outline-none focus:border-primary text-foreground cursor-pointer"
                                >
                                  <option value={item.num}>— Нет (Оригинал) —</option>
                                  {pointsConfig.map(c => {
                                    if (c.num === item.num) return null;
                                    if (item.allowedAlternatives && item.allowedAlternatives.length > 0) {
                                      if (!item.allowedAlternatives.includes(c.num)) {
                                        return null;
                                      }
                                    } else {
                                      const isMandatory = activeFlowConfig.mandatory.some((m: any) => m.num === c.num);
                                      if (isMandatory) return null;
                                    }
                                    return (
                                      <option key={c.num} value={c.num}>
                                        Пункт {c.num}. {c.name}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </div>

                            {replacements[item.num] && replacements[item.num] !== item.num && (
                              <div className="pl-5 pt-1.5 space-y-1">
                                <label className="text-[9px] uppercase font-mono text-muted-foreground block font-bold">
                                  Ссылка на скриншот (подтверждение замены)
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="url"
                                    placeholder="Ссылка на скриншот..."
                                    disabled={!!uploadingReplacements[item.num]}
                                    value={replacementLinks[item.num] || ""}
                                    onChange={(e) => {
                                      setReplacementLinks(prev => ({ ...prev, [item.num]: e.target.value }));
                                    }}
                                    className="bg-tactical-panel border border-tactical-border px-2 py-1 text-xs text-foreground font-mono flex-1 focus:outline-none focus:border-primary"
                                  />
                                  <label className="bg-tactical-panel border border-tactical-border hover:border-primary px-3 py-1 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center gap-1 flex-shrink-0">
                                    {!!uploadingReplacements[item.num] ? (
                                      <>
                                        <Icon name="Loader2" size={12} className="animate-spin text-primary" />
                                        <span>...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Icon name="Upload" size={12} />
                                        <span>Загрузить</span>
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={!!uploadingReplacements[item.num]}
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setUploadingReplacements(prev => ({ ...prev, [item.num]: true }));
                                        try {
                                          const url = await uploadEvidenceFile(file);
                                          setReplacementLinks(prev => ({ ...prev, [item.num]: url }));
                                        } catch (err: any) {
                                          alert("Ошибка загрузки: " + err.message);
                                        } finally {
                                          setUploadingReplacements(prev => ({ ...prev, [item.num]: false }));
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Military Report preview */}
              <div className="bg-tactical-card border border-tactical-border/60 p-4 corner-mark space-y-3">
                <h4 className="font-oswald text-xs tracking-widest uppercase text-muted-foreground">
                  Предпросмотр документа
                </h4>
                <InstructorMilitaryReport
                  name={authUser.name}
                  staticId={authUser.static_id}
                  currentRank={currentRank}
                  targetRank={targetRank}
                  totalPoints={totalPoints}
                  entries={entries}
                  gratitude={gratitude}
                  gratitudeLink={gratitudeLink}
                  date={new Date().toLocaleDateString("ru-RU")}
                  pointsConfig={pointsConfig}
                  ranksFlow={ranksFlow}
                  replacements={replacements}
                  replacementLinks={replacementLinks}
                  onImageClick={(images, index) => {
                    setGalleryImages(images);
                    setGalleryIndex(index);
                  }}
                />
              </div>

              {/* Error messages */}
              {error && (
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-800 px-4 py-3">
                  <Icon name="AlertTriangle" size={14} className="text-red-400" />
                  <p className="text-xs text-red-400 font-ibm">{error}</p>
                </div>
              )}

              {/* Success box */}
              {success && (
                <div className="flex flex-col gap-3 bg-green-900/20 border border-green-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon name="CheckCircle" size={14} className="text-green-400" />
                    <p className="text-xs text-green-400 font-semibold font-ibm">{success}</p>
                  </div>
                  {submittedReportLink && (
                    <div className="space-y-1.5 bg-black/40 p-3 border border-tactical-border/60">
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Ссылка на рапорт (скопируйте и отправьте в Discord):
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={submittedReportLink}
                          className="bg-tactical-panel border border-tactical-border px-2 py-1 text-xs text-foreground font-mono flex-1 select-all focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(submittedReportLink);
                            alert("Ссылка скопирована!");
                          }}
                          className="bg-primary text-primary-foreground font-oswald text-[10px] tracking-wider uppercase px-2.5 py-1 hover:bg-primary/90 transition-colors flex items-center gap-0.5"
                        >
                          <Icon name="Copy" size={10} />
                          Копировать
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!checklistStatus.allCompleted || submitLoading || hasPendingReport || activeWarnings.some(w => w.is_active)}
                className={`w-full font-oswald text-xs tracking-widest uppercase py-3.5 px-8 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 corner-mark ${
                  activeWarnings.some(w => w.is_active)
                    ? "bg-red-950/80 border border-red-700 text-red-400"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                <Icon name={activeWarnings.some(w => w.is_active) ? "AlertTriangle" : "Send"} size={12} />
                {activeWarnings.some(w => w.is_active)
                  ? "Блокировка: активный выговор"
                  : submitLoading
                    ? "Отправка..."
                    : hasPendingReport
                      ? "Рапорт на рассмотрении"
                      : "Подать рапорт"}
              </button>
            </div>
          </div>
        </div>
      )
      ) : activeSubTab === "review" ? (
        /* Review instructor promotion reports list */
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-muted-foreground font-ibm">
              Всего рапортов: {filteredReports.length}
            </p>
            <div className="flex gap-2">
              <select
                className="bg-tactical-panel border border-tactical-border px-3 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Все статусы</option>
                <option value="pending">На рассмотрении</option>
                <option value="approved">Одобренные</option>
                <option value="rejected">Отклонённые</option>
              </select>
            </div>
          </div>

          {reportsLoading ? (
            <Spinner />
          ) : filteredReports.length === 0 ? (
            <Empty text="Рапортов инструкторов не найдено" />
          ) : (
            <div className="space-y-3">
              {filteredReports.map((r) => {
                const isExpanded = expandedId === r.id;
                
                return (
                  <div
                    key={r.id}
                    className={`bg-green-950/20 border transition-colors ${
                      isExpanded ? "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]" : "border-green-500/30 hover:border-green-500/60"
                    }`}
                  >
                    <div
                      className="p-4 cursor-pointer flex items-start justify-between gap-3"
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-950 border border-green-500 text-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name="Star" size={14} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-ibm text-sm font-medium text-green-200">
                              {r.instructor_name}
                            </h4>
                            <span className="rank-badge text-green-400 border border-green-800 bg-green-950/40 px-1.5 py-0.5 text-[10px]">
                              {r.current_rank} → {r.target_rank}
                            </span>
                            {r.instructor_unit && (
                              <span className="rank-badge text-blue-400 border border-blue-900 bg-blue-950/40 px-1.5 py-0.5 text-[10px]">
                                {r.instructor_unit}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            ID: {r.instructor_static_id} · {fmt(r.created_at)} · {r.total_points} баллов
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        <Icon
                          name={isExpanded ? "ChevronUp" : "ChevronDown"}
                          size={14}
                          className="text-muted-foreground"
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-tactical-border divide-y divide-tactical-border animate-fade-in">
                        <div className="p-4 bg-tactical-panel/30 border-b border-tactical-border space-y-2">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-oswald text-[10px] tracking-widest uppercase text-muted-foreground">
                              Документ рапорта
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const reportLink = `${window.location.origin}/?tab=promotions&instructorReportId=${r.id}`;
                                navigator.clipboard.writeText(reportLink);
                                alert("Ссылка скопирована!");
                              }}
                              className="text-[10px] text-primary hover:underline font-mono uppercase tracking-wider flex items-center gap-1"
                            >
                              <Icon name="Copy" size={10} />
                              Скопировать ссылку для Discord
                            </button>
                          </div>
                          
                          {/* Replacement warning alert & formal document */}
                          {(() => {
                            const metadataEntry = r.items_completed.find(e => e.num === 100) as any;
                            const reportReplacements = metadataEntry?.metadata?.replacements || {};
                            const reportReplacementLinks = metadataEntry?.metadata?.replacementLinks || {};
                            const hasReplacements = Object.keys(reportReplacements).length > 0;
                            return (
                              <>
                                {hasReplacements && (
                                  <div className="mb-4 p-3 bg-yellow-950/20 border border-yellow-800/60 rounded text-xs space-y-1 text-left">
                                    <p className="font-semibold text-yellow-400 flex items-center gap-1.5">
                                      <Icon name="AlertTriangle" size={13} className="text-yellow-400" />
                                      Внимание: В рапорте произведены замены обязательных пунктов!
                                    </p>
                                    <ul className="list-disc pl-4 space-y-0.5 text-yellow-200/80 font-mono text-[11px]">
                                      {Object.entries(reportReplacements).map(([origStr, replStr]) => {
                                        const origNum = Number(origStr);
                                        const replNumVal = Number(replStr);
                                        const origConf = pointsConfig.find(p => p.num === origNum);
                                        const replConf = pointsConfig.find(p => p.num === replNumVal);
                                        const link = reportReplacementLinks[origNum];
                                        return (
                                          <li key={origNum}>
                                            {origConf ? origConf.name : `Пункт ${origNum}`} ➔ Заменен на: {replConf ? replConf.name : `Пункт ${replNumVal}`}
                                            {link && (
                                              <span className="block pl-3 text-[10px] text-yellow-400/70 font-mono break-all">
                                                Скриншот:{" "}
                                                <span
                                                  onClick={() => {
                                                    const allImages = [
                                                      ...r.items_completed.flatMap(e => e.links),
                                                      r.items_completed.find(e => e.num === 99)?.links[0] || "",
                                                      ...Object.values(reportReplacementLinks)
                                                    ].filter(Boolean) as string[];
                                                    const idxInAll = allImages.indexOf(link);
                                                    setGalleryImages(allImages);
                                                    setGalleryIndex(idxInAll !== -1 ? idxInAll : 0);
                                                  }}
                                                  className="underline hover:text-primary cursor-pointer font-bold select-none"
                                                >
                                                  {link}
                                                </span>
                                              </span>
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                )}

                                {/* Formal document component */}
                                <InstructorMilitaryReport
                                  name={r.instructor_name || "Инструктор"}
                                  staticId={r.instructor_static_id || ""}
                                  currentRank={r.current_rank}
                                  targetRank={r.target_rank}
                                  totalPoints={r.total_points}
                                  entries={r.items_completed.filter(e => e.num !== 99 && e.num !== 100)}
                                  gratitude={r.items_completed.some(e => e.num === 99)}
                                  gratitudeLink={r.items_completed.find(e => e.num === 99)?.links[0] || ""}
                                  date={new Date(r.created_at).toLocaleDateString("ru-RU")}
                                  pointsConfig={pointsConfig}
                                  ranksFlow={ranksFlow}
                                  replacements={reportReplacements}
                                  replacementLinks={reportReplacementLinks}
                                  onImageClick={(images, index) => {
                                    setGalleryImages(images);
                                    setGalleryIndex(index);
                                  }}
                                />
                              </>
                            );
                          })()}
                        </div>

                        {/* Review actions */}
                        {r.status === "pending" && (
                          <div className="p-4 bg-tactical-panel/50 space-y-2">
                            {r.user_id === authUser.id || r.instructor_id === authUser.id ? (
                              <p className="text-xs text-yellow-500 font-ibm italic">
                                Вы не можете рассмотреть собственный рапорт. Дождитесь проверки другим членом руководства.
                              </p>
                            ) : (
                              <>
                                <input
                                  className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-xs text-foreground font-ibm focus:outline-none focus:border-primary transition-colors"
                                  placeholder="Комментарий руководства (необязательно)..."
                                  value={reviewComment[r.id] || ""}
                                  onChange={(e) => setReviewComment(prev => ({ ...prev, [r.id]: e.target.value }))}
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    disabled={reviewLoading[r.id]}
                                    onClick={() => handleReviewClick(r, "approved")}
                                    className="rank-badge text-green-400 border border-green-800 px-3 py-1.5 hover:bg-green-900/30 transition-colors disabled:opacity-50 flex items-center gap-1 text-xs"
                                  >
                                    <Icon name="Check" size={12} /> Одобрить и повысить
                                  </button>
                                  <button
                                    disabled={reviewLoading[r.id]}
                                    onClick={() => {
                                      setRejectTargetReport(r);
                                      setRejectReason("");
                                      setIsRejectModalOpen(true);
                                    }}
                                    className="rank-badge text-red-400 border border-red-800 px-3 py-1.5 hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center gap-1 text-xs"
                                  >
                                    <Icon name="X" size={12} /> Отклонить
                                  </button>
                                  {reviewLoading[r.id] && (
                                    <Icon name="Loader2" size={14} className="text-primary animate-spin" />
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Reviewed by */}
                        {r.status !== "pending" && r.reviewer_name && (
                          <div className="px-4 py-3 bg-tactical-panel/10">
                            <p className="text-xs text-muted-foreground font-mono">
                              Рассмотрел: {r.reviewer_name}
                              {r.instructor_comment && ` · Комментарий: "${r.instructor_comment}"`}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Settings panel */
        <div className="space-y-6 animate-fade-in">
          <div className="bg-tactical-card border border-tactical-border/60 p-6 corner-mark space-y-4">
            <div className="flex items-center justify-between border-b border-tactical-border pb-3">
              <div>
                <h3 className="font-oswald text-sm tracking-widest uppercase text-foreground flex items-center gap-2">
                  <Icon name="Settings" size={16} className="text-primary" />
                  Управление системой повышения инструкторов
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Настройка баллов за активности и пороговых требований по званиям
                </p>
              </div>
              <button
                onClick={handleSaveConfig}
                disabled={saveConfigMutation.isPending || hasDuplicateNums}
                className="bg-primary text-primary-foreground font-oswald text-xs tracking-wider uppercase px-4 py-2 hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed corner-mark"
              >
                <Icon name="Save" size={14} />
                {saveConfigMutation.isPending ? "Сохранение..." : "Сохранить всё"}
              </button>
            </div>

            <div className="flex items-center gap-3 bg-tactical-panel/40 p-3 border border-tactical-border/30 rounded-sm">
              <label className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Редактируемое подразделение:</label>
              {isGlobalAdmin ? (
                <select
                  className="bg-tactical-card border border-tactical-border px-3 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary cursor-pointer rounded-sm"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  <option value="АВНГ">АВНГ (Академия)</option>
                  <option value="УВО">УВО (Вневедомственная Охрана)</option>
                  <option value="ОМОН">ОМОН</option>
                  <option value="СОБР">СОБР</option>
                  <option value="УСБ">УСБ</option>
                </select>
              ) : (
                <span className="font-ibm text-xs text-primary font-bold bg-tactical-panel border border-tactical-border px-3 py-1.5 rounded-sm">
                  {selectedUnit}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/80 font-mono">
                {isGlobalAdmin ? "(При редактировании настройки будут применены к выбранному отделу)" : "(Вы можете редактировать критерии только для своего отдела)"}
              </span>
            </div>

            {saveStatus?.error && (
              <div className="bg-red-950/20 border border-red-800 px-4 py-3 flex items-center gap-2 text-red-400 text-xs font-ibm">
                <Icon name="AlertTriangle" size={14} />
                <span>{saveStatus.error}</span>
              </div>
            )}

            {saveStatus?.success && (
              <div className="bg-green-950/20 border border-green-800 px-4 py-3 flex items-center gap-2 text-green-400 text-xs font-ibm">
                <Icon name="CheckCircle" size={14} />
                <span>Конфигурация успешно сохранена и применена!</span>
              </div>
            )}

            {hasDuplicateNums && (
              <div className="bg-yellow-950/20 border border-yellow-800 px-4 py-3 flex items-center gap-2 text-yellow-400 text-xs font-ibm">
                <Icon name="AlertTriangle" size={14} />
                <span>Внимание: Обнаружены дублирующиеся ID пунктов! Убедитесь, что ID каждого пункта уникален перед сохранением.</span>
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Points Configuration */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between border-b border-tactical-border/40 pb-2">
                  <h4 className="font-oswald text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Icon name="Medal" size={13} />
                    1. Активности и баллы
                  </h4>
                  <button
                    onClick={addPointConfig}
                    className="border border-tactical-border hover:border-primary text-foreground hover:text-primary transition-colors font-oswald text-[10px] tracking-wider uppercase px-2 py-1 flex items-center gap-1 bg-tactical-panel"
                  >
                    <Icon name="Plus" size={10} /> Добавить
                  </button>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {editPoints.map((p, idx) => {
                    const isDuplicate = editPoints.filter(ep => ep.num === p.num).length > 1;
                    return (
                      <div key={idx} className={`bg-tactical-panel border p-4 space-y-3 relative ${isDuplicate ? 'border-red-500/50 bg-red-950/5' : 'border-tactical-border/60'}`}>
                        <button
                          onClick={() => {
                            setEditPoints(prev => prev.filter((_, i) => i !== idx));
                          }}
                          title="Удалить активность"
                          className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>

                        <div className="grid grid-cols-12 gap-3 pr-6">
                          <div className="col-span-3 space-y-1">
                            <label className="text-[9px] uppercase font-mono text-muted-foreground">ID/Пункт</label>
                            <input
                              type="number"
                              value={p.num}
                              onChange={(e) => {
                                const updated = [...editPoints];
                                updated[idx].num = Number(e.target.value);
                                setEditPoints(updated);
                              }}
                              className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                            />
                          </div>

                          <div className="col-span-6 space-y-1">
                            <label className="text-[9px] uppercase font-mono text-muted-foreground">Название</label>
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) => {
                                const updated = [...editPoints];
                                updated[idx].name = e.target.value;
                                setEditPoints(updated);
                              }}
                              placeholder="Напр. Проведение лекции"
                              className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-ibm focus:outline-none focus:border-primary"
                            />
                          </div>

                          <div className="col-span-3 space-y-1">
                            <label className="text-[9px] uppercase font-mono text-muted-foreground">Баллы</label>
                            <input
                              type="number"
                              value={p.points}
                              onChange={(e) => {
                                const updated = [...editPoints];
                                updated[idx].points = Number(e.target.value);
                                setEditPoints(updated);
                              }}
                              className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-mono text-muted-foreground">Описание (необязательно)</label>
                          <input
                            type="text"
                            value={p.desc || ""}
                            onChange={(e) => {
                              const updated = [...editPoints];
                              updated[idx].desc = e.target.value;
                              setEditPoints(updated);
                            }}
                            placeholder="Описание требований к доказательствам"
                            className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-ibm focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div className="flex items-center gap-4 pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!!p.hasSubPoints}
                              onChange={(e) => {
                                const updated = [...editPoints];
                                updated[idx].hasSubPoints = e.target.checked;
                                if (!e.target.checked) {
                                  updated[idx].bonusPoints = 0;
                                  updated[idx].bonusLabel = "";
                                } else {
                                  updated[idx].bonusPoints = updated[idx].bonusPoints || 10;
                                  updated[idx].bonusLabel = updated[idx].bonusLabel || "Бонусные баллы";
                                }
                                setEditPoints(updated);
                              }}
                              className="rounded border-tactical-border bg-tactical-card text-primary focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                            />
                            <span className="text-[10px] font-ibm text-muted-foreground">Доп. баллы за успех</span>
                          </label>
                        </div>

                        {p.hasSubPoints && (
                          <div className="grid grid-cols-2 gap-3 pl-4 border-l border-tactical-border/60">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-mono text-muted-foreground">Название бонуса</label>
                              <input
                                type="text"
                                value={p.bonusLabel || ""}
                                onChange={(e) => {
                                  const updated = [...editPoints];
                                  updated[idx].bonusLabel = e.target.value;
                                  setEditPoints(updated);
                                }}
                                placeholder="Успешное выполнение"
                                className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-ibm focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-mono text-muted-foreground">Бонусные баллы</label>
                              <input
                                type="number"
                                value={p.bonusPoints || 0}
                                onChange={(e) => {
                                  const updated = [...editPoints];
                                  updated[idx].bonusPoints = Number(e.target.value);
                                  setEditPoints(updated);
                                }}
                                className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Ranks Flow Configuration */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between border-b border-tactical-border/40 pb-2">
                  <h4 className="font-oswald text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Icon name="Award" size={13} />
                    2. Требования по званиям
                  </h4>
                  <button
                    onClick={addRankFlow}
                    className="border border-tactical-border hover:border-primary text-foreground hover:text-primary transition-colors font-oswald text-[10px] tracking-wider uppercase px-2 py-1 flex items-center gap-1 bg-tactical-panel"
                  >
                    <Icon name="Plus" size={10} /> Добавить переход
                  </button>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {editRanks.map((flow, flowIdx) => (
                    <div key={flowIdx} className="bg-tactical-panel border border-tactical-border/60 p-4 space-y-4 relative">
                      <button
                        onClick={() => {
                          setEditRanks(prev => prev.filter((_, i) => i !== flowIdx));
                        }}
                        title="Удалить переход"
                        className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>

                      <div className="flex items-center gap-2 flex-wrap text-xs font-oswald uppercase tracking-wider text-primary border-b border-tactical-border/30 pb-1.5 pr-6">
                        <span>Переход {flowIdx + 1}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-4 space-y-1">
                          <label className="text-[9px] uppercase font-mono text-muted-foreground">С какого звания</label>
                          <select
                            value={flow.from}
                            onChange={(e) => {
                              const updated = [...editRanks];
                              updated[flowIdx].from = e.target.value;
                              setEditRanks(updated);
                            }}
                            className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-ibm focus:outline-none focus:border-primary"
                          >
                            {INSTRUCTOR_RANKS.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4 space-y-1">
                          <label className="text-[9px] uppercase font-mono text-muted-foreground">До какого звания</label>
                          <select
                            value={flow.to}
                            onChange={(e) => {
                              const updated = [...editRanks];
                              updated[flowIdx].to = e.target.value;
                              setEditRanks(updated);
                            }}
                            className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-ibm focus:outline-none focus:border-primary"
                          >
                            {INSTRUCTOR_RANKS.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4 space-y-1">
                          <label className="text-[9px] uppercase font-mono text-muted-foreground">Порог баллов</label>
                          <input
                            type="number"
                            value={flow.points}
                            onChange={(e) => {
                              const updated = [...editRanks];
                              updated[flowIdx].points = Number(e.target.value);
                              setEditRanks(updated);
                            }}
                            className="w-full bg-tactical-card border border-tactical-border px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      {/* Mandatory Conditions List */}
                      <div className="space-y-2.5 bg-tactical-card p-3 border border-tactical-border/40">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-mono text-muted-foreground">Обязательные активности:</span>
                          <button
                            onClick={() => addMandatory(flowIdx)}
                            className="text-[9px] uppercase font-mono text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Icon name="Plus" size={9} /> Добавить условие
                          </button>
                        </div>

                        {(!flow.mandatory || flow.mandatory.length === 0) ? (
                          <p className="text-[10px] text-muted-foreground font-ibm italic">Нет обязательных активностей для этого перехода</p>
                        ) : (
                          <div className="space-y-2">
                            {flow.mandatory.map((m: any, mIdx: number) => (
                              <div key={mIdx} className="bg-tactical-panel/40 p-3 border border-tactical-border/40 space-y-2 rounded-sm">
                                <div className="flex items-end gap-3">
                                  <div className="flex-1 min-w-0 space-y-1 text-left">
                                    <label className="text-[10px] uppercase font-mono text-muted-foreground block font-bold">Активность</label>
                                    <select
                                      value={m.num}
                                      onChange={(e) => {
                                        const updated = [...editRanks];
                                        updated[flowIdx].mandatory[mIdx].num = Number(e.target.value);
                                        const currentAlts = updated[flowIdx].mandatory[mIdx].allowedAlternatives || [];
                                        updated[flowIdx].mandatory[mIdx].allowedAlternatives = currentAlts.filter((n: number) => n !== Number(e.target.value));
                                        setEditRanks(updated);
                                      }}
                                      className="w-full bg-tactical-card border border-tactical-border px-2.5 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary cursor-pointer rounded-sm"
                                    >
                                      {editPoints.map(p => (
                                        <option key={p.num} value={p.num}>
                                          Пункт {p.num}. {p.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="w-24 space-y-1 flex-shrink-0 text-left">
                                    <label className="text-[10px] uppercase font-mono text-muted-foreground block font-bold">Кол-во (шт)</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={m.count}
                                      onChange={(e) => {
                                        const updated = [...editRanks];
                                        updated[flowIdx].mandatory[mIdx].count = Math.max(1, Number(e.target.value));
                                        setEditRanks(updated);
                                      }}
                                      className="w-full bg-tactical-card border border-tactical-border px-2 py-1.5 text-xs text-foreground font-mono font-bold text-center focus:outline-none focus:border-primary rounded-sm"
                                    />
                                  </div>

                                  <button
                                    onClick={() => deleteMandatory(flowIdx, mIdx)}
                                    title="Удалить обязательное условие"
                                    className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 p-2 border border-transparent hover:border-red-500/30 rounded transition-all flex-shrink-0 mb-0.5"
                                  >
                                    <Icon name="Trash2" size={14} />
                                  </button>
                                </div>

                                <div className="pl-4 border-l border-tactical-border/40 space-y-1">
                                  <span className="text-[9px] uppercase font-mono text-muted-foreground block">Разрешенные альтернативы:</span>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 max-h-[80px] overflow-y-auto bg-tactical-panel/40 p-2 border border-tactical-border/30 rounded-sm">
                                    {editPoints.map(p => {
                                      if (p.num === m.num) return null;
                                      const isAltChecked = m.allowedAlternatives?.includes(p.num);
                                      return (
                                        <label key={p.num} className="flex items-center gap-1.5 text-[10px] text-foreground select-none cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={!!isAltChecked}
                                            onChange={(e) => {
                                              const updated = [...editRanks];
                                              const currentAlts = updated[flowIdx].mandatory[mIdx].allowedAlternatives || [];
                                              if (e.target.checked) {
                                                updated[flowIdx].mandatory[mIdx].allowedAlternatives = [...currentAlts, p.num];
                                              } else {
                                                updated[flowIdx].mandatory[mIdx].allowedAlternatives = currentAlts.filter((num: number) => num !== p.num);
                                              }
                                              setEditRanks(updated);
                                            }}
                                            className="rounded border-tactical-border bg-tactical-card text-primary focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                                          />
                                          <span>Пункт {p.num}. {p.name}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-tactical-border/40">
              <button
                onClick={handleSaveConfig}
                disabled={saveConfigMutation.isPending || hasDuplicateNums}
                className="bg-primary text-primary-foreground font-oswald text-xs tracking-widest uppercase py-2.5 px-6 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed corner-mark"
              >
                <Icon name="Save" size={14} />
                {saveConfigMutation.isPending ? "Сохранение конфигурации..." : "Сохранить конфигурацию"}
              </button>
            </div>
          </div>

          {/* Warnings Management panel */}
          <div className="bg-tactical-card border border-tactical-border/60 p-6 corner-mark space-y-4 mt-6">
            <h3 className="font-oswald text-sm tracking-widest uppercase text-foreground border-b border-tactical-border pb-3 flex items-center gap-2">
              <Icon name="AlertTriangle" size={16} className="text-red-500" />
              Дисциплинарные выговоры инструкторов
            </h3>
            
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Issue Warning Form */}
              <div className="lg:col-span-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-muted-foreground block font-bold">Выбор инструктора</label>
                  <select
                    value={warningTargetUserId}
                    onChange={(e) => setWarningTargetUserId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-xs text-foreground font-ibm focus:outline-none focus:border-primary cursor-pointer rounded-sm"
                  >
                    <option value="">-- Выберите инструктора --</option>
                    {instructors
                      .filter(i => i.id !== authUser.id)
                      .map(i => (
                        <option key={i.id} value={i.id}>
                          [{fmtStaticId(i.static_id)}] {i.name} ({i.rank})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-muted-foreground block font-bold">Причина выговора</label>
                  <textarea
                    rows={3}
                    placeholder="Укажите причину дисциплинарного взыскания..."
                    value={warningReason}
                    onChange={(e) => setWarningReason(e.target.value)}
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-xs text-foreground font-ibm focus:outline-none focus:border-primary rounded-sm resize-none"
                  />
                </div>

                <button
                  onClick={handleIssueWarning}
                  disabled={warningIssueLoading || !warningTargetUserId || !warningReason.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-oswald text-xs tracking-wider uppercase py-2.5 px-4 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed corner-mark"
                >
                  <Icon name="AlertOctagon" size={14} />
                  {warningIssueLoading ? "Выдача выговора..." : "Выдать выговор"}
                </button>
              </div>

              {/* Right Column: Instructor Warnings List */}
              <div className="lg:col-span-7 space-y-3 text-left">
                <span className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">
                  История выговоров выбранного инструктора:
                </span>
                
                {!warningTargetUserId ? (
                  <div className="text-center p-8 border border-dashed border-tactical-border/40 text-muted-foreground bg-tactical-panel/10 rounded-sm">
                    <p className="text-xs font-ibm">Выберите инструктора в левой колонке для просмотра истории выговоров.</p>
                  </div>
                ) : warningsLoading ? (
                  <div className="py-8 flex justify-center">
                    <Icon name="Loader2" size={24} className="text-primary animate-spin" />
                  </div>
                ) : warningsList.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-tactical-border/40 text-muted-foreground bg-tactical-panel/10 rounded-sm">
                    <p className="text-xs font-ibm">У данного инструктора нет зарегистрированных выговоров.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {warningsList.map((w) => (
                      <div
                        key={w.id}
                        className={`p-3 border rounded-sm font-mono text-xs flex justify-between items-start gap-4 transition-all ${
                          w.is_active
                            ? "bg-red-950/20 border-red-800/60 shadow-[0_0_8px_rgba(239,68,68,0.05)]"
                            : "bg-tactical-panel/40 border-tactical-border/40 opacity-70"
                        }`}
                      >
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-[9px] uppercase font-bold rounded-sm border ${
                              w.is_active
                                ? "bg-red-950/80 text-red-400 border-red-800/50"
                                : "bg-zinc-900 text-zinc-400 border-zinc-700/50"
                            }`}>
                              {w.is_active ? "Активен" : "Снят"}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">{w.id} · {fmt(w.created_at)}</span>
                          </div>
                          <p className="text-foreground font-ibm font-medium pt-1 text-[12px]">
                            {w.reason}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-ibm">
                            Выдал: <span className="text-zinc-300 font-semibold">{w.issued_by_name}</span>
                          </p>
                        </div>
                        
                        {w.is_active && (
                          <button
                            onClick={() => handleDismissWarning(w.id)}
                            disabled={!!warningDismissLoading[w.id]}
                            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-[10px] font-oswald tracking-wide uppercase px-2.5 py-1.5 transition-colors disabled:opacity-40 flex items-center gap-1 rounded-sm flex-shrink-0"
                          >
                            <Icon name="Check" size={10} />
                            {warningDismissLoading[w.id] ? "Снятие..." : "Снять выговор"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Proof Gallery Modal */}
      {galleryImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col justify-between p-6 animate-fade-in"
          onClick={() => setGalleryImages([])}
        >
          {/* Header */}
          <div className="flex items-center justify-between text-white">
            <span className="font-mono text-zinc-400 text-xs">
              Доказательства · {galleryIndex + 1} из {galleryImages.length}
            </span>
            <button
              onClick={() => setGalleryImages([])}
              className="text-zinc-400 hover:text-white transition-colors p-2 bg-zinc-900/60 border border-zinc-800 rounded hover:border-zinc-700"
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex items-center justify-between gap-4 max-w-7xl mx-auto w-full relative">
            {/* Left Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGalleryIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
              }}
              className="w-10 h-10 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600 text-white rounded flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Icon name="ChevronLeft" size={20} />
            </button>

            {/* Active Image */}
            <div
              className="flex-1 flex items-center justify-center p-4 max-h-[70vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={galleryImages[galleryIndex]}
                alt={`Evidence screenshot ${galleryIndex + 1}`}
                className="max-w-full max-h-[70vh] object-contain shadow-2xl border border-zinc-800 rounded-sm"
              />
            </div>

            {/* Right Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGalleryIndex(prev => (prev + 1) % galleryImages.length);
              }}
              className="w-10 h-10 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600 text-white rounded flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Icon name="ChevronRight" size={20} />
            </button>
          </div>

          {/* Thumbnails list below */}
          <div
            className="flex justify-center items-center gap-2 overflow-x-auto py-3 max-w-3xl mx-auto w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setGalleryIndex(idx)}
                className={`w-14 h-10 border rounded-sm overflow-hidden flex-shrink-0 transition-all ${
                  idx === galleryIndex
                    ? "border-primary scale-110 ring-1 ring-primary"
                    : "border-zinc-700 opacity-60 hover:opacity-100 hover:scale-105"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Reject Modal */}
      {isRejectModalOpen && rejectTargetReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-tactical-dark border border-tactical-border max-w-md w-full p-5 space-y-4 shadow-[0_0_32px_rgba(239,68,68,0.15)] corner-mark relative animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-oswald text-base text-red-500 uppercase tracking-wider flex items-center gap-2">
              <Icon name="AlertTriangle" size={18} /> Отклонение рапорта
            </h3>
            
            <p className="text-xs font-ibm text-muted-foreground leading-relaxed">
              Укажите причину отклонения рапорта для{" "}
              <span className="text-foreground font-semibold">
                {rejectTargetReport.instructor_name}
              </span>. Эта информация будет записана в историю рапорта и отправлена в Discord.
            </p>

            <textarea
              className="w-full h-24 bg-tactical-panel border border-tactical-border px-3 py-2 text-xs text-foreground font-ibm focus:outline-none focus:border-red-500 transition-colors placeholder:text-muted-foreground/50 resize-none rounded-sm"
              placeholder="Введите причину отклонения (обязательно)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectTargetReport(null);
                  setRejectReason("");
                }}
                className="rank-badge text-muted-foreground border border-tactical-border px-3 py-1.5 hover:bg-tactical-panel transition-colors text-xs"
              >
                Отмена
              </button>
              <button
                disabled={!rejectReason.trim()}
                onClick={handleConfirmReject}
                className="rank-badge bg-red-950/40 text-red-400 border border-red-800 px-4 py-1.5 hover:bg-red-900/30 transition-colors disabled:opacity-50 text-xs font-semibold"
              >
                Подтвердить отклонение
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type PromotionCheckResultsMap = Record<number, PromotionCheckResult>;
type NumberBooleanMap = Record<number, boolean>;
type NumberStringMap = Record<number, string>;

export function PromotionInstructorTab({
  highlightReportId,
  onReviewSuccess,
  authUser,
}: {
  highlightReportId?: number;
  onReviewSuccess?: () => void;
  authUser?: User;
}) {
  const [reports, setReports] = useState<PromotionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(() => {
    if (highlightReportId) return highlightReportId;
    const params = new URLSearchParams(window.location.search);
    const reportIdParam = params.get("reportId");
    return reportIdParam ? Number(reportIdParam) : null;
  });

  useEffect(() => {
    if (highlightReportId) {
      setExpandedId(highlightReportId);
    }
  }, [highlightReportId]);
  const [checkResults, setCheckResults] = useState<PromotionCheckResultsMap>({});
  const [checkLoading, setCheckLoading] = useState<NumberBooleanMap>({});
  const [reviewComment, setReviewComment] = useState<NumberStringMap>({});
  const [reviewLoading, setReviewLoading] = useState<NumberBooleanMap>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedPromoDate, setSelectedPromoDate] = useState<string>(() => new Date().toLocaleDateString("ru-RU"));
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetReport, setRejectTargetReport] = useState<PromotionReport | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    const r = await fetchPromotionReports().catch(() => []);
    setReports(r);
    setLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  // Auto-load checks for expandedId from URL on mount
  useEffect(() => {
    if (expandedId && reports.length > 0 && !checkResults[expandedId]) {
      const rep = reports.find((r) => r.id === expandedId);
      if (rep) {
        setCheckLoading((prev) => ({ ...prev, [expandedId]: true }));
        checkPromotionRequirements(rep.promotion_type, rep.cadet_id)
          .then((res) => {
            setCheckResults((prev) => ({ ...prev, [expandedId]: res }));
          })
          .catch(() => {})
          .finally(() => {
            setCheckLoading((prev) => ({ ...prev, [expandedId]: false }));
          });
      }
    }
  }, [expandedId, reports, checkResults]);

  const handleExpand = async (report: PromotionReport) => {
    if (expandedId === report.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(report.id);
    if (!checkResults[report.id]) {
      setCheckLoading((prev) => ({ ...prev, [report.id]: true }));
      try {
        const result = await checkPromotionRequirements(report.promotion_type, report.cadet_id);
        setCheckResults((prev) => ({ ...prev, [report.id]: result }));
      } catch {
        // silent fail
      }
      setCheckLoading((prev) => ({ ...prev, [report.id]: false }));
    }
  };

  const handleReview = async (report: PromotionReport, status: "approved" | "rejected") => {
    setReviewLoading((prev) => ({ ...prev, [report.id]: true }));
    try {
      await reviewPromotionReport(report.id, status, reviewComment[report.id] || "");
      
      sendPromotionReviewedDiscord({
        name: report.cadet_name,
        staticId: report.cadet_static_id,
        promotionType: report.promotion_type,
        status,
        comment: reviewComment[report.id] || "",
        reportId: report.id,
        cadetDiscordId: report.cadet_discord_id || undefined,
      }).catch((err) => console.error("Discord error:", err));

      await loadReports();
      setExpandedId(null);
      if (onReviewSuccess) {
        onReviewSuccess();
      }
    } catch {
      // silent fail
    }
    setReviewLoading((prev) => ({ ...prev, [report.id]: false }));
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetReport || !rejectReason.trim()) return;
    setReviewComment(prev => ({ ...prev, [rejectTargetReport.id]: rejectReason }));
    setIsRejectModalOpen(false);
    await handleReview(rejectTargetReport, "rejected");
    setRejectTargetReport(null);
    setRejectReason("");
  };

  const promoDates = useMemo(() => {
    const dates = new Set<string>();
    dates.add(new Date().toLocaleDateString("ru-RU")); // always include today
    reports.forEach((r) => {
      if (r.created_at) {
        dates.add(new Date(r.created_at).toLocaleDateString("ru-RU"));
      }
    });
    return Array.from(dates).sort((a, b) => {
      if (a === "Не указана") return 1;
      if (b === "Не указана") return -1;
      const [dayA, monthA, yearA] = a.split(".").map(Number);
      const [dayB, monthB, yearB] = b.split(".").map(Number);
      const timeA = new Date(yearA, monthA - 1, dayA).getTime();
      const timeB = new Date(yearB, monthB - 1, dayB).getTime();
      return timeB - timeA;
    });
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        if (selectedPromoDate !== "all") {
          const dateStr = new Date(r.created_at).toLocaleDateString("ru-RU");
          if (dateStr !== selectedPromoDate) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reports, filterStatus, selectedPromoDate]);

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground font-ibm">
          {pendingCount > 0
            ? `${pendingCount} рапорт(ов) ожидают рассмотрения`
            : "Нет рапортов на рассмотрении"}
        </p>
        <div className="flex gap-2">
          <select
            className="bg-tactical-panel border border-tactical-border px-3 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary cursor-pointer transition-colors"
            value={selectedPromoDate}
            onChange={(e) => setSelectedPromoDate(e.target.value)}
          >
            <option value="all">Все даты</option>
            {promoDates.map((d) => (
              <option key={d} value={d}>
                {d} {d === new Date().toLocaleDateString("ru-RU") ? " (Сегодня)" : ""}
              </option>
            ))}
          </select>
          <select
            className="bg-tactical-panel border border-tactical-border px-3 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="pending">На рассмотрении</option>
            <option value="approved">Одобренные</option>
            <option value="rejected">Отклонённые</option>
            <option value="all">Все</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : reports.length === 0 ? (
        <Empty text="Нет рапортов на повышение" />
      ) : filteredReports.length === 0 ? (
        <Empty text={`Нет рапортов на ${selectedPromoDate === new Date().toLocaleDateString("ru-RU") ? "сегодня" : `дату ${selectedPromoDate}`}`} />
      ) : (
        <div className="space-y-3">
          {filteredReports.map((r) => {
            const isExpanded = expandedId === r.id;
            const check = checkResults[r.id];
            const isLoading = checkLoading[r.id];

             return (
              <div
                key={r.id}
                className={`bg-green-950/20 border transition-colors ${
                  isExpanded ? "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]" : "border-green-500/30 hover:border-green-500/60"
                }`}
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer flex items-start justify-between gap-3"
                  onClick={() => handleExpand(r)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-950 border border-green-500 text-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon name="Medal" size={14} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-ibm text-sm font-medium text-green-200">
                          {r.cadet_rank} {r.cadet_name}
                        </h4>
                        <span className="rank-badge text-green-400 border border-green-800 bg-green-950/40 px-1.5 py-0.5">
                          → {PROMOTION_LABELS[r.promotion_type]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        ID: {r.cadet_static_id} · {fmt(r.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <Icon
                      name={isExpanded ? "ChevronUp" : "ChevronDown"}
                      size={14}
                      className="text-muted-foreground"
                    />
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-tactical-border animate-fade-in">
                    {isLoading ? (
                      <div className="p-4"><Spinner /></div>
                    ) : check ? (
                      <div className="divide-y divide-tactical-border">
                        {/* Military Report Document */}
                        <div className="p-4 bg-tactical-panel/30 border-b border-tactical-border space-y-2">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-oswald text-xs tracking-widest uppercase text-muted-foreground">
                              Документ рапорта
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const reportLink = `${window.location.origin}/?tab=promotions&reportId=${r.id}`;
                                navigator.clipboard.writeText(reportLink);
                                alert("Ссылка на рапорт скопирована!");
                              }}
                              className="text-[10px] text-primary hover:underline font-mono uppercase tracking-wider flex items-center gap-1"
                            >
                              <Icon name="Copy" size={10} />
                              Скопировать ссылку для Discord
                            </button>
                          </div>
                          <MilitaryReport
                            cadetName={r.cadet_name}
                            cadetStaticId={r.cadet_static_id}
                            cadetRank={r.cadet_rank}
                            promotionType={r.promotion_type}
                            date={new Date(r.created_at).toLocaleDateString("ru-RU")}
                          />
                        </div>
                        {/* Compact checklist */}
                        {Object.entries(
                          check.items.reduce((acc, item) => {
                            if (!acc[item.category]) acc[item.category] = [];
                            acc[item.category].push(item);
                            return acc;
                          }, {} as Record<string, typeof check.items>)
                        ).map(([category, items]) => (
                          <div key={category} className="px-4 py-3">
                            <p className="font-oswald text-xs tracking-widest uppercase text-muted-foreground mb-2">
                              {category}
                            </p>
                            <div className="space-y-1.5">
                              {items.map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <Icon
                                    name={item.completed ? "CheckSquare" : "Square"}
                                    size={14}
                                    className={item.completed ? "text-green-400" : "text-muted-foreground/40"}
                                  />
                                  <span
                                    className={`text-xs font-ibm ${
                                      item.completed ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                  {item.completed && item.grade && (
                                    <span className="text-[10px] rank-badge text-green-400 border border-green-800 px-1.5 py-0.5 ml-auto">
                                      {item.grade >= 3 ? "Зачтено" : "Не зачтено"}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Progress summary */}
                        <div className="px-4 py-3 bg-tactical-panel">
                          <span className="text-xs font-mono text-muted-foreground">
                            Выполнено: {check.completed_count}/{check.total_count}
                            {check.all_completed && (
                              <span className="text-green-400 ml-2">✓ Все требования выполнены</span>
                            )}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {/* Review actions */}
                    {r.status === "pending" && (
                      <div className="p-4 border-t border-tactical-border space-y-2">
                        {authUser && r.cadet_id === authUser.id ? (
                          <p className="text-xs text-yellow-500 font-ibm italic">
                            Вы не можете рассмотреть собственный рапорт. Дождитесь проверки другим членом руководства.
                          </p>
                        ) : (
                          <>
                            <input
                              className="w-full bg-tactical-panel border border-tactical-border px-3 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary transition-colors"
                              placeholder="Комментарий инструктора (необязательно)..."
                              value={reviewComment[r.id] || ""}
                              onChange={(e) =>
                                setReviewComment((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                disabled={reviewLoading[r.id]}
                                onClick={() => handleReview(r, "approved")}
                                className="rank-badge text-green-400 border border-green-800 px-3 py-1 hover:bg-green-900/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                <Icon name="Check" size={12} />Одобрить и повысить
                              </button>
                              <button
                                disabled={reviewLoading[r.id]}
                                onClick={() => {
                                  setRejectTargetReport(r);
                                  setRejectReason("");
                                  setIsRejectModalOpen(true);
                                }}
                                className="rank-badge text-red-400 border border-red-800 px-3 py-1 hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                <Icon name="X" size={12} />Отклонить
                              </button>
                              {reviewLoading[r.id] && (
                                <Icon name="Loader2" size={14} className="text-primary animate-spin" />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Already reviewed */}
                    {r.status !== "pending" && r.reviewer_name && (
                      <div className="px-4 py-3 border-t border-tactical-border">
                        <p className="text-xs text-muted-foreground font-mono">
                          Рассмотрел: {r.reviewer_name}
                          {r.instructor_comment && ` · "${r.instructor_comment}"`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Reject Modal */}
      {isRejectModalOpen && rejectTargetReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-tactical-dark border border-tactical-border max-w-md w-full p-5 space-y-4 shadow-[0_0_32px_rgba(239,68,68,0.15)] corner-mark relative animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-oswald text-base text-red-500 uppercase tracking-wider flex items-center gap-2">
              <Icon name="AlertTriangle" size={18} /> Отклонение рапорта
            </h3>
            
            <p className="text-xs font-ibm text-muted-foreground leading-relaxed">
              Укажите причину отклонения рапорта для{" "}
              <span className="text-foreground font-semibold">
                {rejectTargetReport.cadet_name}
              </span>. Эта информация будет записана в историю рапорта и отправлена в Discord.
            </p>

            <textarea
              className="w-full h-24 bg-tactical-panel border border-tactical-border px-3 py-2 text-xs text-foreground font-ibm focus:outline-none focus:border-red-500 transition-colors placeholder:text-muted-foreground/50 resize-none rounded-sm"
              placeholder="Введите причину отклонения (обязательно)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectTargetReport(null);
                  setRejectReason("");
                }}
                className="rank-badge text-muted-foreground border border-tactical-border px-3 py-1.5 hover:bg-tactical-panel transition-colors text-xs"
              >
                Отмена
              </button>
              <button
                disabled={!rejectReason.trim()}
                onClick={handleConfirmReject}
                className="rank-badge bg-red-950/40 text-red-400 border border-red-800 px-4 py-1.5 hover:bg-red-900/30 transition-colors disabled:opacity-50 text-xs font-semibold"
              >
                Подтвердить отклонение
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
