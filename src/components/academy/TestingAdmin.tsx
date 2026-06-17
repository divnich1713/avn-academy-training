import React, { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { 
  testingApi, 
  AdminAttempt, 
  TopicDifficulty, 
  TimePerQuestion, 
  ScoreDistribution,
  QuestionAdmin,
  TestSettings
} from "@/lib/testingApi";
import { TestingD3Stats } from "./TestingD3Stats";
import { toast } from "sonner";
import { fmtStaticId } from "./SectionsShared";

interface AdminProps {
  onNavigate?: (tab: string) => void;
}

export function TestingAdmin({ onNavigate }: AdminProps) {
  const [activeTab, setActiveTab] = useState<"results" | "questions" | "settings">("results");
  
  // Results Tab State
  const [attempts, setAttempts] = useState<AdminAttempt[]>([]);
  const [topicDifficulty, setTopicDifficulty] = useState<TopicDifficulty[]>([]);
  const [timePerQuestion, setTimePerQuestion] = useState<TimePerQuestion[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");

  // Questions Tab State
  const [questions, setQuestions] = useState<QuestionAdmin[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [qSearch, setQSearch] = useState("");
  const [qTypeFilter, setQTypeFilter] = useState("Все");
  const [qSubjectFilter, setQSubjectFilter] = useState("Все");
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionAdmin | null>(null);

  // Question Form State (Modal)
  const [qSubject, setQSubject] = useState("");
  const [qType, setQType] = useState<"choice" | "multichoice" | "matching" | "essay">("choice");
  const [qText, setQText] = useState("");
  const [qElo, setQElo] = useState(1000);
  const [qExplanation, setQExplanation] = useState("");
  
  // Options state helper for choice / multichoice
  const [qStringOptions, setQStringOptions] = useState<string[]>(["", ""]);
  const [qChoiceCorrect, setQChoiceCorrect] = useState("");
  const [qMultichoiceCorrect, setQMultichoiceCorrect] = useState<string[]>([]);
  
  // Pairs state helper for matching
  const [qMatchingPairs, setQMatchingPairs] = useState<{ key: string; val: string }[]>([{ key: "", val: "" }]);
  
  // Criteria state helper for essay
  const [qEssayCriteria, setQEssayCriteria] = useState<string[]>([
    "Содержание и полнота",
    "Применение регламентов", 
    "Логика и структура",
    "Терминология",
    "Качество выводов"
  ]);

  // Settings Tab State
  const [settingsList, setSettingsList] = useState<TestSettings[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [editingSettings, setEditingSettings] = useState<TestSettings | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [showAddSubject, setShowAddSubject] = useState(false);

  useEffect(() => {
    if (activeTab === "results") {
      loadResultsData();
    } else if (activeTab === "questions") {
      loadQuestionsData();
    } else if (activeTab === "settings") {
      loadSettingsData();
    }
  }, [activeTab]);

  // Load Results
  const loadResultsData = async () => {
    setLoadingResults(true);
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
      toast.error("Ошибка загрузки результатов: " + err.message);
    } finally {
      setLoadingResults(false);
    }
  };

  // Load Questions
  const loadQuestionsData = async () => {
    setLoadingQuestions(true);
    try {
      const res = await testingApi.getQuestionsAdmin();
      setQuestions(res);
    } catch (err: any) {
      toast.error("Ошибка загрузки вопросов: " + err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Load Settings
  const loadSettingsData = async () => {
    setLoadingSettings(true);
    try {
      const res = await testingApi.getSettingsAdmin();
      setSettingsList(res);
      if (res.length > 0) {
        setEditingSettings(res[0]);
      }
    } catch (err: any) {
      toast.error("Ошибка загрузки настроек: " + err.message);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Results Tab Filtering
  const units = ["Все", ...Array.from(new Set(attempts.map((att) => att.unit).filter(Boolean)))];
  const filteredAttempts = attempts.filter((att) => {
    const matchesSearch =
      att.cadet_name.toLowerCase().includes(search.toLowerCase()) ||
      att.static_id.includes(search);
    const matchesUnit = unitFilter === "Все" || att.unit === unitFilter;
    const matchesStatus = statusFilter === "Все" || att.status === statusFilter;
    return matchesSearch && matchesUnit && matchesStatus;
  });

  // Questions Tab Filtering
  const qSubjects = ["Все", ...Array.from(new Set([...questions.map((q) => q.subject), ...settingsList.map((s) => s.subject)].filter(Boolean)))];
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question_text.toLowerCase().includes(qSearch.toLowerCase());
    const matchesType = qTypeFilter === "Все" || q.type === qTypeFilter;
    const matchesSubject = qSubjectFilter === "Все" || q.subject === qSubjectFilter;
    return matchesSearch && matchesType && matchesSubject;
  });

  // Export results to CSV
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

  // Print results PDF
  const handleExportPDF = () => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Не удалось открыть окно печати. Разрешите всплывающие окна.");
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
            <title>Сводный отчет по тестированию</title>
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
            </style>
          </head>
          <body>
            <h2>Сводный отчет по успеваемости</h2>
            <div class="meta">Академия АВНГ &bull; Сформирован: ${new Date().toLocaleDateString("ru-RU")}</div>
            <div class="summary">
              <div class="summary-item">
                <div class="summary-val">${filteredAttempts.length}</div>
                <div>Всего сессий</div>
              </div>
              <div class="summary-item">
                <div class="summary-val">${filteredAttempts.filter((a) => a.status === "completed").length}</div>
                <div>Сдано</div>
              </div>
              <div class="summary-item">
                <div class="summary-val">${Math.round(filteredAttempts.reduce((acc, a) => acc + (a.end_elo || 1000), 0) / (filteredAttempts.length || 1))} ELO</div>
                <div>Средний ELO</div>
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
                window.onafterprint = function() { window.close(); };
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

  // Open Question Edit / Create Modal
  const handleOpenQuestionModal = (q: QuestionAdmin | null = null) => {
    if (q) {
      // Edit mode
      setEditingQuestion(q);
      setQSubject(q.subject);
      setQType(q.type);
      setQText(q.question_text);
      setQElo(q.elo_rating || 1000);
      setQExplanation(q.explanation || "");

      // Load specific options
      if (q.type === "choice" || q.type === "multichoice") {
        setQStringOptions(Array.isArray(q.options) ? q.options : ["", ""]);
        if (q.type === "choice") {
          setQChoiceCorrect(String(q.correct_answer));
        } else {
          setQMultichoiceCorrect(Array.isArray(q.correct_answer) ? q.correct_answer : []);
        }
      } else if (q.type === "matching") {
        const pairs = q.options?.pairs || q.correct_answer || {};
        const pairsList = Object.entries(pairs).map(([key, val]) => ({ key, val: String(val) }));
        setQMatchingPairs(pairsList.length > 0 ? pairsList : [{ key: "", val: "" }]);
      } else if (q.type === "essay") {
        const criteria = q.criteria_matrix?.criteria || [];
        setQEssayCriteria(criteria.length > 0 ? criteria : [""]);
      }
    } else {
      // Create mode
      setEditingQuestion(null);
      
      let initialSubject = "Тест по ФЗ ФСВНГ и уставу ФСВНГ";
      if (qSubjectFilter && qSubjectFilter !== "Все") {
        initialSubject = qSubjectFilter;
      } else if (settingsList.length > 0) {
        initialSubject = settingsList[0].subject;
      }
      setQSubject(initialSubject);
      setQType("choice");
      setQText("");
      setQElo(1000);
      setQExplanation("");
      setQStringOptions(["", ""]);
      setQChoiceCorrect("");
      setQMultichoiceCorrect([]);
      setQMatchingPairs([{ key: "", val: "" }]);
      setQEssayCriteria([
        "Содержание и полнота",
        "Применение регламентов", 
        "Логика и структура",
        "Терминология",
        "Качество выводов"
      ]);
    }
    setShowQuestionModal(true);
  };

  // Save Question Action
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qSubject.trim() || !qText.trim()) {
      toast.warning("Заполните тему и текст вопроса!");
      return;
    }

    let optionsPayload: any = null;
    let correctAnswerPayload: any = null;
    let criteriaMatrixPayload: any = null;

    if (qType === "choice") {
      const activeOptions = qStringOptions.map((o) => o.trim()).filter(Boolean);
      if (activeOptions.length < 2) {
        toast.warning("Для одиночного выбора нужно указать как минимум 2 варианта ответа!");
        return;
      }
      if (!qChoiceCorrect || !activeOptions.includes(qChoiceCorrect)) {
        toast.warning("Выберите корректный правильный вариант!");
        return;
      }
      optionsPayload = activeOptions;
      correctAnswerPayload = qChoiceCorrect;
    } else if (qType === "multichoice") {
      const activeOptions = qStringOptions.map((o) => o.trim()).filter(Boolean);
      if (activeOptions.length < 2) {
        toast.warning("Для множественного выбора нужно указать как минимум 2 варианта ответа!");
        return;
      }
      const activeCorrect = qMultichoiceCorrect.filter((x) => activeOptions.includes(x));
      if (activeCorrect.length === 0) {
        toast.warning("Выберите хотя бы один правильный вариант!");
        return;
      }
      optionsPayload = activeOptions;
      correctAnswerPayload = activeCorrect;
    } else if (qType === "matching") {
      const pairs: Record<string, string> = {};
      qMatchingPairs.forEach((p) => {
        if (p.key.trim() && p.val.trim()) {
          pairs[p.key.trim()] = p.val.trim();
        }
      });
      if (Object.keys(pairs).length === 0) {
        toast.warning("Добавьте хотя бы одну пару для сопоставления!");
        return;
      }
      optionsPayload = { pairs };
      correctAnswerPayload = pairs;
    } else if (qType === "essay") {
      const activeCriteria = qEssayCriteria.map((c) => c.trim()).filter(Boolean);
      if (activeCriteria.length === 0) {
        toast.warning("Укажите хотя бы один критерий оценки эссе!");
        return;
      }
      criteriaMatrixPayload = { criteria: activeCriteria };
      correctAnswerPayload = "";
    }

    const payload: QuestionAdmin = {
      subject: qSubject,
      type: qType,
      question_text: qText,
      options: optionsPayload,
      correct_answer: correctAnswerPayload,
      explanation: qExplanation.trim() || undefined,
      elo_rating: Number(qElo) || 1000,
      criteria_matrix: criteriaMatrixPayload
    };

    try {
      if (editingQuestion && editingQuestion.id) {
        await testingApi.updateQuestionAdmin(editingQuestion.id, payload);
        toast.success("Вопрос успешно изменен!");
      } else {
        await testingApi.createQuestionAdmin(payload);
        toast.success("Вопрос успешно добавлен!");
      }
      setShowQuestionModal(false);
      loadQuestionsData();
    } catch (err: any) {
      toast.error("Не удалось сохранить вопрос: " + err.message);
    }
  };

  // Delete Question Action
  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm("Вы уверены, что хотите безвозвратно удалить этот вопрос?")) {
      return;
    }
    try {
      await testingApi.deleteQuestionAdmin(id);
      toast.success("Вопрос успешно удален!");
      loadQuestionsData();
    } catch (err: any) {
      toast.error("Не удалось удалить вопрос: " + err.message);
    }
  };

  // Save Settings Action
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSettings) return;

    if (editingSettings.timer_minutes < 15 || editingSettings.timer_minutes > 120) {
      toast.warning("Время теста должно быть в диапазоне от 15 до 120 минут!");
      return;
    }
    if (editingSettings.question_count < 1 || editingSettings.question_count > 100) {
      toast.warning("Количество вопросов должно быть в диапазоне от 1 до 100!");
      return;
    }
    if (editingSettings.base_elo < 100 || editingSettings.base_elo > 3000) {
      toast.warning("Базовый ELO рейтинг должен быть в диапазоне от 100 до 3000!");
      return;
    }

    try {
      await testingApi.updateSettingsAdmin(editingSettings);
      toast.success("Настройки успешно сохранены!");
      loadSettingsData();
    } catch (err: any) {
      toast.error("Ошибка сохранения настроек: " + err.message);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubject.trim()) {
      toast.warning("Введите название темы!");
      return;
    }
    const exists = settingsList.some((s) => s.subject.toLowerCase() === newSubject.trim().toLowerCase());
    if (exists) {
      toast.warning("Тест с такой темой уже существует!");
      return;
    }
    
    const newSettings: TestSettings = {
      subject: newSubject.trim(),
      timer_minutes: 45,
      question_count: 20,
      base_elo: 1000,
    };

    try {
      await testingApi.updateSettingsAdmin(newSettings);
      toast.success("Новый тест успешно создан!");
      setNewSubject("");
      setShowAddSubject(false);
      
      const res = await testingApi.getSettingsAdmin();
      setSettingsList(res);
      
      const newlyCreated = res.find((x) => x.subject === newSettings.subject);
      if (newlyCreated) {
        setEditingSettings({ ...newlyCreated });
      } else {
        setEditingSettings({ ...newSettings });
      }
    } catch (err: any) {
      toast.error("Ошибка создания теста: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* Tactical Sub-tabs Navigation */}
      <div className="flex border-b border-tactical-border/70 gap-2">
        <button
          onClick={() => setActiveTab("results")}
          className={`flex items-center gap-2 font-mono text-xs uppercase px-4 py-2 border-t border-x transition-all ${
            activeTab === "results"
              ? "bg-tactical-card border-tactical-border text-gold border-b-tactical-card -mb-px font-bold"
              : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="LineChart" size={13} /> Результаты
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`flex items-center gap-2 font-mono text-xs uppercase px-4 py-2 border-t border-x transition-all ${
            activeTab === "questions"
              ? "bg-tactical-card border-tactical-border text-gold border-b-tactical-card -mb-px font-bold"
              : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="ClipboardList" size={13} /> Банк вопросов
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 font-mono text-xs uppercase px-4 py-2 border-t border-x transition-all ${
            activeTab === "settings"
              ? "bg-tactical-card border-tactical-border text-gold border-b-tactical-card -mb-px font-bold"
              : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="Settings" size={13} /> Параметры теста
        </button>
      </div>

      {/* TAB 1: RESULTS */}
      {activeTab === "results" && (
        <div className="space-y-6">
          {loadingResults ? (
            <div className="flex items-center justify-center h-[300px]">
              <Icon name="Loader2" className="text-primary animate-spin" size={36} />
            </div>
          ) : (
            <>
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
                        <th className="p-3 text-muted-foreground uppercase font-semibold text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttempts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-muted-foreground">
                            Сессий тестирования не найдено по выбранным фильтрам.
                          </td>
                        </tr>
                      ) : (
                        filteredAttempts.map((att) => (
                          <tr key={att.attempt_id} className="border-b border-tactical-border/50 hover:bg-tactical-panel/20">
                            <td className="p-3 font-semibold">{fmtStaticId(att.static_id)}</td>
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
                                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                                    : att.status === "aborted"
                                    ? "bg-destructive/10 border-destructive text-destructive"
                                    : "bg-gold/10 border-gold text-gold"
                                }`}
                              >
                                {att.status === "completed" ? "Сдал" : att.status === "aborted" ? "Списал" : "В процессе"}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {att.status === "completed" && (
                                <button
                                  onClick={() => {
                                    const completedDate = new Date(att.completed_at || att.started_at).toLocaleDateString("ru-RU", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    });
                                    const isPassed = att.score_percent >= 80;
                                    const gradeVal = att.score_percent >= 90 ? 5 : att.score_percent >= 80 ? 4 : att.score_percent >= 60 ? 3 : 2;
                                    const discordText = `**[РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ АВНГ]**
**Курсант:** ${att.cadet_name} (ID: ${fmtStaticId(att.static_id)})
**Звание:** ${att.rank || "—"}
**Подразделение:** ${att.unit || "—"}
**Результат:** ${isPassed ? "🟢 СДАН" : "🔴 НЕ СДАН"}
**Оценка:** ${gradeVal}
**Процент верных:** ${att.score_percent}%
**Дата сдачи:** ${completedDate}
**Ссылка на систему:** ${window.location.origin}`;
                                    
                                    navigator.clipboard.writeText(discordText);
                                    toast.success(`Результат ${att.cadet_name} скопирован для Discord!`);
                                  }}
                                  className="text-[10px] text-primary hover:underline font-mono uppercase tracking-wider flex items-center justify-end gap-1 ml-auto"
                                >
                                  <Icon name="Copy" size={10} />
                                  В Discord
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: QUESTIONS */}
      {activeTab === "questions" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-tactical-card border border-tactical-border p-4 card-glow">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Поиск в тексте вопроса..."
                value={qSearch}
                onChange={(e) => setQSearch(e.target.value)}
                className="bg-tactical-panel border border-tactical-border text-foreground font-mono text-xs px-3 py-2 focus:outline-none focus:border-primary w-full sm:w-[250px]"
              />
              <select
                value={qTypeFilter}
                onChange={(e) => setQTypeFilter(e.target.value)}
                className="bg-tactical-panel border border-tactical-border text-foreground font-mono text-xs p-2 focus:outline-none focus:border-primary"
              >
                <option value="Все">Все типы</option>
                <option value="choice">Одиночный выбор</option>
                <option value="multichoice">Множественный выбор</option>
                <option value="matching">Сопоставление</option>
                <option value="essay">Эссе (Развернутый)</option>
              </select>
              <select
                value={qSubjectFilter}
                onChange={(e) => setQSubjectFilter(e.target.value)}
                className="bg-tactical-panel border border-tactical-border text-foreground font-mono text-xs p-2 focus:outline-none focus:border-primary max-w-[200px]"
              >
                {qSubjects.map((sub, idx) => (
                  <option key={idx} value={sub}>{sub === "Все" ? "Все темы" : sub}</option>
                ))}
              </select>
            </div>

            {/* Add Button */}
            <button
              onClick={() => handleOpenQuestionModal(null)}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-mono text-xs uppercase tracking-wider px-4 py-2 border border-primary/20 flex items-center gap-1.5 shadow-lg w-full md:w-auto justify-center"
            >
              <Icon name="Plus" size={13} /> Добавить вопрос
            </button>
          </div>

          {loadingQuestions ? (
            <div className="flex items-center justify-center h-[200px]">
              <Icon name="Loader2" className="text-primary animate-spin" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredQuestions.length === 0 ? (
                <div className="corner-mark bg-tactical-card border border-tactical-border p-8 text-center text-muted-foreground font-mono text-xs">
                  Вопросы не найдены по выбранным фильтрам.
                </div>
              ) : (
                filteredQuestions.map((q) => (
                  <div key={q.id} className="corner-mark bg-tactical-card border border-tactical-border p-5 relative card-glow space-y-4 hover:border-tactical-border/90 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tactical-border/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-[10px] text-primary font-mono uppercase">
                          {q.subject}
                        </span>
                        <span className="px-2 py-0.5 bg-gold/10 border border-gold/20 text-[10px] text-gold font-mono uppercase">
                          {q.type === "choice" ? "Одиночный выбор" : q.type === "multichoice" ? "Множ. выбор" : q.type === "matching" ? "Сопоставление" : "Эссе"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ELO: <span className="text-foreground font-bold">{q.elo_rating}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenQuestionModal(q)}
                          className="p-1.5 bg-tactical-panel hover:bg-tactical-border text-gold border border-gold/10 transition-colors"
                          title="Редактировать"
                        >
                          <Icon name="Edit" size={12} />
                        </button>
                        <button
                          onClick={() => q.id && handleDeleteQuestion(q.id)}
                          className="p-1.5 bg-tactical-panel hover:bg-destructive/20 text-destructive border border-destructive/10 transition-colors"
                          title="Удалить"
                        >
                          <Icon name="Trash2" size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-medium leading-relaxed font-sans">{q.question_text}</p>

                    {/* Question details by type */}
                    {q.type === "choice" && Array.isArray(q.options) && (
                      <div className="text-xs space-y-1 bg-tactical-panel/20 p-3 border border-tactical-border/30">
                        <span className="text-muted-foreground uppercase font-bold text-[9px] block tracking-wide">Варианты ответов:</span>
                        {q.options.map((opt, i) => (
                          <div key={i} className={`flex items-center gap-2 ${opt === q.correct_answer ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                            <Icon name={opt === q.correct_answer ? "CheckCircle" : "CircleAlert"} size={10} />
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === "multichoice" && Array.isArray(q.options) && (
                      <div className="text-xs space-y-1 bg-tactical-panel/20 p-3 border border-tactical-border/30">
                        <span className="text-muted-foreground uppercase font-bold text-[9px] block tracking-wide">Варианты ответов:</span>
                        {q.options.map((opt, i) => {
                          const isCorrect = Array.isArray(q.correct_answer) && q.correct_answer.includes(opt);
                          return (
                            <div key={i} className={`flex items-center gap-2 ${isCorrect ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                              <Icon name={isCorrect ? "CheckCircle" : "CircleAlert"} size={10} />
                              <span>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === "matching" && q.options?.pairs && (
                      <div className="text-xs bg-tactical-panel/20 p-3 border border-tactical-border/30 space-y-1.5">
                        <span className="text-muted-foreground uppercase font-bold text-[9px] block tracking-wide text-gold">Пары сопоставления:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(q.options.pairs).map(([key, val], i) => (
                            <div key={i} className="flex items-center justify-between gap-2 p-1.5 bg-tactical-panel/40 border border-tactical-border/20 font-mono text-[10px]">
                              <span className="text-muted-foreground">{key}</span>
                              <span className="text-foreground font-semibold">&rarr; {String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {q.type === "essay" && q.criteria_matrix?.criteria && (
                      <div className="text-xs bg-tactical-panel/20 p-3 border border-tactical-border/30 space-y-1">
                        <span className="text-muted-foreground uppercase font-bold text-[9px] block tracking-wide text-gold">Критерии оценки ИИ:</span>
                        {q.criteria_matrix.criteria.map((crit: string, i: number) => (
                          <div key={i} className="text-muted-foreground font-mono text-[10px] flex items-center gap-1.5">
                            <span className="text-gold">•</span> {crit}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="text-xs text-muted-foreground bg-tactical-panel/10 p-2 border-l-2 border-gold/40 italic">
                        <span className="font-semibold not-italic text-gold text-[9px] uppercase tracking-wider block mb-0.5">Пояснение к ответу:</span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === "settings" && (
        <div className="space-y-6 max-w-xl mx-auto animate-fade-in">
          {loadingSettings ? (
            <div className="flex items-center justify-center h-[200px]">
              <Icon name="Loader2" className="text-primary animate-spin" size={32} />
            </div>
          ) : (
            <div className="corner-mark bg-tactical-card border border-tactical-border p-6 card-glow space-y-6">
              <h3 className="font-oswald text-base tracking-wide uppercase text-gold border-b border-tactical-border pb-2 flex items-center gap-2">
                <Icon name="Settings" /> Параметры тестирования
              </h3>

              {editingSettings && (
                <form onSubmit={handleSaveSettings} className="space-y-5 font-mono text-xs">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-muted-foreground uppercase">Настройка для темы</label>
                      <button
                        type="button"
                        onClick={() => setShowAddSubject(!showAddSubject)}
                        className="bg-tactical-panel hover:bg-tactical-border text-gold border border-gold/20 px-2 py-0.5 flex items-center gap-1 font-bold text-[10px]"
                      >
                        <Icon name="Plus" size={10} /> Создать новый тест
                      </button>
                    </div>

                    {showAddSubject && (
                      <div className="flex gap-2 mb-3 bg-tactical-panel/30 p-2.5 border border-tactical-border/40">
                        <input
                          type="text"
                          placeholder="Название нового теста..."
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          className="flex-1 bg-tactical-panel border border-tactical-border text-foreground p-1.5 focus:outline-none focus:border-primary font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleCreateSubject}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 font-bold font-mono text-[10px]"
                        >
                          Добавить
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddSubject(false);
                            setNewSubject("");
                          }}
                          className="bg-tactical-panel hover:bg-tactical-border text-muted-foreground border border-tactical-border/40 px-2.5 py-1 font-bold font-mono text-[10px]"
                        >
                          Отмена
                        </button>
                      </div>
                    )}

                    <select
                      value={editingSettings.subject}
                      onChange={(e) => {
                        const s = settingsList.find((x) => x.subject === e.target.value);
                        if (s) setEditingSettings({ ...s });
                      }}
                      className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2.5 focus:outline-none focus:border-primary font-bold"
                    >
                      {settingsList.map((item, idx) => (
                        <option key={idx} value={item.subject}>{item.subject}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    <div>
                      <label className="text-muted-foreground uppercase block mb-1 text-[10px]">Таймер (мин)</label>
                      <input
                        type="number"
                        min="15"
                        max="120"
                        value={editingSettings.timer_minutes}
                        onChange={(e) => setEditingSettings({ ...editingSettings, timer_minutes: parseInt(e.target.value) || 0 })}
                        className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 focus:outline-none focus:border-primary font-bold text-center"
                      />
                      <span className="text-[10px] text-muted-foreground text-center block mt-1">15–120 мин.</span>
                    </div>

                    <div>
                      <label className="text-muted-foreground uppercase block mb-1 text-[10px]">Вопросов</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editingSettings.question_count}
                        onChange={(e) => setEditingSettings({ ...editingSettings, question_count: parseInt(e.target.value) || 0 })}
                        className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 focus:outline-none focus:border-primary font-bold text-center"
                      />
                      <span className="text-[10px] text-muted-foreground text-center block mt-1">1–100 вопр.</span>
                    </div>

                    <div>
                      <label className="text-muted-foreground uppercase block mb-1 text-[10px]">Начальный ELO</label>
                      <input
                        type="number"
                        min="100"
                        max="3000"
                        value={editingSettings.base_elo}
                        onChange={(e) => setEditingSettings({ ...editingSettings, base_elo: parseInt(e.target.value) || 0 })}
                        className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 focus:outline-none focus:border-primary font-bold text-center"
                      />
                      <span className="text-[10px] text-muted-foreground text-center block mt-1">Дефолт: 1000</span>
                    </div>

                    <div>
                      <label className="text-muted-foreground uppercase block mb-1 text-[10px]">Время / вопрос (сек)</label>
                      <input
                        type="number"
                        min="0"
                        max="600"
                        value={editingSettings.time_limit_per_question || 0}
                        onChange={(e) => setEditingSettings({ ...editingSettings, time_limit_per_question: parseInt(e.target.value) || 0 })}
                        className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 focus:outline-none focus:border-primary font-bold text-center"
                      />
                      <span className="text-[10px] text-muted-foreground text-center block mt-1">0 — без лим.</span>
                    </div>

                    <div>
                      <label className="text-muted-foreground uppercase block mb-1 text-[10px]">Проходной (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editingSettings.passing_score_percent || 80}
                        onChange={(e) => setEditingSettings({ ...editingSettings, passing_score_percent: parseInt(e.target.value) || 0 })}
                        className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 focus:outline-none focus:border-primary font-bold text-center"
                      />
                      <span className="text-[10px] text-muted-foreground text-center block mt-1">Дефолт: 80%</span>
                    </div>
                  </div>

                  <div className="bg-tactical-panel/20 border border-tactical-border/30 p-3 text-[10px] leading-relaxed text-muted-foreground space-y-1">
                    <span className="text-gold uppercase font-bold tracking-wider block mb-1">Информационная справка:</span>
                    <div>• <strong>Вопросов в тесте</strong> — сколько вопросов нужно ответить курсанту до завершения сессии.</div>
                    <div>• <strong>Базовый ELO</strong> — отправная точка для расчета сложности (адаптивная сложность ELO).</div>
                    <div>• <strong>Таймер</strong> — общее время, по истечению которого сессия автоматически завершается.</div>
                    <div>• <strong>Время на 1 вопрос</strong> — лимит времени (в секундах) на ответ на один конкретный вопрос.</div>
                    <div>• <strong>Проходной балл (%)</strong> — минимальный процент успеваемости для успешной сдачи.</div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/95 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors border border-primary/20 flex items-center justify-center gap-1.5 shadow-lg"
                  >
                    <Icon name="Save" size={13} /> Сохранить настройки
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* QUESTION CREATE/EDIT MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="corner-mark bg-tactical-card border border-tactical-border w-full max-w-2xl max-h-[90vh] flex flex-col card-glow animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-tactical-border/50 p-4">
              <h3 className="font-oswald text-base tracking-wide uppercase text-gold flex items-center gap-2">
                <Icon name="ClipboardList" /> {editingQuestion ? "Редактировать вопрос" : "Добавить вопрос в банк"}
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 bg-tactical-panel/40 border border-tactical-border/20"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveQuestion} className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground uppercase block mb-1">Тема тестирования</label>
                  <select
                    value={qSubject}
                    onChange={(e) => setQSubject(e.target.value)}
                    className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 focus:outline-none focus:border-primary font-bold"
                    required
                  >
                    <option value="">-- Выберите тему --</option>
                    {settingsList.map((item, idx) => (
                      <option key={idx} value={item.subject}>{item.subject}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground uppercase block mb-1">Тип вопроса</label>
                  <select
                    value={qType}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setQType(t);
                    }}
                    className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 focus:outline-none focus:border-primary font-bold"
                  >
                    <option value="choice">Одиночный выбор</option>
                    <option value="multichoice">Множественный выбор</option>
                    <option value="matching">Сопоставление пар (Drag-and-Drop)</option>
                    <option value="essay">Эссе (Развернутый ответ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground uppercase block mb-1">Сложность вопроса (ELO)</label>
                  <input
                    type="number"
                    min="100"
                    max="3000"
                    value={qElo}
                    onChange={(e) => setQElo(parseInt(e.target.value) || 1000)}
                    className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground uppercase block mb-1">Текст вопроса</label>
                <textarea
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Введите формулировку вопроса..."
                  rows={3}
                  className="w-full bg-tactical-panel border border-tactical-border text-foreground p-3 focus:outline-none focus:border-primary resize-y font-sans text-sm"
                  required
                />
              </div>

              {/* DYNAMIC FORMS BY TYPE */}

              {/* CHOICE & MULTICHOICE OPTIONS */}
              {(qType === "choice" || qType === "multichoice") && (
                <div className="border border-tactical-border/40 p-4 bg-tactical-panel/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gold uppercase font-bold tracking-wider text-[10px]">Варианты ответов:</span>
                    <button
                      type="button"
                      onClick={() => setQStringOptions([...qStringOptions, ""])}
                      className="bg-tactical-panel hover:bg-tactical-border text-gold border border-gold/20 px-2 py-1 flex items-center gap-1 font-bold text-[10px]"
                    >
                      <Icon name="Plus" size={10} /> Вариант
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {qStringOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {qType === "choice" ? (
                          <input
                            type="radio"
                            name="correct-choice"
                            checked={qChoiceCorrect === opt && opt !== ""}
                            onChange={() => setQChoiceCorrect(opt)}
                            className="accent-primary w-4 h-4"
                            disabled={!opt}
                            title="Отметить как правильный"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={qMultichoiceCorrect.includes(opt) && opt !== ""}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setQMultichoiceCorrect([...qMultichoiceCorrect, opt]);
                              } else {
                                setQMultichoiceCorrect(qMultichoiceCorrect.filter((x) => x !== opt));
                              }
                            }}
                            className="accent-primary w-4 h-4"
                            disabled={!opt}
                            title="Отметить как правильный"
                          />
                        )}
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...qStringOptions];
                            const oldVal = next[i];
                            next[i] = e.target.value;
                            setQStringOptions(next);
                            
                            // Keep correct answer in sync
                            if (qType === "choice" && qChoiceCorrect === oldVal) {
                              setQChoiceCorrect(e.target.value);
                            } else if (qType === "multichoice" && qMultichoiceCorrect.includes(oldVal)) {
                              setQMultichoiceCorrect(qMultichoiceCorrect.map((x) => x === oldVal ? e.target.value : x));
                            }
                          }}
                          placeholder={`Вариант ${i + 1}`}
                          className="flex-1 bg-tactical-panel border border-tactical-border text-foreground p-1.5 focus:outline-none focus:border-primary"
                          required
                        />
                        {qStringOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = qStringOptions.filter((_, idx) => idx !== i);
                              setQStringOptions(next);
                              if (qType === "choice" && qChoiceCorrect === opt) setQChoiceCorrect("");
                              if (qType === "multichoice") setQMultichoiceCorrect(qMultichoiceCorrect.filter((x) => x !== opt));
                            }}
                            className="p-1.5 bg-tactical-panel hover:bg-destructive/20 text-destructive border border-destructive/20"
                          >
                            <Icon name="Minus" size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MATCHING PAIRS */}
              {qType === "matching" && (
                <div className="border border-tactical-border/40 p-4 bg-tactical-panel/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gold uppercase font-bold tracking-wider text-[10px]">Пары для сопоставления:</span>
                    <button
                      type="button"
                      onClick={() => setQMatchingPairs([...qMatchingPairs, { key: "", val: "" }])}
                      className="bg-tactical-panel hover:bg-tactical-border text-gold border border-gold/20 px-2 py-1 flex items-center gap-1 font-bold text-[10px]"
                    >
                      <Icon name="Plus" size={10} /> Добавить пару
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {qMatchingPairs.map((pair, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pair.key}
                          onChange={(e) => {
                            const next = [...qMatchingPairs];
                            next[i].key = e.target.value;
                            setQMatchingPairs(next);
                          }}
                          placeholder="Элемент слева (например, Майор)"
                          className="flex-1 bg-tactical-panel border border-tactical-border text-foreground p-1.5 focus:outline-none focus:border-primary"
                          required
                        />
                        <span className="text-gold font-bold">&rarr;</span>
                        <input
                          type="text"
                          value={pair.val}
                          onChange={(e) => {
                            const next = [...qMatchingPairs];
                            next[i].val = e.target.value;
                            setQMatchingPairs(next);
                          }}
                          placeholder="Элемент справа (например, Одна звезда)"
                          className="flex-1 bg-tactical-panel border border-tactical-border text-foreground p-1.5 focus:outline-none focus:border-primary"
                          required
                        />
                        {qMatchingPairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setQMatchingPairs(qMatchingPairs.filter((_, idx) => idx !== i));
                            }}
                            className="p-1.5 bg-tactical-panel hover:bg-destructive/20 text-destructive border border-destructive/20"
                          >
                            <Icon name="Minus" size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ESSAY CRITERIA */}
              {qType === "essay" && (
                <div className="border border-tactical-border/40 p-4 bg-tactical-panel/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gold uppercase font-bold tracking-wider text-[10px]">Критерии оценки ответа ИИ:</span>
                    <button
                      type="button"
                      onClick={() => setQEssayCriteria([...qEssayCriteria, ""])}
                      className="bg-tactical-panel hover:bg-tactical-border text-gold border border-gold/20 px-2 py-1 flex items-center gap-1 font-bold text-[10px]"
                    >
                      <Icon name="Plus" size={10} /> Добавить критерий
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {qEssayCriteria.map((crit, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono font-bold text-xs">{i + 1}.</span>
                        <input
                          type="text"
                          value={crit}
                          onChange={(e) => {
                            const next = [...qEssayCriteria];
                            next[i] = e.target.value;
                            setQEssayCriteria(next);
                          }}
                          placeholder={`Критерий ${i + 1} (например, Использование терминологии)`}
                          className="flex-1 bg-tactical-panel border border-tactical-border text-foreground p-1.5 focus:outline-none focus:border-primary"
                          required
                        />
                        {qEssayCriteria.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setQEssayCriteria(qEssayCriteria.filter((_, idx) => idx !== i));
                            }}
                            className="p-1.5 bg-tactical-panel hover:bg-destructive/20 text-destructive border border-destructive/20"
                          >
                            <Icon name="Minus" size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EXPLANATION */}
              {qType !== "essay" && (
                <div>
                  <label className="text-muted-foreground uppercase block mb-1">Пояснение / комментарий к верному ответу</label>
                  <textarea
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                    placeholder="Этот текст будет показан курсанту после ответа на вопрос..."
                    rows={2}
                    className="w-full bg-tactical-panel border border-tactical-border text-foreground p-3 focus:outline-none focus:border-primary resize-y font-sans text-xs"
                  />
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-tactical-border/30">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="bg-tactical-panel hover:bg-tactical-border text-foreground border border-tactical-border/80 font-mono text-xs uppercase px-4 py-2"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-mono text-xs uppercase tracking-wider px-5 py-2 border border-primary/20 flex items-center gap-1.5 shadow-lg font-bold"
                >
                  <Icon name="Save" size={13} /> {editingQuestion ? "Сохранить изменения" : "Добавить вопрос"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
