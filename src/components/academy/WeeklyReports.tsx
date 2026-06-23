import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import {
  fetchWeeklyReports,
  submitWeeklyReport,
  reviewWeeklyReport,
  getWeeklyReportsAutoFill,
  fetchWeeklyReportsSettings,
  saveWeeklyReportsSettings,
  WeeklyReport,
  WeeklyReportItem,
  User,
  ActivityDef,
} from "@/lib/api";
import { SectionHeader, StatusBadge } from "./UIComponents";
import { Spinner, Empty } from "./SectionsShared";

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

function getAvailableWeeks() {
  const weeks = [];
  const now = new Date();
  
  // Find current Monday in local time without mutating now
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const currentMonday = new Date(now.getFullYear(), now.getMonth(), diff);

  for (let i = 0; i < 5; i++) {
    const monday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - i * 7);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    
    const formattedMonday = monday.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const formattedSunday = sunday.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
    
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const date = String(monday.getDate()).padStart(2, '0');
    const value = `${year}-${month}-${date}`;
    
    weeks.push({
      value,
      label: `${formattedMonday} — ${formattedSunday} (${i === 0 ? "Текущая неделя" : i === 1 ? "Предыдущая неделя" : "Прошлая неделя"})`,
    });
  }
  return weeks;
}

function getBonusThreshold(role: string): number {
  if (["chief_instructor", "deputy_head", "head_avng", "senior_ufsvng"].includes(role)) {
    return 400; // Старший состав
  }
  return 300; // Рядовой состав
}

function isAutomatedActivity(act: ActivityDef): boolean {
  const labelLower = act.label.toLowerCase();
  return (
    labelLower.includes("экзамен") ||
    labelLower.includes("аттестац") ||
    labelLower.includes("присяг") ||
    labelLower.includes("практик") ||
    (labelLower.includes("лекц") && !labelLower.includes("экскурси") && !labelLower.includes("мероприяти")) ||
    (labelLower.includes("рапорт") && labelLower.includes("повышен"))
  );
}

export function WeeklyReports({ authUser }: { authUser: User }) {
  const [activeTab, setActiveTab] = useState<"submit" | "history" | "review" | "settings">("submit");
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic activities list loaded from DB
  const [activities, setActivities] = useState<ActivityDef[]>(DEFAULT_ACTIVITIES);

  // Form state
  const weeks = getAvailableWeeks();
  const [selectedWeek, setSelectedWeek] = useState(weeks[0].value);
  const [formItems, setFormItems] = useState<Record<string, { count: number; links: string[] }>>(() => {
    const initial: Record<string, { count: number; links: string[] }> = {};
    DEFAULT_ACTIVITIES.forEach(act => {
      initial[act.key] = { count: 0, links: [] };
    });
    return initial;
  });

  const [autoFilling, setAutoFilling] = useState(false);
  const prevWeekRef = useRef(selectedWeek);

  const handleAutoFill = async (options?: { silent?: boolean; resetManual?: boolean } | any) => {
    const isEvent = options && (options.nativeEvent || options.preventDefault);
    const silent = isEvent ? false : (options === true || options?.silent === true);
    const resetManual = isEvent ? false : (options?.resetManual === true);
    setAutoFilling(true);
    try {
      const data = await getWeeklyReportsAutoFill(selectedWeek);
      const counts = data.counts as Record<string, number>;
      
      let hasData = false;
      const nextFormItems: Record<string, { count: number; links: string[] }> = {};
      const autoKeys = Object.keys(counts);

      activities.forEach(act => {
        if (autoKeys.includes(act.key)) {
          const count = counts[act.key] !== undefined ? counts[act.key] : 0;
          if (count > 0) {
            hasData = true;
          }
          nextFormItems[act.key] = { count, links: Array(count).fill("") };
        } else {
          nextFormItems[act.key] = resetManual ? { count: 0, links: [] } : (formItems[act.key] || { count: 0, links: [] });
        }
      });

      setFormItems(nextFormItems);
      
      if (hasData && !silent) {
        toast.success("Данные успешно импортированы! Пожалуйста, добавьте ссылки-доказательства для всех выполненных заданий.");
      }
    } catch (err: any) {
      if (!silent) {
        toast.error("Не удалось подтянуть данные: " + err.message);
      }
    } finally {
      setAutoFilling(false);
    }
  };

  // Review state
  const [selectedReportForReview, setSelectedReportForReview] = useState<WeeklyReport | null>(null);
  const [reviewerComment, setReviewerComment] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [editedItems, setEditedItems] = useState<Record<string, WeeklyReportItem>>({});

  useEffect(() => {
    if (selectedReportForReview) {
      const itemsClone: Record<string, WeeklyReportItem> = {};
      activities.forEach(act => {
        const item = selectedReportForReview.items[act.key];
        itemsClone[act.key] = {
          count: item ? (item.count || 0) : 0,
          links: item ? [...(item.links || [])] : []
        };
      });
      // Copy any other items that might not exist in current activities list (e.g. deleted activities)
      Object.entries(selectedReportForReview.items).forEach(([key, item]) => {
        if (!itemsClone[key]) {
          itemsClone[key] = {
            count: item.count || 0,
            links: [...(item.links || [])]
          };
        }
      });
      setEditedItems(itemsClone);
    } else {
      setEditedItems({});
    }
  }, [selectedReportForReview, activities]);

  const handleReviewCountChange = (key: string, val: number) => {
    setEditedItems(prev => {
      const current = prev[key] || { count: 0, links: [] };
      const newCount = Math.max(0, current.count + val);
      const newLinks = [...current.links];
      
      if (newCount > current.count) {
        for (let i = current.count; i < newCount; i++) {
          newLinks.push("");
        }
      } else if (newCount < current.count) {
        newLinks.splice(newCount);
      }
      
      return {
        ...prev,
        [key]: { count: newCount, links: newLinks }
      };
    });
  };

  const handleReviewLinkChange = (key: string, index: number, val: string) => {
    setEditedItems(prev => {
      const current = prev[key];
      if (!current) return prev;
      const newLinks = [...current.links];
      newLinks[index] = val;
      return {
        ...prev,
        [key]: { ...current, links: newLinks }
      };
    });
  };

  const [savingSettings, setSavingSettings] = useState(false);
  const isHeadAvng = authUser.role === "head_avng";
  const canReviewReports = authUser.role === "head_avng" || authUser.role === "senior_ufsvng";

  // Dynamic Settings Modifiers
  const handleActivityLabelChange = (index: number, label: string) => {
    setActivities(prev => {
      const next = [...prev];
      next[index] = { ...next[index], label };
      return next;
    });
  };

  const handleActivityPointChange = (index: number, points: number) => {
    setActivities(prev => {
      const next = [...prev];
      next[index] = { ...next[index], points: Math.max(0, points) };
      return next;
    });
  };

  const handleActivityIsAdditionalChange = (index: number, isAdditional: boolean) => {
    setActivities(prev => {
      const next = [...prev];
      next[index] = { ...next[index], isAdditional };
      return next;
    });
  };

  const handleAddActivity = () => {
    setActivities(prev => [
      ...prev,
      {
        key: `custom_${Date.now()}`,
        label: "Новое задание",
        points: 10,
        isAdditional: false
      }
    ]);
  };

  const handleDeleteActivity = (index: number) => {
    setActivities(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await saveWeeklyReportsSettings(activities);
      toast.success("Настройки успешно сохранены!");
    } catch (err: any) {
      toast.error("Не удалось сохранить настройки: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const data = await fetchWeeklyReports();
      setReports(data);
    } catch (err: any) {
      toast.error("Не удалось загрузить отчёты: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetchWeeklyReportsSettings();
      if (res && res.activities) {
        setActivities(res.activities);
      }
    } catch (err: any) {
      console.error("Failed to fetch weekly report settings:", err);
    }
  };

  useEffect(() => {
    fetchReportsData();
    fetchSettings();
  }, []);

  // Automatically pull weekly report data when week, tab, or activities list changes
  useEffect(() => {
    if (activeTab !== "submit" || activities.length === 0) return;

    const weekChanged = prevWeekRef.current !== selectedWeek;
    prevWeekRef.current = selectedWeek;

    // If week didn't change and the form already has links/modifications, do not overwrite it
    if (!weekChanged) {
      const hasUserLinks = Object.values(formItems).some(item => 
        item.links && item.links.some(link => link.trim() !== "")
      );
      if (hasUserLinks) return;
    }

    // Automatically trigger autofill silently in the background
    handleAutoFill({ silent: true, resetManual: weekChanged });
  }, [selectedWeek, activeTab, activities]);

  const handleCountChange = (key: string, val: number) => {
    setFormItems(prev => {
      const current = prev[key] || { count: 0, links: [] };
      const newCount = Math.max(0, current.count + val);
      const newLinks = [...current.links];
      
      if (newCount > current.count) {
        for (let i = current.count; i < newCount; i++) {
          newLinks.push("");
        }
      } else if (newCount < current.count) {
        newLinks.splice(newCount);
      }

      return {
        ...prev,
        [key]: { count: newCount, links: newLinks }
      };
    });
  };

  const handleLinkChange = (key: string, index: number, val: string) => {
    setFormItems(prev => {
      const current = prev[key];
      if (!current) return prev;
      const newLinks = [...current.links];
      newLinks[index] = val;
      return {
        ...prev,
        [key]: { ...current, links: newLinks }
      };
    });
  };

  // Calculate live score
  const calculatedPoints = activities.reduce((sum, act) => {
    const item = formItems[act.key];
    return sum + (item ? item.count * act.points : 0);
  }, 0);

  // Calculate live score for report under review
  const reviewCalculatedPoints = Object.entries(editedItems).reduce((sum, [key, item]) => {
    const act = activities.find(a => a.key === key);
    const points = act ? act.points : 0;
    return sum + (item ? item.count * points : 0);
  }, 0);

  const threshold = getBonusThreshold(authUser.role);
  const percentage = Math.min(100, Math.round((calculatedPoints / threshold) * 100));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if at least one activity has count > 0
    const hasActivities = Object.values(formItems).some(item => item.count > 0);
    if (!hasActivities) {
      toast.error("Добавьте хотя бы одно выполненное мероприятие!");
      return;
    }

    // Validate that all link fields are filled for count > 0
    let linksValid = true;
    for (const [key, item] of Object.entries(formItems)) {
      if (item.count > 0) {
        const act = activities.find(a => a.key === key);
        if (act && isAutomatedActivity(act)) {
          continue;
        }
        for (let i = 0; i < item.links.length; i++) {
          const l = item.links[i].trim();
          if (!l) {
            toast.error(`Заполните все ссылки для пункта "${act?.label.substring(0, 30)}..."`);
            linksValid = false;
            break;
          }
          if (!l.startsWith("http://") && !l.startsWith("https://")) {
            toast.error(`Ссылка "${l}" должна начинаться с http:// или https://`);
            linksValid = false;
            break;
          }
        }
      }
      if (!linksValid) break;
    }

    if (!linksValid) return;

    setSubmitting(true);
    try {
      const itemsToSubmit: Record<string, WeeklyReportItem> = {};
      Object.entries(formItems).forEach(([key, val]) => {
        if (val.count > 0) {
          itemsToSubmit[key] = {
            count: val.count,
            links: val.links.map(l => l.trim()),
          };
        }
      });

      await submitWeeklyReport(selectedWeek, itemsToSubmit);
      toast.success("Еженедельный отчёт успешно подан!");
      
      // Reset form
      const resetForm: Record<string, { count: number; links: string[] }> = {};
      activities.forEach(act => {
        resetForm[act.key] = { count: 0, links: [] };
      });
      setFormItems(resetForm);

      // Refresh list
      await fetchReportsData();
      setActiveTab("history");
    } catch (err: any) {
      toast.error("Ошибка при подаче отчёта: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (status: "approved" | "rejected") => {
    if (!selectedReportForReview) return;
    if (status === "rejected" && !reviewerComment.trim()) {
      toast.error("Укажите причину отказа в комментарии!");
      return;
    }

    setReviewing(true);
    try {
      let linksValid = true;
      if (status === "approved") {
        for (const [key, item] of Object.entries(editedItems)) {
          if (item.count > 0) {
            const act = activities.find(a => a.key === key);
            if (act && isAutomatedActivity(act)) {
              continue;
            }
            for (let i = 0; i < item.links.length; i++) {
              const l = item.links[i].trim();
              if (!l) {
                toast.error(`Заполните все ссылки для пункта "${act?.label.substring(0, 30) || key}..."`);
                linksValid = false;
                break;
              }
              if (!l.startsWith("http://") && !l.startsWith("https://")) {
                toast.error(`Ссылка "${l}" должна начинаться с http:// или https://`);
                linksValid = false;
                break;
              }
            }
          }
          if (!linksValid) break;
        }
      }

      if (!linksValid) {
        setReviewing(false);
        return;
      }

      // Filter out zero count items
      const cleanItems: Record<string, WeeklyReportItem> = {};
      Object.entries(editedItems).forEach(([key, val]) => {
        if (val.count > 0) {
          cleanItems[key] = {
            count: val.count,
            links: val.links.map(l => l.trim()),
          };
        }
      });

      await reviewWeeklyReport(selectedReportForReview.id, status, reviewerComment, cleanItems);
      toast.success(`Отчёт успешно ${status === "approved" ? "одобрен" : "отклонён"}`);
      setSelectedReportForReview(null);
      setReviewerComment("");
      await fetchReportsData();
    } catch (err: any) {
      toast.error("Не удалось сохранить решение: " + err.message);
    } finally {
      setReviewing(false);
    }
  };

  const myReports = reports.filter(r => r.user_id === authUser.id);
  const pendingReports = reports.filter(r => r.status === "pending");

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Еженедельные отчеты" 
        sub="Подача и проверка отчетов на получение еженедельной премии для инструкторов" 
      />

      {/* Tabs */}
      <div className="flex border-b border-tactical-border/60">
        <button
          onClick={() => setActiveTab("submit")}
          className={`font-oswald text-sm tracking-widest uppercase px-5 py-3 transition-colors border-b-2 ${
            activeTab === "submit"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Подать отчёт
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`font-oswald text-sm tracking-widest uppercase px-5 py-3 transition-colors border-b-2 relative ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Мои отчёты
          {myReports.length > 0 && (
            <span className="ml-2 bg-primary/20 text-primary border border-primary/30 rounded-full px-1.5 py-0.5 text-[10px] font-mono">
              {myReports.length}
            </span>
          )}
        </button>
        {canReviewReports && (
          <button
            onClick={() => setActiveTab("review")}
            className={`font-oswald text-sm tracking-widest uppercase px-5 py-3 transition-colors border-b-2 relative ${
              activeTab === "review"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Панель проверки
            {pendingReports.length > 0 && (
              <span className="ml-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-full px-1.5 py-0.5 text-[10px] font-mono animate-pulse">
                {pendingReports.length}
              </span>
            )}
          </button>
        )}
        {isHeadAvng && (
          <button
            onClick={() => setActiveTab("settings")}
            className={`font-oswald text-sm tracking-widest uppercase px-5 py-3 transition-colors border-b-2 relative ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Настройки баллов
          </button>
        )}
      </div>

      {/* Submit Report Tab */}
      {activeTab === "submit" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleSubmit} className="bg-tactical-card border border-tactical-border p-5 space-y-6 corner-mark">
              
              {/* Week Selector */}
              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-mono uppercase tracking-wider block">Отчётный период</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="flex-1 bg-tactical-panel border border-tactical-border px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary font-ibm"
                  >
                    {weeks.map(w => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    disabled={autoFilling}
                    className="bg-tactical-panel border border-tactical-border hover:border-primary text-foreground hover:text-primary font-oswald text-xs tracking-widest uppercase px-4 py-2 transition-colors flex items-center justify-center gap-2 shrink-0"
                  >
                    {autoFilling ? (
                      <>
                        <Icon name="Loader2" size={14} className="animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Icon name="Sparkles" size={14} />
                        Подтянуть данные
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Activities List */}
              <div className="space-y-4">
                <div className="flex justify-between border-b border-tactical-border/40 pb-2">
                  <span className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest">Проделанная работа</span>
                  <span className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest mr-20">Счетчик</span>
                </div>

                <div className="space-y-6 divide-y divide-tactical-border/20">
                  {activities.map(act => {
                    const item = formItems[act.key] || { count: 0, links: [] };
                    return (
                      <div key={act.key} className="pt-4 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm text-foreground font-ibm leading-relaxed">{act.label}</p>
                              {isAutomatedActivity(act) && (
                                <span className="bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_6px_rgba(34,197,94,0.15)] rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider animate-pulse">
                                  автоматически
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-yellow-500/80 mt-1">+{act.points} баллов за раз</p>
                          </div>
                          
                          {/* Counter controls */}
                          {isAutomatedActivity(act) ? (
                            <div className="flex items-center justify-center border border-tactical-border/60 bg-tactical-panel/40 px-3 py-1.5 select-none w-24 h-[38px] font-mono text-sm text-foreground font-semibold">
                              {item.count}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 border border-tactical-border bg-tactical-panel p-1 select-none">
                              <button
                                type="button"
                                onClick={() => handleCountChange(act.key, -1)}
                                className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-tactical-border/40 transition-colors"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-sm font-mono text-foreground">{item.count}</span>
                              <button
                                type="button"
                                onClick={() => handleCountChange(act.key, 1)}
                                className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-tactical-border/40 transition-colors"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Proof Link Input Fields */}
                        {item.count > 0 && !isAutomatedActivity(act) && (
                          <div className="space-y-2 pl-4 border-l border-primary/20 ml-2 mt-2">
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Ссылки на скриншоты / док-ва или Discord</p>
                            {item.links.map((link, idx) => (
                              <div key={idx} className="flex gap-2">
                                <span className="text-xs text-muted-foreground font-mono self-center w-6">#{idx+1}</span>
                                <input
                                  type="url"
                                  placeholder="https://imgur.com/... или ссылка на Discord"
                                  value={link}
                                  onChange={(e) => handleLinkChange(act.key, idx, e.target.value)}
                                  required
                                  className="flex-1 bg-tactical-panel/60 border border-tactical-border/70 px-3 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary/80"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary disabled:bg-primary/50 text-primary-foreground font-oswald text-sm tracking-widest uppercase py-3 hover:bg-primary/95 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Icon name="Send" size={16} />
                    Подать отчёт
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Right Column Status Dashboard */}
          <div className="space-y-4">
            
            {/* Score HUD display */}
            <div className="bg-tactical-card border border-tactical-border p-5 space-y-4 corner-mark relative overflow-hidden card-glow">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-yellow-500 uppercase tracking-widest">Калькулятор баллов</span>
                <span className="text-[9px] font-mono text-muted-foreground/50">V.WEEKLY</span>
              </div>

              <div className="py-4 text-center">
                <p className="text-5xl font-oswald font-bold text-foreground tracking-tight">{calculatedPoints}</p>
                <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1">Итого баллов набрано</p>
              </div>

              {/* Progress to reward */}
              <div className="space-y-2 pt-2 border-t border-tactical-border/40">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-muted-foreground">Минимум для премии:</span>
                  <span className="text-foreground">{threshold} баллов</span>
                </div>
                <div className="h-2 bg-tactical-panel border border-tactical-border overflow-hidden relative">
                  <div 
                     className={`absolute inset-0 transition-all duration-500 ${
                      calculatedPoints >= threshold ? "bg-green-500" : "bg-primary"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Прогресс премии</span>
                  <span className={calculatedPoints >= threshold ? "text-green-400 font-bold" : "text-primary font-bold"}>
                    {calculatedPoints >= threshold ? "ВЫПОЛНЕНО" : `${percentage}%`}
                  </span>
                </div>
              </div>

              {/* Role-based Threshold information */}
              <div className="bg-tactical-panel border border-tactical-border/60 p-3 mt-4 text-xs font-ibm space-y-1.5 leading-relaxed">
                <p className="font-semibold text-yellow-500 uppercase tracking-wider text-[10px]">Нормативы премии:</p>
                <p className="text-muted-foreground flex justify-between">
                  <span>Рядовой состав отдела:</span> 
                  <span className="font-mono text-foreground font-semibold">300 баллов</span>
                </p>
                <p className="text-muted-foreground flex justify-between">
                  <span>Старший состав отдела:</span> 
                  <span className="font-mono text-foreground font-semibold">400 баллов</span>
                </p>
                <p className="text-[9px] text-muted-foreground/60 italic mt-2 border-t border-tactical-border/40 pt-1.5">
                  Рядовой состав: Мл. инстр. / Инструктор / Ст. инстр. <br />
                  Старший состав: Гл. инстр. / Зам. нач / Нач. / Старший состав УФСВНГ.
                </p>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* History of reports */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {loading ? (
            <Spinner />
          ) : myReports.length === 0 ? (
            <Empty text="Вы еще не подавали еженедельные отчёты" />
          ) : (
            <div className="space-y-4">
              {myReports.map(report => (
                <ReportCard key={report.id} report={report} activities={activities} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Tab */}
      {activeTab === "review" && canReviewReports && (
        <div className="space-y-6">
          {loading ? (
            <Spinner />
          ) : pendingReports.length === 0 ? (
            <Empty text="Нет отчётов, ожидающих вашей проверки" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* List of pending reports */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground mb-3">Ожидают проверки ({pendingReports.length})</h3>
                <div className="space-y-2">
                  {pendingReports.map(report => {
                    const isSelected = selectedReportForReview?.id === report.id;
                    return (
                      <div
                        key={report.id}
                        onClick={() => {
                          setSelectedReportForReview(report);
                          setReviewerComment("");
                        }}
                        className={`bg-tactical-card border p-4 cursor-pointer transition-all corner-mark flex justify-between items-center ${
                          isSelected ? "border-primary card-glow" : "border-tactical-border hover:border-tactical-border/80"
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-sm text-foreground">{report.instructor_name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{report.instructor_rank}</p>
                          <p className="text-[11px] text-yellow-500/80 font-mono mt-1">Неделя: {report.week_start}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-oswald text-primary font-bold">{report.total_points}</p>
                          <p className="text-[8px] font-mono text-muted-foreground uppercase">баллов</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Panel details */}
              <div className="lg:col-span-2">
                {selectedReportForReview ? (
                  <div className="bg-tactical-card border border-tactical-border p-5 space-y-6 corner-mark animate-fade-in">
                    
                    {/* Header info */}
                    <div className="flex justify-between items-start border-b border-tactical-border/60 pb-4">
                      <div>
                        <h4 className="font-oswald text-lg text-foreground uppercase tracking-wide">
                          Отчёт: {selectedReportForReview.instructor_name}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          Static ID: {selectedReportForReview.instructor_static_id} · Звание: {selectedReportForReview.instructor_rank}
                        </p>
                        <p className="text-xs text-yellow-500 font-mono mt-1">
                          Период отчёта: {selectedReportForReview.week_start}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-muted-foreground block uppercase">Набрано баллов</span>
                        <span className="text-3xl font-oswald text-primary font-bold block">{reviewCalculatedPoints}</span>
                      </div>
                    </div>

                    {/* Report details table */}
                    <div className="space-y-4">
                      <h5 className="font-oswald text-xs tracking-widest text-muted-foreground uppercase">Выполненная работа & Доказательства</h5>
                      <div className="space-y-4 divide-y divide-tactical-border/20">
                        {Object.entries(editedItems).map(([key, item]) => {
                          if (item.count <= 0) return null;
                          const act = activities.find(a => a.key === key);
                          const label = act ? act.label : `[Удаленное задание: ${key}]`;
                          const points = act ? act.points : 0;
                          return (
                            <div key={key} className="pt-3 space-y-2">
                              <div className="flex justify-between items-center gap-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs text-foreground font-ibm leading-relaxed">{label}</p>
                                  {act && isAutomatedActivity(act) && (
                                    <span className="bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_6px_rgba(34,197,94,0.15)] rounded px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider">
                                      автоматически
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  {/* Counter modifier */}
                                  {act && isAutomatedActivity(act) ? (
                                    <div className="flex items-center justify-center border border-tactical-border/60 bg-tactical-panel/40 px-2.5 py-0.5 select-none font-mono text-xs text-foreground font-semibold h-[26px] w-[50px]">
                                      {item.count}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 border border-tactical-border bg-tactical-panel p-0.5 select-none">
                                      <button
                                        type="button"
                                        onClick={() => handleReviewCountChange(key, -1)}
                                        className="w-5 h-5 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-tactical-border/40 transition-colors"
                                      >
                                        -
                                      </button>
                                      <span className="w-5 text-center text-xs font-mono text-foreground">{item.count}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleReviewCountChange(key, 1)}
                                        className="w-5 h-5 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-tactical-border/40 transition-colors"
                                      >
                                        +
                                      </button>
                                    </div>
                                  )}

                                  <span className="text-xs font-mono text-yellow-500/80 bg-tactical-panel border border-tactical-border/40 px-2 py-0.5 whitespace-nowrap font-semibold">
                                    {item.count} x {points} = {item.count * points} б.
                                  </span>
                                </div>
                              </div>

                              {/* Links inputs */}
                              {act && !isAutomatedActivity(act) && (
                                <div className="pl-4 border-l border-primary/20 space-y-1.5 mt-1">
                                  {item.links?.map((link, lIdx) => (
                                    <div key={lIdx} className="flex gap-2">
                                      <span className="text-[10px] text-muted-foreground font-mono self-center w-5">#{lIdx+1}</span>
                                      <input
                                        type="url"
                                        placeholder="https://imgur.com/... или ссылка на Discord"
                                        value={link}
                                        onChange={(e) => handleReviewLinkChange(key, lIdx, e.target.value)}
                                        required
                                        className="flex-1 bg-tactical-panel/60 border border-tactical-border/70 px-2 py-1 text-[11px] text-foreground font-ibm focus:outline-none focus:border-primary/80"
                                      />
                                      {link.startsWith("http") && (
                                        <a
                                          href={link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:text-primary-light flex items-center justify-center px-1"
                                        >
                                          <Icon name="ExternalLink" size={12} />
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Dropdown to add another activity that wasn't claimed */}
                      <div className="pt-4 border-t border-tactical-border/40 flex items-center justify-between gap-4">
                        <span className="text-xs text-muted-foreground font-ibm">Добавить неуказанное задание:</span>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              handleReviewCountChange(val, 1);
                              e.target.value = "";
                            }
                          }}
                          className="bg-tactical-panel border border-tactical-border px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-primary font-ibm"
                        >
                          <option value="">-- Выбрать задание --</option>
                          {activities.map(act => {
                            const item = editedItems[act.key];
                            if (item && item.count > 0) return null; // already in list
                            if (isAutomatedActivity(act)) return null; // cannot manually add automated activity
                            return (
                              <option key={act.key} value={act.key}>
                                {act.label.substring(0, 50)}... (+{act.points} б.)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* Review Form controls */}
                    <div className="border-t border-tactical-border/60 pt-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-muted-foreground text-xs font-mono uppercase tracking-wider block">Комментарий проверяющего</label>
                        <textarea
                          placeholder="Введите комментарий (при отказе обязателен)"
                          value={reviewerComment}
                          onChange={(e) => setReviewerComment(e.target.value)}
                          rows={3}
                          className="w-full bg-tactical-panel border border-tactical-border/80 px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReviewSubmit("rejected")}
                          disabled={reviewing}
                          className="flex-1 bg-red-950 border border-red-800 text-red-400 font-oswald text-xs tracking-widest uppercase py-3 hover:bg-red-900/35 transition-colors disabled:opacity-50"
                        >
                          Отклонить
                        </button>
                        <button
                          onClick={() => handleReviewSubmit("approved")}
                          disabled={reviewing}
                          className="flex-1 bg-primary text-primary-foreground font-oswald text-xs tracking-widest uppercase py-3 hover:bg-primary/95 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {reviewing ? (
                            <>
                              <Icon name="Loader2" size={14} className="animate-spin" />
                              Сохранение...
                            </>
                          ) : (
                            <>
                              Одобрить
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-tactical-panel/40 border border-dashed border-tactical-border/80 p-12 text-center text-muted-foreground corner-mark font-ibm text-sm">
                    Выберите отчёт из списка слева для просмотра и проверки
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && isHeadAvng && (
        <form onSubmit={handleSaveSettings} className="bg-tactical-card border border-tactical-border p-5 space-y-6 corner-mark">
          <div className="flex justify-between items-center border-b border-tactical-border/60 pb-3">
            <div>
              <h3 className="font-oswald text-base text-foreground uppercase tracking-wider">Настройка баллов за задания</h3>
              <p className="text-xs text-muted-foreground font-ibm">Добавление, удаление и редактирование ценности/названий каждого пункта в системе еженедельных отчётов</p>
            </div>
            <Icon name="Settings" className="text-primary" size={20} />
          </div>

          <div className="space-y-4 pt-2">
            {activities.map((act, index) => {
              return (
                <div key={act.key} className="flex flex-col md:flex-row md:items-center gap-4 py-3 border-b border-tactical-border/20">
                  {/* Label editor */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={act.label}
                      onChange={(e) => handleActivityLabelChange(index, e.target.value)}
                      required
                      placeholder="Название задания"
                      className="w-full bg-tactical-panel border border-tactical-border px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary font-ibm"
                    />
                  </div>

                  {/* Points & Additional & Delete controls */}
                  <div className="flex items-center justify-between md:justify-end gap-6 flex-shrink-0">
                    {/* Points input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={act.points}
                        onChange={(e) => handleActivityPointChange(index, parseInt(e.target.value) || 0)}
                        required
                        className="w-16 bg-tactical-panel border border-tactical-border px-2 py-1.5 text-center font-mono text-sm text-foreground focus:outline-none focus:border-primary"
                      />
                      <span className="text-xs text-muted-foreground font-mono">б.</span>
                    </div>

                    {/* Additional toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!act.isAdditional}
                        onChange={(e) => handleActivityIsAdditionalChange(index, e.target.checked)}
                        className="rounded bg-tactical-panel border-tactical-border text-primary focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground font-ibm">Доп.</span>
                    </label>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(index)}
                      className="text-red-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors flex items-center justify-center"
                      title="Удалить пункт"
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              type="button"
              onClick={handleAddActivity}
              className="flex-1 bg-tactical-panel border border-tactical-border hover:border-primary text-foreground hover:text-primary font-oswald text-xs tracking-widest uppercase py-3 transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="Plus" size={16} />
              Добавить задание
            </button>

            <button
              type="submit"
              disabled={savingSettings}
              className="flex-1 bg-primary disabled:bg-primary/50 text-primary-foreground font-oswald text-xs tracking-widest uppercase py-3 hover:bg-primary/95 transition-colors flex items-center justify-center gap-2"
            >
              {savingSettings ? (
                <>
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Icon name="Save" size={16} />
                  Сохранить конфигурацию
                </>
              )}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

// Collapsible card to show a single report
function ReportCard({ report, activities }: { report: WeeklyReport; activities: ActivityDef[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-tactical-card border border-tactical-border p-4 corner-mark space-y-3">
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon name="CalendarCheck" size={16} className="text-primary" />
          </div>
          <div>
            <p className="font-oswald text-base text-foreground tracking-wide">Неделя: {report.week_start}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">Подан: {new Date(report.created_at).toLocaleDateString("ru-RU")}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 self-end md:self-auto">
          <div className="text-right">
            <p className="text-2xl font-oswald text-foreground font-bold leading-none">{report.total_points}</p>
            <p className="text-[8px] font-mono text-muted-foreground uppercase mt-0.5">баллов</p>
          </div>
          <StatusBadge status={report.status} />
          <Icon 
            name="ChevronDown" 
            size={18} 
            className={`text-muted-foreground transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`} 
          />
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-tactical-border/40 pt-4 space-y-4 animate-fade-in">
          
          {/* Review result summary if reviewed */}
          {report.status !== "pending" && (
            <div className={`p-3 border text-xs font-ibm leading-relaxed ${
              report.status === "approved" 
                ? "bg-green-950/20 border-green-800/60 text-green-400" 
                : "bg-red-950/20 border-red-800/60 text-red-400"
            }`}>
              <p className="font-semibold uppercase tracking-wider text-[10px] mb-1">
                Вердикт: {report.status === "approved" ? "Одобрено" : "Отклонено"}
              </p>
              {report.reviewer_name && (
                <p className="font-mono text-[10px] text-muted-foreground">Проверил: {report.reviewer_name}</p>
              )}
              {report.reviewer_comment && (
                <p className="mt-1 text-foreground italic">«{report.reviewer_comment}»</p>
              )}
            </div>
          )}

          {/* Activities itemized */}
          <div className="space-y-3 divide-y divide-tactical-border/20">
            {Object.entries(report.items).map(([key, item]) => {
              if ((item.count || 0) <= 0) return null;
              const act = activities.find(a => a.key === key);
              const label = act ? act.label : `[Удаленное задание: ${key}]`;
              const points = act ? act.points : 0;
              return (
                <div key={key} className="pt-3 space-y-1">
                  <div className="flex justify-between text-xs font-ibm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground leading-relaxed">{label}</span>
                      {act && isAutomatedActivity(act) && (
                        <span className="bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_6px_rgba(34,197,94,0.15)] rounded px-1 py-0.5 text-[8px] font-mono uppercase tracking-wider">
                          автоматически
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-yellow-500/80 shrink-0 ml-4">
                      {item.count} x {points} = {item.count * points} б.
                    </span>
                  </div>

                  {act && !isAutomatedActivity(act) && (
                    <div className="pl-4 border-l border-primary/20 space-y-1.5 pt-1.5">
                      {item.links?.map((link, lIdx) => (
                        <a
                          key={lIdx}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline hover:text-primary-light font-mono truncate max-w-lg"
                        >
                          <Icon name="ExternalLink" size={11} className="shrink-0" />
                          Доказательство #{lIdx+1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
