import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { SectionHeader, InstructorAvatar } from "./UIComponents";
import { fetchRatings, InstructorRating, User } from "@/lib/api";
import { Spinner, Empty } from "./SectionsShared";

type Timeframe = "daily" | "weekly" | "monthly" | "yearly";

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  daily: "За сегодня",
  weekly: "За неделю",
  monthly: "За месяц",
  yearly: "За год",
};

// ═══════════════════════════════════════════════════════════════════════════════
// INSTRUCTOR RATING VIEW (для вкладки инструктора)
// ═══════════════════════════════════════════════════════════════════════════════
export function InstructorRatingView({ instructorId }: { instructorId?: number }) {
  const [timeframe, setTimeframe] = useState<Timeframe>("weekly");
  const [instructors, setInstructors] = useState<InstructorRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRatings(timeframe)
      .then((res) => setInstructors(res.instructors))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [timeframe]);

  const me = instructors.find((i) => i.id === instructorId);
  const myRankIndex = instructors.findIndex((i) => i.id === instructorId);

  return (
    <div className="animate-fade-in space-y-4">
      {/* Timeframe Selector */}
      <div className="flex gap-1.5 bg-tactical-panel border border-tactical-border p-1 max-w-sm">
        {(["daily", "weekly", "monthly", "yearly"] as Timeframe[]).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`flex-1 text-center font-oswald text-xs tracking-wider uppercase py-1.5 transition-colors ${
              timeframe === tf
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {TIMEFRAME_LABELS[tf]}
          </button>
        ))}
      </div>

      {/* My rating summary card */}
      {me && (
        <div className="bg-tactical-card border border-primary/30 p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 flex items-center justify-center mb-2 overflow-hidden rounded-full">
              <InstructorAvatar 
                avatarUrl={me.avatar_url} 
                discordId={me.discord_id} 
                role="instructor" 
                size={64} 
                className="w-full h-full" 
              />
            </div>
            <p className="font-oswald text-base text-foreground tracking-wide">{me.rank} {me.name}</p>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-tactical-panel border border-tactical-border p-3 text-center">
              <p className="font-oswald text-3xl text-yellow-400">{me.points}</p>
              <p className="rank-badge text-muted-foreground mt-1">Очки рейтинга</p>
            </div>
            <div className="bg-tactical-panel border border-tactical-border p-3 text-center">
              <p className="font-oswald text-3xl text-primary">{me.lectures_count + me.practices_count + me.exams_count}</p>
              <p className="rank-badge text-muted-foreground mt-1">Проведено занятий</p>
            </div>
            <div className="bg-tactical-panel border border-tactical-border p-3 text-center">
              <p className="font-oswald text-3xl text-green-400">{me.reviews_count}</p>
              <p className="rank-badge text-muted-foreground mt-1">Проверено рапортов</p>
            </div>
            <div className="bg-tactical-panel border border-tactical-border p-3 text-center">
              <p className="font-oswald text-3xl text-primary">#{myRankIndex + 1}</p>
              <p className="rank-badge text-muted-foreground mt-1">Место в рейтинге</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground">
        Рейтинг инструкторов ({TIMEFRAME_LABELS[timeframe].toLowerCase()})
      </h3>
      {loading ? (
        <Spinner />
      ) : instructors.length === 0 ? (
        <Empty text="Нет данных рейтинга за выбранный период" />
      ) : (
        <div className="bg-tactical-card border border-tactical-border overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-tactical-border bg-tactical-panel">
                <th className="text-center px-3 py-3 rank-badge text-muted-foreground w-10">#</th>
                <th className="text-left px-4 py-3 rank-badge text-muted-foreground">Инструктор</th>
                <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Лекции (5б)</th>
                <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Практики (5б)</th>
                <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Экзамены (10б)</th>
                <th className="text-center px-4 py-3 rank-badge text-muted-foreground">Рапорты (2б)</th>
                <th className="text-center px-4 py-3 rank-badge text-muted-foreground font-semibold text-yellow-400">Всего баллов</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((inst, idx) => (
                <tr
                  key={inst.id}
                  className={`border-b border-tactical-border last:border-0 transition-colors ${
                    inst.id === instructorId ? "bg-primary/10" : "hover:bg-primary/5"
                  }`}
                >
                  <td className="px-3 py-3 text-center font-oswald text-sm text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <InstructorAvatar 
                        avatarUrl={inst.avatar_url} 
                        discordId={inst.discord_id} 
                        role="instructor" 
                        size={32} 
                        className="w-8 h-8 rounded-full border border-tactical-border bg-tactical-panel" 
                      />
                      <div>
                        <p className="text-sm font-ibm text-foreground">{inst.rank} {inst.name}</p>
                        {inst.unit && <p className="text-xs text-muted-foreground font-mono">{inst.unit}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-mono text-muted-foreground">{inst.lectures_count}</td>
                  <td className="px-4 py-3 text-center text-sm font-mono text-muted-foreground">{inst.practices_count}</td>
                  <td className="px-4 py-3 text-center text-sm font-mono text-muted-foreground">{inst.exams_count}</td>
                  <td className="px-4 py-3 text-center text-sm font-mono text-muted-foreground">{inst.reviews_count}</td>
                  <td className="px-4 py-3 text-center font-oswald text-base text-yellow-400">{inst.points}</td>
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
// INSTRUCTOR RATINGS (Заглушка, так как курсанты больше не ставят оценки)
// ═══════════════════════════════════════════════════════════════════════════════
export function InstructorRatings({ authUser }: { authUser?: User }) {
  const isInstructor = authUser && ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "senior_ufsvng"].includes(authUser.role);
  const instructorId = isInstructor ? authUser.id : undefined;

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader title="Рейтинг инструкторов" sub="Система баллов за академическую активность" />
      
      {/* Information Banner */}
      <div className="bg-tactical-card border border-tactical-border/60 p-4 flex gap-3 items-start text-xs md:text-sm text-muted-foreground relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/80" />
        <div className="w-5 h-5 text-yellow-500/80 flex-shrink-0 flex items-center justify-center">
          <Icon name="Info" size={18} />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground text-xs font-mono uppercase tracking-wide">Автоматический расчет активности</p>
          <p className="leading-relaxed text-muted-foreground">
            Ручная оценка инструкторов курсантами отключена. Рейтинг строится автоматически на основе учебных мероприятий:
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 pt-2 border-t border-tactical-border/40 font-mono text-[10px] text-yellow-500/80">
            <span>• Лекция: <strong className="text-foreground">5б</strong></span>
            <span>• Практика: <strong className="text-foreground">5б</strong></span>
            <span>• Экзамен: <strong className="text-foreground">10б</strong></span>
            <span>• Проверка рапорта: <strong className="text-foreground">2б</strong></span>
          </div>
        </div>
      </div>

      <InstructorRatingView instructorId={instructorId} />
    </div>
  );
}
