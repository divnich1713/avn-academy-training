import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { apiLogout } from "@/lib/api";
import { testingApi, Question, ActiveSession } from "@/lib/testingApi";
import { toast } from "sonner";
import { fmtStaticId } from "./SectionsShared";

export function TestingSystem() {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Starting config state
  const [subject, setSubject] = useState("Тест по ФЗ ФСВНГ и уставу ФСВНГ");
  const [difficulty] = useState(5);
  const [timerMinutes] = useState(45);
  const [subjectsList, setSubjectsList] = useState<string[]>(["Тест по ФЗ ФСВНГ и уставу ФСВНГ"]);
  // Current test state
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [timerString, setTimerString] = useState("00:00");
  const [warnings, setWarnings] = useState(0);
  const [isAnnulling, setIsAnnulling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-question timer & certificate states
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState<number | null>(null);
  const [certificate, setCertificate] = useState<any>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedAnswerRef = useRef<any>(null);
  const questionRef = useRef<Question | null>(null);
  const activeSessionRef = useRef<ActiveSession | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  useEffect(() => {
    selectedAnswerRef.current = selectedAnswer;
  }, [selectedAnswer]);

  useEffect(() => {
    questionRef.current = question;
  }, [question]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  // 1. Check active session on load
  useEffect(() => {
    loadSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, []);

  const loadSession = async () => {
    setLoading(true);
    try {
      const session = await testingApi.getActiveSession();
      setActiveSession(session);
      if (session.active && session.attempt_id) {
        setWarnings(session.warnings_count || 0);
        if (!session.is_frozen) {
          loadNextQuestion(session.attempt_id, session.time_limit_per_question);
          startTimer(session.remaining_seconds || 2700);
        }
      } else {
        const subjs = await testingApi.getSubjects();
        if (subjs && subjs.length > 0) {
          setSubjectsList(subjs);
          setSubject(subjs[0]);
        }
      }
    } catch (err: any) {
      toast.error("Ошибка загрузки сессии: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load next question
  const loadNextQuestion = async (attemptId: number, timeLimit?: number) => {
    try {
      const res = await testingApi.getNextQuestion(attemptId);
      if ("completed" in res && res.completed) {
        loadSession();
      } else {
        const q = res as Question;
        setQuestion(q);
        // Reset answer selection based on question type
        if (q.type === "choice") setSelectedAnswer(null);
        else if (q.type === "multichoice") setSelectedAnswer([]);
        else if (q.type === "matching") {
          // Initialize empty pairs map
          const initPairs: Record<string, string> = {};
          q.options.keys.forEach((k: string) => {
            initPairs[k] = "";
          });
          setSelectedAnswer(initPairs);
        }
        else if (q.type === "essay") setSelectedAnswer("");

        // Setup question timer
        const limit = timeLimit !== undefined ? timeLimit : ((res as any).time_limit_per_question || 0);
        if (limit > 0) {
          setQuestionSecondsLeft(limit);
        } else {
          setQuestionSecondsLeft(null);
        }
      }
    } catch (err: any) {
      toast.error("Ошибка загрузки вопроса: " + err.message);
    }
  };

  // 3. Timer implementation
  const startTimer = (secondsLeft: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    let time = secondsLeft;
    const updateTimeStr = () => {
      const mins = Math.floor(time / 60);
      const secs = time % 60;
      setTimerString(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    };
    
    updateTimeStr();

    timerRef.current = setInterval(async () => {
      time--;
      if (time <= 0) {
        clearInterval(timerRef.current!);
        toast.error("Время вышло!");
        // Force complete
        loadSession();
      } else {
        updateTimeStr();
      }
    }, 1000);
  };

  // 4. Anti-cheat visibility listener
  useEffect(() => {
    if (!activeSession || !activeSession.active || activeSession.is_frozen || isAnnulling) return;

    const handleAntiCheat = async () => {
      if (document.hidden) {
        const nextWarn = warnings + 1;
        setWarnings(nextWarn);
        toast.warning(`Внимание! Переключение вкладок запрещено. Предупреждение ${nextWarn}/3`);

        if (activeSession.attempt_id) {
          const res = await testingApi.sendWarning(activeSession.attempt_id, nextWarn);
          if (res.aborted) {
            setIsAnnulling(true);
            toast.error("Тест аннулирован из-за нарушений режима защиты!");
            setTimeout(async () => {
              await apiLogout();
              window.location.reload();
            }, 3000);
          }
        }
      }
    };

    const handleCopyPasteBlock = (e: Event) => {
      e.preventDefault();
      toast.error("Копирование и вставка текста в режиме тестирования заблокированы!");
    };

    document.addEventListener("visibilitychange", handleAntiCheat);
    window.addEventListener("blur", handleAntiCheat);
    document.addEventListener("copy", handleCopyPasteBlock);
    document.addEventListener("cut", handleCopyPasteBlock);
    document.addEventListener("paste", handleCopyPasteBlock);
    document.addEventListener("contextmenu", handleCopyPasteBlock);

    return () => {
      document.removeEventListener("visibilitychange", handleAntiCheat);
      window.removeEventListener("blur", handleAntiCheat);
      document.removeEventListener("copy", handleCopyPasteBlock);
      document.removeEventListener("cut", handleCopyPasteBlock);
      document.removeEventListener("paste", handleCopyPasteBlock);
      document.removeEventListener("contextmenu", handleCopyPasteBlock);
    };
  }, [activeSession, warnings, isAnnulling]);

  // 5. Start Test handler
  const handleStartTest = async () => {
    try {
      await testingApi.startTest(subject, difficulty, timerMinutes);
      toast.success("Тест начат!");
      loadSession();
    } catch (err: any) {
      toast.error("Не удалось начать тест: " + err.message);
    }
  };

  // 6. Freeze/Pause Handler


  // 7. Resume Handler
  const handleResume = async () => {
    if (!activeSession || !activeSession.attempt_id) return;
    try {
      await testingApi.resumeTest(activeSession.attempt_id);
      toast.success("Тест возобновлен!");
      loadSession();
    } catch (err: any) {
      toast.error("Ошибка возобновления: " + err.message);
    }
  };

  // 8. Submit Answer Handler
  const handleSubmitAnswer = async () => {
    if (!activeSession || !activeSession.attempt_id || !question || isSubmitting) return;

    // Validate matching
    if (question.type === "matching") {
      const values = Object.values(selectedAnswer);
      if (values.some((v) => v === "")) {
        toast.warning("Пожалуйста, установите соответствия для всех пар!");
        return;
      }
    }

    if (question.type === "multichoice" && selectedAnswer.length === 0) {
      toast.warning("Выберите хотя бы один вариант!");
      return;
    }

    if (question.type === "choice" && selectedAnswer === null) {
      toast.warning("Выберите вариант ответа!");
      return;
    }

    if (question.type === "essay" && selectedAnswer.trim().length < 10) {
      toast.warning("Ваш ответ слишком короткий!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await testingApi.submitAnswer(activeSession.attempt_id, question.question_id, selectedAnswer);
      if (res.completed) {
        toast.success("Тестирование успешно завершено!");
        if (res.certificate) {
          setCertificate(res.certificate);
        } else {
          loadSession();
        }
      } else {
        await loadNextQuestion(activeSession.attempt_id, activeSession.time_limit_per_question);
      }
    } catch (err: any) {
      const errMsg = String(err.message || "");
      if (errMsg.toLowerCase().includes("ответили") || errMsg.toLowerCase().includes("already answered")) {
        toast.info("Ответ уже был записан ранее. Загружаем следующий вопрос...");
        await loadNextQuestion(activeSession.attempt_id, activeSession.time_limit_per_question);
      } else {
        toast.error("Ошибка отправки ответа: " + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8.5. Auto Submit when question timer expires
  const handleAutoSubmit = async () => {
    const currentSession = activeSessionRef.current;
    const currentQuestion = questionRef.current;
    const currentAnswer = selectedAnswerRef.current;
    const currentlySubmitting = isSubmittingRef.current;

    if (!currentSession || !currentSession.attempt_id || !currentQuestion || currentlySubmitting) return;

    let finalAnswer = currentAnswer;
    if (currentQuestion.type === "matching" && (!finalAnswer || Object.keys(finalAnswer).length === 0)) {
      finalAnswer = {};
    } else if (currentQuestion.type === "multichoice" && (!finalAnswer || finalAnswer.length === 0)) {
      finalAnswer = [];
    } else if (currentQuestion.type === "choice" && !finalAnswer) {
      finalAnswer = "";
    } else if (currentQuestion.type === "essay" && !finalAnswer) {
      finalAnswer = "";
    }

    setIsSubmitting(true);
    toast.info("Время на ответ истекло! Автоматическая отправка...", { duration: 2000 });

    try {
      const res = await testingApi.submitAnswer(currentSession.attempt_id, currentQuestion.question_id, finalAnswer);
      if (res.completed) {
        toast.success("Тестирование успешно завершено!");
        if (res.certificate) {
          setCertificate(res.certificate);
        } else {
          loadSession();
        }
      } else {
        await loadNextQuestion(currentSession.attempt_id, currentSession.time_limit_per_question);
      }
    } catch (err: any) {
      const errMsg = String(err.message || "");
      if (errMsg.toLowerCase().includes("ответили") || errMsg.toLowerCase().includes("already answered")) {
        await loadNextQuestion(currentSession.attempt_id, currentSession.time_limit_per_question);
      } else {
        toast.error("Ошибка авто-отправки: " + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8.6. Question timer interval
  useEffect(() => {
    if (questionSecondsLeft === null) {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      return;
    }

    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    questionTimerRef.current = setInterval(() => {
      setQuestionSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(questionTimerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [questionSecondsLeft]);

  // Rendering Helpers
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Icon name="Loader2" className="text-primary animate-spin" size={36} />
      </div>
    );
  }

  // Certificate Display
  if (certificate) {
    const isPassed = certificate.passed;
    const completedDate = new Date(certificate.completed_at).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    return (
      <div className="max-w-2xl mx-auto animate-scale-in py-4">
        <div className={`corner-mark bg-tactical-card border p-8 space-y-8 relative card-glow text-center overflow-hidden ${
          isPassed ? "border-gold/60 shadow-[0_0_25px_rgba(212,163,89,0.15)]" : "border-destructive/40"
        }`}>
          {/* Certificate Header Watermark */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
            <Icon name="Award" size={320} className={isPassed ? "text-gold" : "text-muted-foreground"} />
          </div>

          <div className="space-y-2 relative">
            <div className="flex justify-center mb-2">
              <Icon name="Award" size={64} className={isPassed ? "text-gold animate-pulse" : "text-muted-foreground"} />
            </div>
            <h2 className="font-oswald text-2xl tracking-widest uppercase text-foreground">
              СЕРТИФИКАТ
            </h2>
            <p className="text-muted-foreground text-xs uppercase tracking-widest font-mono">
              о прохождении тестирования
            </p>
          </div>

          <div className="space-y-1 relative">
            <span className="text-muted-foreground text-xs font-mono italic">Настоящим подтверждается, что</span>
            <h3 className="text-xl font-bold font-sans text-foreground py-2 border-b border-tactical-border/30 max-w-md mx-auto">
              {certificate.cadet_name}
            </h3>
            <div className="flex justify-center gap-3 text-[10px] font-mono text-muted-foreground mt-2">
              <span>ID: <strong className="text-foreground">{fmtStaticId(certificate.static_id)}</strong></span>
              <span>•</span>
              <span>Звание: <strong className="text-foreground">{certificate.rank}</strong></span>
              <span>•</span>
              <span>Подразделение: <strong className="text-foreground">{certificate.unit}</strong></span>
            </div>
          </div>

          <div className="space-y-2 relative">
            <span className="text-muted-foreground text-xs font-mono italic">завершил(а) тестирование по теме</span>
            <h4 className="text-md font-mono font-bold text-gold px-4 py-1.5 bg-tactical-panel/40 border border-tactical-border/50 max-w-lg mx-auto rounded-sm">
              {certificate.subject}
            </h4>
            <span className="text-[10px] font-mono text-muted-foreground block mt-1">
              Дата сдачи: {completedDate}
            </span>
          </div>

          {/* Metrics Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-tactical-panel/30 border border-tactical-border/50 p-4 font-mono text-xs max-w-xl mx-auto rounded-sm relative">
            <div className="text-center p-2 border-r border-tactical-border/30 last:border-0 sm:block flex justify-between items-center">
              <span className="text-muted-foreground text-[10px] uppercase block mb-1">Верные ответы</span>
              <strong className="text-sm text-foreground block">{certificate.correct_answers_count} из {certificate.total_questions}</strong>
            </div>
            <div className="text-center p-2 border-r border-tactical-border/30 last:border-0 sm:block flex justify-between items-center">
              <span className="text-muted-foreground text-[10px] uppercase block mb-1">Процент верных</span>
              <strong className="text-sm text-gold block">{certificate.percentage}%</strong>
            </div>
            <div className="text-center p-2 border-r border-tactical-border/30 last:border-0 sm:block flex justify-between items-center">
              <span className="text-muted-foreground text-[10px] uppercase block mb-1">Ваша оценка</span>
              <strong className={`text-sm block font-bold ${
                certificate.grade >= 4 ? "text-primary" : certificate.grade === 3 ? "text-gold" : "text-destructive"
              }`}>{certificate.grade}</strong>
            </div>
            <div className="text-center p-2 last:border-0 sm:block flex justify-between items-center">
              <span className="text-muted-foreground text-[10px] uppercase block mb-1">Результат</span>
              <strong className={`text-sm block font-bold uppercase tracking-wider ${
                isPassed ? "text-primary" : "text-destructive"
              }`}>{isPassed ? "Сдан" : "Не сдан"}</strong>
            </div>
          </div>

          {!isPassed && (
            <p className="text-destructive font-mono text-[10px] uppercase tracking-wider animate-pulse relative">
              Внимание: минимальный проходной балл составляет 80%. Тест не сдан.
            </p>
          )}

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4 relative">
            <button
              onClick={() => {
                const completedDate = new Date(certificate.completed_at).toLocaleDateString("ru-RU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });
                const discordText = `**[РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ АВНГ]**
**Курсант:** ${certificate.cadet_name} | ${fmtStaticId(certificate.static_id)}
**Звание:** ${certificate.rank || "—"}
**Подразделение:** ${certificate.unit || "—"}
**Тема:** ${certificate.subject}
**Результат:** ${certificate.passed ? "🟢 СДАН" : "🔴 НЕ СДАН"}
**Оценка:** ${certificate.grade}
**Верные ответы:** ${certificate.correct_answers_count} из ${certificate.total_questions} (${certificate.percentage}%)
**Дата сдачи:** ${completedDate}
**Ссылка на систему:** ${window.location.origin}`;
                
                navigator.clipboard.writeText(discordText);
                toast.success("Данные для Discord успешно скопированы!");
              }}
              className="bg-tactical-panel hover:bg-tactical-border/60 text-primary font-mono text-xs uppercase tracking-widest px-6 py-3 border border-primary/20 shadow-lg font-bold flex items-center gap-2"
            >
              <Icon name="Copy" size={14} />
              Скопировать для Discord
            </button>
            <button
              onClick={() => {
                setCertificate(null);
                loadSession();
              }}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-mono text-xs uppercase tracking-widest px-8 py-3 border border-primary/20 shadow-lg font-bold"
            >
              Завершить
            </button>
          </div>
        </div>
      </div>
    );
  }

  // A. If test is frozen (paused)
  if (activeSession?.active && activeSession.is_frozen) {
    return (
      <div className="corner-mark bg-tactical-card border border-tactical-border p-8 text-center max-w-md mx-auto space-y-6">
        <Icon name="Coffee" className="text-gold animate-bounce mx-auto" size={48} />
        <h3 className="font-oswald text-xl tracking-wide uppercase text-foreground">Тестирование приостановлено</h3>
        <p className="text-muted-foreground text-sm">
          Ваша сессия заморожена. Ответы и оставшееся время сохранены в базе данных на 30 дней.
        </p>
        <button
          onClick={handleResume}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 font-mono text-sm uppercase tracking-wider transition-colors border border-primary/20"
        >
          Возобновить тест
        </button>
      </div>
    );
  }

  // B. If active test is running
  if (activeSession?.active && question) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
        {/* Test status bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-tactical-panel border border-tactical-border p-4 text-center">
          <div>
            <span className="text-muted-foreground text-[10px] uppercase font-mono block">Прогресс</span>
            <span className="text-sm font-semibold font-mono text-foreground">
              {question.progress} из {question.total_questions}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px] uppercase font-mono block">Таймер</span>
            <span className="text-sm font-semibold font-mono text-gold flex items-center justify-center gap-1.5">
              <Icon name="Clock" size={14} /> {timerString}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px] uppercase font-mono block">Предупреждения</span>
            <span className={`text-sm font-semibold font-mono flex items-center justify-center gap-1.5 ${warnings > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              <Icon name="AlertTriangle" size={14} /> {warnings} / 3
            </span>
          </div>
        </div>

        {/* Question Panel */}
        <div className="corner-mark bg-tactical-card border border-tactical-border p-6 space-y-6 relative card-glow overflow-hidden">
          {questionSecondsLeft !== null && activeSession?.time_limit_per_question && (
            <div 
              className="absolute top-0 left-0 h-[3px] bg-primary transition-all duration-1000"
              style={{ 
                width: `${(questionSecondsLeft / activeSession.time_limit_per_question) * 100}%`,
                backgroundColor: questionSecondsLeft <= 10 ? "rgb(239 68 68)" : "var(--color-primary, rgb(212 163 89))"
              }}
            />
          )}
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-[10px] text-primary font-mono uppercase">
                {question.subject}
              </span>
              {questionSecondsLeft !== null && (
                <span className={`px-2 py-0.5 font-mono text-[10px] uppercase border animate-pulse ${
                  questionSecondsLeft <= 10
                    ? "bg-destructive/10 border-destructive text-destructive font-bold"
                    : "bg-gold/10 border-gold/40 text-gold"
                }`}>
                  Осталось времени: {questionSecondsLeft} сек.
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Тип: {question.type === "choice" ? "Базовый (Один выбор)" : question.type === "multichoice" ? "Продвинутый (Множ. выбор)" : question.type === "matching" ? "Продвинутый (Сопоставление)" : "Бонусный (Эссе)"}
            </span>
          </div>

          <p className="text-base text-foreground font-medium leading-relaxed">
            {question.question_text}
          </p>

          {/* Answer choices container */}
          <div className="space-y-3">
            {/* CHOICE TYPE */}
            {question.type === "choice" && question.options.map((opt: string, idx: number) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-3.5 border cursor-pointer transition-all ${
                  selectedAnswer === opt
                    ? "bg-primary/5 border-primary text-primary"
                    : "bg-tactical-panel/40 border-tactical-border/60 hover:bg-tactical-panel/80 hover:border-tactical-border"
                }`}
              >
                <input
                  type="radio"
                  name="choice-ans"
                  checked={selectedAnswer === opt}
                  onChange={() => setSelectedAnswer(opt)}
                  className="accent-primary w-4 h-4"
                />
                <span className="text-sm font-mono">{opt}</span>
              </label>
            ))}

            {/* MULTICHOICE TYPE */}
            {question.type === "multichoice" && question.options.map((opt: string, idx: number) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-3.5 border cursor-pointer transition-all ${
                  selectedAnswer?.includes(opt)
                    ? "bg-primary/5 border-primary text-primary"
                    : "bg-tactical-panel/40 border-tactical-border/60 hover:bg-tactical-panel/80 hover:border-tactical-border"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedAnswer?.includes(opt) || false}
                  onChange={() => {
                    const nextList = selectedAnswer?.includes(opt)
                      ? selectedAnswer.filter((x: string) => x !== opt)
                      : [...(selectedAnswer || []), opt];
                    setSelectedAnswer(nextList);
                  }}
                  className="accent-primary w-4 h-4"
                />
                <span className="text-sm font-mono">{opt}</span>
              </label>
            ))}

            {/* MATCHING TYPE */}
            {question.type === "matching" && (
              <div className="space-y-4">
                {question.options.keys.map((k: string, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-tactical-panel/30 border border-tactical-border/40">
                    <span className="text-sm font-mono text-muted-foreground sm:w-1/2">{k}</span>
                    <select
                      value={selectedAnswer?.[k] || ""}
                      onChange={(e) => {
                        setSelectedAnswer({
                          ...selectedAnswer,
                          [k]: e.target.value
                        });
                      }}
                      className="bg-tactical-card border border-tactical-border text-foreground text-xs font-mono p-2 focus:outline-none focus:border-primary sm:w-1/2"
                    >
                      <option value="">-- Выберите сопоставление --</option>
                      {question.options.shuffled_values.map((v: string, vIdx: number) => (
                        <option key={vIdx} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* ESSAY TYPE */}
            {question.type === "essay" && (
              <div className="space-y-3">
                <textarea
                  value={selectedAnswer || ""}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Введите развернутый текстовый ответ..."
                  className="w-full min-h-[160px] bg-tactical-panel border border-tactical-border p-4 text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-foreground resize-y"
                />
                <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                  <span>Минимум 30 символов.</span>
                  <span>Длина ответа: {(selectedAnswer || "").length} симв.</span>
                </div>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="flex justify-end pt-4 border-t border-tactical-border/40">
            <button
              onClick={handleSubmitAnswer}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-mono text-xs uppercase tracking-wider px-5 py-2.5 border border-primary/20 flex items-center gap-2 shadow-lg"
            >
              {isSubmitting ? (
                <>Отправка... <Icon name="Loader2" size={12} className="animate-spin" /></>
              ) : (
                <>Ответить <Icon name="CornerDownLeft" size={12} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // C. Start Screen (No active session)
  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      <div className="corner-mark bg-tactical-card border border-tactical-border p-6 space-y-6 card-glow">
        <h3 className="font-oswald text-lg tracking-wide uppercase text-foreground text-center border-b border-tactical-border pb-3 flex items-center justify-center gap-2">
          <Icon name="Award" className="text-primary" /> Начало тестирования
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Тема тестирования</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-tactical-panel border border-tactical-border text-foreground font-mono text-xs p-2.5 focus:outline-none focus:border-primary"
            >
              {subjectsList.map((subj, idx) => (
                <option key={idx} value={subj}>{subj}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleStartTest}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/95 py-3 font-mono text-xs uppercase tracking-wider transition-colors border border-primary/20 flex items-center justify-center gap-2"
        >
          Начать тестирование <Icon name="Play" size={12} />
        </button>
      </div>
    </div>
  );
}
