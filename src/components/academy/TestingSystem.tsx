import React, { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { apiLogout } from "@/lib/api";
import { testingApi, Question, ActiveSession } from "@/lib/testingApi";
import { toast } from "sonner";

interface TestingSystemProps {
  onNavigate?: (tab: string) => void;
}

export function TestingSystem({ onNavigate }: TestingSystemProps) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Starting config state
  const [subject, setSubject] = useState("Тест по ФЗ ФСВНГ и уставу ФСВНГ");
  const [difficulty, setDifficulty] = useState(5);
  const [timerMinutes, setTimerMinutes] = useState(45);
  
  // Current test state
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<any>(null);
  const [timerString, setTimerString] = useState("00:00");
  const [warnings, setWarnings] = useState(0);
  const [isAnnulling, setIsAnnulling] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Check active session on load
  useEffect(() => {
    loadSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
          loadNextQuestion(session.attempt_id);
          startTimer(session.remaining_seconds || 2700, session.attempt_id);
        }
      }
    } catch (err: any) {
      toast.error("Ошибка загрузки сессии: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load next question
  const loadNextQuestion = async (attemptId: number) => {
    try {
      const res = await testingApi.getNextQuestion(attemptId);
      if ("completed" in res && res.completed) {
        toast.success("Тестирование успешно завершено!");
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
        setShowFeedback(false);
        setFeedbackData(null);
      }
    } catch (err: any) {
      toast.error("Ошибка загрузки вопроса: " + err.message);
    }
  };

  // 3. Timer implementation
  const startTimer = (secondsLeft: number, attemptId: number) => {
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
      const res = await testingApi.startTest(subject, difficulty, timerMinutes);
      toast.success("Тест начат!");
      loadSession();
    } catch (err: any) {
      toast.error("Не удалось начать тест: " + err.message);
    }
  };

  // 6. Freeze/Pause Handler
  const handleFreeze = async () => {
    if (!activeSession || !activeSession.attempt_id) return;
    try {
      await testingApi.freezeTest(activeSession.attempt_id);
      if (timerRef.current) clearInterval(timerRef.current);
      toast.success("Сессия теста успешно заморожена на 30 дней!");
      loadSession();
    } catch (err: any) {
      toast.error("Ошибка заморозки: " + err.message);
    }
  };

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
    if (!activeSession || !activeSession.attempt_id || !question) return;

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

    try {
      const res = await testingApi.submitAnswer(activeSession.attempt_id, question.question_id, selectedAnswer);
      setFeedbackData(res);
      setShowFeedback(true);
    } catch (err: any) {
      toast.error("Ошибка отправки ответа: " + err.message);
    }
  };

  // Rendering Helpers
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Icon name="Loader2" className="text-primary animate-spin" size={36} />
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-tactical-panel border border-tactical-border p-4">
          <div className="text-center md:text-left">
            <span className="text-muted-foreground text-[10px] uppercase font-mono block">Прогресс</span>
            <span className="text-sm font-semibold font-mono text-foreground">
              {question.progress} из {question.total_questions}
            </span>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground text-[10px] uppercase font-mono block">Таймер</span>
            <span className="text-sm font-semibold font-mono text-gold flex items-center justify-center gap-1.5">
              <Icon name="Clock" size={14} /> {timerString}
            </span>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground text-[10px] uppercase font-mono block">Предупреждения</span>
            <span className={`text-sm font-semibold font-mono flex items-center justify-center gap-1.5 ${warnings > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              <Icon name="AlertTriangle" size={14} /> {warnings} / 3
            </span>
          </div>
          <div className="text-center md:text-right">
            <button
              onClick={handleFreeze}
              className="text-xs font-mono uppercase bg-tactical-card hover:bg-tactical-border text-gold border border-gold/30 px-3 py-1 transition-all"
            >
              Заморозить
            </button>
          </div>
        </div>

        {/* Question Panel */}
        <div className="corner-mark bg-tactical-card border border-tactical-border p-6 space-y-6 relative card-glow">
          <div className="flex justify-between items-start gap-4">
            <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-[10px] text-primary font-mono uppercase">
              {question.subject}
            </span>
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
                  onChange={() => !showFeedback && setSelectedAnswer(opt)}
                  disabled={showFeedback}
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
                    if (showFeedback) return;
                    const nextList = selectedAnswer?.includes(opt)
                      ? selectedAnswer.filter((x: string) => x !== opt)
                      : [...(selectedAnswer || []), opt];
                    setSelectedAnswer(nextList);
                  }}
                  disabled={showFeedback}
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
                        if (showFeedback) return;
                        setSelectedAnswer({
                          ...selectedAnswer,
                          [k]: e.target.value
                        });
                      }}
                      disabled={showFeedback}
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
                  onChange={(e) => !showFeedback && setSelectedAnswer(e.target.value)}
                  disabled={showFeedback}
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

          {/* Feedback Screen */}
          {showFeedback && feedbackData && (
            <div className={`p-4 border ${feedbackData.is_correct === false ? "bg-destructive/5 border-destructive/30 text-destructive-foreground" : feedbackData.type === "essay" ? "bg-primary/5 border-primary/30" : "bg-primary/5 border-primary/30 text-primary-foreground"} space-y-3 animate-fade-in`}>
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-semibold">
                <Icon name={feedbackData.is_correct === false ? "XCircle" : "CheckCircle"} size={16} />
                {feedbackData.type === "essay" ? "Ответ отправлен" : feedbackData.is_correct ? "Правильно!" : "Неверный ответ"}
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">
                {feedbackData.explanation}
              </p>
              {feedbackData.type !== "essay" && feedbackData.is_correct === false && (
                <div className="text-xs font-mono text-muted-foreground border-t border-tactical-border/30 pt-2">
                  <span className="text-gold block">Правильный ответ:</span>
                  <span className="block mt-1 font-semibold text-foreground">
                    {typeof feedbackData.correct_answer === "object"
                      ? JSON.stringify(feedbackData.correct_answer, null, 2)
                      : String(feedbackData.correct_answer)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-end pt-4 border-t border-tactical-border/40">
            {!showFeedback ? (
              <button
                onClick={handleSubmitAnswer}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-mono text-xs uppercase tracking-wider px-5 py-2.5 border border-primary/20 flex items-center gap-2 shadow-lg"
              >
                Ответить <Icon name="CornerDownLeft" size={12} />
              </button>
            ) : (
              <button
                onClick={() => loadNextQuestion(activeSession.attempt_id!)}
                className="bg-gold hover:bg-gold/90 text-gold-foreground font-mono text-xs uppercase tracking-wider px-5 py-2.5 border border-gold/20 flex items-center gap-2 shadow-lg"
              >
                Далее <Icon name="ArrowRight" size={12} />
              </button>
            )}
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
              <option value="Тест по ФЗ ФСВНГ и уставу ФСВНГ">Тест по ФЗ ФСВНГ и уставу ФСВНГ</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase mb-1">
              <span>Сложность</span>
              <span className="text-gold font-semibold">{difficulty} / 10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={difficulty}
              onChange={(e) => setDifficulty(parseInt(e.target.value))}
              className="w-full accent-primary bg-tactical-panel cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase mb-1">
              <span>Лимит времени</span>
              <span className="text-gold font-semibold">{timerMinutes} мин</span>
            </div>
            <input
              type="range"
              min="15"
              max="120"
              step="5"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(parseInt(e.target.value))}
              className="w-full accent-primary bg-tactical-panel cursor-pointer"
            />
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
