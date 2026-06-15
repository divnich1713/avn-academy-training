import { useState, useEffect } from "react";
import { Section, UserRole, NAV_ITEMS } from "@/components/academy/types";
import { AppHeader, AppSidebar } from "@/components/academy/Layout";
import Icon from "@/components/ui/icon";
import {
  Dashboard,
  Materials,
  Lectures,
  Practices,
  Exams,
  Reports,
  Grades,
  Profile,
  InstructorPanel,
  InstructorRatings,
  PromotionSection,
  Instructors,
} from "@/components/academy/Sections";
import { User } from "@/lib/api";

interface IndexProps {
  authUser: User;
  onLogout: () => void;
  onReloadUser?: () => void;
}

export default function Index({ authUser, onLogout, onReloadUser }: IndexProps) {
  const [section, setSection] = useState<Section>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const isInstr = authUser.role !== "cadet";
    let initialSection: Section = isInstr ? "instructor" : "dashboard";
    if (tabParam) {
      const candidateSection = tabParam as Section;
      if ((candidateSection === "promotions" || candidateSection === "dashboard") && isInstr) {
        initialSection = "instructor";
      } else {
        initialSection = candidateSection;
      }
    }
    // Authorization check
    const navItem = NAV_ITEMS.find((item) => item.id === initialSection);
    if (navItem && !navItem.roles.includes(authUser.role as UserRole)) {
      initialSection = authUser.role === "cadet" ? "dashboard" : "instructor";
    }
    return initialSection;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [highlightRequestId, setHighlightRequestId] = useState<number | undefined>();
  const [highlightReportId, setHighlightReportId] = useState<number | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("reportId");
    return id ? Number(id) : undefined;
  });
  const [selectedCadet, setSelectedCadet] = useState<User | null>(null);

  // Poll for profile/promotion updates every 5 seconds for active cadets
  useEffect(() => {
    if (authUser.role === "cadet" && onReloadUser) {
      const interval = setInterval(onReloadUser, 5000);
      return () => clearInterval(interval);
    }
  }, [authUser.role, onReloadUser]);

  // Clean up URL parameters from browser address bar on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") || params.get("reportId")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const role = authUser.role as UserRole;

  const navigateTo = (s: Section, requestId?: number, targetCadet?: User) => {
    const isInstr = authUser.role !== "cadet";
    let targetSection = s;
    if (isInstr && (s === "dashboard" || s === "promotions")) {
      targetSection = "instructor";
    }
    // Authorization check
    const navItem = NAV_ITEMS.find((item) => item.id === targetSection);
    if (navItem && !navItem.roles.includes(authUser.role as UserRole)) {
      targetSection = authUser.role === "cadet" ? "dashboard" : "instructor";
    }
    setSection(targetSection);
    setHighlightRequestId(requestId);
    if (targetCadet) {
      setSelectedCadet(targetCadet);
    } else if (targetSection !== "profile") {
      setSelectedCadet(null);
    }
  };

  const isSergeantCadet = authUser.role === "cadet" && (
    (authUser.rank || "").toLowerCase() === "сержант"
  );

  const isExpiredCadet = authUser.role === "cadet" && !isSergeantCadet && (() => {
    if (!authUser.created_at) return false;
    const createdDate = new Date(authUser.created_at);
    const currentDate = new Date();
    const diffTime = currentDate.getTime() - createdDate.getTime();
    return diffTime / (1000 * 60 * 60 * 24) > 7;
  })();

  const renderSection = () => {
    if (isSergeantCadet) {
      return (
        <div className="animate-fade-in space-y-6">
          <div className="bg-tactical-card border-2 border-primary/50 p-6 text-center max-w-lg mx-auto mt-12 corner-mark card-glow">
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="Award" size={32} className="text-primary" />
            </div>
            <h3 className="font-oswald text-lg uppercase tracking-wider text-foreground">Академия успешно пройдена</h3>
            <p className="text-gold font-mono text-sm mt-1">Сержант {authUser.name}</p>
            <div className="my-4 border-y border-tactical-border py-4 font-ibm text-sm text-muted-foreground">
              <span className="text-foreground font-semibold">Статус: </span>
              Закончил Академию АВНГ и переведен в УВО
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ваше обучение завершено. Доступ к учебным разделам академии заблокирован в связи с успешным окончанием курса.
            </p>
            <button
              onClick={onLogout}
              className="mt-6 bg-primary text-primary-foreground font-oswald text-sm tracking-widest uppercase py-2 px-6 hover:bg-primary/90 transition-colors"
            >
              Выйти из системы
            </button>
          </div>
        </div>
      );
    }

    if (isExpiredCadet) {
      return (
        <div className="animate-fade-in space-y-6">
          <div className="bg-tactical-card border-2 border-red-500/80 p-6 text-center max-w-lg mx-auto mt-12 corner-mark shadow-[0_0_24px_rgba(239,68,68,0.25)]">
            <div className="w-16 h-16 bg-red-950 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="XCircle" size={32} className="text-red-500" />
            </div>
            <h3 className="font-oswald text-lg uppercase tracking-wider text-red-500">Доступ к обучению закрыт</h3>
            <p className="text-muted-foreground font-mono text-sm mt-1">{authUser.rank} {authUser.name}</p>
            <div className="my-4 border-y border-tactical-border py-4 font-ibm text-sm text-red-400">
              <span className="text-muted-foreground font-semibold">Статус: </span>
              Отчислен из Академии (превышен лимит обучения в 7 дней)
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Срок вашего нахождения в Академии АВНГ превысил лимит в 7 дней. В связи с этим доступ к учебным разделам, лекциям, практикам и экзаменам заблокирован. Для выяснения обстоятельств обратитесь к руководству Академии.
            </p>
            <button
              onClick={onLogout}
              className="mt-6 bg-red-600 hover:bg-red-700 text-white font-oswald text-sm tracking-widest uppercase py-2 px-6 transition-colors border border-red-800"
            >
              Выйти из системы
            </button>
          </div>
        </div>
      );
    }

    switch (section) {
      case "dashboard": return <Dashboard authUser={authUser} onNavigate={navigateTo} />;
      case "materials": return <Materials />;
      case "lectures": return <Lectures authUser={authUser} highlightRequestId={highlightRequestId} />;
      case "practices": return <Practices authUser={authUser} highlightRequestId={highlightRequestId} />;
      case "exams": return <Exams authUser={authUser} highlightRequestId={highlightRequestId} />;
      case "reports": return <Reports authUser={authUser} highlightRequestId={highlightRequestId} />;
      case "grades": return <Grades authUser={authUser} />;
      case "promotions": return <PromotionSection authUser={authUser} />;
      case "profile": return <Profile authUser={authUser} targetUser={selectedCadet || undefined} onNavigate={navigateTo} />;
      case "ratings": return <InstructorRatings />;
      case "instructors": return <Instructors onNavigate={navigateTo} />;
      case "instructor": return <InstructorPanel authUser={authUser} highlightRequestId={highlightRequestId} highlightReportId={highlightReportId} onViewProfile={(cadet) => navigateTo("profile", undefined, cadet)} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Russia Guard watermark right side background */}
      <div 
        className="fixed top-12 right-0 w-[500px] h-[500px] bg-contain bg-right-top bg-no-repeat opacity-5 pointer-events-none z-0"
        style={{ backgroundImage: 'url("/rosgvardia_emblem.png")' }}
      />
      <div 
        className="fixed inset-0 bg-cover bg-center opacity-10 pointer-events-none z-0"
        style={{ 
          backgroundImage: 'url("/academy_bg.jpg")'
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-background/40 via-background/90 to-background pointer-events-none z-0" />
      
      <div className="relative z-10 flex flex-col flex-1 min-h-screen">
        <AppHeader
          role={role}
          authUser={authUser}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={onLogout}
          onNavigate={navigateTo}
        />
        
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar
            section={section}
            role={role}
            sidebarOpen={sidebarOpen}
            onNavigate={(isSergeantCadet || isExpiredCadet) ? () => {} : navigateTo}
            onClose={() => setSidebarOpen(false)}
          />


          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              {section === "dashboard" && !isSergeantCadet && !isExpiredCadet ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Left/Middle Content Dashboard */}
                  <div className="lg:col-span-9">
                    {renderSection()}
                  </div>

                  {/* Right HUD Column matching layout */}
                  <div className="lg:col-span-3 space-y-4">
                    {/* Eagle Emblem transparent card */}
                    <div className="relative border border-red-950/60 bg-tactical-card/25 p-3.5 h-36 overflow-hidden flex flex-col justify-between corner-mark card-glow">
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-full bg-contain bg-right bg-no-repeat opacity-25 pointer-events-none" 
                        style={{ backgroundImage: 'url("/rosgvardia_emblem.png")' }} 
                      />
                      <div className="relative z-10">
                        <span className="text-[9px] font-mono text-yellow-500/80 tracking-widest uppercase block">ШТАБ АВНГ</span>
                        <span className="text-[8px] font-mono text-muted-foreground/60 block mt-0.5">COORD: Base A-7 · Sector 4</span>
                      </div>
                      <div className="relative z-10 border-t border-red-900/40 pt-1.5 flex justify-between items-center text-[8px] font-mono text-red-500">
                        <span className="tracking-wider">РЕЖИМ ОБУЧЕНИЯ</span>
                        <span className="animate-pulse">● ОНЛАЙН</span>
                      </div>
                    </div>

                    {/* Telemetry hollow frame (Yellow/Gold corner styles) */}
                    <div className="border border-yellow-600/40 bg-tactical-card/10 p-3 h-32 relative flex flex-col justify-between overflow-hidden">
                      {/* Technical corner ticks */}
                      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-yellow-500/60" />
                      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-yellow-500/60" />
                      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-yellow-500/60" />
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-yellow-500/60" />
                      
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono text-yellow-500 tracking-wider">ДЕТАЛИЗАЦИЯ ДАННЫХ</span>
                        <span className="text-[8px] font-mono text-muted-foreground/40">SYS.OK</span>
                      </div>
                      
                      {/* Telemetry charts */}
                      <div className="space-y-2 my-1">
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[7px] font-mono text-muted-foreground/60">
                            <span>РЕСУРС СВЯЗИ</span>
                            <span>82%</span>
                          </div>
                          <div className="h-1 bg-red-950/40 border border-red-900/20 overflow-hidden relative">
                            <div className="absolute inset-0 bg-yellow-500/70 w-[82%]" />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[7px] font-mono text-muted-foreground/60">
                            <span>СИНХРОНИЗАЦИЯ БАЗ</span>
                            <span>45%</span>
                          </div>
                          <div className="h-1 bg-red-950/40 border border-red-900/20 overflow-hidden relative">
                            <div className="absolute inset-0 bg-red-500 w-[45%] animate-pulse" />
                          </div>
                        </div>
                      </div>

                      <div className="text-[7px] font-mono text-muted-foreground/40 text-right">SECURE LINK V.2</div>
                    </div>

                    {/* Empty hollow frame with red corners */}
                    <div className="border border-red-900/40 bg-tactical-card/5 p-3.5 h-24 relative flex flex-col justify-between hud-tech-border">
                      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500/60" />
                      <span className="text-[8px] font-mono text-muted-foreground/60 tracking-wider uppercase block">ОПЕРАТИВНЫЙ СТАТУС</span>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-mono text-muted-foreground">
                          <span>БЕЗОПАСНОСТЬ:</span>
                          <span className="text-green-500">ШТАТНО</span>
                        </div>
                        <div className="flex justify-between text-[8px] font-mono text-muted-foreground">
                          <span>ПОДКЛЮЧЕНИЕ:</span>
                          <span className="text-green-500">СТАБИЛЬНО</span>
                        </div>
                      </div>
                    </div>

                    {/* Telemetry lines SVG graph */}
                    <div className="border border-tactical-border/50 h-20 bg-tactical-panel/20 p-2 relative flex flex-col justify-between hud-grid-texture">
                      <span className="text-[7px] font-mono text-muted-foreground/40 uppercase">АКТИВНОСТЬ КАНАЛОВ (ГГц)</span>
                      <svg viewBox="0 0 100 20" className="w-full h-8 text-red-500/50 stroke-current fill-none">
                        <path d="M 0,10 L 10,8 L 20,15 L 30,5 L 40,12 L 50,2 L 60,16 L 70,8 L 80,12 L 90,4 L 100,10" strokeWidth="1" />
                        <line x1="0" y1="10" x2="100" y2="10" strokeWidth="0.5" strokeDasharray="2 2" className="text-muted-foreground/20" />
                      </svg>
                      <div className="flex justify-between text-[6px] font-mono text-muted-foreground/40">
                        <span>MIN: 2.4</span>
                        <span>MAX: 5.8</span>
                      </div>
                    </div>

                    {/* Red warnings block with striping */}
                    <div className="border border-red-950/60 bg-red-950/5 p-3 relative">
                      <span className="text-[8px] font-mono text-red-500 uppercase tracking-widest block mb-2 text-center">СИСТЕМА БЕЗОПАСНОСТИ</span>
                      <div className="h-5 hud-warning-stripes border border-red-950/40 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[7px] font-mono text-red-500 font-bold bg-tactical-dark px-1.5 border border-red-950/80 tracking-widest">АКТИВЕН</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto">
                  {renderSection()}
                </div>
              )}

              {/* Bottom Row of 5 Decorative HUD Panels (only shown on dashboard) */}
              {section === "dashboard" && !isSergeantCadet && !isExpiredCadet && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-tactical-border/30 pt-6">
                  {/* 1: Map pattern background */}
                  <div className="h-20 border border-tactical-border/50 bg-tactical-card/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: 'url("/patrol_map.jpg")' }} />
                    <p className="p-2 text-[8px] font-mono text-muted-foreground uppercase">КООРДИНАТЫ БАЗЫ</p>
                  </div>
                  {/* 2: Rotating Radar scope */}
                  <div className="h-20 border border-tactical-border/50 bg-tactical-card/20 flex items-center justify-center p-2">
                    <div className="w-14 h-14 rounded-full border border-red-500/10 relative flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full border border-red-500/20" />
                      <div className="w-6 h-6 rounded-full border border-red-500/30" />
                      <div className="absolute w-px h-7 bg-red-500/30 top-0 origin-bottom animate-spin" style={{ animationDuration: '6s' }} />
                    </div>
                  </div>
                  {/* 3: Dot matrix indicators */}
                  <div className="h-20 border border-tactical-border/50 bg-tactical-card/20 p-2 flex flex-col justify-between">
                    <div className="flex gap-1 justify-center py-1">
                      {[...Array(6)].map((_, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full border ${i === 4 ? 'bg-red-500 border-red-500 animate-pulse' : 'border-tactical-border/40'}`} />
                      ))}
                    </div>
                    <div className="text-center font-mono text-[8px] text-red-500/70 uppercase">СЕНСОРЫ ОНЛАЙН</div>
                  </div>
                  {/* 4: Target scope indicator */}
                  <div className="h-20 border border-tactical-border/50 bg-tactical-card/20 flex items-center justify-center relative">
                    <svg viewBox="0 0 100 100" className="w-10 h-10 text-muted-foreground/20 stroke-current fill-none">
                      <circle cx="50" cy="50" r="40" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="50" y1="0" x2="50" y2="100" strokeWidth="0.5" />
                      <line x1="0" y1="50" x2="100" y2="50" strokeWidth="0.5" />
                    </svg>
                  </div>
                  {/* 5: Grid/Lines */}
                  <div className="h-20 border border-tactical-border/50 bg-tactical-card/20 hud-grid-texture relative col-span-2 md:col-span-1">
                    <div className="absolute inset-0 bg-gradient-to-t from-red-950/10 to-transparent" />
                    <p className="p-2 text-[8px] font-mono text-muted-foreground uppercase">СЕТКА ЧАСТОТ</p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
