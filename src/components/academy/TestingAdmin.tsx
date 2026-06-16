import React, { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { testingApi, AdminAttempt, TopicDifficulty, TimePerQuestion, ScoreDistribution } from "@/lib/testingApi";
import { TestingD3Stats } from "./TestingD3Stats";
import { toast } from "sonner";

interface AdminProps {
  onNavigate?: (tab: string) => void;
}

export function TestingAdmin({ onNavigate }: AdminProps) {
  const [attempts, setAttempts] = useState<AdminAttempt[]>([]);
  const [topicDifficulty, setTopicDifficulty] = useState<TopicDifficulty[]>([]);
  const [timePerQuestion, setTimePerQuestion] = useState<TimePerQuestion[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await testingApi.getAdminDashboard();
      setAttempts(res.attempts);

      const [topics, times, scores] = await Promise.all([
        testingApi.getD3TopicDifficulty(),
        testingApi.getD3TimePerQuestion(),
        testingApi.getD3ScoreDistribution(),
      ]);
      setTopicDifficulty(topics);
      setTimePerQuestion(times);
      setScoreDistribution(scores);
    } catch (err: any) {
      toast.error("Ошибка загрузки данных администратора: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique units for filter
  const units = ["Все", ...Array.from(new Set(attempts.map((att) => att.unit).filter(Boolean)))];

  // Filter and sort attempts
  const filteredAttempts = attempts.filter((att) => {
    const matchesSearch =
      att.cadet_name.toLowerCase().includes(search.toLowerCase()) ||
      att.static_id.includes(search);
    const matchesUnit = unitFilter === "Все" || att.unit === unitFilter;
    const matchesStatus = statusFilter === "Все" || att.status === statusFilter;
    return matchesSearch && matchesUnit && matchesStatus;
  });

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = ["ID Курсанта", "ФИО", "Звание", "Взвод", "Начальный ELO", "Конечный ELO", "Сложность", "Средний балл %", "Предупреждения", "Статус", "Дата начала"];
      const rows = filteredAttempts.map((att) => [
        att.static_id,
        att.cadet_name,
        att.rank || "",
        att.unit || "",
        att.start_elo,
        att.end_elo || "",
        att.difficulty,
        att.status === "completed" ? att.score_percent : "",
        att.status === "completed" ? "—" : "В процессе",
        att.status,
        new Date(att.started_at).toLocaleDateString("ru-RU"),
      ]);

      const csvContent =
        "\uFEFF" + // UTF-8 BOM
        [headers.join(";"), ...rows.map((row) => row.map((val) => `"${val}"`).join(";"))].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `test_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV успешно экспортирован!");
    } catch (err: any) {
      toast.error("Ошибка экспорта CSV: " + err.message);
    }
  };

  // Export/Print to PDF using a clean styled print window
  const handleExportPDF = () => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Не удалось открыть окно печати. Разрешите всплывающие окна в браузере.");
        return;
      }

      const rowsHTML = filteredAttempts
        .map(
          (att) => `
        <tr>
          <td>${att.static_id}</td>
          <td>${att.cadet_name}</td>
          <td>${att.rank || "—"}</td>
          <td>${att.unit || "—"}</td>
          <td>${att.difficulty}</td>
          <td>${att.start_elo} &rarr; ${att.end_elo || "—"}</td>
          <td>${att.status === "completed" ? att.score_percent + "%" : "—"}</td>
          <td>${att.status}</td>
          <td>${new Date(att.started_at).toLocaleDateString("ru-RU")}</td>
        </tr>
      `
        )
        .join("");

      printWindow.document.write(`
        <html>
          <head>
            <title>Сводный отчет по тестированию курсантов</title>
            <style>
              body { font-family: Arial, sans-serif; color: #111; margin: 20px; }
              h2 { text-align: center; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
              .meta { text-align: center; font-size: 12px; color: #555; margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              tr:nth-child(even) { background-color: #fafafa; }
              .summary { display: flex; justify-content: space-around; margin-bottom: 20px; background: #f9f9f9; padding: 15px; border: 1px solid #eaeaea; }
              .summary-item { text-align: center; }
              .summary-val { font-size: 18px; font-weight: bold; color: #0088cc; }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <h2>Сводный отчет по успеваемости</h2>
            <div class="meta">Академия АВНГ &bull; Сформирован: ${new Date().toLocaleDateString("ru-RU")} ${new Date().toLocaleTimeString("ru-RU")}</div>
            
            <div class="summary">
              <div class="summary-item">
                <div class="summary-val">${filteredAttempts.length}</div>
                <div>Всего сессий</div>
              </div>
              <div class="summary-item">
                <div class="summary-val">
                  ${
                    filteredAttempts.filter((a) => a.status === "completed").length
                  }
                </div>
                <div>Сдано тестов</div>
              </div>
              <div class="summary-item">
                <div class="summary-val">
                  ${Math.round(
                    filteredAttempts.reduce((acc, a) => acc + (a.end_elo || 1000), 0) /
                      (filteredAttempts.length || 1)
                  )} ELO
                </div>
                <div>Средний ELO рейтинг</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Static ID</th>
                  <th>ФИО курсанта</th>
                  <th>Звание</th>
                  <th>Взвод</th>
                  <th>Сложность</th>
                  <th>ELO Прогресс</th>
                  <th>Средний балл</th>
                  <th>Статус</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML}
              </tbody>
            </table>
            
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err: any) {
      toast.error("Ошибка генерации PDF: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Icon name="Loader2" className="text-primary animate-spin" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Visual Stats Block */}
      <div className="space-y-4">
        <h4 className="font-oswald text-base tracking-wide uppercase text-gold">
          Аналитический дашборд успеваемости
        </h4>
        <TestingD3Stats
          topicDifficulty={topicDifficulty}
          timePerQuestion={timePerQuestion}
          scoreDistribution={scoreDistribution}
        />
      </div>

      {/* Control panel for filters & exports */}
      <div className="corner-mark bg-tactical-card border border-tactical-border p-4 card-glow space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Поиск по ФИО / Static ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-tactical-panel border border-tactical-border text-foreground font-mono text-xs px-3 py-2 focus:outline-none focus:border-primary w-full sm:w-[220px]"
            />

            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="bg-tactical-panel border border-tactical-border text-foreground font-mono text-xs p-2 focus:outline-none focus:border-primary"
            >
              {units.map((u, i) => (
                <option key={i} value={u}>{u === "Все" ? "Все взводы" : u}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-tactical-panel border border-tactical-border text-foreground font-mono text-xs p-2 focus:outline-none focus:border-primary"
            >
              <option value="Все">Все статусы</option>
              <option value="completed">Завершен</option>
              <option value="in_progress">В процессе</option>
              <option value="aborted">Аннулирован</option>
            </select>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              className="bg-tactical-panel hover:bg-tactical-border text-gold border border-gold/30 font-mono text-xs uppercase px-4 py-2 transition-all flex items-center gap-1.5"
            >
              <Icon name="Download" size={12} /> Экспорт CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs uppercase px-4 py-2 transition-all flex items-center gap-1.5 border border-primary/20"
            >
              <Icon name="FileText" size={12} /> Отчет PDF
            </button>
          </div>
        </div>

        {/* Results table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-tactical-border bg-tactical-panel/40">
                <th className="p-3 text-muted-foreground uppercase font-semibold">Static ID</th>
                <th className="p-3 text-muted-foreground uppercase font-semibold">ФИО</th>
                <th className="p-3 text-muted-foreground uppercase font-semibold">Звание / Взвод</th>
                <th className="p-3 text-muted-foreground uppercase font-semibold">Прогресс ELO</th>
                <th className="p-3 text-muted-foreground uppercase font-semibold">Сложность</th>
                <th className="p-3 text-muted-foreground uppercase font-semibold">Результат</th>
                <th className="p-3 text-muted-foreground uppercase font-semibold">Дата</th>
                <th className="p-3 text-muted-foreground uppercase font-semibold">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Сессий тестирования не найдено по выбранным фильтрам.
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((att) => (
                  <tr key={att.attempt_id} className="border-b border-tactical-border/50 hover:bg-tactical-panel/20">
                    <td className="p-3 font-semibold">{att.static_id}</td>
                    <td className="p-3">{att.cadet_name}</td>
                    <td className="p-3 text-muted-foreground">
                      {att.rank} <span className="text-gold">/</span> {att.unit}
                    </td>
                    <td className="p-3">
                      <span className="text-muted-foreground">{att.start_elo}</span> &rarr;{" "}
                      <span className="text-gold font-bold">{att.end_elo || "—"}</span>
                    </td>
                    <td className="p-3">{att.difficulty}</td>
                    <td className="p-3 font-bold text-primary">
                      {att.status === "completed" ? `${att.score_percent}%` : "—"}
                    </td>
                    <td className="p-3">{new Date(att.started_at).toLocaleDateString("ru-RU")}</td>
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
                        {att.status === "completed" ? "Сдал" : att.status === "aborted" ? "Списал" : "В процессе"}
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
