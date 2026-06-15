import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { SectionHeader, StatCard, StatusBadge, GradeCircle, OnlineStatus, InstructorAvatar } from "./UIComponents";
import { User, fetchRequests, fetchGrades, fetchInstructors, fetchRatings, fetchPromotionReports, fetchDiscordProfile, TrainingRequest, Grade, PromotionReport, InstructorRating } from "@/lib/api";
import { MOCK_MATERIALS } from "./types";
import { TYPE_LABEL, fmt, avg, Spinner, Empty, RequestSection, fmtStaticId } from "./SectionsShared";
import {
  PatrolMemo,
  ArrestMemo,
  WeaponMemo,
  LegalMemo,
  SearchMemo,
  WeaponSizMemo,
  RightsMemo,
  AccessMemo,
  ReleaseMemo,
  TerritoryMemo,
  MapMemo,
  OathMemo
} from "./MaterialsMemos";

const ROLE_LABELS: Record<string, string> = {
  head_avng: "Нач.АВНГ",
  deputy_head: "Зам.Нач.АВНГ",
  chief_instructor: "Гл.Инст.АВНГ",
  senior_instructor: "Ст.Инст.АВНГ",
  instructor: "Инст.АВНГ",
  junior_instructor: "Мл.Инст.АВНГ",
  cadet: "Курсант"
};

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export function Dashboard({ authUser, onNavigate }: { authUser: User; onNavigate?: (s: import("./types").Section, id?: number) => void }) {
  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const isInstructor = authUser.role === "instructor" || authUser.role === "head_avng";

  useEffect(() => {
    fetchRequests().then(setRequests).catch(() => {});
    fetchGrades().then(setGrades).catch(() => {});
  }, []);

  const myGrades = grades.filter((g) => g.cadet_id === authUser.id);
  const approvedCount = myGrades.filter((g) => g.grade >= 3).length;
  const passRate = myGrades.length
    ? `${Math.round((approvedCount / myGrades.length) * 100)}%`
    : "—";
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const mockRecentRequests = [
    { id: 101, subject: "Экзамен теоретические тесты — Устав ФСВНГ — ФЗ о ФСВНГ", type: "exam" as const, status: "approved" as const, cadet_id: authUser.id, created_at: "", updated_at: "", cadet_name: "", cadet_rank: "", cadet_static_id: "", description: "", preferred_date: "", instructor_comment: "", reviewer_name: "" },
    { id: 102, subject: "Вышка — 30 мин", type: "practice" as const, status: "approved" as const, cadet_id: authUser.id, created_at: "", updated_at: "", cadet_name: "", cadet_rank: "", cadet_static_id: "", description: "", preferred_date: "", instructor_comment: "", reviewer_name: "" },
    { id: 103, subject: "Патруль по территории — 30 мин", type: "practice" as const, status: "approved" as const, cadet_id: authUser.id, created_at: "", updated_at: "", cadet_name: "", cadet_rank: "", cadet_static_id: "", description: "", preferred_date: "", instructor_comment: "", reviewer_name: "" },
  ] as TrainingRequest[];
  const myRecentRequests = requests.filter(r => r.cadet_id === authUser.id);
  const recent = myRecentRequests.length > 0 
    ? [...myRecentRequests, ...mockRecentRequests].slice(0, 3) 
    : mockRecentRequests;

  // Calculate remaining academy duration (7 days limit)
  const getDaysRemaining = () => {
    if (!authUser.created_at) return "7 дн.";
    const createdDate = new Date(authUser.created_at);
    const currentDate = new Date();
    
    // Time difference in milliseconds
    const diffTime = currentDate.getTime() - createdDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    const remaining = 7 - diffDays;
    
    if (remaining <= 0) return "Срок истёк";
    if (remaining < 1) {
      const remainingHours = Math.max(0, Math.floor(remaining * 24));
      return `${remainingHours} ч.`;
    }
    return `${Math.ceil(remaining)} дн.`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return "Доброе утро";
    if (hour >= 12 && hour < 17) return "Добрый день";
    if (hour >= 17 && hour < 23) return "Добрый вечер";
    return "Доброй ночи";
  };

  const getRequestIcon = (type: string) => {
    switch (type) {
      case "lecture": return "GraduationCap";
      case "practice": return "Wrench";
      case "exam": return "ClipboardList";
      case "report": return "FileText";
      default: return "FileText";
    }
  };

  const rejectedCount = myGrades.filter((g) => g.grade < 3).length;
  const totalGrades = myGrades.length;

  const barData = [
    { grade: "Зачтено", count: approvedCount, color: "bg-green-500", text: "text-green-400" },
    { grade: "Не зачтено", count: rejectedCount, color: "bg-red-500", text: "text-red-400" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Top Banner with red stripe accent */}
      <div className="relative overflow-hidden border border-tactical-border/60 bg-tactical-panel h-52 flex flex-col justify-end p-6 md:p-8 corner-mark">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-85"
          style={{ backgroundImage: 'url("/academy_bg.jpg")' }}
        />
        <div 
          className="absolute right-0 top-0 bottom-0 w-80 bg-contain bg-right bg-no-repeat opacity-30 pointer-events-none z-0"
          style={{ backgroundImage: 'url("/rosgvardia_emblem.png")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative z-10 flex items-start gap-4">
          {/* Vertical red bar */}
          <div className="w-1 h-16 bg-red-600 self-center" />
          <div>
            <h2 className="font-oswald text-2xl md:text-4xl font-bold tracking-widest text-foreground uppercase leading-none">
              АКАДЕМИЯ ВОЙСК НАЦИОНАЛЬНОЙ ГВАРДИИ
            </h2>
            <p className="text-xs md:text-sm font-mono text-muted-foreground tracking-wide mt-2">
              {getGreeting()}, {authUser.rank ? `${authUser.rank} ` : ""}{authUser.name}{authUser.role === "head_avng" ? " [Нач.АВНГ]" : authUser.unit ? ` [${authUser.unit}]` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Combined Quick Actions + Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Small red quick action buttons (col-span-3) */}
        <div className="lg:col-span-3 space-y-3">
          <h3 className="font-oswald text-xs tracking-widest uppercase text-muted-foreground">БЫСТРЫЕ ДЕЙСТВИЯ</h3>
          <div className="flex flex-col gap-2">
            {[
              { icon: "BookOpen", target: "materials" as const, title: "Материалы", desc: "Учебные материалы и уставы" },
              { icon: "GraduationCap", target: "lectures" as const, title: "Лекции", desc: "Теоретические занятия" },
              { icon: "Wrench", target: "practices" as const, title: "Практики", desc: "Практические задания" },
              { icon: "FileText", target: "reports" as const, title: "Отчеты", desc: "Рапорты об обучении" },
              { icon: "ClipboardList", target: "exams" as const, title: "Экзамены", desc: "Сдача тестов и нормативов" },
            ].map((act, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate?.(act.target)}
                className="w-full border border-red-900/60 bg-red-950/20 text-red-500 hover:bg-red-900/30 hover:border-red-500/80 p-2.5 flex items-center gap-3 transition-all duration-200 corner-mark text-left group"
              >
                <div className="w-9 h-9 border border-red-900/40 bg-red-950/40 flex items-center justify-center text-red-500 group-hover:text-red-400 shrink-0">
                  <Icon name={act.icon} size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-oswald text-xs uppercase tracking-wider text-foreground font-semibold group-hover:text-red-400 transition-colors">
                    {act.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {act.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Stats Grid (col-span-9) */}
        <div className="lg:col-span-9 space-y-3">
          <h3 className="font-oswald text-xs tracking-widest uppercase text-muted-foreground">МОНИТОРИНГ ДЕЯТЕЛЬНОСТИ</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Средний балл */}
            <div className="relative border border-tactical-border/60 bg-tactical-card/30 p-4 h-28 overflow-hidden flex flex-col justify-between">
              <div 
                className="absolute right-2 bottom-2 w-16 h-16 opacity-15 pointer-events-none bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: 'url("/rosgvardia_emblem_color.png")' }}
              />
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">ПРОЦЕНТ ЗАЧЕТОВ</span>
                <div className="w-6 h-6 border border-red-900/60 bg-red-950/20 flex items-center justify-center text-red-500">
                  <Icon name="CheckCircle" size={12} />
                </div>
              </div>
              <p className="font-oswald text-3xl font-bold text-yellow-500 mt-2">{passRate}</p>
            </div>

            {/* Всего оценок */}
            <div className="relative border border-tactical-border/60 bg-tactical-card/30 p-4 h-28 overflow-hidden flex flex-col justify-between">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
                style={{ backgroundImage: 'url("/patrol_guard.jpg")' }}
              />
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">ВСЕГО ОЦЕНОК</span>
                <div className="w-6 h-6 border border-red-900/60 bg-red-950/20 flex items-center justify-center text-red-500">
                  <Icon name="CheckSquare" size={12} />
                </div>
              </div>
              <p className="font-oswald text-3xl font-bold text-green-500 mt-2">{myGrades.length}</p>
            </div>

            {/* Активных запросов */}
            <div className="relative border border-tactical-border/60 bg-tactical-card/30 p-4 h-28 overflow-hidden flex flex-col justify-between">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
                style={{ backgroundImage: 'url("/patrol_tower.png")' }}
              />
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">АКТИВНЫХ ЗАПРОСОВ</span>
                <div className="w-6 h-6 border border-red-900/60 bg-red-950/20 flex items-center justify-center text-red-500">
                  <Icon name="FileText" size={12} />
                </div>
              </div>
              <p className="font-oswald text-3xl font-bold text-yellow-500 mt-2">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info panels row (moved to center) */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Личные данные */}
        <div className="relative bg-tactical-card border border-tactical-border/60 p-4 flex flex-col justify-between overflow-hidden min-h-[190px]">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
            style={{ backgroundImage: 'url("/personal_data_bg.jpg")' }}
          />
          <div className="relative z-10 w-full">
            <h3 className="font-oswald text-xs tracking-widest uppercase text-muted-foreground mb-3 pb-1 border-b border-tactical-border/30">ЛИЧНЫЕ ДАННЫЕ</h3>
            <div className="space-y-2">
              {(() => {
                const isSergeant = authUser.role === "cadet" && (authUser.rank || "").toLowerCase() === "сержант";
                return [
                  { label: "ЗВАНИЕ", value: authUser.rank || "—" },
                  { label: "ПОДРАЗДЕЛЕНИЕ", value: isSergeant ? "УВО" : (authUser.unit || "—") },
                  { label: "STATIC ID", value: fmtStaticId(authUser.static_id) },
                  { label: "ДАТА РЕГИСТРАЦИИ", value: authUser.created_at ? new Date(authUser.created_at).toLocaleDateString("ru-RU") : "—" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-1 border-b border-tactical-border/30 last:border-0">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-mono">{item.label}</span>
                    <span className="text-foreground text-xs font-ibm">{item.value}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Распределение оценок */}
        <div className="relative bg-tactical-card border border-tactical-border/60 p-4 flex flex-col justify-between overflow-hidden min-h-[190px]">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
            style={{ backgroundImage: 'url("/rosgvardia_always_on_guard.png")' }}
          />
          <div className="relative z-10 w-full">
            <h3 className="font-oswald text-xs tracking-widest uppercase text-muted-foreground mb-3 pb-1 border-b border-tactical-border/30">РЕЗУЛЬТАТЫ СДАЧИ</h3>
            <div className="space-y-2">
              {barData.map((item) => {
                return (
                  <div key={item.grade} className="flex justify-between items-center text-xs py-0.5">
                    <span className="font-mono text-muted-foreground text-[10px] uppercase">{item.grade}</span>
                    <span className={`font-mono font-bold text-xs ${item.text}`}>{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Последние запросы */}
        <div className="relative bg-tactical-card border border-tactical-border/60 p-4 flex flex-col justify-between overflow-hidden min-h-[190px]">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none"
            style={{ backgroundImage: 'url("/patrol_guard.jpg")' }}
          />
          <div className="relative z-10 h-full w-full flex flex-col justify-between">
            <div>
              <h3 className="font-oswald text-xs tracking-widest uppercase text-muted-foreground mb-3 pb-1 border-b border-tactical-border/30">ПОСЛЕДНИЕ ЗАПРОСЫ</h3>
              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 h-full mt-4">
                  <Icon name="Inbox" size={24} className="text-muted-foreground/30 mb-1" />
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">Нет запросов</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {recent.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 py-1 border-b border-tactical-border/30 last:border-0">
                      <div className="w-5 h-5 bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Icon name={getRequestIcon(r.type)} size={10} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-foreground truncate">{r.subject}</p>
                      </div>
                      <div className="flex-shrink-0"><StatusBadge status={r.status} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATERIALS
// ═══════════════════════════════════════════════════════════════════════════════
export function Materials() {
  const [activeTab, setActiveTab] = useState<"lectures" | "laws" | "instructions" >("lectures");
  const [showPatrolMemo, setShowPatrolMemo] = useState(false);
  const [showArrestMemo, setShowArrestMemo] = useState(false);
  const [showWeaponMemo, setShowWeaponMemo] = useState(false);
  const [showLegalMemo, setShowLegalMemo] = useState(false);
  const [showSearchMemo, setShowSearchMemo] = useState(false);
  const [showWeaponSizMemo, setShowWeaponSizMemo] = useState(false);
  const [showRightsMemo, setShowRightsMemo] = useState(false);
  const [showAccessMemo, setShowAccessMemo] = useState(false);
  const [showReleaseMemo, setShowReleaseMemo] = useState(false);
  const [showTerritoryMemo, setShowTerritoryMemo] = useState(false);
  const [showMapMemo, setShowMapMemo] = useState(false);
  const [showOathMemo, setShowOathMemo] = useState(false);

  const filteredMaterials = MOCK_MATERIALS.filter((m) => {
    if (activeTab === "lectures") return m.category === "Лекции";
    if (activeTab === "laws") return m.category === "Законы";
    if (activeTab === "instructions") return m.category === "Памятки";
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6">
      
      <SectionHeader title="Обучающие материалы" sub="Учебная библиотека академии АВНГ" />
      
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-tactical-border">
        {([
          { id: "lectures", label: "Лекции" },
          { id: "laws", label: "Законы" },
          { id: "instructions", label: "Памятки" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`font-oswald text-sm tracking-widest uppercase px-4 py-2 transition-colors border-b-2 ${
              activeTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.map((m) => (
          <div key={m.id} className="corner-mark bg-tactical-card border border-tactical-border p-4 card-glow hover:border-primary/40 transition-colors group">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Icon name={m.icon} fallback="BookOpen" size={18} className="text-primary" />
              </div>
              <div>
                <h4 className="font-oswald text-base font-medium text-foreground leading-tight">{m.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{m.category}</p>
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-tactical-border pt-3">
              <span className="rank-badge text-muted-foreground">{m.pages ? `${m.pages} стр.` : m.category === "Законы" ? "Закон" : m.category === "Лекции" ? "Лекция" : "Памятка"}</span>
              {m.isModal ? (
                <button
                  onClick={() => {
                    if (m.id === 7) setShowPatrolMemo(true);
                    if (m.id === 16) setShowArrestMemo(true);
                    if (m.id === 8) setShowWeaponMemo(true);
                    if (m.id === 17) setShowLegalMemo(true);
                    if (m.id === 18) setShowSearchMemo(true);
                    if (m.id === 19) setShowWeaponSizMemo(true);
                    if (m.id === 20) setShowRightsMemo(true);
                    if (m.id === 21) setShowAccessMemo(true);
                    if (m.id === 22) setShowReleaseMemo(true);
                    if (m.id === 23) setShowTerritoryMemo(true);
                    if (m.id === 24) setShowMapMemo(true);
                    if (m.id === 25) setShowOathMemo(true);
                  }}
                  className="rank-badge text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  <Icon name="Eye" size={12} />Открыть
                </button>
              ) : m.url ? (
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="rank-badge text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  <Icon name="ExternalLink" size={12} />Открыть
                </a>
              ) : (
                <button className="rank-badge text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  <Icon name="Download" size={12} />Скачать
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instructional Modals */}
      <PatrolMemo isOpen={showPatrolMemo} onClose={() => setShowPatrolMemo(false)} />
      <ArrestMemo isOpen={showArrestMemo} onClose={() => setShowArrestMemo(false)} />
      <WeaponMemo isOpen={showWeaponMemo} onClose={() => setShowWeaponMemo(false)} />
      <LegalMemo isOpen={showLegalMemo} onClose={() => setShowLegalMemo(false)} />
      <SearchMemo isOpen={showSearchMemo} onClose={() => setShowSearchMemo(false)} />
      <WeaponSizMemo isOpen={showWeaponSizMemo} onClose={() => setShowWeaponSizMemo(false)} />
      <RightsMemo isOpen={showRightsMemo} onClose={() => setShowRightsMemo(false)} />
      <AccessMemo isOpen={showAccessMemo} onClose={() => setShowAccessMemo(false)} />
      <ReleaseMemo isOpen={showReleaseMemo} onClose={() => setShowReleaseMemo(false)} />
      <TerritoryMemo isOpen={showTerritoryMemo} onClose={() => setShowTerritoryMemo(false)} />
      <MapMemo isOpen={showMapMemo} onClose={() => setShowMapMemo(false)} />
      <OathMemo isOpen={showOathMemo} onClose={() => setShowOathMemo(false)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LECTURES
// ═══════════════════════════════════════════════════════════════════════════════
export function Lectures({ authUser, highlightRequestId }: { authUser: User; highlightRequestId?: number }) {
  return (
    <RequestSection
      authUser={authUser}
      type="lecture"
      icon="GraduationCap"
      title="Лекции"
      sub="Запросы на прохождение лекций"
      subjectOptions={[
        "── Рядовой ──",
        "Прослушать вступительную лекцию",
        "Лекция ФЗ о ФСВНГ и Внутреннему Уставу",
        "── Младший сержант ──",
        "Лекция УК, ПК и КоАП",
        "Лекция: О ФЗ закрытых территорий",
      ]}
      newLabel="Новый запрос"
      emptyText="Нет запросов на лекции"
      highlightRequestId={highlightRequestId}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRACTICES
// ═══════════════════════════════════════════════════════════════════════════════
export function Practices({ authUser, highlightRequestId }: { authUser: User; highlightRequestId?: number }) {
  return (
    <RequestSection
      authUser={authUser}
      type="practice"
      icon="Wrench"
      title="Практики"
      sub="Запросы на прохождение практических занятий"
      subjectOptions={[
        "── Рядовой ──",
        "Заполнение личного дела",
        "Строевая подготовка",
        "Физическая подготовка",
        "Огневая подготовка",
        "Присяга",
        "Вышка — 30 мин",
        "Патруль по территории — 30 мин",
        "── Младший сержант ──",
        "Отработка Штраф Задержание Ареста на инструкторе",
        "Наряд на КПП-1 — 30 мин",
        "Наряд на КПП-2 — 1 час",
        "Участие в досмотровых мероприятиях",
        "Участие в государственной поставке",
      ]}
      newLabel="Новый запрос"
      emptyText="Нет запросов на практику"
      highlightRequestId={highlightRequestId}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMS
// ═══════════════════════════════════════════════════════════════════════════════
export function Exams({ authUser, highlightRequestId }: { authUser: User; highlightRequestId?: number }) {
  return (
    <RequestSection
      authUser={authUser}
      type="exam"
      icon="ClipboardList"
      title="Экзамены"
      sub="Запросы на прохождение экзаменов"
      subjectOptions={[
        "── Рядовой ──",
        "Экзамен теоретические тесты — Устав ФСВНГ — ФЗ о ФСВНГ",
        "── Младший сержант ──",
        "Экзамен (теоретические тесты): УК, ПК, КоАП.",
        "Экзамен процедуры практики — Штраф — Задержание — Арест",
      ]}
      newLabel="Записаться"
      emptyText="Нет запросов на экзамены"
      highlightRequestId={highlightRequestId}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════════
export function Reports({ authUser, highlightRequestId }: { authUser: User; highlightRequestId?: number }) {
  return (
    <RequestSection
      authUser={authUser}
      type="report"
      icon="FileText"
      title="Рапорты"
      sub="Подача служебных рапортов и заявлений"
      subjectOptions={[
        "Рапорт на повышение в звании",
        "Запрос дополнительного обучения",
        "Рапорт о прохождении практики",
        "Рапорт на увольнение из академии",
        "Иное обращение",
      ]}
      newLabel="Новый рапорт"
      emptyText="Нет рапортов"
      highlightRequestId={highlightRequestId}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADES
// ═══════════════════════════════════════════════════════════════════════════════
export function Grades({ authUser }: { authUser: User }) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrades()
      .then((all) => setGrades(all.filter((g) => g.cadet_id === authUser.id)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authUser.id]);

  const approvedCount = grades.filter((g) => g.grade >= 3).length;
  const rejectedCount = grades.filter((g) => g.grade < 3).length;
  const passRate = grades.length
    ? `${Math.round((approvedCount / grades.length) * 100)}%`
    : "—";

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader title="Система оценок" sub="Академические показатели и решения инструкторов" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Зачтено" value={approvedCount} icon="CheckCircle" accent="text-green-400" />
        <StatCard label="Не зачтено" value={rejectedCount} icon="XCircle" accent="text-red-400" />
        <StatCard label="Процент зачетов" value={passRate} icon="Percent" accent="text-gold" />
      </div>
      {loading ? <Spinner /> : grades.length === 0 ? <Empty text="Оценок пока нет" /> : (
        <div className="bg-tactical-card border border-tactical-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-tactical-border bg-tactical-panel">
                <th className="text-left px-4 py-3 rank-badge text-muted-foreground">Дисциплина</th>
                <th className="text-left px-4 py-3 rank-badge text-muted-foreground hidden md:table-cell">Тип</th>
                <th className="text-left px-4 py-3 rank-badge text-muted-foreground hidden md:table-cell">Инструктор</th>
                <th className="text-left px-4 py-3 rank-badge text-muted-foreground hidden md:table-cell">Дата</th>
                <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Результат</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.id} className="border-b border-tactical-border last:border-0 hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-3 text-sm font-ibm text-foreground">
                    {g.subject}
                    {g.comment && <p className="text-xs text-muted-foreground italic">{g.comment}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden md:table-cell">{TYPE_LABEL[g.type]}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden md:table-cell">{g.instructor_name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden md:table-cell">{fmt(g.graded_at)}</td>
                  <td className="px-4 py-3"><div className="flex justify-center"><GradeCircle grade={g.grade} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
interface ActionItem {
  id: string;
  type: "grade" | "request" | "promotion";
  title: string;
  subtitle: string;
  date: string;
  meta?: string | null;
}

export function Profile({ authUser, targetUser, onNavigate }: { authUser: User; targetUser?: User; onNavigate?: (s: import("./types").Section, id?: number, u?: User) => void }) {
  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loadingR, setLoadingR] = useState(true);
  const [loadingG, setLoadingG] = useState(true);
  const [tab, setTab] = useState<"requests" | "grades">("requests");

  const [rating, setRating] = useState<InstructorRating | null>(null);
  const [ratingPosition, setRatingPosition] = useState<number | null>(null);
  const [activities, setActivities] = useState<ActionItem[]>([]);
  const [loadingAct, setLoadingAct] = useState(false);
  const [actTimeframe, setActTimeframe] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");

  const [discordProfile, setDiscordProfile] = useState<{
    username: string;
    globalName?: string;
    avatarUrl?: string;
  } | null>(null);
  const [loadingDiscord, setLoadingDiscord] = useState(false);
  const [imageError, setImageError] = useState(false);

  const displayUser = targetUser || authUser;

  useEffect(() => {
    if (displayUser.role === "instructor") {
      setLoadingR(false);
      setLoadingG(false);
      return;
    }

    fetchRequests()
      .then((all) => {
        if (authUser.role === "instructor" || authUser.role === "head_avng") {
          setRequests(all.filter((r) => r.cadet_id === displayUser.id));
        } else {
          setRequests(all);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingR(false));

    fetchGrades()
      .then((all) => setGrades(all.filter((g) => g.cadet_id === displayUser.id)))
      .catch(() => {})
      .finally(() => setLoadingG(false));
  }, [displayUser.id, authUser.role, displayUser.role]);

  // Load instructor rating and activity timeline
  useEffect(() => {
    if (displayUser.role !== "instructor") return;

    setLoadingAct(true);

    // 1. Fetch ratings
    fetchRatings(actTimeframe)
      .then((res) => {
        const list = res.instructors || [];
        const idx = list.findIndex((i) => i.id === displayUser.id || i.name.toLowerCase().includes(displayUser.name.toLowerCase()) || displayUser.name.toLowerCase().includes(i.name.toLowerCase()));
        if (idx !== -1) {
          setRating(list[idx]);
          setRatingPosition(idx + 1);
        } else {
          setRating(null);
          setRatingPosition(null);
        }
      })
      .catch(() => {});

    // Helper name matcher
    const isNameMatch = (targetName?: string | null) => {
      if (!targetName) return false;
      const t = targetName.toLowerCase();
      const d = displayUser.name.toLowerCase();
      return t.includes(d) || d.includes(t);
    };

    // 2. Fetch all activities
    Promise.all([
      fetchGrades().catch(() => [] as Grade[]),
      fetchRequests().catch(() => [] as TrainingRequest[]),
      fetchPromotionReports().catch(() => [] as PromotionReport[]),
    ])
      .then(([allGrades, allRequests, allPromReports]) => {
        const combined: ActionItem[] = [];

        // Filter and map grades
        allGrades
          .filter((g) => isNameMatch(g.instructor_name))
          .forEach((g) => {
            combined.push({
              id: `grade-${g.id}`,
              type: "grade",
              title: `Выставил оценку ${g.grade}`,
              subtitle: `${g.cadet_rank} ${g.cadet_name} по предмету «${g.subject}»`,
              date: g.graded_at,
              meta: g.comment,
            });
          });

        // Filter and map requests
        allRequests
          .filter((r) => r.status !== "pending" && isNameMatch(r.reviewer_name))
          .forEach((r) => {
            combined.push({
              id: `request-${r.id}`,
              type: "request",
              title: r.status === "approved" ? "Одобрил запрос" : "Отклонил запрос",
              subtitle: `${r.cadet_rank} ${r.cadet_name} · ${r.subject}`,
              date: r.updated_at || r.created_at,
              meta: r.instructor_comment,
            });
          });

        // Filter and map promotion reports
        allPromReports
          .filter((rep) => rep.status !== "pending" && isNameMatch(rep.reviewer_name))
          .forEach((rep) => {
            combined.push({
              id: `promotion-${rep.id}`,
              type: "promotion",
              title: rep.status === "approved" ? "Одобрил рапорт на повышение" : "Отклонил рапорт на повышение",
              subtitle: `${rep.cadet_rank} ${rep.cadet_name} до звания ${rep.promotion_type === "junior_sergeant" ? "Мл. Сержант" : "Сержант"}`,
              date: rep.reviewed_at || rep.created_at,
              meta: rep.instructor_comment,
            });
          });

        // Sort descending by date
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setActivities(combined.slice(0, 15));
      })
      .catch(() => {})
      .finally(() => setLoadingAct(false));
  }, [displayUser.id, displayUser.name, displayUser.role, actTimeframe]);

  // Fetch Discord profile if discord_id exists and no manual avatar is specified
  useEffect(() => {
    setImageError(false);
    if (displayUser.avatar_url) {
      setDiscordProfile(null);
      return;
    }
    if (!displayUser.discord_id) {
      setDiscordProfile(null);
      return;
    }

    setLoadingDiscord(true);
    fetchDiscordProfile(displayUser.discord_id)
      .then((data) => {
        setDiscordProfile({
          username: data.username,
          globalName: data.global_name || data.globalName || undefined,
          avatarUrl: data.avatar?.link || data.avatarUrl || undefined,
        });
      })
      .catch((err) => {
        console.error("Error fetching Discord profile:", err);
        setDiscordProfile(null);
      })
      .finally(() => {
        setLoadingDiscord(false);
      });
  }, [displayUser.discord_id, displayUser.avatar_url]);

  const approvedCount = grades.filter((g) => g.grade >= 3).length;
  const avgGrade = grades.length
    ? `${Math.round((approvedCount / grades.length) * 100)}%`
    : "—";

  return (
    <div className="animate-fade-in space-y-6">
      {targetUser && (
        <button
          onClick={() => {
            if (targetUser?.role && targetUser.role !== "cadet") onNavigate?.("instructors");
            else if (authUser.role !== "cadet") onNavigate?.("instructor");
            else onNavigate?.("dashboard");
          }}
          className="bg-tactical-panel border border-tactical-border px-3 py-1.5 text-xs text-primary hover:text-primary-foreground hover:bg-primary transition-all flex items-center gap-1.5 font-mono uppercase tracking-wider card-glow"
        >
          <Icon name="ArrowLeft" size={12} /> {(targetUser?.role && targetUser.role !== "cadet") ? "Назад к списку инструкторов" : (authUser.role !== "cadet") ? "Назад в панель инструктора" : "Назад"}
        </button>
      )}
      <SectionHeader
        title={displayUser.role === "head_avng" ? "Профиль Нач.АВНГ" : displayUser.role !== "cadet" ? "Профиль инструктора" : "Профиль курсанта"}
        sub={displayUser.role === "head_avng" ? "Карточка начальника академии" : displayUser.role !== "cadet" ? "Личные и служебные данные инструктора" : "Личные данные и история обучения"}
      />
      <div className="grid md:grid-cols-3 gap-4">
        <div className="corner-mark bg-tactical-card border border-tactical-border p-6 card-glow flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-4 overflow-hidden relative rounded-full">
            <InstructorAvatar 
              id={displayUser.id}
              avatarUrl={displayUser.avatar_url} 
              discordId={displayUser.discord_id} 
              role={displayUser.role} 
              size={80} 
              className="w-full h-full" 
            />
          </div>
          <h3 className="font-oswald text-lg tracking-wide text-foreground">{displayUser.name}</h3>
          <p className="text-gold font-mono text-sm mt-1">{displayUser.rank || "—"}</p>
          <div className="mt-3 px-3 py-1 bg-primary/10 border border-primary/20">
            <span className="rank-badge text-primary">ID: {fmtStaticId(displayUser.static_id)}</span>
          </div>

          {/* Discord Connection status */}
          {displayUser.discord_id ? (
            <div className="mt-4 p-3 bg-[#5865F2]/10 border border-[#5865F2]/25 w-full text-left font-mono relative overflow-hidden">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Профиль Discord</p>
              {loadingDiscord ? (
                <div className="h-9 flex items-center">
                  <span className="text-xs text-muted-foreground animate-pulse">Загрузка...</span>
                </div>
              ) : discordProfile ? (
                <>
                  <p className="text-xs font-semibold text-foreground truncate mt-0.5">{discordProfile.globalName || discordProfile.username}</p>
                  <p className="text-[10px] text-[#5865F2] mt-0.5">@{discordProfile.username}</p>
                  <a
                    href={`https://discord.com/users/${displayUser.discord_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block w-full text-center bg-[#5865F2] hover:bg-[#5865F2]/90 text-white text-[10px] uppercase font-bold py-1.5 px-2 transition-colors font-sans tracking-wide"
                  >
                    Открыть Discord
                  </a>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5">ID: {displayUser.discord_id}</p>
                  <a
                    href={`https://discord.com/users/${displayUser.discord_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block w-full text-center bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-primary-foreground border border-[#5865F2]/30 text-[10px] uppercase font-bold py-1.5 px-2 transition-colors font-sans tracking-wide"
                  >
                    Открыть Discord
                  </a>
                </>
              )}
            </div>
          ) : (
            displayUser.role === "instructor" && (
              <div className="mt-4 p-3 bg-tactical-panel border border-tactical-border w-full text-left font-mono">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Профиль Discord</p>
                <p className="text-xs text-muted-foreground italic mt-0.5">Не привязан</p>
              </div>
            )
          )}

          {displayUser.role !== "instructor" && (
            <div className="mt-4 grid grid-cols-2 gap-2 w-full">
              <div className="bg-tactical-panel border border-tactical-border p-2 text-center">
                <p className="font-oswald text-xl text-gold">{avgGrade}</p>
                <p className="rank-badge text-muted-foreground">Процент зачетов</p>
              </div>
              <div className="bg-tactical-panel border border-tactical-border p-2 text-center">
                <p className="font-oswald text-xl text-primary">{requests.length}</p>
                <p className="rank-badge text-muted-foreground">Запросов</p>
              </div>
            </div>
          )}
          {displayUser.role === "instructor" && (
            <div className="mt-4 grid grid-cols-2 gap-2 w-full">
              <div className="bg-tactical-panel border border-tactical-border p-2 text-center">
                <p className="font-oswald text-xl text-yellow-400">{rating?.points ?? 0}</p>
                <p className="rank-badge text-muted-foreground">Очки рейтинга</p>
              </div>
              <div className="bg-tactical-panel border border-tactical-border p-2 text-center">
                <p className="font-oswald text-xl text-primary">{ratingPosition ? `#${ratingPosition}` : "—"}</p>
                <p className="rank-badge text-muted-foreground">В рейтинге</p>
              </div>
            </div>
          )}
        </div>
        <div className="md:col-span-2 bg-tactical-card border border-tactical-border p-4">
          <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground mb-4">Служебные данные</h3>
          <div className="space-y-3">
            {(() => {
              const isSergeant = displayUser.role === "cadet" && (displayUser.rank || "").toLowerCase() === "сержант";
              const items = [
                { label: "Имя", value: displayUser.name },
                { label: "Звание", value: displayUser.rank || "—" },
                { label: "Подразделение", value: isSergeant ? "УВО" : (displayUser.unit || "—") },
                { label: "Static ID", value: fmtStaticId(displayUser.static_id) },
                { label: "Дата зачисления" , value: displayUser.created_at ? new Date(displayUser.created_at).toLocaleDateString("ru-RU") : "—" },
                { label: "Роль", value: ROLE_LABELS[displayUser.role] || displayUser.role },
              ];
              if (isSergeant) {
                items.push({ label: "Статус", value: "Закончил Академию АВНГ и переведен в УВО" });
              }
              return items.map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-tactical-border last:border-0">
                  <span className="rank-badge text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-ibm ${item.label === "Статус" ? "text-primary font-bold" : "text-foreground"}`}>{item.value}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {displayUser.role === "instructor" && (
        <div className="space-y-6">
          {/* Timeframe Selector */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground">Академическая активность</h3>
            <div className="flex gap-1 bg-tactical-panel border border-tactical-border p-0.5">
              {(["daily", "weekly", "monthly", "yearly"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActTimeframe(tf)}
                  className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 transition-colors ${
                    actTimeframe === tf ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tf === "daily" ? "День" : tf === "weekly" ? "Неделя" : tf === "monthly" ? "Месяц" : "Год"}
                </button>
              ))}
            </div>
          </div>

          {/* Rating Detail Cards */}
          {rating && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
              <div className="bg-tactical-panel border border-tactical-border p-4 text-center">
                <p className="font-oswald text-2xl text-yellow-400">{rating.points}</p>
                <p className="rank-badge text-muted-foreground mt-1">Очки рейтинга</p>
              </div>
              <div className="bg-tactical-panel border border-tactical-border p-4 text-center">
                <p className="font-oswald text-2xl text-primary">{rating.lectures_count + rating.practices_count + rating.exams_count}</p>
                <p className="rank-badge text-muted-foreground mt-1">Проведено занятий</p>
              </div>
              <div className="bg-tactical-panel border border-tactical-border p-4 text-center">
                <p className="font-oswald text-2xl text-green-400">{rating.reviews_count}</p>
                <p className="rank-badge text-muted-foreground mt-1">Проверено рапортов</p>
              </div>
              <div className="bg-tactical-panel border border-tactical-border p-4 text-center">
                <p className="font-oswald text-2xl text-primary">#{ratingPosition}</p>
                <p className="rank-badge text-muted-foreground mt-1">Место в рейтинге</p>
              </div>
            </div>
          )}

          {/* Timeline of actions */}
          <div className="space-y-4">
            <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground">Последние действия</h3>
            {loadingAct ? (
              <Spinner />
            ) : activities.length === 0 ? (
              <Empty text="Активных действий за последнее время не найдено" />
            ) : (
              <div className="relative border-l-2 border-tactical-border ml-3 pl-5 space-y-4">
                {activities.map((act) => {
                  let badgeColor = "bg-primary/10 text-primary border-primary/25";
                  let iconName = "FileText";

                  if (act.type === "grade") {
                    badgeColor = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
                    iconName = "Star";
                  } else if (act.type === "promotion") {
                    badgeColor = "bg-green-500/10 text-green-400 border-green-500/20";
                    iconName = "Award";
                  }

                  return (
                    <div key={act.id} className="relative group">
                      <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 bg-background border-2 border-tactical-border rounded-full group-hover:border-primary transition-colors flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-tactical-border group-hover:bg-primary rounded-full transition-colors" />
                      </div>
                      
                      <div className="bg-tactical-card border border-tactical-border p-3 hover:border-primary/30 transition-colors flex items-start gap-3 justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-8 h-8 flex items-center justify-center border flex-shrink-0 ${badgeColor}`}>
                            <Icon name={iconName} size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-ibm text-foreground leading-snug font-medium truncate">{act.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{act.subtitle}</p>
                            {act.meta && <p className="text-xs text-muted-foreground italic mt-1 font-mono">Комментарий: "{act.meta}"</p>}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase whitespace-nowrap ml-2">{fmt(act.date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {displayUser.role !== "instructor" && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b border-tactical-border">
            {([
              { id: "requests", label: "История запросов" },
              { id: "grades", label: "Оценки" },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`font-oswald text-sm tracking-widest uppercase px-4 py-2 transition-colors border-b-2 ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "requests" && (
            loadingR ? <Spinner /> : requests.length === 0 ? <Empty text="Запросов нет" /> : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="bg-tactical-card border border-tactical-border p-3 flex items-center justify-between gap-3 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Icon name="FileText" size={12} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-ibm text-foreground">{r.subject}</p>
                        <p className="text-xs text-muted-foreground font-mono">{TYPE_LABEL[r.type]} · {fmt(r.created_at)}</p>
                        {r.instructor_comment && <p className="text-xs text-muted-foreground italic mt-0.5">"{r.instructor_comment}"</p>}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "grades" && (
            loadingG ? <Spinner /> : grades.length === 0 ? <Empty text="Оценок нет" /> : (
              <div className="space-y-2">
                {grades.map((g) => (
                  <div key={g.id} className="bg-tactical-card border border-tactical-border p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-ibm text-foreground">{g.subject}</p>
                      <p className="text-xs text-muted-foreground font-mono">{TYPE_LABEL[g.type]} · {g.instructor_name} · {fmt(g.graded_at)}</p>
                      {g.comment && <p className="text-xs text-muted-foreground italic mt-0.5">"{g.comment}"</p>}
                    </div>
                    <GradeCircle grade={g.grade} />
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSTRUCTORS LIST
// ═══════════════════════════════════════════════════════════════════════════════
const ROLE_SENIORITY: Record<string, number> = {
  head_avng: 1,
  deputy_head: 2,
  chief_instructor: 3,
  senior_instructor: 4,
  instructor: 5,
  junior_instructor: 6,
  cadet: 7
};

function getRolePriority(role: string | null | undefined): number {
  if (!role) return 999;
  return ROLE_SENIORITY[role] || 999;
}

const RANK_SENIORITY: { key: string; value: number }[] = [
  { key: "генерал-полковник", value: 1 },
  { key: "генерал-лейтенант", value: 2 },
  { key: "генерал-майор", value: 3 },
  { key: "подполковник", value: 5 },
  { key: "подполк", value: 5 },
  { key: "полковник", value: 4 },
  { key: "майор", value: 6 },
  { key: "капитан", value: 7 },
  { key: "кап", value: 7 },
  { key: "старший лейтенант", value: 8 },
  { key: "ст. лейтенант", value: 8 },
  { key: "ст.лейтенант", value: 8 },
  { key: "младший лейтенант", value: 10 },
  { key: "мл. лейтенант", value: 10 },
  { key: "мл.лейтенант", value: 10 },
  { key: "лейтенант", value: 9 },
  { key: "лейт", value: 9 },
  { key: "старший прапорщик", value: 11 },
  { key: "ст. прапорщик", value: 11 },
  { key: "ст.прапорщик", value: 11 },
  { key: "прапорщик", value: 12 },
  { key: "старшина", value: 13 },
  { key: "старший сержант", value: 14 },
  { key: "ст. сержант", value: 14 },
  { key: "ст.сержант", value: 14 },
  { key: "младший сержант", value: 16 },
  { key: "мл. сержант", value: 16 },
  { key: "мл.сержант", value: 16 },
  { key: "сержант", value: 15 },
  { key: "ефрейтор", value: 17 },
  { key: "рядовой", value: 18 }
];

function getRankPriority(rankStr: string | null | undefined): number {
  if (!rankStr) return 999;
  const cleanRank = rankStr.toLowerCase().trim();
  for (const item of RANK_SENIORITY) {
    if (cleanRank.includes(item.key)) {
      return item.value;
    }
  }
  return 999;
}

export function Instructors({ onNavigate }: { onNavigate?: (s: import("./types").Section, id?: number, u?: User) => void }) {
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstructors()
      .then((res) => {
        const sorted = [...res].sort((a, b) => {
          const rolePriorityA = getRolePriority(a.role);
          const rolePriorityB = getRolePriority(b.role);
          if (rolePriorityA !== rolePriorityB) {
            return rolePriorityA - rolePriorityB;
          }
          const rankPriorityA = getRankPriority(a.rank);
          const rankPriorityB = getRankPriority(b.rank);
          if (rankPriorityA !== rankPriorityB) {
            return rankPriorityA - rankPriorityB;
          }
          return (a.name || "").localeCompare(b.name || "", "ru");
        });
        setInstructors(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader title="Список инструкторов" sub="Действующий командный и преподавательский состав академии АВНГ" />
      {loading ? (
        <Spinner />
      ) : instructors.length === 0 ? (
        <Empty text="Инструкторы не найдены" />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instructors.map((inst) => (
            <div key={inst.id} className="corner-mark bg-tactical-card border border-tactical-border p-4 card-glow hover:border-primary/45 transition-all group flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-primary/10 border border-primary/25 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors overflow-hidden rounded-full">
                  <InstructorAvatar 
                    avatarUrl={inst.avatar_url} 
                    discordId={inst.discord_id} 
                    role={inst.role} 
                    size={48} 
                    className="w-full h-full" 
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate?.("profile", undefined, inst)}
                      className="font-oswald text-base font-semibold tracking-wide text-foreground leading-tight hover:text-primary transition-colors text-left"
                    >
                      {inst.name}
                    </button>
                    <OnlineStatus lastSeen={inst.last_seen} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="text-gold font-mono text-xs uppercase tracking-wider">{inst.rank || "Инструктор"}</span>
                    <span className={`rank-badge px-1.5 py-0.2 text-[10px] border leading-none ${
                      inst.role === "head_avng" || inst.role === "deputy_head"
                        ? "text-red-400 border-red-800 bg-red-900/20"
                        : ["instructor", "chief_instructor", "senior_instructor", "junior_instructor"].includes(inst.role)
                        ? "text-yellow-400 border-yellow-800 bg-yellow-900/20"
                        : "text-primary border-primary/30 bg-primary/10"
                    }`}>
                      {ROLE_LABELS[inst.role] || inst.role}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{inst.unit || "Учебный центр"}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-tactical-border flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                <span>Static ID: <span className="text-primary">{fmtStaticId(inst.static_id)}</span></span>
                <span>В штате с: {inst.created_at ? new Date(inst.created_at).toLocaleDateString("ru-RU") : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
