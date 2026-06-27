import { useState, useEffect, useRef, MouseEvent } from "react";
import Icon from "@/components/ui/icon";
import { markAllNotificationsRead, markNotificationRead, Notification } from "@/lib/api";
import { useNotifications, queryKeys } from "@/lib/useQueries";
import { useQueryClient } from "@tanstack/react-query";
import { Section } from "./types";

function playNotificationSound() {
  try {
    const enabled = localStorage.getItem("avng_notification_sound") !== "false";
    if (!enabled) return;
    const audio = new Audio("/social-media-logout-sound.mp3");
    audio.volume = 0.45;
    audio.play();
  } catch (_e) { /* silent */ }
}

function getSectionForNotif(n: Notification): { section: Section; requestId?: number } | null {
  const match = n.message.match(/request_id:(\d+)/);
  const requestId = match ? parseInt(match[1]) : undefined;
  if (n.type === "new_request") return { section: "instructor", requestId };
  if (n.type === "promotion_request") return { section: "instructor", requestId };
  if (n.type === "promotion_reviewed") return { section: "promotions" };
  if (n.type === "request_reviewed") {
    if (n.message.includes("лекци")) return { section: "lectures", requestId };
    if (n.message.includes("практик")) return { section: "practices", requestId };
    if (n.message.includes("экзамен") || n.message.includes("Экзамен")) return { section: "exams", requestId };
    if (n.message.includes("рапорт") || n.message.includes("Рапорт")) return { section: "reports", requestId };
    return { section: "instructor", requestId };
  }
  if (n.type === "grade_added") return { section: "grades" };
  return null;
}

function getNotifStyles(n: Notification) {
  const msg = n.message.toLowerCase();
  const title = n.title.toLowerCase();
  const isUnread = !n.is_read;
  
  if (msg.includes("увольн") || title.includes("увольн")) {
    return {
      iconColor: isUnread ? "text-red-400" : "text-red-800/60",
      dotColor: "bg-red-500",
      borderColor: "border-l-2 border-l-red-500/50",
      bgColor: isUnread ? "bg-red-950/20 hover:bg-red-950/30" : "hover:bg-red-950/10"
    };
  }
  if (msg.includes("практик") || title.includes("практик")) {
    return {
      iconColor: isUnread ? "text-blue-400" : "text-blue-800/60",
      dotColor: "bg-blue-500",
      borderColor: "border-l-2 border-l-blue-500/50",
      bgColor: isUnread ? "bg-blue-950/20 hover:bg-blue-950/30" : "hover:bg-blue-950/10"
    };
  }
  if (msg.includes("лекци") || title.includes("лекци") || msg.includes("запрос") || title.includes("запрос")) {
    return {
      iconColor: isUnread ? "text-yellow-400" : "text-yellow-800/60",
      dotColor: "bg-yellow-500",
      borderColor: "border-l-2 border-l-yellow-500/50",
      bgColor: isUnread ? "bg-yellow-950/20 hover:bg-yellow-950/30" : "hover:bg-yellow-950/10"
    };
  }
  if (msg.includes("экзамен") || title.includes("экзамен")) {
    return {
      iconColor: isUnread ? "text-purple-400" : "text-purple-800/60",
      dotColor: "bg-purple-500",
      borderColor: "border-l-2 border-l-purple-500/50",
      bgColor: isUnread ? "bg-purple-950/20 hover:bg-purple-950/30" : "hover:bg-purple-950/10"
    };
  }
  if (
    n.type === "promotion_request" ||
    n.type === "promotion_reviewed" ||
    msg.includes("повышен") ||
    title.includes("повышен") ||
    msg.includes("повышение") ||
    title.includes("повышение")
  ) {
    return {
      iconColor: isUnread ? "text-green-400" : "text-green-800/60",
      dotColor: "bg-green-500",
      borderColor: "border-l-2 border-l-green-500/50",
      bgColor: isUnread ? "bg-green-950/20 hover:bg-green-950/30" : "hover:bg-green-950/10"
    };
  }
  // Default to yellow for general requests/notifications
  return {
    iconColor: isUnread ? "text-yellow-400" : "text-muted-foreground",
    dotColor: "bg-yellow-400",
    borderColor: "border-l-2 border-l-yellow-500/30",
    bgColor: isUnread ? "bg-yellow-950/10 hover:bg-yellow-950/20" : "hover:bg-tactical-panel/50"
  };
}

export function NotificationBell({ onNavigate }: { onNavigate: (section: Section, requestId?: number) => void }) {
  // P1-7: Use shared React Query hook instead of manual polling.
  // useNotifications() already does refetchInterval: 30_000 and deduplicates
  // requests across all components using the same query key.
  const { data: notifData } = useNotifications();
  const qc = useQueryClient();
  const notifications = notifData?.notifications ?? [];
  const unreadCount = notifData?.unread_count ?? 0;

  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("avng_notification_sound");
      return val !== "false";
    }
    return true;
  });
  const prevUnreadRef = useRef<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Play sound when new unread notifications arrive
  useEffect(() => {
    if (prevUnreadRef.current !== null && unreadCount > prevUnreadRef.current) {
      playNotificationSound();
      setRinging(true);
      setTimeout(() => setRinging(false), 1200);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const toggleSound = (e: MouseEvent) => {
    e.stopPropagation();
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("avng_notification_sound", String(next));
      return next;
    });
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    prevUnreadRef.current = 0;
    qc.invalidateQueries({ queryKey: queryKeys.notifications });
  };

  const handleMarkOne = async (id: number) => {
    await markNotificationRead(id);
    prevUnreadRef.current = Math.max(0, unreadCount - 1);
    qc.invalidateQueries({ queryKey: queryKeys.notifications });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const typeIcon = (type: string) => {
    if (type === "grade_added") return "Star";
    if (type === "request_reviewed") return "FileCheck";
    if (type === "new_request") return "FilePlus";
    if (type === "promotion_request") return "Medal";
    if (type === "promotion_reviewed") return "Award";
    return "Bell";
  };

  return (
    <div ref={ref} className="relative">
      <style>{`
        @keyframes bell-ring {
          0%   { transform: rotate(0deg); }
          10%  { transform: rotate(18deg); }
          20%  { transform: rotate(-16deg); }
          30%  { transform: rotate(14deg); }
          40%  { transform: rotate(-12deg); }
          50%  { transform: rotate(10deg); }
          60%  { transform: rotate(-8deg); }
          70%  { transform: rotate(6deg); }
          80%  { transform: rotate(-4deg); }
          90%  { transform: rotate(2deg); }
          100% { transform: rotate(0deg); }
        }
        .bell-ringing { animation: bell-ring 0.6s ease-in-out; }
        @keyframes badge-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
        .badge-pulsing { animation: badge-pulse 0.6s ease-in-out infinite; }
      `}</style>

      <button
        onClick={() => setOpen((v) => !v)}
        className={`transition-colors relative ${unreadCount > 0 ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`}
      >
        <span className={ringing ? "bell-ringing inline-block origin-top" : "inline-block"}>
          <Icon name="Bell" size={16} />
        </span>
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-400 text-[7px] font-bold text-black flex items-center justify-center rounded-full ${ringing ? "badge-pulsing" : ""}`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-80 bg-tactical-panel border border-tactical-border shadow-2xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-tactical-border">
            <div className="flex items-center gap-2">
              <span className="font-ibm text-xs font-semibold uppercase tracking-widest text-foreground">
                Уведомления
              </span>
              <button
                onClick={toggleSound}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded flex items-center justify-center"
                title={soundEnabled ? "Выключить звук уведомлений" : "Включить звук уведомлений"}
              >
                <Icon name={soundEnabled ? "Volume2" : "VolumeX"} size={14} />
              </button>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-[10px] text-primary hover:text-primary/80 font-ibm transition-colors"
              >
                Прочитать все
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <Icon name="BellOff" size={20} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-ibm">Нет уведомлений</p>
              </div>
            ) : (
              notifications.map((n) => {
                const style = getNotifStyles(n);
                return (
                  <div
                    key={n.id}
                    className={`px-3 py-2.5 border-b border-tactical-border/50 flex gap-2.5 cursor-pointer transition-colors ${style.bgColor} ${style.borderColor}`}
                    onClick={() => {
                      if (!n.is_read) handleMarkOne(n.id);
                      const dest = getSectionForNotif(n);
                      if (dest) { setOpen(false); onNavigate(dest.section, dest.requestId); }
                    }}
                  >
                    <div className={`mt-0.5 flex-shrink-0 ${style.iconColor}`}>
                      <Icon name={typeIcon(n.type)} size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold font-ibm leading-tight ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-ibm leading-snug mt-0.5 break-words">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">
                        {formatTime(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${style.dotColor}`} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}