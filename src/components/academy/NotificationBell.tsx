import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, Notification } from "@/lib/api";
import { Section } from "./types";

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const gain = ctx.createGain();
    o1.connect(gain);
    o2.connect(gain);
    gain.connect(ctx.destination);
    o1.type = "sine";
    o2.type = "sine";
    o1.frequency.setValueAtTime(880, ctx.currentTime);
    o1.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    o2.frequency.setValueAtTime(1100, ctx.currentTime + 0.18);
    o2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o1.start(ctx.currentTime);
    o1.stop(ctx.currentTime + 0.18);
    o2.start(ctx.currentTime + 0.18);
    o2.stop(ctx.currentTime + 0.4);
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

export function NotificationBell({ onNavigate }: { onNavigate: (section: Section, requestId?: number) => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const prevUnreadRef = useRef<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount((_prev) => {
        const incoming = data.unread_count;
        if (prevUnreadRef.current !== null && incoming > prevUnreadRef.current) {
          playNotificationSound();
          setRinging(true);
          setTimeout(() => setRinging(false), 1200);
        }
        prevUnreadRef.current = incoming;
        return incoming;
      });
    } catch (_e) { /* silent */ }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

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
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    prevUnreadRef.current = 0;
  };

  const handleMarkOne = async (id: number) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => {
      const next = Math.max(0, c - 1);
      prevUnreadRef.current = next;
      return next;
    });
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
            <span className="font-ibm text-xs font-semibold uppercase tracking-widest text-foreground">
              Уведомления
            </span>
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
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-3 py-2.5 border-b border-tactical-border/50 flex gap-2.5 cursor-pointer hover:bg-primary/5 transition-colors ${
                    !n.is_read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    if (!n.is_read) handleMarkOne(n.id);
                    const dest = getSectionForNotif(n);
                    if (dest) { setOpen(false); onNavigate(dest.section, dest.requestId); }
                  }}
                >
                  <div className={`mt-0.5 flex-shrink-0 ${!n.is_read ? "text-yellow-400" : "text-muted-foreground"}`}>
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
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}