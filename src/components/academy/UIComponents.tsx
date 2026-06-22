import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { fetchDiscordProfile } from "@/lib/api";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "Одобрено", cls: "text-green-400 bg-green-900/30 border-green-800" },
    pending: { label: "На рассмотрении", cls: "text-yellow-400 bg-yellow-900/30 border-yellow-800" },
    rejected: { label: "Отклонено", cls: "text-red-400 bg-red-900/30 border-red-800" },
  };
  const s = map[status] ?? { label: status, cls: "text-gray-400 bg-gray-900/30 border-gray-700" };
  return (
    <span className={`rank-badge px-2 py-0.5 border rounded ${s.cls}`}>{s.label}</span>
  );
}

export function GradeCircle({ grade }: { grade: number }) {
  const isApproved = grade >= 3;
  const color = isApproved ? "text-green-400 border-green-800 bg-green-950/20" : "text-red-400 border-red-800 bg-red-950/20";
  return (
    <span className={`rank-badge px-3 py-1 border font-ibm text-xs tracking-wider uppercase font-semibold ${color}`}>
      {isApproved ? "Зачтено" : "Не зачтено"}
    </span>
  );
}

export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6 pb-3 border-b border-tactical-border">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-primary" />
        <div>
          <h2 className="font-oswald text-2xl font-semibold tracking-widest text-foreground uppercase">{title}</h2>
          {sub && <p className="text-muted-foreground text-sm font-ibm mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon, accent, bgImage, radar }: { label: string; value: string | number; icon: string; accent?: string; bgImage?: string; radar?: boolean }) {
  return (
    <div className="relative corner-mark bg-tactical-card border border-tactical-border p-4 card-glow overflow-hidden">
      {bgImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
          style={{ backgroundImage: `url("${bgImage}")` }}
        />
      )}
      {radar && (
        <div className="absolute right-0 bottom-0 w-24 h-24 opacity-10 pointer-events-none flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full text-primary stroke-current fill-none">
            <circle cx="50" cy="50" r="45" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="50" cy="50" r="30" strokeWidth="0.75" />
            <circle cx="50" cy="50" r="15" strokeWidth="0.5" />
            <line x1="50" y1="5" x2="50" y2="95" strokeWidth="0.75" />
            <line x1="5" y1="50" x2="95" y2="50" strokeWidth="0.75" />
          </svg>
        </div>
      )}
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-[10px] font-ibm uppercase tracking-widest mb-1">{label}</p>
          <p className={`font-oswald text-3xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
        </div>
        <div className="w-8 h-8 bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon name={icon} size={14} className="text-primary" />
        </div>
      </div>
    </div>
  );
}

export function OnlineStatus({ lastSeen }: { lastSeen?: string }) {
  if (!lastSeen) return <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-gray-500" />офлайн</span>;
  const lastSeenDate = new Date(lastSeen);
  const diffTime = Date.now() - lastSeenDate.getTime();
  const isOnline = diffTime < 5 * 60 * 1000;

  if (isOnline) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium font-ibm">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        онлайн
      </span>
    );
  }

  const timeStr = lastSeenDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  let dateText = "";
  if (lastSeenDate.toDateString() === today.toDateString()) {
    dateText = `сегодня в ${timeStr}`;
  } else if (lastSeenDate.toDateString() === yesterday.toDateString()) {
    dateText = `вчера в ${timeStr}`;
  } else {
    const formattedDate = lastSeenDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    dateText = `${formattedDate} в ${timeStr}`;
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
      был(а) {dateText}
    </span>
  );
}

export function InstructorAvatar({ 
  id,
  avatarUrl, 
  discordId, 
  role, 
  size = 24, 
  className = "" 
}: { 
  id?: number;
  avatarUrl?: string | null; 
  discordId?: string | null; 
  role?: string; 
  size?: number; 
  className?: string; 
}) {
  const [discordAvatar, setDiscordAvatar] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setImageError(false);
    setDiscordAvatar(null);
    
    if (avatarUrl) return;
    if (!discordId || !/^\d+$/.test(discordId)) return;

    setLoading(true);
    fetchDiscordProfile(discordId)
      .then((data) => {
        const url = data.avatar?.link || data.avatarUrl || null;
        setDiscordAvatar(url);
      })
      .catch((err) => {
        console.error("Error loading avatar from Discord:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [avatarUrl, discordId]);

  // If cadet and no custom/Discord avatar, assign a random FSVNG themed avatar based on ID
  const isCadet = role === "cadet";
  const defaultCadetAvatar = isCadet && id ? `/avatars/cadet${(id % 4) + 1}.png` : null;

  const targetUrl = avatarUrl || discordAvatar || defaultCadetAvatar;

  if (targetUrl && !imageError) {
    return (
      <img
        src={targetUrl}
        alt="Avatar"
        className={`object-cover rounded-full ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImageError(true)}
      />
    );
  }

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center bg-primary/5 animate-pulse rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        <Icon name="Loader2" size={size / 2} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center justify-center bg-primary/10 border border-primary/25 rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon 
        name={(role !== "cadet") ? "Shield" : "User"} 
        size={size * 0.55} 
        className="text-primary" 
      />
    </div>
  );
}
