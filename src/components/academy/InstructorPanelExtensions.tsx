import React, { useState } from "react";
import { useAnalyticsSummary, useAuditLogs, useMonitoringAlerts, useBulkUpdateUsers, useBulkImportUsers } from "@/lib/useQueries";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import Icon from "@/components/ui/icon";
import { toast } from "@/hooks/use-toast";

// ─── ANALYTICS TAB ─────────────────────────────────────────────────────────────
export function AnalyticsTab() {
  const { data: stats, isLoading: statsLoading } = useAnalyticsSummary();
  const { data: alerts = [], isLoading: alertsLoading } = useMonitoringAlerts();

  if (statsLoading || alertsLoading) {
    return (
      <div className="flex justify-center items-center p-12 text-muted-foreground font-mono text-sm">
        <Icon name="Loader2" className="animate-spin mr-2" /> Загрузка тактических данных...
      </div>
    );
  }

  // Formatting chart data
  const chartData = [
    { name: "Всего попыток", value: stats?.total_attempts || 0, color: "#eab308" },
    { name: "Завершено", value: stats?.completed_attempts || 0, color: "#22c55e" },
    { name: "Сдано (>=80%)", value: Math.round(((stats?.completed_attempts || 0) * (stats?.pass_rate || 0)) / 100), color: "#3b82f6" },
  ];

  return (
    <div className="space-y-6 mt-4">
      {/* Alerts / Guardrails Section */}
      {alerts.length > 0 && (
        <div className="border border-red-950/40 bg-red-950/10 p-4 rounded backdrop-blur-sm space-y-3">
          <div className="flex items-center text-red-400 font-oswald text-sm tracking-wider uppercase">
            <Icon name="AlertTriangle" className="mr-2 text-red-500 animate-pulse" size={18} />
            Критические алерты мониторинга успеваемости ({alerts.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alert) => (
              <div 
                key={alert.user_id + alert.type} 
                className={`p-3 rounded border text-xs font-mono flex items-start justify-between ${
                  alert.severity === "critical" 
                    ? "bg-red-950/30 border-red-800/40 text-red-200" 
                    : "bg-yellow-950/20 border-yellow-800/30 text-yellow-200"
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1">
                    <span className="text-muted-foreground">[{alert.static_id}]</span>
                    {alert.rank} {alert.name}
                  </div>
                  <div className="mt-1 opacity-90">{alert.message}</div>
                </div>
                <div className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-current opacity-80">
                  {alert.severity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-tactical-card/30 border border-tactical-border p-4 rounded font-mono">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Всего тестов</div>
          <div className="text-2xl font-bold text-primary mt-1">{stats?.total_attempts}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Все запущенные сессии</div>
        </div>
        <div className="bg-tactical-card/30 border border-tactical-border p-4 rounded font-mono">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Завершено</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats?.completed_attempts}</div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {stats?.total_attempts ? Math.round(((stats.completed_attempts) / stats.total_attempts) * 100) : 0}% от общего числа
          </div>
        </div>
        <div className="bg-tactical-card/30 border border-tactical-border p-4 rounded font-mono">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Успешность (Pass Rate)</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats?.pass_rate}%</div>
          <div className="text-[10px] text-muted-foreground mt-1">Проходной балл &gt;= 80%</div>
        </div>
        <div className="bg-tactical-card/30 border border-tactical-border p-4 rounded font-mono">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Средний балл</div>
          <div className="text-2xl font-bold text-gold mt-1">{stats?.avg_score}%</div>
          <div className="text-[10px] text-muted-foreground mt-1">Средняя оценка за все попытки</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 bg-tactical-card/20 border border-tactical-border p-4 rounded flex flex-col justify-between">
          <div className="text-sm font-oswald tracking-wide uppercase text-muted-foreground mb-4">
            Распределение активности тестирования
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                <XAxis type="number" stroke="#4b5563" className="font-mono text-[10px]" />
                <YAxis dataKey="name" type="category" stroke="#4b5563" className="font-mono text-[10px]" width={110} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", color: "#f3f4f6" }}
                  itemStyle={{ color: "#fbbf24" }}
                />
                <Bar dataKey="value" barSize={24} radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Active Instructors */}
        <div className="bg-tactical-card/20 border border-tactical-border p-4 rounded space-y-4">
          <div className="text-sm font-oswald tracking-wide uppercase text-muted-foreground">
            Активность инструкторов (Audit Actions)
          </div>
          <div className="space-y-2 font-mono text-xs">
            {stats?.instructor_activity.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">Нет данных об активности</div>
            ) : (
              stats?.instructor_activity.map((inst, index) => (
                <div key={inst.name} className="flex justify-between items-center p-2 rounded bg-tactical-card/30 border border-tactical-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-bold">#{index + 1}</span>
                    <span>{inst.name}</span>
                  </div>
                  <span className="bg-primary/20 text-primary font-bold px-2 py-0.5 rounded">{inst.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Most Complex Questions */}
      <div className="bg-tactical-card/20 border border-tactical-border p-4 rounded space-y-4">
        <div className="text-sm font-oswald tracking-wide uppercase text-muted-foreground flex items-center">
          <Icon name="Skull" size={16} className="mr-2 text-red-400" />
          ТОП-10 самых сложных вопросов тестирования
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-tactical-border text-muted-foreground uppercase text-[10px] tracking-wider">
                <th className="p-2">Тема</th>
                <th className="p-2">Текст вопроса</th>
                <th className="p-2 text-center">Ответов</th>
                <th className="p-2 text-center">Средний балл</th>
                <th className="p-2 text-center">Рейтинг ELO</th>
              </tr>
            </thead>
            <tbody>
              {stats?.complex_questions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">Нет данных для анализа</td>
                </tr>
              ) : (
                stats?.complex_questions.map((q) => (
                  <tr key={q.id} className="border-b border-tactical-border/30 hover:bg-tactical-card/40">
                    <td className="p-2 text-primary font-semibold">{q.subject}</td>
                    <td className="p-2 max-w-md truncate text-foreground/90" title={q.question_text}>{q.question_text}</td>
                    <td className="p-2 text-center font-bold">{q.total_answers}</td>
                    <td className="p-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded ${q.avg_score < 40 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}`}>
                        {q.avg_score}%
                      </span>
                    </td>
                    <td className="p-2 text-center text-gold font-bold">{q.elo_rating}</td>
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


// ─── AUDIT LOG TAB ─────────────────────────────────────────────────────────────
export function AuditLogTab() {
  const [skip, setSkip] = useState(0);
  const [limit] = useState(25);
  const [filterAction, setFilterAction] = useState("all");
  const [searchOperator, setSearchOperator] = useState("");

  const { data, isLoading } = useAuditLogs(skip, limit, filterAction, searchOperator);

  const handleNextPage = () => {
    if (data && skip + limit < data.total) {
      setSkip(skip + limit);
    }
  };

  const handlePrevPage = () => {
    if (skip - limit >= 0) {
      setSkip(skip - limit);
    }
  };

  const formatAction = (act: string) => {
    const map: Record<string, string> = {
      approve_request: "Одобрил запрос",
      reject_request: "Отклонил запрос",
      take_request_review: "Взял на рассмотрение",
      cancel_request_review: "Отменил рассмотрение",
      create_user: "Создал пользователя",
      update_user: "Изменил пользователя",
      delete_user: "Удалил пользователя",
      bulk_update: "Массовое обновление",
      bulk_import: "Массовый импорт CSV",
    };
    return map[act] || act;
  };

  const getActionBadge = (act: string) => {
    if (act.includes("delete") || act.includes("reject")) {
      return "bg-red-500/10 text-red-400 border border-red-500/20";
    }
    if (act.includes("create") || act.includes("approve") || act.includes("import")) {
      return "bg-green-500/10 text-green-400 border border-green-500/20";
    }
    return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-tactical-card/10 border border-tactical-border/50 p-3 rounded font-mono text-xs">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-muted-foreground whitespace-nowrap">Администратор:</span>
          <input
            type="text"
            className="flex-1 bg-tactical-input/50 border border-tactical-border rounded px-2 py-1 text-foreground placeholder-muted-foreground outline-none focus:border-primary"
            placeholder="Введите имя или позывной..."
            value={searchOperator}
            onChange={(e) => {
              setSearchOperator(e.target.value);
              setSkip(0);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Действие:</span>
          <select
            className="bg-tactical-input/50 border border-tactical-border rounded px-2 py-1 text-foreground outline-none focus:border-primary"
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setSkip(0);
            }}
          >
            <option value="all">Все действия</option>
            <option value="approve_request">Одобрение запроса</option>
            <option value="reject_request">Отклонение запроса</option>
            <option value="take_request_review">Взятие в работу</option>
            <option value="cancel_request_review">Отмена работы</option>
            <option value="create_user">Создание пользователя</option>
            <option value="update_user">Изменение пользователя</option>
            <option value="delete_user">Удаление пользователя</option>
            <option value="bulk_update">Массовое обновление</option>
            <option value="bulk_import">Импорт CSV</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-tactical-card/20 border border-tactical-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-tactical-border bg-tactical-card/45 text-muted-foreground uppercase text-[10px] tracking-wider">
                <th className="p-3">Время (UTC)</th>
                <th className="p-3">Инициатор</th>
                <th className="p-3">Действие</th>
                <th className="p-3">Объект</th>
                <th className="p-3">Детали</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    <Icon name="Loader2" className="animate-spin mr-2 inline-block" /> Загрузка логов аудита...
                  </td>
                </tr>
              ) : !data || data.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">Нет записей в журнале аудита</td>
                </tr>
              ) : (
                data.logs.map((log: any) => {
                  const dateStr = new Date(log.created_at).toLocaleString("ru-RU", { timeZone: "UTC" });
                  return (
                    <tr key={log.id} className="border-b border-tactical-border/30 hover:bg-tactical-card/40">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{dateStr}</td>
                      <td className="p-3 font-semibold text-foreground/90">{log.operator_name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getActionBadge(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {log.target_name ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{log.target_name}</span>
                            {log.target_id && <span className="text-[10px] text-muted-foreground">ID: {log.target_id}</span>}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-foreground/80 max-w-sm break-words">
                        {log.details ? (
                          <pre className="text-[10px] font-sans bg-black/30 p-1.5 rounded max-h-24 overflow-y-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data && data.total > limit && (
          <div className="flex items-center justify-between p-3 border-t border-tactical-border bg-tactical-card/30 font-mono text-xs text-muted-foreground">
            <div>
              Показано {skip + 1}—{Math.min(skip + limit, data.total)} из {data.total} записей
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={skip === 0}
                className="px-3 py-1 border border-tactical-border rounded hover:bg-tactical-card/50 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Назад
              </button>
              <button
                onClick={handleNextPage}
                disabled={skip + limit >= data.total}
                className="px-3 py-1 border border-tactical-border rounded hover:bg-tactical-card/50 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Вперед
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── BULK OPERATIONS & DIALOGS ──────────────────────────────────────────────────
interface BulkActionsBarProps {
  selectedIds: number[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export function BulkActionsBar({ selectedIds, onClearSelection, onSuccess }: BulkActionsBarProps) {
  const [rank, setRank] = useState("");
  const [unit, setUnit] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);

  const bulkMutation = useBulkUpdateUsers();

  const handleApply = async () => {
    if (!action && !rank && !unit) {
      toast({ title: "Ошибка", description: "Выберите действие или параметры для смены", variant: "destructive" });
      return;
    }
    if (action === "warn" && !reason) {
      toast({ title: "Ошибка", description: "Укажите причину предупреждения", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await bulkMutation.mutateAsync({
        user_ids: selectedIds,
        rank: rank || null,
        unit: unit || null,
        action: action || null,
        reason: reason || null,
      });
      toast({ title: "Успех", description: `Обновлено ${res.count} пользователей.` });
      onClearSelection();
      onSuccess();
    } catch (err: any) {
      toast({ title: "Ошибка применения", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setAction("");
      setRank("");
      setUnit("");
      setReason("");
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-tactical-card border border-primary/50 shadow-2xl shadow-black p-4 rounded-lg flex flex-col md:flex-row items-center gap-3 w-[90%] md:w-auto min-w-[500px] font-mono text-xs backdrop-blur-md">
      <div className="flex items-center gap-2 border-r border-tactical-border/70 pr-3 mr-1">
        <span className="bg-primary/20 text-primary font-bold px-2 py-1 rounded">
          {selectedIds.length}
        </span>
        <span className="text-muted-foreground whitespace-nowrap">Выбрано</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="bg-tactical-input border border-tactical-border rounded px-2 py-1.5 outline-none focus:border-primary text-foreground"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            if (e.target.value) {
              setRank("");
              setUnit("");
            }
          }}
        >
          <option value="">Действие...</option>
          <option value="warn">Выдать предупреждение</option>
          <option value="dismiss">Массово уволить</option>
          <option value="whitelist">Вайтлист (активировать)</option>
          <option value="delete">Удалить из системы</option>
        </select>

        {!action && (
          <>
            <select
              className="bg-tactical-input border border-tactical-border rounded px-2 py-1.5 outline-none focus:border-primary text-foreground"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
            >
              <option value="">Ранг...</option>
              <option value="Рядовой">Рядовой</option>
              <option value="Ефрейтор">Ефрейтор</option>
              <option value="Мл. Сержант">Мл. Сержант</option>
              <option value="Сержант">Сержант</option>
              <option value="Ст. Сержант">Ст. Сержант</option>
              <option value="Старшина">Старшина</option>
              <option value="Мл. Лейтенант">Мл. Лейтенант</option>
              <option value="Лейтенант">Лейтенант</option>
            </select>
          </>
        )}

        {!action && (
          <select
            className="bg-tactical-input border border-tactical-border rounded px-2 py-1.5 outline-none focus:border-primary text-foreground"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          >
            <option value="">Подразделение...</option>
            <option value="АВНГ">АВНГ</option>
            <option value="ОГ">ОГ</option>
            <option value="УС">УС</option>
            <option value="СП">СП</option>
            <option value="УС ФСВНГ">УС ФСВНГ</option>
          </select>
        )}

        {action === "warn" && (
          <input
            type="text"
            placeholder="Причина..."
            className="bg-tactical-input border border-tactical-border rounded px-2 py-1.5 outline-none focus:border-primary text-foreground w-40 placeholder:text-muted-foreground"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
      </div>

      <div className="flex gap-2 ml-auto">
        <button
          onClick={handleApply}
          disabled={loading}
          className="bg-primary hover:bg-primary/95 text-black font-bold px-3 py-1.5 rounded transition-colors disabled:opacity-50"
        >
          {loading ? "Применение..." : "Применить"}
        </button>
        <button
          onClick={onClearSelection}
          disabled={loading}
          className="border border-tactical-border hover:bg-tactical-card/50 px-3 py-1.5 rounded transition-colors text-muted-foreground hover:text-foreground"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}


interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkImportDialog({ isOpen, onClose, onSuccess }: BulkImportDialogProps) {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Array<{ static_id: string; name: string; rank: string; unit: string }>>([]);
  const [error, setError] = useState("");

  const importMutation = useBulkImportUsers();

  const handleParse = () => {
    setError("");
    if (!csvText.trim()) {
      setPreview([]);
      return;
    }

    const rows = csvText.split("\n");
    const list: typeof preview = [];

    for (let i = 0; i < rows.length; i++) {
      const line = rows[i].trim();
      if (!line) continue;

      const parts = line.split(",").map(p => p.trim());
      if (parts.length < 2) {
        setError(`Ошибка на строке ${i + 1}: должно быть минимум 2 колонки (static_id, имя)`);
        return;
      }

      const static_id = parts[0].replace("-", "");
      if (static_id.length !== 6 || !/^\d+$/.test(static_id)) {
        setError(`Ошибка на строке ${i + 1}: неверный формат ID "${parts[0]}" (должно быть 6 цифр)`);
        return;
      }

      list.push({
        static_id,
        name: parts[1],
        rank: parts[2] || "Рядовой",
        unit: parts[3] || "АВНГ",
      });
    }

    setPreview(list);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const res = await importMutation.mutateAsync(preview);
      let msg = `Успешно создано ${res.imported_count} курсантов.`;
      if (res.skipped.length > 0) {
        msg += ` Пропущено записей: ${res.skipped.length}.`;
      }
      toast({ title: "Импорт завершен", description: msg });
      setCsvText("");
      setPreview([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: "Ошибка импорта", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-tactical-card border border-tactical-border p-6 rounded-lg w-full max-w-2xl shadow-2xl font-mono text-xs text-foreground space-y-4">
        <div className="flex justify-between items-center border-b border-tactical-border/70 pb-3">
          <h3 className="font-oswald text-sm tracking-wider uppercase text-primary flex items-center">
            <Icon name="Upload" size={16} className="mr-2" />
            Пакетный импорт курсантов из CSV
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-muted-foreground uppercase text-[10px] tracking-wider">Формат ввода (одна строка — один курсант):</label>
          <div className="bg-black/35 p-2 rounded text-[10px] text-muted-foreground border border-tactical-border/40">
            static_id, Фамилия Имя, ранг (опционально), подразделение (опционально)<br />
            Пример: <code className="text-yellow-400">111222, Иванов Иван, Рядовой, АВНГ</code>
          </div>
        </div>

        <textarea
          rows={6}
          className="w-full bg-tactical-input border border-tactical-border rounded p-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary font-mono"
          placeholder="Вставьте строки CSV..."
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          onBlur={handleParse}
        />

        {error && (
          <div className="text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded flex items-center gap-2">
            <Icon name="AlertTriangle" size={14} className="text-red-500 animate-pulse" />
            {error}
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-2">
            <div className="text-muted-foreground uppercase text-[10px] tracking-wider">Превью зачисления ({preview.length}):</div>
            <div className="border border-tactical-border/50 rounded overflow-hidden max-h-36 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-tactical-card/40 text-muted-foreground text-[10px] border-b border-tactical-border uppercase">
                    <th className="p-1.5 pl-3">ID</th>
                    <th className="p-1.5">Имя</th>
                    <th className="p-1.5">Ранг</th>
                    <th className="p-1.5 pr-3">Подразделение</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, idx) => (
                    <tr key={idx} className="border-b border-tactical-border/20 hover:bg-tactical-card/25">
                      <td className="p-1.5 pl-3 text-primary font-bold">{p.static_id}</td>
                      <td className="p-1.5 font-semibold">{p.name}</td>
                      <td className="p-1.5 text-muted-foreground">{p.rank}</td>
                      <td className="p-1.5 pr-3 text-muted-foreground">{p.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-tactical-border/70 pt-3">
          <button
            onClick={handleImport}
            disabled={loading || preview.length === 0 || !!error}
            className="bg-primary hover:bg-primary/95 text-black font-bold px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            {loading ? "Импорт..." : `Импортировать ${preview.length} курсантов`}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="border border-tactical-border hover:bg-tactical-card/50 px-4 py-2 rounded transition-colors text-muted-foreground hover:text-foreground"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
