import Icon from "@/components/ui/icon";
import { Section, UserRole, NAV_ITEMS } from "./types";
import { User } from "@/lib/api";
import { NotificationBell } from "./NotificationBell";
import { InstructorAvatar } from "./UIComponents";
import { fmtStaticId } from "./SectionsShared";

interface AppHeaderProps {
  role: UserRole;
  authUser: User;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onLogout: () => void;
  onNavigate: (section: import("./types").Section, requestId?: number) => void;
}

export function AppHeader({
  role: _role,
  authUser,
  sidebarOpen: _sidebarOpen,
  onToggleSidebar,
  onLogout,
  onNavigate,
}: AppHeaderProps) {
  // Format user name to match PANARIN A.I. style (Lastname I.O.)
  const formatUserName = (fullname: string) => {
    const parts = fullname.replace("Курсант ", "").replace("Инструктор ", "").split(" ");
    if (parts.length >= 3) {
      return `${parts[0].toUpperCase()} ${parts[1][0]}.${parts[2][0]}.`;
    }
    if (parts.length === 2) {
      return `${parts[0].toUpperCase()} ${parts[1][0]}.`;
    }
    return fullname.toUpperCase();
  };

  return (
    <header className="border-b border-tactical-border bg-tactical-dark flex-shrink-0 z-20 relative px-4 h-16 flex items-center">
      <div className="w-full flex items-center justify-between gap-4">
        {/* Left: Emblems and Text */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors mr-1 sm:mr-2"
            onClick={onToggleSidebar}
          >
            <Icon name="Menu" size={20} />
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Double-headed eagle emblem */}
            <img
              src="/rosgvardia_emblem_color.webp"
              alt="Эмблема АВНГ"
              className="w-9 h-9 sm:w-12 sm:h-12 object-contain filter drop-shadow-[0_0_8px_rgba(200,168,74,0.3)]"
            />
            <div className="border-l border-tactical-border pl-2 sm:pl-3 ml-0.5 sm:ml-1">
              <h1 className="font-oswald text-xs sm:text-lg font-bold tracking-wider sm:tracking-widest text-foreground leading-none">
                РОСГВАРДИЯ АВНГ
              </h1>
              <p className="text-[7px] sm:text-[9px] font-mono text-muted-foreground tracking-[0.1em] sm:tracking-[0.2em] uppercase leading-none mt-1">
                УЧЕБНЫЙ ПОРТАЛ · V2.0
              </p>
              <p className="hidden sm:block text-[10px] font-oswald text-red-500 font-bold tracking-widest uppercase leading-none mt-1.5">
                РОСГВАРДИЯ АВНГ
              </p>
            </div>
          </div>
        </div>

        {/* Middle Header Icons */}
        <div className="hidden lg:flex items-center gap-4 px-4 py-1 border-x border-tactical-border/40">
          <NotificationBell onNavigate={onNavigate} />
          <button
            onClick={onLogout}
            title="Выйти"
            className="text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Icon name="LogOut" size={18} />
          </button>
        </div>

        {/* Right: Cadet Profile box matching screenshot exactly */}
        <div className="flex items-center gap-2 sm:gap-4 justify-end">
          {/* Mobile/Tablet action buttons next to profile box */}
          <div className="flex lg:hidden items-center gap-2 mr-1 sm:mr-2">
            <NotificationBell onNavigate={onNavigate} />
            <button
              onClick={onLogout}
              title="Выйти"
              className="text-muted-foreground hover:text-red-500 transition-colors"
            >
              <Icon name="LogOut" size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            {/* Profile Panel with soldier photo */}
            <button
              onClick={() => onNavigate("profile")}
              className="flex items-center gap-2 sm:gap-3 border border-tactical-border bg-tactical-panel/80 p-1 sm:p-1.5 pr-2 sm:pr-4 rounded-sm hover:bg-tactical-panel hover:border-primary/50 transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 border border-tactical-border/60 overflow-hidden relative rounded-sm group-hover:border-primary/60 transition-colors">
                <InstructorAvatar
                  id={authUser.id}
                  avatarUrl={authUser.avatar_url}
                  discordId={authUser.discord_id}
                  role={authUser.role}
                  size={40}
                  className="rounded-none object-cover"
                />
              </div>
              <div className="hidden min-[380px]:block">
                <p className="font-oswald text-[10px] sm:text-xs font-semibold tracking-wider text-foreground leading-none group-hover:text-primary transition-colors">
                  {formatUserName(authUser.name)}
                </p>
                <p className="text-[8px] sm:text-[9px] font-mono text-yellow-500 font-bold tracking-wide mt-0.5 sm:mt-1 leading-none">
                  [{fmtStaticId(authUser.static_id)}]
                </p>
              </div>
            </button>
            
            {/* Rank Line: Green dot + yellow bars (hidden on mobile to fit h-16 header) */}
            <div className="hidden sm:flex items-center gap-1 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse block" />
              <div className="flex gap-0.5 ml-1">
                <span className="w-6 h-1 bg-yellow-500 rounded-sm" />
                <span className="w-6 h-1 bg-yellow-500 rounded-sm" />
                <span className="w-6 h-1 bg-yellow-500 rounded-sm" />
                <span className="w-6 h-1 bg-yellow-500 rounded-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

interface AppSidebarProps {
  section: Section;
  role: UserRole;
  sidebarOpen: boolean;
  onNavigate: (s: Section) => void;
  onClose: () => void;
}

export function AppSidebar({
  section,
  role,
  sidebarOpen,
  onNavigate,
  onClose,
}: AppSidebarProps) {
  const visibleNav = NAV_ITEMS.filter((n) => n.roles.includes(role) && n.id !== "profile");

  const getMenuIcon = (id: Section) => {
    const item = NAV_ITEMS.find((n) => n.id === id);
    if (item) return item.icon;
    switch (id) {
      case "dashboard": return "LayoutGrid";
      case "materials": return "BookOpen";
      case "lectures": return "GraduationCap";
      case "practices": return "Wrench";
      case "exams": return "ClipboardList";
      case "promotions": return "Star";
      case "grades": return "BarChart3";
      case "instructors": return "Shield";
      case "instructor": return "ShieldAlert";
      default: return "LayoutDashboard";
    }
  };

  return (
    <>
      <aside
        className={`
        fixed md:relative inset-y-0 left-0 z-30 md:z-auto
        w-60 bg-tactical-dark border-r border-tactical-border/60 flex-shrink-0
        transform transition-transform duration-300 md:translate-x-0
        top-16 md:top-auto bottom-0 flex flex-col justify-between overflow-hidden
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="p-3 space-y-4 relative z-10">

          {/* Sidebar Menu matching screenshot */}
          <nav className="space-y-1">
            {visibleNav.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-all group
                  ${
                    section === item.id
                      ? "bg-red-900/80 text-foreground font-semibold border-l-4 border-red-500"
                      : "text-muted-foreground hover:text-foreground hover:bg-red-950/15"
                  }`}
              >
                <Icon
                  name={getMenuIcon(item.id)}
                  size={15}
                  className={
                    section === item.id
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-red-500 transition-colors"
                  }
                />
                <span className="font-oswald text-xs tracking-wider uppercase leading-tight">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3 border-t border-tactical-border/50 space-y-3 relative z-10">
          {/* Active status */}
          <div className="border border-tactical-border bg-tactical-panel p-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="rank-badge text-green-400 font-bold">СИСТЕМА АКТИВНА</span>
            </div>
            <p className="rank-badge text-muted-foreground font-mono text-[9px]">
              11.06.2026 · БАЗА А-7
            </p>
          </div>

          {/* Decorative bars / tech markers */}
          <div className="space-y-1 opacity-70">
            <div className="h-1 bg-red-950 border border-red-900/30 overflow-hidden relative">
              <div className="absolute inset-0 bg-red-500 w-1/3" />
            </div>
            <div className="h-1 bg-red-950 border border-red-900/30 overflow-hidden relative">
              <div className="absolute inset-0 bg-red-500 w-2/3" />
            </div>
          </div>
        </div>
      </aside>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden top-16"
          onClick={onClose}
        />
      )}
    </>
  );
}