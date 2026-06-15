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
} from "@/lib/api";
import { fmt, Spinner, Empty, fmtStaticId } from "./SectionsShared";

const PROMOTION_LABELS: Record<PromotionType, string> = {
  junior_sergeant: "Мл. Сержант",
  sergeant: "Сержант",
};

export function MilitaryReport({
  cadetName,
  cadetStaticId,
  cadetRank,
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
  const targetRank = isSergeant ? "Сержант" : "Младший Сержант";

  return (
    <div className="bg-white border border-gray-200 text-black p-6 font-mono text-[11px] space-y-4 max-w-2xl mx-auto shadow-[0_4px_12px_rgba(0,0,0,0.15)] leading-relaxed select-all">
      {/* Top Header */}
      <div className="text-center font-bold pb-2 space-y-0.5 uppercase tracking-wide text-black">
        <p>ФЕДЕРАЛЬНАЯ СЛУЖБА ВОЙСК НАЦИОНАЛЬНОЙ ГВАРДИИ</p>
        <p>РОССИЙСКОЙ ФЕДЕРАЦИИ (ФСВНГ России)</p>
        <p>Академия Войск Национальной Гвардии (АВНГ)</p>
      </div>

      {/* Addressed To (Right aligned) */}
      <div className="flex justify-end pt-2">
        <div className="text-left space-y-0.5 max-w-md text-black">
          <p className="font-semibold">Начальнику Академии Войск Национальной Гвардии</p>
          <p>подполковнику — Нач.АВНГ | Артем Панарин</p>
          <p className="text-gray-500 pt-1">Копия:</p>
          <p>Заместителю начальника АВНГ — Зам.Нач.АВНГ | Данила Моралис</p>
          <p>Заместителю начальника АВНГ — Зам.Нач.АВНГ | Илья Росса</p>
          <p>Заместителю начальника АВНГ — Зам.Нач.АВНГ | Иван Андрейченко</p>
        </div>
      </div>

      {/* From Cadet */}
      <div className="space-y-0.5 pt-4 text-black border-t border-gray-200">
        <p><span className="text-gray-500">От курсанта:</span> {cadetName}</p>
        <p><span className="text-gray-500">Табельный номер:</span> {fmtStaticId(cadetStaticId)}</p>
        <p><span className="text-gray-500">Звание:</span> {currentRank}</p>
      </div>

      {/* Title */}
      <div className="text-center font-bold text-sm tracking-widest pt-4 uppercase text-black">
        РАПОРТ
      </div>

      {/* Content */}
      <div className="space-y-4 text-black">
        <p className="indent-8">
          Прошу Вашего ходатайства перед вышестоящим командованием
          о присвоении мне очередного воинского звания «{targetRank}».
        </p>
        <p className="font-semibold">К рапорту прилагаю:</p>
        {isSergeant ? (
          <ul className="space-y-2 pl-4">
            <li>• Отчёт о патрулировании прилегающей территорий;</li>
            <li>• Наряд на КПП-1;</li>
            <li>• Наряд на КПП-2 (Внутренний пост);</li>
            <li>• Участие в государственной поставке в количестве 4-ёх шт. В сопровождение инструктора АВНГ | СС;</li>
            <li>• Принять участие в досмотровых мероприятиях на двух собеседованиях.</li>
            <li>• Отчёт о прослушанных лекциях "УК, ПК, КоАП";</li>
            <li>• Лекция: О ФЗ закрытых территорий</li>
            <li>• Отчёт о прохождений практического экзамена "Штраф, Задержание, Арест";</li>
            <li>• Отчёт о сдаче тестов УК/ПК/КоАП;</li>
          </ul>
        ) : (
          <ul className="space-y-2 pl-4">
            <li>• Вступительная лекция;</li>
            <li>• Лекция ФЗ о ФСВНГ и Уставу;</li>
            <li>• Строевая подготовка;</li>
            <li>• Физическая подготовка (нормативы);</li>
            <li>• Тренировка по оружию;</li>
            <li>• Присяга;</li>
            <li>• Вышка — 30 мин (доклад каждые 10 мин);</li>
            <li>• Патруль по территории — 30 мин (доклад каждые 10 мин);</li>
            <li>• Заполнение личного дела;</li>
            <li>• Экзамен: Устав ФСВНГ и ФЗ о ФСВНГ;</li>
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-6 font-mono text-xs text-black border-t border-gray-200">
        <p><span className="text-gray-500">Дата:</span> {date}</p>
        <p>
          <span className="text-gray-500">Подпись:</span>{" "}
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
export function PromotionSection({ authUser }: { authUser: User }) {
  const [selected, setSelected] = useState<PromotionType | null>(null);
  const [checkResult, setCheckResult] = useState<PromotionCheckResult | null>(null);
  const [reports, setReports] = useState<PromotionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submittedReportLink, setSubmittedReportLink] = useState("");

  const isInstructor = authUser.role === "instructor" || authUser.role === "head_avng";

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
            return (
              <button
                key={type}
                onClick={() => !isInstructor && handleSelect(type)}
                disabled={isInstructor}
                className={`corner-mark bg-tactical-card border p-6 text-left transition-all group ${
                  isSelected
                    ? "border-primary card-glow"
                    : "border-tactical-border hover:border-primary/40"
                } ${isInstructor ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary/20 border-primary"
                        : "bg-primary/10 border-primary/20 group-hover:bg-primary/15"
                    }`}
                  >
                    <Icon name="Medal" size={28} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-oswald text-lg tracking-wide text-foreground">
                      {PROMOTION_LABELS[type]}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Рапорт на повышение в звании
                    </p>
                    {hasPending && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-yellow-400 font-mono">
                        <Icon name="Clock" size={11} /> На рассмотрении
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-primary font-mono">
                  <Icon name={isSelected ? "ChevronUp" : "ChevronDown"} size={12} />
                  {isSelected ? "Скрыть требования" : "Показать требования"}
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
                            {item.type === "lecture" ? "Лекция" : item.type === "practice" ? "Практика" : "Экзамен"}
                            {item.completed && item.grade && ` · Оценка: ${item.grade}`}
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
                className="bg-tactical-card border border-tactical-border p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon name="Medal" size={14} className="text-primary" />
                    </div>
                    <div>
                      <h4 className="font-ibm text-sm font-medium text-foreground">
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

export function PromotionInstructorTab({
  highlightReportId,
  onReviewSuccess,
}: {
  highlightReportId?: number;
  onReviewSuccess?: () => void;
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
  const [checkResults, setCheckResults] = useState<Record<number, PromotionCheckResult>>({});
  const [checkLoading, setCheckLoading] = useState<Record<number, boolean>>({});
  const [reviewComment, setReviewComment] = useState<Record<number, string>>({});
  const [reviewLoading, setReviewLoading] = useState<Record<number, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedPromoDate, setSelectedPromoDate] = useState<string>(() => new Date().toLocaleDateString("ru-RU"));

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

  const handleReview = async (id: number, status: "approved" | "rejected") => {
    setReviewLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await reviewPromotionReport(id, status, reviewComment[id] || "");
      await loadReports();
      setExpandedId(null);
      if (onReviewSuccess) {
        onReviewSuccess();
      }
    } catch {
      // silent fail
    }
    setReviewLoading((prev) => ({ ...prev, [id]: false }));
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
                className={`bg-tactical-card border transition-colors ${
                  isExpanded ? "border-primary" : "border-tactical-border hover:border-primary/30"
                }`}
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer flex items-start justify-between gap-3"
                  onClick={() => handleExpand(r)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon name="Medal" size={14} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-ibm text-sm font-medium text-foreground">
                          {r.cadet_rank} {r.cadet_name}
                        </h4>
                        <span className="rank-badge text-muted-foreground bg-tactical-panel px-1.5 py-0.5">
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
                                    <span className="text-xs font-mono text-green-400 ml-auto">
                                      {item.grade}
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
                            onClick={() => handleReview(r.id, "approved")}
                            className="rank-badge text-green-400 border border-green-800 px-3 py-1 hover:bg-green-900/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <Icon name="Check" size={12} />Одобрить и повысить
                          </button>
                          <button
                            disabled={reviewLoading[r.id]}
                            onClick={() => handleReview(r.id, "rejected")}
                            className="rank-badge text-red-400 border border-red-800 px-3 py-1 hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <Icon name="X" size={12} />Отклонить
                          </button>
                          {reviewLoading[r.id] && (
                            <Icon name="Loader2" size={14} className="text-primary animate-spin" />
                          )}
                        </div>
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
    </div>
  );
}
