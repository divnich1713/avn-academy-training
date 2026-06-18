import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { testingApi, CadetDashboard, TimePerQuestion, ScoreDistribution } from "@/lib/testingApi";
import { TestingD3Stats } from "./TestingD3Stats";
import { toast } from "sonner";

export function TestingHistory() {
  const [dashboard, setDashboard] = useState<CadetDashboard | null>(null);
  const [timePerQuestion, setTimePerQuestion] = useState<TimePerQuestion[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dash = await testingApi.getCadetDashboard();
      setDashboard(dash);

      // Load D3 stats
      const [times, scores] = await Promise.all([
        testingApi.getD3TimePerQuestion(),
        testingApi.getD3ScoreDistribution(),
      ]);
      setTimePerQuestion(times);
      setScoreDistribution(scores);
    } catch (err: any) {
      toast.error("Ошибка загрузки статистики: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Icon name="Loader2" className="text-primary animate-spin" size={36} />
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="corner-mark bg-tactical-card border border-tactical-border p-4 card-glow flex items-center justify-between">
          <div>
            <span className="text-muted-foreground text-[10px] font-mono uppercase block">Накопленный % освоения</span>
            <span className="text-xl font-bold font-oswald text-primary mt-1">{dashboard.mastery_percent}%</span>
          </div>
          <Icon name="CheckSquare" className="text-primary" size={32} />
        </div>

        <div className="corner-mark bg-tactical-card border border-tactical-border p-4 card-glow flex items-center justify-between">
          <div>
            <span className="text-muted-foreground text-[10px] font-mono uppercase block">Рейтинг в группе</span>
            <span className="text-xl font-bold font-oswald text-gold mt-1">{dashboard.rank_in_group}</span>
          </div>
          <Icon name="TrendingUp" className="text-gold" size={32} />
        </div>

        <div className="corner-mark bg-tactical-card border border-tactical-border p-4 card-glow flex items-center justify-between">
          <div>
            <span className="text-muted-foreground text-[10px] font-mono uppercase block">Перцентиль (успеваемость)</span>
            <span className="text-xl font-bold font-oswald text-blue-400 mt-1">Топ {100 - dashboard.percentile}%</span>
          </div>
          <Icon name="Award" className="text-blue-400" size={32} />
        </div>
      </div>

      {/* Subject Mastery Progress Bars */}
      <div className="corner-mark bg-tactical-card border border-tactical-border p-6 card-glow space-y-4">
        <h4 className="font-oswald text-base tracking-wide uppercase text-foreground">
          Уровень освоения по темам
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(dashboard.subject_mastery).map(([sub, pct]) => (
            <div key={sub} className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">{sub}</span>
                <span className="text-primary font-semibold">{pct}%</span>
              </div>
              <div className="h-1.5 bg-tactical-panel border border-tactical-border/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* D3 Stats Charts */}
      <div className="space-y-4">
        <h4 className="font-oswald text-base tracking-wide uppercase text-foreground">
          Общая визуальная статистика академии
        </h4>
        <TestingD3Stats
          timePerQuestion={timePerQuestion}
          scoreDistribution={scoreDistribution}
        />
      </div>

      {/* Attempts Table */}
      <div className="corner-mark bg-tactical-card border border-tactical-border p-6 card-glow space-y-4">
        <h4 className="font-oswald text-base tracking-wide uppercase text-foreground">
          История прохождений тестов
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-tactical-border bg-tactical-panel/40">
                <th className="p-3 text-muted-foreground uppercase font-semibold">Дата</th>
                <th className="p-3 text-muted-foreground uppercase font-semibold">Предупреждения</th>
                <th className="p-3 text-muted-foreground uppercase font-semibold">Средний балл</th>
                <th className="p-3 text-muted-foreground uppercase font-semibold">Статус</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.attempts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Вы ещё не проходили тестирование.
                  </td>
                </tr>
              ) : (
                dashboard.attempts.map((att) => (
                  <tr key={att.id} className="border-b border-tactical-border/50 hover:bg-tactical-panel/20">
                    <td className="p-3">{new Date(att.started_at).toLocaleDateString("ru-RU")}</td>
                    <td className="p-3">{att.warnings_count} / 3</td>
                    <td className="p-3">{att.status === "completed" ? `${att.avg_score}%` : "—"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 border text-[10px] uppercase font-bold ${
                          att.status === "completed"
                            ? "bg-primary/10 border-primary text-primary"
                            : att.status === "aborted"
                            ? "bg-destructive/10 border-destructive text-destructive"
                            : "bg-gold/10 border-gold text-gold"
                        }`}
                      >
                        {att.status === "completed" ? "Завершен" : att.status === "aborted" ? "Аннулирован" : "В процессе"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
