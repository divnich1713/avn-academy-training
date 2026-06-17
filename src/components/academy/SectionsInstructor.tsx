import { useState, useEffect, useMemo, Fragment } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { SectionHeader, StatCard, StatusBadge, GradeCircle, OnlineStatus, InstructorAvatar } from "./UIComponents";
import { User, reviewRequest, TrainingRequest } from "@/lib/api";
import { useRequests, useGrades, useAdminUsers, usePromotionReports, queryKeys } from "@/lib/useQueries";
import { TYPE_LABEL, fmt, Spinner, Empty, fmtStaticId } from "./SectionsShared";
import { InstructorRatingView } from "./SectionsRatings";
import { PromotionInstructorTab } from "./Promotions";

type EditForm = { static_id: string; name: string; rank: string; unit: string; role: "cadet" | "instructor" | "head_avng" | "chief_instructor" | "senior_instructor" | "junior_instructor" | "deputy_head" | "dismissed"; password: string; created_at: string; discord_id: string; avatar_url: string };

const ROLE_LABELS: Record<string, string> = {
  head_avng: "Нач.АВНГ",
  deputy_head: "Зам.Нач.АВНГ",
  chief_instructor: "Гл.Инст.АВНГ",
  senior_instructor: "Ст.Инст.АВНГ",
  instructor: "Инст.АВНГ",
  junior_instructor: "Мл.Инст.АВНГ",
  cadet: "Курсант",
  dismissed: "Уволен"
};

const MILITARY_RANKS = [
  "Рядовой",
  "Ефрейтор",
  "Младший сержант",
  "Сержант",
  "Старший сержант",
  "Старшина",
  "Прапорщик",
  "Старший прапорщик",
  "Младший лейтенант",
  "Лейтенант",
  "Старший лейтенант",
  "Капитан",
  "Майор",
  "Подполковник",
  "Полковник",
  "Генерал-майор",
  "Генерал-лейтенант",
  "Генерал-полковник"
];

const ACADEMY_UNITS = [
  "АВНГ",
  "УВО"
];

// ═══════════════════════════════════════════════════════════════════════════════
// INSTRUCTOR PANEL
// ═══════════════════════════════════════════════════════════════════════════════
export function InstructorPanel({ authUser, highlightRequestId, highlightReportId, onViewProfile }: { authUser: User; highlightRequestId?: number; highlightReportId?: number; onViewProfile?: (c: User) => void }) {
  const [activeTab, setActiveTab] = useState<"requests" | "grades" | "cadets" | "whitelist" | "rating" | "promotions" | "expired">(() => {
    if (highlightReportId) return "promotions";
    return "requests";
  });

  useEffect(() => {
    if (highlightReportId) {
      setActiveTab("promotions");
    }
  }, [highlightReportId]);

  // --- Requests tab ---
  // --- Requests tab --- P1-6: React Query
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading: reqLoading, refetch: refetchRequests } = useRequests();
  const { data: reports = [] } = usePromotionReports();
  const [reviewComment, setReviewComment] = useState<Record<number, string>>({});
  const [reviewLoading, setReviewLoading] = useState<Record<number, boolean>>({});
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("pending");



  // --- Grades tab ---
  const { data: allGrades = [], isLoading: gradesLoading } = useGrades();

  // --- Whitelist tab ---
  const { data: wlUsers = [], isLoading: wlLoading } = useAdminUsers();
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ static_id: "", password: "", name: "", rank: "Рядовой", unit: "АВНГ", role: "cadet" as "cadet" | "instructor" | "head_avng" | "chief_instructor" | "senior_instructor" | "junior_instructor" | "deputy_head" | "dismissed", discord_id: "", avatar_url: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [editUser, setEditUser] = useState<import("@/lib/api").AdminUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ static_id: "", name: "", rank: "", unit: "", role: "cadet", password: "", created_at: "", discord_id: "", avatar_url: "" });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [selectedWlDate, setSelectedWlDate] = useState<string>(() => new Date().toLocaleDateString("ru-RU"));
  const [selectedReqDate, setSelectedReqDate] = useState<string>(() => new Date().toLocaleDateString("ru-RU"));
  const [selectedGradeDate, setSelectedGradeDate] = useState<string>(() => new Date().toLocaleDateString("ru-RU"));
  const [wlSearchQuery, setWlSearchQuery] = useState("");



  const handleTabClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    // P1-6: React Query auto-caches — we just invalidate stale data on tab switch
    if (tab === "whitelist" || tab === "cadets" || tab === "expired") {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    }
    if (tab === "grades") {
      queryClient.invalidateQueries({ queryKey: queryKeys.grades });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    }
    if (tab === "requests" || tab === "promotions") {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests });
      queryClient.invalidateQueries({ queryKey: queryKeys.promotionReports });
    }
  };

  const handleReview = async (id: number, status: "approved" | "rejected") => {
    setReviewLoading((prev) => ({ ...prev, [id]: true }));
    if (id < 0) {
      const cadetId = -id;
      try {
        const { adminUpdateUser } = await import("@/lib/api");
        if (status === "approved") {
          await adminUpdateUser(cadetId, { is_whitelisted: false });
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
      } catch (err) {
        console.error(err);
      }
    } else {
      const req = requests.find((r) => r.id === id);
      await reviewRequest(id, status, reviewComment[id] || "").catch(() => {});
      if (status === "approved" && req && req.subject === "Рапорт на увольнение из академии") {
        try {
          const { adminUpdateUser } = await import("@/lib/api");
          await adminUpdateUser(req.cadet_id, { is_whitelisted: false });
          await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
        } catch (err) {
          console.error(err);
        }
      }
      await refetchRequests();
    }
    setReviewLoading((prev) => ({ ...prev, [id]: false }));
  };





  const toggleWhitelist = async (id: number, current: boolean) => {
    const { adminUpdateUser } = await import("@/lib/api");
    await adminUpdateUser(id, { is_whitelisted: !current });
    queryClient.setQueryData<import("@/lib/api").AdminUser[]>(queryKeys.adminUsers, (prev) => {
      if (!prev) return [];
      return prev.map((u) => (u.id === id ? { ...u, is_whitelisted: !current } : u));
    });
  };

  const openEdit = (u: import("@/lib/api").AdminUser) => {
    setEditUser(u);
    const dateStr = u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "";
    setEditForm({ static_id: u.static_id || "", name: u.name, rank: u.rank, unit: u.unit, role: u.role, password: "", created_at: dateStr, discord_id: u.discord_id || "", avatar_url: u.avatar_url || "" });
    setEditError("");
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditError("");
    setEditLoading(true);
    try {
      const { adminUpdateUser } = await import("@/lib/api");
      const isoCreatedAt = editForm.created_at ? new Date(editForm.created_at).toISOString() : new Date().toISOString();
      const payload: Parameters<typeof adminUpdateUser>[1] = {
        static_id: editForm.static_id.trim(),
        name: editForm.name,
        rank: editForm.rank,
        unit: editForm.unit,
        role: editForm.role,
        created_at: isoCreatedAt,
        discord_id: editForm.discord_id ? editForm.discord_id.trim() : null,
        avatar_url: editForm.avatar_url ? editForm.avatar_url.trim() : null
      };
      if (editForm.password) payload.password = editForm.password;
      await adminUpdateUser(editUser.id, payload);
      queryClient.setQueryData<import("@/lib/api").AdminUser[]>(queryKeys.adminUsers, (prev) => {
        if (!prev) return [];
        return prev.map((u) =>
          u.id === editUser.id
            ? {
                ...u,
                ...editForm,
                created_at: isoCreatedAt,
                discord_id: editForm.discord_id ? editForm.discord_id.trim() : null,
                avatar_url: editForm.avatar_url ? editForm.avatar_url.trim() : null,
              }
            : u
        );
      });
      setEditUser(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Ошибка");
    }
    setEditLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const { adminCreateUser } = await import("@/lib/api");
      await adminCreateUser({ ...form, discord_id: form.discord_id ? form.discord_id.trim() : null, avatar_url: form.avatar_url ? form.avatar_url.trim() : null, is_whitelisted: true });
      setShowAddForm(false);
      setForm({ static_id: "", password: "", name: "", rank: "Рядовой", unit: "АВНГ", role: "cadet", discord_id: "", avatar_url: "" });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Ошибка");
    }
    setFormLoading(false);
  };

  // Generate virtual dismissal requests for cadets exceeding 7 days
  const dismissalRequests: TrainingRequest[] = wlUsers
    .filter((u) => u.role === "cadet" && u.is_whitelisted && u.created_at)
    .filter((u) => {
      if (u.rank === "Сержант" || u.rank?.toLowerCase() === "сержант") return false;
      const createdDate = new Date(u.created_at);
      const currentDate = new Date();
      const diffTime = currentDate.getTime() - createdDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays > 7;
    })
    .map((c) => ({
      id: -c.id,
      type: "dismissal" as any,
      subject: `Увольнение: Превышен лимит обучения (7 дней)`,
      description: `Курсант ${c.name} зарегистрирован ${new Date(c.created_at!).toLocaleDateString("ru-RU")}.\nСрок нахождения в академии превысил 7 дней. Требуется отчисление из академии.`,
      preferred_date: null,
      status: "pending" as const,
      instructor_comment: null,
      created_at: c.created_at,
      updated_at: new Date().toISOString(),
      cadet_name: c.name,
      cadet_rank: c.rank,
      cadet_static_id: c.static_id,
      cadet_id: c.id,
      reviewer_name: null,
    }));

  // Map cadet-submitted dismissal reports from type 'report' to 'dismissal' so they are not filtered out and show up under 'dismissal' tab
  const mappedRequests = requests.map((r) => {
    if (r.type === "report" && r.subject === "Рапорт на увольнение из академии") {
      return { ...r, type: "dismissal" as any };
    }
    return r;
  });

  const allRequestsPlusDismissals = [...mappedRequests, ...dismissalRequests].filter((r) => r.type !== "report");

  const reqDates = useMemo(() => {
    const dates = new Set<string>();
    dates.add(new Date().toLocaleDateString("ru-RU")); // always include today
    allRequestsPlusDismissals.forEach((r) => {
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
  }, [allRequestsPlusDismissals]);

  const filteredRequests = useMemo(() => {
    return allRequestsPlusDismissals
      .filter((r) => {
        if (filterType !== "all" && r.type !== filterType) return false;
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        if (selectedReqDate !== "all") {
          const dateStr = new Date(r.created_at).toLocaleDateString("ru-RU");
          if (dateStr !== selectedReqDate) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allRequestsPlusDismissals, filterType, filterStatus, selectedReqDate]);

  const pendingCount = allRequestsPlusDismissals.filter((r) => r.status === "pending").length;

  const pendingCountByType = useMemo(() => {
    const counts = {
      all: 0,
      lecture: 0,
      practice: 0,
      exam: 0,
      dismissal: 0
    };
    allRequestsPlusDismissals.forEach((r) => {
      if (r.status === "pending") {
        counts.all++;
        if (r.type === "lecture") counts.lecture++;
        if (r.type === "practice") counts.practice++;
        if (r.type === "exam") counts.exam++;
        if (r.type === "dismissal") counts.dismissal++;
      }
    });
    return counts;
  }, [allRequestsPlusDismissals]);

  const groupedRequests = useMemo(() => {
    const groups: Record<string, typeof filteredRequests> = {
      lecture: [],
      practice: [],
      exam: [],
      dismissal: []
    };
    filteredRequests.forEach(r => {
      if (groups[r.type]) {
        groups[r.type].push(r);
      } else {
        if (!groups[r.type]) groups[r.type] = [];
        groups[r.type].push(r);
      }
    });
    return groups;
  }, [filteredRequests]);

  const gradeDates = useMemo(() => {
    const dates = new Set<string>();
    dates.add(new Date().toLocaleDateString("ru-RU")); // always include today
    allGrades.forEach((g) => {
      if (g.graded_at) {
        dates.add(new Date(g.graded_at).toLocaleDateString("ru-RU"));
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
  }, [allGrades]);

  const filteredGrades = useMemo(() => {
    return [...allGrades]
      .filter((g) => {
        if (selectedGradeDate !== "all") {
          const dateStr = new Date(g.graded_at).toLocaleDateString("ru-RU");
          if (dateStr !== selectedGradeDate) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime());
  }, [allGrades, selectedGradeDate]);
  
  // Custom sorting helper for ranks
  const getRankPriority = (rank: string) => {
    const r = rank.toLowerCase();
    if (r.includes("младший сержант") || r.includes("мл. сержант") || r.includes("мл.сержант")) return 1;
    if (r.includes("рядовой")) return 2;
    return 3;
  };

  const cadets = wlUsers
    .filter((u) => u.role === "cadet" && u.is_whitelisted)
    .sort((a, b) => {
      const pA = getRankPriority(a.rank || "");
      const pB = getRankPriority(b.rank || "");
      if (pA !== pB) return pA - pB;
      return (a.name || "").localeCompare(b.name || "", "ru");
    });

  const groupedWlUsers = useMemo(() => {
    // Filter by search query first if provided
    let filtered = wlUsers;
    if (wlSearchQuery.trim()) {
      const normalizeStr = (str: string) => str.toLowerCase().replace(/ё/g, "е");
      const q = wlSearchQuery.toLowerCase().trim();
      const qNorm = normalizeStr(wlSearchQuery).trim();
      const cleanQ = q.replace(/\D/g, ""); // extract digits only

      filtered = wlUsers.filter((u) => {
        const nameMatch = normalizeStr(u.name || "").includes(qNorm);
        const rankMatch = normalizeStr(u.rank || "").includes(qNorm);
        const unitMatch = normalizeStr(u.unit || "").includes(qNorm);
        
        // Static ID match: supports raw string, formatted string (e.g. "123-456"), or digit-only matching
        const staticIdRaw = (u.static_id || "").toLowerCase();
        const staticIdFormatted = fmtStaticId(u.static_id).toLowerCase();
        const staticIdMatch = 
          staticIdRaw.includes(q) || 
          staticIdFormatted.includes(q) || 
          (cleanQ.length > 0 && staticIdRaw.includes(cleanQ));
          
        // Role match: supports display labels like "нач.авнг" or role keys like "head_avng"
        const displayRole = (ROLE_LABELS[u.role] || "").toLowerCase();
        const roleMatch = displayRole.includes(q) || u.role.toLowerCase().includes(q);
        
        // Discord ID match
        const discordMatch = (u.discord_id || "").toLowerCase().includes(q);
        
        // Date match (e.g. searching "15.06" or "2026")
        const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString("ru-RU") : "";
        const dateMatch = dateStr.includes(q);

        return nameMatch || rankMatch || unitMatch || staticIdMatch || roleMatch || discordMatch || dateMatch;
      });
    }

    // Sort users by created_at descending, then by name
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return (a.name || "").localeCompare(b.name || "", "ru");
    });

    // Group by date of enrollment
    const groups: { dateStr: string; users: typeof wlUsers }[] = [];
    sorted.forEach((u) => {
      const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString("ru-RU") : "Не указана";
      let group = groups.find((g) => g.dateStr === dateStr);
      if (!group) {
        group = { dateStr, users: [] };
        groups.push(group);
      }
      group.users.push(u);
    });
    return groups;
  }, [wlUsers, wlSearchQuery]);

  const wlDates = useMemo(() => {
    const dates = new Set<string>();
    dates.add(new Date().toLocaleDateString("ru-RU")); // always include today
    wlUsers.forEach((u) => {
      if (u.created_at) {
        dates.add(new Date(u.created_at).toLocaleDateString("ru-RU"));
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
  }, [wlUsers]);

  const filteredGroupedWlUsers = useMemo(() => {
    // If searching, show all matching users across all dates
    if (selectedWlDate === "all" || wlSearchQuery.trim()) {
      return groupedWlUsers;
    }
    return groupedWlUsers.filter((g) => g.dateStr === selectedWlDate);
  }, [groupedWlUsers, selectedWlDate, wlSearchQuery]);

  const renderRequestCard = (r: import("@/lib/api").TrainingRequest) => {
    const getCardStyle = (type: string) => {
      switch (type) {
        case "dismissal":
          return {
            bg: "bg-red-950/20 border-red-500/80 shadow-[0_0_10px_rgba(220,38,38,0.15)]",
            iconBg: "bg-red-950 border-red-500 text-red-500",
            iconName: "UserMinus",
            badgeColor: "text-red-400 border-red-800 bg-red-950/40",
            titleColor: "text-red-200 font-semibold",
            nameColor: "text-red-400"
          };
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
            iconName: "User",
            badgeColor: "text-muted-foreground bg-tactical-panel border-tactical-border",
            titleColor: "text-foreground",
            nameColor: "text-foreground"
          };
      }
    };

    const style = getCardStyle(r.type);

    return (
      <div key={r.id} className={`border p-4 space-y-3 transition-colors ${style.bg} ${r.id === highlightRequestId ? "border-primary" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 border flex items-center justify-center flex-shrink-0 mt-0.5 ${style.iconBg}`}>
              <Icon name={style.iconName} size={14} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onViewProfile?.({ id: r.cadet_id, name: r.cadet_name, rank: r.cadet_rank, static_id: r.cadet_static_id } as any)}
                  className={`font-ibm text-sm font-medium hover:text-primary transition-colors hover:underline text-left ${style.nameColor}`}
                >
                  {r.cadet_rank} {r.cadet_name}
                </button>
                <span className={`rank-badge px-1.5 py-0.5 border ${style.badgeColor}`}>{TYPE_LABEL[r.type]}</span>
              </div>
              <p className={`text-sm mt-0.5 ${style.titleColor}`}>{r.subject}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {fmt(r.created_at)}
                {r.preferred_date && fmt(r.created_at) !== fmt(r.preferred_date) && ` · Дата: ${fmt(r.preferred_date)}`}
              </p>
              {r.description && (
                <div className="text-xs text-muted-foreground mt-1 bg-tactical-panel border border-tactical-border/60 p-2 font-mono whitespace-pre-line text-[11px] leading-relaxed">
                  {r.description.split("\n").map((line, idx) => {
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
              )}
            </div>
          </div>
          <StatusBadge status={r.status} />
        </div>
        {r.status === "pending" && (
          <div className="border-t border-tactical-border pt-3 space-y-2">
            <input
              className="w-full bg-tactical-panel border border-tactical-border px-3 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary transition-colors"
              placeholder="Комментарий инструктора (необязательно)..."
              value={reviewComment[r.id] || ""}
              onChange={(e) => setReviewComment((prev) => ({ ...prev, [r.id]: e.target.value }))}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={reviewLoading[r.id]}
                onClick={() => handleReview(r.id, "approved")}
                className="rank-badge text-green-400 border border-green-800 px-3 py-1 hover:bg-green-900/30 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Icon name="Check" size={12} />Одобрить
              </button>
              <button
                type="button"
                disabled={reviewLoading[r.id]}
                onClick={() => handleReview(r.id, "rejected")}
                className="rank-badge text-red-400 border border-red-800 px-3 py-1 hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Icon name="X" size={12} />Отклонить
              </button>
               {reviewLoading[r.id] && <Icon name="Loader2" size={14} className="text-primary animate-spin" />}
            </div>
          </div>
        )}
        {r.status !== "pending" && r.reviewer_name && (
          <p className="text-xs text-muted-foreground font-mono border-t border-tactical-border pt-2">
            Рассмотрел: {r.reviewer_name}
            {r.instructor_comment && ` · "${r.instructor_comment}"`}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader title="Панель инструктора" sub="Управление курсантами, запросами и оценками" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Новых запросов" value={pendingCount} icon="Bell" accent="text-yellow-400" />
        <StatCard label="Курсантов" value={wlUsers.filter((u) => u.role === "cadet").length || "—"} icon="Users" accent="text-primary" />
        <StatCard label="Всего оценок" value={allGrades.length} icon="Award" accent="text-green-400" />
        <StatCard label="Запросов всего" value={requests.length} icon="FileText" accent="text-gold" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-tactical-border overflow-x-auto">
        {([
          { id: "requests", label: "Запросы" },
          { id: "promotions", label: "Повышения" },
          { id: "grades", label: "Оценки" },
          { id: "cadets", label: "Курсанты" },
          { id: "expired", label: "Просроченные" },
          { id: "whitelist", label: "Вайтлист" },
          { id: "rating", label: "Мой рейтинг" },
        ] as const)
          .filter((tab) => tab.id !== "whitelist" || authUser.role === "head_avng" || authUser.role === "deputy_head")
          .map((tab) => {
          const expiredCount = wlUsers.filter((u) => {
            if (u.role !== "cadet" || !u.is_whitelisted || !u.created_at) return false;
            if (u.rank === "Сержант" || u.rank?.toLowerCase() === "сержант") return false;
            const createdDate = new Date(u.created_at);
            const currentDate = new Date();
            const diffTime = currentDate.getTime() - createdDate.getTime();
            return diffTime / (1000 * 60 * 60 * 24) > 7;
          }).length;

          // Compute pending promotions count (loaded on promotions page or via mock report count state)
          const pendingPromotionsCount = tab.id === "promotions" ? reports.filter(r => r.status === "pending").length : 0;
          const activeCadetsCount = tab.id === "cadets" ? cadets.length : 0;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`font-oswald text-sm tracking-widest uppercase px-4 py-2 transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
              {tab.id === "requests" && pendingCount > 0 && (
                <span className="ml-1.5 bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
              {tab.id === "promotions" && pendingPromotionsCount > 0 && (
                <span className="inline-flex items-center gap-1 ml-1.5 text-green-400 animate-pulse">
                  <Icon name="Medal" size={13} className="inline-block" />
                  <span className="text-xs font-bold font-mono">({pendingPromotionsCount})</span>
                </span>
              )}
              {tab.id === "cadets" && activeCadetsCount > 0 && (
                <span className="ml-1.5 bg-primary/20 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">{activeCadetsCount}</span>
              )}
              {tab.id === "expired" && expiredCount > 0 && (
                <span className="inline-flex items-center gap-1 ml-1.5 text-red-500 animate-pulse">
                  <Icon name="XCircle" size={13} className="inline-block" />
                  <span className="text-xs font-bold font-mono">({expiredCount})</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── REQUESTS TAB ── */}
      {activeTab === "requests" && (
        <div className="space-y-4 animate-fade-in">
          {/* Sub-tabs for separating requests */}
          <div className="flex border-b border-tactical-border/60 pb-1.5 gap-2 overflow-x-auto scrollbar-none">
            {([
              { id: "all", label: "Все запросы" },
              { id: "lecture", label: "Лекции" },
              { id: "practice", label: "Практики" },
              { id: "exam", label: "Экзамены" },
              { id: "dismissal", label: "Увольнения" },
            ] as const).map((subTab) => {
              const pendingCountForTab = pendingCountByType[subTab.id];
              return (
                <button
                  key={subTab.id}
                  type="button"
                  onClick={() => {
                    setFilterType(subTab.id);
                  }}
                  className={`font-oswald text-xs tracking-wider uppercase px-3 py-1.5 transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${filterType === subTab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {subTab.label}
                  {pendingCountForTab > 0 && (
                    <span className="bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {pendingCountForTab}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 flex-wrap items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <select
                className="bg-tactical-panel border border-tactical-border px-3 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="pending">На рассмотрении</option>
                <option value="approved">Одобренные</option>
                <option value="rejected">Отклонённые</option>
                <option value="all">Все статусы</option>
              </select>
              <select
                className="bg-tactical-panel border border-tactical-border px-3 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary cursor-pointer transition-colors"
                value={selectedReqDate}
                onChange={(e) => setSelectedReqDate(e.target.value)}
              >
                <option value="all">Все даты</option>
                {reqDates.map((d) => (
                  <option key={d} value={d}>
                    {d} {d === new Date().toLocaleDateString("ru-RU") ? " (Сегодня)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {reqLoading ? <Spinner /> : allRequestsPlusDismissals.length === 0 ? <Empty text="Нет запросов" /> : (
            filteredRequests.length === 0 ? (
              <Empty text={`Нет запросов на ${selectedReqDate === new Date().toLocaleDateString("ru-RU") ? "сегодня" : `дату ${selectedReqDate}`}`} />
            ) : (
              filterType === "all" ? (
                <div className="space-y-6">
                  {groupedRequests.lecture.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-oswald text-xs tracking-wider uppercase text-yellow-500 border-l-2 border-yellow-500 pl-2">Запросы на лекции ({groupedRequests.lecture.length})</h4>
                      <div className="space-y-3">
                        {groupedRequests.lecture.map(renderRequestCard)}
                      </div>
                    </div>
                  )}
                  {groupedRequests.practice.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-oswald text-xs tracking-wider uppercase text-blue-500 border-l-2 border-blue-500 pl-2">Запросы на практики ({groupedRequests.practice.length})</h4>
                      <div className="space-y-3">
                        {groupedRequests.practice.map(renderRequestCard)}
                      </div>
                    </div>
                  )}
                  {groupedRequests.exam.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-oswald text-xs tracking-wider uppercase text-purple-500 border-l-2 border-purple-500 pl-2">Запросы на экзамены ({groupedRequests.exam.length})</h4>
                      <div className="space-y-3">
                        {groupedRequests.exam.map(renderRequestCard)}
                      </div>
                    </div>
                  )}
                  {groupedRequests.dismissal.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-oswald text-xs tracking-wider uppercase text-red-500 border-l-2 border-red-500 pl-2">Рапорты на увольнение ({groupedRequests.dismissal.length})</h4>
                      <div className="space-y-3">
                        {groupedRequests.dismissal.map(renderRequestCard)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map(renderRequestCard)}
                </div>
              )
            )
          )}
        </div>
      )}

      {/* ── GRADES TAB ── */}
      {activeTab === "grades" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">Дата оценки:</span>
              <select
                className="bg-tactical-panel border border-tactical-border px-3 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary cursor-pointer transition-colors"
                value={selectedGradeDate}
                onChange={(e) => setSelectedGradeDate(e.target.value)}
              >
                <option value="all">Все даты</option>
                {gradeDates.map((d) => (
                  <option key={d} value={d}>
                    {d} {d === new Date().toLocaleDateString("ru-RU") ? " (Сегодня)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {gradesLoading ? <Spinner /> : allGrades.length === 0 ? <Empty text="Оценок пока нет" /> : (
            filteredGrades.length === 0 ? (
              <Empty text={`Нет оценок, выставленных ${selectedGradeDate === new Date().toLocaleDateString("ru-RU") ? "сегодня" : `в день ${selectedGradeDate}`}`} />
            ) : (
              <div className="bg-tactical-card border border-tactical-border overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-tactical-border bg-tactical-panel">
                      <th className="text-left px-4 py-3 rank-badge text-muted-foreground">Курсант</th>
                      <th className="text-left px-4 py-3 rank-badge text-muted-foreground">Дисциплина</th>
                      <th className="text-left px-4 py-3 rank-badge text-muted-foreground hidden md:table-cell">Тип</th>
                      <th className="text-left px-4 py-3 rank-badge text-muted-foreground hidden md:table-cell">Дата</th>
                      <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Результат</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGrades.map((g) => (
                      <tr key={g.id} className="border-b border-tactical-border last:border-0 hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-3 text-sm font-ibm text-foreground">{g.cadet_rank} {g.cadet_name}</td>
                        <td className="px-4 py-3 text-sm font-ibm text-foreground">
                          {g.subject}
                          {g.comment && <p className="text-xs text-muted-foreground italic">{g.comment}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden md:table-cell">{TYPE_LABEL[g.type]}</td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden md:table-cell">{fmt(g.graded_at)}</td>
                        <td className="px-4 py-3"><div className="flex justify-center"><GradeCircle grade={g.grade} /></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* ── CADETS TAB ── */}
      {activeTab === "cadets" && (
        <div className="animate-fade-in">
          {wlLoading ? <Spinner /> : (
            <div className="bg-tactical-card border border-tactical-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-tactical-border bg-tactical-panel">
                    <th className="text-left px-4 py-3 rank-badge text-muted-foreground">Курсант</th>
                    <th className="text-left px-4 py-3 rank-badge text-muted-foreground hidden md:table-cell">Звание</th>
                    <th className="text-left px-4 py-3 rank-badge text-muted-foreground hidden md:table-cell">Подразделение</th>
                    <th className="text-center px-4 py-3 rank-badge text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 rank-badge text-muted-foreground hidden lg:table-cell">Дата регистрации</th>
                    <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Осталось времени</th>
                  </tr>
                </thead>
                <tbody>
                  {cadets.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Нет курсантов. Загрузите вайтлист.</td></tr>
                  ) : cadets.map((c) => {
                    // Calculate remaining time
                    const getRemainingText = () => {
                      if (c.rank === "Сержант" || c.rank?.toLowerCase() === "сержант") {
                        return <span className="text-green-400 font-semibold">Закончил академию</span>;
                      }
                      if (!c.created_at) return "—";
                      const createdDate = new Date(c.created_at);
                      const currentDate = new Date();
                      const diffTime = currentDate.getTime() - createdDate.getTime();
                      const diffDays = diffTime / (1000 * 60 * 60 * 24);
                      const remaining = 7 - diffDays;
                      
                      if (remaining <= 0) return <span className="text-red-400">Срок истёк</span>;
                      if (remaining < 1) {
                        const hours = Math.max(0, Math.floor(remaining * 24));
                        return <span className="text-orange-400">{hours} ч.</span>;
                      }
                      return <span className="text-primary">{Math.ceil(remaining)} дн.</span>;
                    };

                    return (
                      <tr key={c.id} className="border-b border-tactical-border last:border-0 hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-3 text-sm font-ibm text-foreground">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 border border-primary/25 flex items-center justify-center overflow-hidden rounded-full">
                              <InstructorAvatar 
                                id={c.id}
                                avatarUrl={c.avatar_url} 
                                discordId={c.discord_id} 
                                role={c.role} 
                                size={32} 
                                className="w-full h-full" 
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onViewProfile?.(c)}
                                className="hover:text-primary transition-colors hover:underline text-left font-medium"
                              >
                                {c.name}
                              </button>
                              <OnlineStatus lastSeen={c.last_seen} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden md:table-cell">{c.rank}</td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden md:table-cell">
                          {c.rank === "Сержант" || c.rank?.toLowerCase() === "сержант" ? "УВО" : (c.unit || "—")}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm text-primary">{fmtStaticId(c.static_id)}</td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden lg:table-cell">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString("ru-RU") : "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">{getRemainingText()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── EXPIRED CADETS TAB ── */}
      {activeTab === "expired" && (
        <div className="animate-fade-in space-y-4">
          <div className="bg-red-950/10 border border-red-900/40 p-4 mb-2 flex items-start gap-3">
            <Icon name="AlertTriangle" className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <h4 className="font-oswald text-sm uppercase text-red-400 font-semibold tracking-wide">Система контроля сроков</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Здесь отображаются курсанты, срок нахождения которых в академии превысил лимит в 7 дней. Вы можете отчислить их в один клик.
              </p>
            </div>
          </div>
          {wlLoading ? <Spinner /> : (
            <div className="bg-tactical-card border border-tactical-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-tactical-border bg-tactical-panel">
                    <th className="text-left px-4 py-3 rank-badge text-muted-foreground">Курсант</th>
                    <th className="text-left px-4 py-3 rank-badge text-muted-foreground hidden md:table-cell">Звание</th>
                    <th className="text-left px-4 py-3 rank-badge text-muted-foreground hidden md:table-cell">Подразделение</th>
                    <th className="text-center px-4 py-3 rank-badge text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 rank-badge text-muted-foreground hidden lg:table-cell">Дата зачисления</th>
                    <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Просрочено дней</th>
                    <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {wlUsers.filter((u) => {
                    if (u.role !== "cadet" || !u.is_whitelisted || !u.created_at) return false;
                    if (u.rank === "Сержант" || u.rank?.toLowerCase() === "сержант") return false;
                    const createdDate = new Date(u.created_at);
                    const currentDate = new Date();
                    const diffTime = currentDate.getTime() - createdDate.getTime();
                    return diffTime / (1000 * 60 * 60 * 24) > 7;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Нет курсантов с истёкшим сроком обучения.
                      </td>
                    </tr>
                  ) : wlUsers.filter((u) => {
                    if (u.role !== "cadet" || !u.is_whitelisted || !u.created_at) return false;
                    if (u.rank === "Сержант" || u.rank?.toLowerCase() === "сержант") return false;
                    const createdDate = new Date(u.created_at);
                    const currentDate = new Date();
                    const diffTime = currentDate.getTime() - createdDate.getTime();
                    return diffTime / (1000 * 60 * 60 * 24) > 7;
                  }).map((c) => {
                    const createdDate = new Date(c.created_at);
                    const currentDate = new Date();
                    const diffTime = currentDate.getTime() - createdDate.getTime();
                    const elapsedDays = diffTime / (1000 * 60 * 60 * 24);
                    const overdueDays = Math.floor(elapsedDays - 7);

                    return (
                      <tr key={c.id} className="border-b border-tactical-border last:border-0 hover:bg-red-950/5 transition-colors">
                        <td className="px-4 py-3 text-sm font-ibm text-red-400 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 border border-primary/25 flex items-center justify-center overflow-hidden rounded-full">
                              <InstructorAvatar 
                                id={c.id}
                                avatarUrl={c.avatar_url} 
                                discordId={c.discord_id} 
                                role={c.role} 
                                size={32} 
                                className="w-full h-full" 
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onViewProfile?.(c)}
                                className="hover:text-red-300 transition-colors hover:underline text-left font-medium"
                              >
                                {c.name}
                              </button>
                              <OnlineStatus lastSeen={c.last_seen} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden md:table-cell">{c.rank}</td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden md:table-cell">{c.unit || "—"}</td>
                        <td className="px-4 py-3 text-center font-mono text-sm text-primary">{fmtStaticId(c.static_id)}</td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden lg:table-cell">
                          {new Date(c.created_at).toLocaleDateString("ru-RU")}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-red-500 font-semibold">{overdueDays} дн.</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleWhitelist(c.id, true)}
                            className="rank-badge text-red-400 border border-red-800 hover:bg-red-900/30 px-3 py-1 transition-colors flex items-center gap-1 mx-auto"
                          >
                            <Icon name="UserMinus" size={12} />Отчислить
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── WHITELIST TAB ── */}
      {activeTab === "whitelist" && (authUser.role === "head_avng" || authUser.role === "deputy_head") && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">Дата зачисления:</span>
                <select
                  className="bg-tactical-panel border border-tactical-border px-3 py-1.5 text-xs text-foreground font-ibm focus:outline-none focus:border-primary cursor-pointer transition-colors"
                  value={selectedWlDate}
                  onChange={(e) => setSelectedWlDate(e.target.value)}
                >
                  <option value="all">Все даты</option>
                  {wlDates.map((d) => (
                    <option key={d} value={d}>
                      {d} {d === new Date().toLocaleDateString("ru-RU") ? " (Сегодня)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">Поиск:</span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Static ID, имя, подразделение..."
                    value={wlSearchQuery}
                    onChange={(e) => setWlSearchQuery(e.target.value)}
                    className="bg-tactical-panel border border-tactical-border px-3 py-1.5 pl-8 text-xs text-foreground font-ibm focus:outline-none focus:border-primary transition-colors w-60"
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Icon name="Search" size={12} />
                  </div>
                  {wlSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setWlSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon name="X" size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-primary text-primary-foreground font-oswald text-sm tracking-widest uppercase py-2 px-4 hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Icon name="Plus" size={14} />Добавить пользователя
            </button>
          </div>
          {showAddForm && (
            <form onSubmit={handleAddUser} className="bg-tactical-card border border-primary/40 p-4 space-y-3 animate-fade-in">
              <h3 className="font-oswald text-sm tracking-widest uppercase text-primary">Новый пользователь</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { label: "Static ID (6 цифр)", key: "static_id", placeholder: "000-000", mono: true },
                  { label: "Пароль", key: "password", placeholder: "Придумайте пароль", type: "password" },
                  { label: "Имя / Позывной", key: "name", placeholder: "Фамилия И.О." },
                ].map(({ label, key, placeholder, type, mono }) => (
                  <div key={key}>
                    <label className="rank-badge text-muted-foreground block mb-1">{label}</label>
                    <input
                      type={type || "text"}
                      className={`w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors ${mono ? "font-mono" : "font-ibm"}`}
                      placeholder={key === "static_id" ? "000-000" : placeholder}
                      value={key === "static_id" ? fmtStaticId(form.static_id) : form[key as keyof typeof form]}
                      maxLength={key === "static_id" ? 7 : undefined}
                      onChange={(e) => setForm({ ...form, [key]: key === "static_id" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value })}
                      required
                    />
                  </div>
                ))}
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Звание</label>
                  <select
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary"
                    value={form.rank}
                    onChange={(e) => setForm({ ...form, rank: e.target.value })}
                  >
                    {MILITARY_RANKS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Подразделение</label>
                  <select
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    {ACADEMY_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Роль</label>
                  <select 
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary disabled:opacity-50" 
                    value={form.role} 
                    onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                    disabled={authUser.role !== "head_avng" && authUser.role !== "deputy_head"}
                  >
                    {(authUser.role === "head_avng" || authUser.role === "deputy_head") && (
                      <>
                        <option value="head_avng">Нач.АВНГ</option>
                        <option value="deputy_head">Зам.Нач.АВНГ</option>
                        <option value="chief_instructor">Гл.Инст.АВНГ</option>
                        <option value="senior_instructor">Ст.Инст.АВНГ</option>
                        <option value="instructor">Инст.АВНГ</option>
                        <option value="junior_instructor">Мл.Инст.АВНГ</option>
                      </>
                    )}
                    <option value="cadet">Курсант</option>
                    <option value="dismissed">Уволен</option>
                  </select>
                </div>
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Discord ID (необязательно)</label>
                  <input
                    type="text"
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
                    placeholder="Например, 321703957240741889"
                    value={form.discord_id}
                    onChange={(e) => setForm({ ...form, discord_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Ссылка на аватар (необязательно)</label>
                  <input
                    type="text"
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary transition-colors"
                    placeholder="https://example.com/avatar.png"
                    value={form.avatar_url}
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                  />
                </div>
              </div>
              {formError && <div className="flex items-center gap-2 bg-red-900/20 border border-red-800 px-3 py-2"><Icon name="AlertTriangle" size={13} className="text-red-400" /><p className="text-xs text-red-400">{formError}</p></div>}
              <div className="flex gap-2">
                <button type="submit" disabled={formLoading} className="bg-primary text-primary-foreground font-oswald text-sm tracking-widest uppercase py-2 px-6 hover:bg-primary/90 transition-colors disabled:opacity-50">{formLoading ? "Сохранение..." : "Добавить"}</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="border border-tactical-border text-muted-foreground font-oswald text-sm tracking-widest uppercase py-2 px-4 hover:border-primary/40 transition-colors">Отмена</button>
              </div>
            </form>
          )}

          {editUser && (
            <form onSubmit={handleEditSave} className="bg-tactical-card border border-yellow-800/50 p-4 space-y-3 animate-fade-in">
              <h3 className="font-oswald text-sm tracking-widest uppercase text-yellow-400">Редактировать: {editUser.name}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { label: "Имя", key: "name", placeholder: "Фамилия И.О." },
                  { label: "Новый пароль", key: "password", type: "password", placeholder: "Оставьте пустым, если не менять" },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="rank-badge text-muted-foreground block mb-1">{label}</label>
                    <input type={type || "text"} className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary" placeholder={placeholder} value={editForm[key as keyof EditForm]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} />
                  </div>
                ))}
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Звание</label>
                  <select
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary"
                    value={editForm.rank}
                    onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}
                  >
                    {Array.from(new Set([...MILITARY_RANKS, editForm.rank || ""])).filter(Boolean).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Подразделение</label>
                  <select
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  >
                    {Array.from(new Set([...ACADEMY_UNITS, editForm.unit || ""])).filter(Boolean).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Static ID (6 цифр)</label>
                  <input
                    type="text"
                    maxLength={7}
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
                    placeholder="000-000"
                    value={fmtStaticId(editForm.static_id)}
                    onChange={(e) => setEditForm({ ...editForm, static_id: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  />
                </div>
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Роль</label>
                  <select 
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary disabled:opacity-50" 
                    value={editForm.role} 
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                    disabled={authUser.role !== "head_avng" && authUser.role !== "deputy_head"}
                  >
                    <option value="head_avng">Нач.АВНГ</option>
                    <option value="deputy_head">Зам.Нач.АВНГ</option>
                    <option value="chief_instructor">Гл.Инст.АВНГ</option>
                    <option value="senior_instructor">Ст.Инст.АВНГ</option>
                    <option value="instructor">Инст.АВНГ</option>
                    <option value="junior_instructor">Мл.Инст.АВНГ</option>
                    <option value="cadet">Курсант</option>
                    <option value="dismissed">Уволен</option>
                  </select>
                </div>
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Дата зачисления</label>
                  <input
                    type="date"
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary"
                    value={editForm.created_at}
                    onChange={(e) => setEditForm({ ...editForm, created_at: e.target.value })}
                  />
                </div>
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Discord ID (необязательно)</label>
                  <input
                    type="text"
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
                    placeholder="Например, 321703957240741889"
                    value={editForm.discord_id}
                    onChange={(e) => setEditForm({ ...editForm, discord_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="rank-badge text-muted-foreground block mb-1">Ссылка на аватар (необязательно)</label>
                  <input
                    type="text"
                    className="w-full bg-tactical-panel border border-tactical-border px-3 py-2 text-sm text-foreground font-ibm focus:outline-none focus:border-primary transition-colors"
                    placeholder="https://example.com/avatar.png"
                    value={editForm.avatar_url}
                    onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                  />
                </div>
              </div>
              {editError && <div className="flex items-center gap-2 bg-red-900/20 border border-red-800 px-3 py-2"><Icon name="AlertTriangle" size={13} className="text-red-400" /><p className="text-xs text-red-400">{editError}</p></div>}
              <div className="flex gap-2">
                <button type="submit" disabled={editLoading} className="bg-primary text-primary-foreground font-oswald text-sm tracking-widest uppercase py-2 px-6 hover:bg-primary/90 transition-colors disabled:opacity-50">{editLoading ? "Сохранение..." : "Сохранить"}</button>
                <button type="button" onClick={() => setEditUser(null)} className="border border-tactical-border text-muted-foreground font-oswald text-sm tracking-widest uppercase py-2 px-4 hover:border-primary/40 transition-colors">Отмена</button>
              </div>
            </form>
          )}

          {wlLoading ? <Spinner /> : (
            <div className="bg-tactical-card border border-tactical-border overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-tactical-border bg-tactical-panel">
                    <th className="text-left px-4 py-3 rank-badge text-muted-foreground">Static ID</th>
                    <th className="text-left px-4 py-3 rank-badge text-muted-foreground">Имя</th>
                    <th className="text-left px-4 py-3 rank-badge text-muted-foreground">Звание</th>
                    <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Роль</th>
                    <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Доступ</th>
                    <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroupedWlUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground font-mono">
                        {wlSearchQuery ? "Пользователи не найдены по вашему запросу." : `Нет пользователей, зачисленных ${selectedWlDate === new Date().toLocaleDateString("ru-RU") ? "сегодня" : `в день ${selectedWlDate}`}.`}
                      </td>
                    </tr>
                  ) : (
                    filteredGroupedWlUsers.map((group) => (
                      <Fragment key={group.dateStr}>
                        <tr className="bg-tactical-panel/40 border-b border-tactical-border/50">
                          <td colSpan={6} className="px-4 py-2 bg-tactical-panel/20">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary select-none">
                              <Icon name="Calendar" size={12} className="text-primary/70" />
                              <span>Дата зачисления: {group.dateStr}</span>
                            </div>
                          </td>
                        </tr>
                        {group.users.map((u) => (
                          <tr key={u.id} className="border-b border-tactical-border last:border-0 hover:bg-primary/5 transition-colors">
                            <td className="px-4 py-3 font-mono text-sm text-primary">{fmtStaticId(u.static_id)}</td>
                            <td className="px-4 py-3 text-sm font-ibm text-foreground">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 border border-primary/25 flex items-center justify-center overflow-hidden rounded-full">
                                  <InstructorAvatar 
                                    id={u.id}
                                    avatarUrl={u.avatar_url} 
                                    discordId={u.discord_id} 
                                    role={u.role} 
                                    size={32} 
                                    className="w-full h-full" 
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span>{u.name}</span>
                                    <OnlineStatus lastSeen={u.last_seen} />
                                  </div>
                                  {u.discord_id && <span className="text-[10px] text-muted-foreground font-mono">Discord: {u.discord_id}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{u.rank}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`rank-badge px-2 py-0.5 border ${
                                u.role === "head_avng" || u.role === "deputy_head"
                                  ? "text-red-400 border-red-800 bg-red-900/20"
                                  : ["instructor", "chief_instructor", "senior_instructor", "junior_instructor"].includes(u.role)
                                  ? "text-yellow-400 border-yellow-800 bg-yellow-900/20"
                                  : "text-primary border-primary/30 bg-primary/10"
                              }`}>
                                {ROLE_LABELS[u.role] || u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleWhitelist(u.id, u.is_whitelisted)}
                                className={`rank-badge px-2 py-0.5 border transition-colors ${u.is_whitelisted ? "text-green-400 border-green-800 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800" : "text-red-400 border-red-800 hover:bg-green-900/20 hover:text-green-400 hover:border-green-800"}`}
                              >
                                {u.is_whitelisted ? "Активен" : "Заблокирован"}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => openEdit(u)} className="rank-badge text-primary border border-primary/30 px-2 py-0.5 hover:bg-primary/10 transition-colors">
                                <Icon name="Pencil" size={11} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PROMOTIONS TAB ── */}
      {activeTab === "promotions" && (
        <PromotionInstructorTab highlightReportId={highlightReportId} onReviewSuccess={() => { queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }); queryClient.invalidateQueries({ queryKey: queryKeys.requests }); queryClient.invalidateQueries({ queryKey: queryKeys.promotionReports }); }} />
      )}

      {/* ── RATING TAB ── */}
      {activeTab === "rating" && (
        <InstructorRatingView instructorId={authUser.id} />
      )}
    </div>
  );
}