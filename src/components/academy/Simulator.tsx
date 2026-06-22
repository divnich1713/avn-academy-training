import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { SectionHeader } from "./UIComponents";
import { User } from "@/lib/api";
import { toast } from "sonner";
import { testingApi } from "@/lib/testingApi";

interface Choice {
  text: string;
  isCorrect: boolean;
  explanation: string;
  scoreImpact: number;
}

interface Step {
  id: number;
  question: string;
  choices: Choice[];
}

interface Scenario {
  id: string;
  title: string;
  category: string;
  difficulty: "Легко" | "Средне" | "Сложно";
  icon: string;
  description: string;
  steps: Step[];
}

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "kpp_gelandewagen",
    title: "Дежурство на КПП-1: Черный Gelandewagen",
    category: "КПП",
    difficulty: "Легко",
    icon: "ShieldAlert",
    description: "Вы стоите на дежурстве на основном контрольно-пропускном пункте базы ФСВНГ. К КПП подъезжает затонированный внедорожник без государственных регистрационных знаков. Водитель приоткрывает окно...",
    steps: [
      {
        id: 1,
        question: "Водитель пренебрежительно говорит вам: 'Открывай шлагбаум, я к генералу, его друг'. Ваше первое действие?",
        choices: [
          {
            text: "Открыть шлагбаум без лишних вопросов. Зачем злить друзей генерала?",
            isCorrect: false,
            explanation: "Пропуск посторонних лиц на охраняемую территорию без проверки документов категорически запрещен Внутренним уставом. Это грубое нарушение безопасности.",
            scoreImpact: -20,
          },
          {
            text: "Начать кричать на водителя, навести автомат на лобовое стекло и приказать выйти из машины.",
            isCorrect: false,
            explanation: "Это необоснованное проявление агрессии и угроза оружием гражданскому лицу. Вы нарушаете Внутренний Устав и ФЗ «О полиции». Оружие приводится в готовность только при угрозе жизни.",
            scoreImpact: -15,
          },
          {
            text: "Вежливо поприветствовать, представиться согласно уставу и запросить документы для проверки личности и цели визита.",
            isCorrect: true,
            explanation: "Согласно Внутреннему Уставу ФСВНГ, посторонние лица допускаются на территорию базы только после проверки документов, установления личности и согласования визита с дежурным офицером.",
            scoreImpact: 30,
          }
        ]
      },
      {
        id: 2,
        question: "Водитель отвечает: 'Ты не понял, боец? Я ниче показывать не буду. Открывай, а то завтра без погон останешься!' Ваша реакция?",
        choices: [
          {
            text: "Извиниться перед ним и открыть шлагбаум.",
            isCorrect: false,
            explanation: "Вы поддались давлению и совершили должностное нарушение. Угрозы со стороны посторонних гражданских лиц не являются основанием для обхода регламента досмотра.",
            scoreImpact: -30,
          },
          {
            text: "Доложить по рации старшему составу о конфликтной ситуации, зафиксировать отсутствие номеров ТС и вежливо, но твердо повторить законное требование предъявить документы.",
            isCorrect: true,
            explanation: "Правильно. В соответствии с ФЗ «О войсках национальной гвардии РФ» вы обязаны докладывать руководству о внештатных ситуациях на КПП, оставаясь вежливым и твердым.",
            scoreImpact: 30,
          },
          {
            text: "Достать тайзер, вытащить водителя из машины и заковать в наручники за неподчинение.",
            isCorrect: false,
            explanation: "Превышение полномочий. В данный момент нет признаков угрозы жизни сотрудников, сопротивления или непосредственной попытки прорыва. Применение спецсредств незаконно.",
            scoreImpact: -15,
          }
        ]
      },
      {
        id: 3,
        question: "Водитель резко сдает назад и пытается объехать шлагбаум через обочину, двигаясь прямо на территорию базы. Что предпримете?",
        choices: [
          {
            text: "Открыть огонь на поражение по водителю из автомата.",
            isCorrect: false,
            explanation: "Огнестрельное оружие на поражение по водителю запрещено применять, если ТС не несет непосредственной угрозы жизни граждан или сотрудников. Это повлечет уголовную ответственность.",
            scoreImpact: -40,
          },
          {
            text: "Сделать предупредительный выстрел в воздух, приказать заглушить двигатель. Если ТС продолжает движение на базу — открыть огонь по колесам для остановки ТС.",
            isCorrect: true,
            explanation: "В соответствии со ст. 21 ФЗ «О войсках национальной гвардии РФ», военнослужащий имеет право применять оружие для остановки транспортного средства путем его повреждения, если водитель игнорирует сигналы к остановке и пытается проникнуть на охраняемые объекты.",
            scoreImpact: 40,
          },
          {
            text: "Ничего не делать и спрятаться в будке охраны.",
            isCorrect: false,
            explanation: "Проявление халатности и трусости при несении караульной службы. Нарушитель проник на базу из-за вашего бездействия.",
            scoreImpact: -50,
          }
        ]
      }
    ]
  },
  {
    id: "patrol_trespass",
    title: "Патруль: Нарушитель периметра базы",
    category: "Патруль",
    difficulty: "Средне",
    icon: "Scan",
    description: "Вы патрулируете прилегающую территорию базы. Около забора в районе южного сектора вы замечаете неизвестного человека в темной одежде, который перелазит через ограждение и спрыгивает на охраняемую территорию части.",
    steps: [
      {
        id: 1,
        question: "Нарушитель спрыгнул на территорию. Каково ваше первое действие?",
        choices: [
          {
            text: "Немедленно открыть огонь на поражение из автомата.",
            isCorrect: false,
            explanation: "Стрельба на поражение без предупреждения по невооруженному нарушителю, который не совершает нападения, категорически запрещена законом.",
            scoreImpact: -35,
          },
          {
            text: "Подбежать к нему, направить оружие и скомандовать 'Лечь на землю, работает Росгвардия!', параллельно доложив в рацию место и факт проникновения.",
            isCorrect: true,
            explanation: "Верно. Своевременный доклад в рацию позволяет объявить тревогу на базе, а громкая и ясная команда дает нарушителю понять, что он обнаружен сотрудником правоохранительных органов.",
            scoreImpact: 30,
          },
          {
            text: "Сделать вид, что ничего не увидели, и продолжить патрулирование.",
            isCorrect: false,
            explanation: "Халатное несение патрульной службы. Создает прямую угрозу безопасности военного объекта.",
            scoreImpact: -50,
          }
        ]
      },
      {
        id: 2,
        question: "Увидев вас, нарушитель бросается бежать в сторону складов снабжения. Требования остановиться он игнорирует. Ваши действия?",
        choices: [
          {
            text: "Применить электрошокер (Tazer) для нейтрализации и задержания убегающего правонарушителя.",
            isCorrect: true,
            explanation: "Согласно ФЗ «О войсках национальной гвардии РФ», спецсредства (включая электрошоковое оружие) могут применяться для задержания лиц, застигнутых при совершении преступления или административного правонарушения, пытающихся скрыться.",
            scoreImpact: 40,
          },
          {
            text: "Открыть огонь из боевого автомата в спину убегающему нарушителю.",
            isCorrect: false,
            explanation: "Нарушитель не вооружен и не представляет смертельной угрозы. Применение огнестрельного оружия на поражение в спину убегающему квалифицируется как превышение полномочий.",
            scoreImpact: -45,
          },
          {
            text: "Прекратить погоню и вернуться на исходный патрульный маршрут.",
            isCorrect: false,
            explanation: "Упущение подозреваемого на территории военного объекта. Невыполнение служебного долга.",
            scoreImpact: -30,
          }
        ]
      }
    ]
  },
  {
    id: "detention_shooting",
    title: "Конфликт на КПП: Незаконная видеосъемка",
    category: "Задержание",
    difficulty: "Средне",
    icon: "UserCheck",
    description: "Гражданин стоит перед КПП-1 с телефоном и демонстративно снимает территорию базы, вышки, ворота и вооруженных часовых.",
    steps: [
      {
        id: 1,
        question: "Вы подходите к гражданину. С чего начнете общение?",
        choices: [
          {
            text: "Сразу выбить телефон из рук и надеть наручники.",
            isCorrect: false,
            explanation: "Грубое превышение полномочий и применение физической силы без законных оснований.",
            scoreImpact: -30,
          },
          {
            text: "Поприветствовать гражданина, представиться по форме, показать удостоверение в развернутом виде и вежливо поинтересоваться целью съемки.",
            isCorrect: true,
            explanation: "Согласно уставу, сотрудник ФСВНГ при обращении к гражданскому лицу обязан назвать должность, звание, фамилию и предъявить служебное удостоверение.",
            scoreImpact: 30,
          },
          {
            text: "Пройти мимо, так как на улице съемка разрешена.",
            isCorrect: false,
            explanation: "База ФСВНГ является режимным охраняемым объектом. Съемка оборонных сооружений и военных объектов ограничивается правилами безопасности, вы обязаны отреагировать.",
            scoreImpact: -15,
          }
        ]
      },
      {
        id: 2,
        question: "Гражданин начинает спорить: 'Я блогер, снимаю общественное место! Покажи закон, запрещающий мне снимать!' Ваши действия?",
        choices: [
          {
            text: "Наорать на него: 'Сюда иди, быстро камеру выключил, кому сказал!'",
            isCorrect: false,
            explanation: "Недопустимое, агрессивное и непрофессиональное поведение сотрудника, порочащее честь Росгвардии.",
            scoreImpact: -25,
          },
          {
            text: "Спокойно сослаться на статус режимного охраняемого объекта базы ФСВНГ и выдвинуть законное требование прекратить съемку территории и часовых.",
            isCorrect: true,
            explanation: "Верно. Согласно правилам охраны военных объектов и закону о гостайне, съемка инфраструктуры режимного объекта может быть ограничена в целях противодействия диверсионной деятельности.",
            scoreImpact: 35,
          },
          {
            text: "Согласиться с ним, помахать в камеру руками и уйти.",
            isCorrect: false,
            explanation: "Несерьезное отношение к охране объекта государственной важности.",
            scoreImpact: -20,
          }
        ]
      },
      {
        id: 3,
        question: "Гражданин игнорирует ваше законное требование, продолжает съемку и начинает вас словесно провоцировать. Ваши дальнейшие действия?",
        choices: [
          {
            text: "Объявить о задержании за помеху в осуществлении деятельности сотрудника государственной власти (ст. 93 УК РФ), применить силу для надевания наручников и задержать до приезда СОГ.",
            isCorrect: true,
            explanation: "В случае оказания помех законной деятельности сотрудника правоохранительных органов наступает ответственность по статье 93 УК РФ. Вы имеете право задержать гражданина и вызвать следственно-оперативную группу.",
            scoreImpact: 40,
          },
          {
            text: "Развернуться, плюнуть и уйти на пост.",
            isCorrect: false,
            explanation: "Невыполнение служебных обязанностей по пресечению правонарушений.",
            scoreImpact: -35,
          },
          {
            text: "Применить резиновую дубинку и избить его.",
            isCorrect: false,
            explanation: "Физическое насилие (удары дубинкой) по невооруженному гражданину, не оказывающему активного физического сопротивления, незаконно.",
            scoreImpact: -45,
          }
        ]
      }
    ]
  },
  {
    id: "interview_search",
    title: "Досмотр перед собеседованием",
    category: "Досмотр",
    difficulty: "Средне",
    icon: "Search",
    description: "Гражданин пришел на КПП-1 на собеседование в Академию Росгвардии. Перед пропуском на территорию базы вы обязаны досмотреть гражданина и его вещи.",
    steps: [
      {
        id: 1,
        question: "Гражданин готов к процедуре. Как вы проведете досмотр?",
        choices: [
          {
            text: "Резко заломить руку, поставить к стене и обыскать без предупреждения.",
            isCorrect: false,
            explanation: "Досмотр — это превентивная мера безопасности, а не задержание преступника. Необоснованное применение силы недопустимо.",
            scoreImpact: -20,
          },
          {
            text: "Включить нагрудную боди-камеру, предупредить гражданина о начале досмотра, вежливо попросить повернуться и досмотреть личные вещи с проверкой карманов.",
            isCorrect: true,
            explanation: "Верно. Процедура досмотра на КПП должна проводиться вежливо, с обязательной видеофиксацией и предупреждением досматриваемого лица.",
            scoreImpact: 35,
          },
          {
            text: "Быстро оглядеть его внешний вид и пропустить. Зачем тратить время?",
            isCorrect: false,
            explanation: "Халатность. Пропуск на военный объект лиц без досмотра вещей является критической ошибкой безопасности.",
            scoreImpact: -40,
          }
        ]
      },
      {
        id: 2,
        question: "В рюкзаке гражданина вы находите охотничий нож длиной 20 см. Лицензии на холодное оружие у гражданина нет. Ваши действия?",
        choices: [
          {
            text: "Забрать нож себе в карман, а гражданина отпустить.",
            isCorrect: false,
            explanation: "Присвоение чужого имущества, сокрытие правонарушения. Это является коррупционным преступлением.",
            scoreImpact: -50,
          },
          {
            text: "Объяснить гражданину, что пронос холодного оружия на базу запрещен. Временно изъять нож, задержать гражданина до выяснения обстоятельств и вызвать полицию/СОГ.",
            isCorrect: true,
            explanation: "Ношение холодного оружия без разрешительных документов незаконно, а его пронос на охраняемый режимный объект ФСВНГ категорически воспрещен. Требуется изъятие и задержание.",
            scoreImpact: 45,
          },
          {
            text: "Вернуть нож гражданину и просто отказать в проходе на собеседование.",
            isCorrect: false,
            explanation: "Гражданин совершил правонарушение (незаконный оборот оружия), просто отпустить его с ножом — проявление халатности.",
            scoreImpact: -25,
          }
        ]
      }
    ]
  }
];

export function Simulator({ authUser }: { authUser?: User }) {
  // Load custom scenarios from localStorage
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    try {
      const saved = localStorage.getItem("avng_custom_scenarios");
      if (!saved) return DEFAULT_SCENARIOS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SCENARIOS;
    } catch {
      return DEFAULT_SCENARIOS;
    }
  });

  // Authorization check for editor access
  const isAdmin = useMemo(() => {
    if (!authUser) return false;
    return ["head_avng", "deputy_head", "chief_instructor", "senior_ufsvng"].includes(authUser.role);
  }, [authUser]);

  useEffect(() => {
    testingApi.getCustomMaterials("scenarios")
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setScenarios(data);
          localStorage.setItem("avng_custom_scenarios", JSON.stringify(data));
        } else {
          // If DB returned null or empty, check local storage
          const local = localStorage.getItem("avng_custom_scenarios");
          if (local) {
            try {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setScenarios(parsed);
                if (isAdmin) {
                  testingApi.saveCustomMaterials("scenarios", parsed)
                    .then(() => console.log("Successfully auto-uploaded local scenarios to DB"))
                    .catch((err) => console.error("Auto-upload scenarios failed:", err));
                }
                return;
              }
            } catch (err) {
              console.warn("Failed to parse local scenarios:", err);
            }
          }
          // If both DB and localStorage are empty/invalid, reset to default
          setScenarios(DEFAULT_SCENARIOS);
          localStorage.setItem("avng_custom_scenarios", JSON.stringify(DEFAULT_SCENARIOS));
        }
      })
      .catch((err) => {
        console.error("Failed to load scenarios from DB:", err);
        setScenarios((prev) => Array.isArray(prev) && prev.length > 0 ? prev : DEFAULT_SCENARIOS);
      });
  }, [isAdmin]);

  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [scenarioScore, setScenarioScore] = useState(0);
  const [answersHistory, setAnswersHistory] = useState<Array<{ stepId: number; choiceText: string; isCorrect: boolean; explanation: string }>>([]);
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completedScenarios, setCompletedScenarios] = useState<Record<string, { passed: boolean; score: number }>>(() => {
    const saved = localStorage.getItem("avng_completed_scenarios");
    return saved ? JSON.parse(saved) : {};
  });

  // Editor states
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Editing Scenario metadata
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [scenFormTitle, setScenFormTitle] = useState("");
  const [scenFormCategory, setScenFormCategory] = useState("КПП");
  const [scenFormDifficulty, setScenFormDifficulty] = useState<"Легко" | "Средне" | "Сложно">("Легко");
  const [scenFormIcon, setScenFormIcon] = useState("ShieldAlert");
  const [scenFormDesc, setScenFormDesc] = useState("");

  // Managing Steps
  const [managingStepsScenId, setManagingStepsScenId] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [stepFormQuestion, setStepFormQuestion] = useState("");
  const [stepChoices, setStepChoices] = useState<Choice[]>([
    { text: "", isCorrect: false, explanation: "", scoreImpact: 0 },
    { text: "", isCorrect: false, explanation: "", scoreImpact: 0 },
    { text: "", isCorrect: false, explanation: "", scoreImpact: 0 }
  ]);

  // JSON Modal
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState("");

  const managingScenario = useMemo(() => {
    return scenarios.find((s) => s.id === managingStepsScenId) || null;
  }, [managingStepsScenId, scenarios]);

  const saveScenarios = (updated: Scenario[]) => {
    setScenarios(updated);
    localStorage.setItem("avng_custom_scenarios", JSON.stringify(updated));
    testingApi.saveCustomMaterials("scenarios", updated)
      .then(() => {
        toast.success("Изменения тренажера сохранены в базу данных фракции!");
      })
      .catch((err) => {
        console.error("Failed to save scenarios to DB:", err);
        toast.error("Не удалось сохранить сценарии на сервере: " + err.message);
      });
  };

  const handleStartScenario = (scenario: Scenario) => {
    if (scenario.steps.length === 0) {
      toast.warning("В этом сценарии ещё нет шагов!");
      return;
    }
    setActiveScenario(scenario);
    setCurrentStepIdx(0);
    setScenarioScore(0);
    setAnswersHistory([]);
    setSelectedChoiceIdx(null);
    setShowFeedback(false);
  };

  const handleChoose = (idx: number) => {
    if (showFeedback) return;
    setSelectedChoiceIdx(idx);
  };

  const handleCheckAnswer = () => {
    if (selectedChoiceIdx === null || !activeScenario) return;
    const currentStep = activeScenario.steps[currentStepIdx];
    const choice = currentStep.choices[selectedChoiceIdx];

    setScenarioScore((prev) => prev + choice.scoreImpact);
    setAnswersHistory((prev) => [
      ...prev,
      {
        stepId: currentStep.id,
        choiceText: choice.text,
        isCorrect: choice.isCorrect,
        explanation: choice.explanation,
      },
    ]);
    setShowFeedback(true);
  };

  const handleNextStep = () => {
    if (!activeScenario) return;
    setSelectedChoiceIdx(null);
    setShowFeedback(false);

    if (currentStepIdx < activeScenario.steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      // Scenario complete
      const isPassed = scenarioScore >= 60; // passing threshold
      const updated = {
        ...completedScenarios,
        [activeScenario.id]: { passed: isPassed, score: scenarioScore },
      };
      setCompletedScenarios(updated);
      localStorage.setItem("avng_completed_scenarios", JSON.stringify(updated));
    }
  };

  const handleBackToScenarios = () => {
    setActiveScenario(null);
  };

  // Scenario Save metadata
  const handleSaveScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenFormTitle.trim() || !scenFormDesc.trim()) {
      toast.warning("Заполните название и вводное описание!");
      return;
    }

    if (editingScenario) {
      // Update existing
      const updated = scenarios.map((s) =>
        s.id === editingScenario.id
          ? {
              ...s,
              title: scenFormTitle.trim(),
              category: scenFormCategory.trim(),
              difficulty: scenFormDifficulty,
              icon: scenFormIcon,
              description: scenFormDesc.trim(),
            }
          : s
      );
      saveScenarios(updated);
      toast.success("Сценарий обновлен!");
    } else {
      // Create new
      const newScen: Scenario = {
        id: "scenario_" + Date.now(),
        title: scenFormTitle.trim(),
        category: scenFormCategory.trim(),
        difficulty: scenFormDifficulty,
        icon: scenFormIcon,
        description: scenFormDesc.trim(),
        steps: [],
      };
      saveScenarios([...scenarios, newScen]);
      toast.success("Сценарий создан!");
    }
    setEditingScenario(null);
  };

  // Delete Scenario
  const handleDeleteScenario = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Вы действительно хотите удалить этот сценарий и все его шаги?")) {
      return;
    }
    const updated = scenarios.filter((s) => s.id !== id);
    saveScenarios(updated);
    toast.success("Сценарий удален");
  };

  // Open Scenario Form
  const handleOpenScenarioForm = (scen: Scenario | null) => {
    if (scen) {
      setEditingScenario(scen);
      setScenFormTitle(scen.title);
      setScenFormCategory(scen.category);
      setScenFormDifficulty(scen.difficulty);
      setScenFormIcon(scen.icon);
      setScenFormDesc(scen.description);
    } else {
      setEditingScenario(null);
      setScenFormTitle("");
      setScenFormCategory("КПП");
      setScenFormDifficulty("Легко");
      setScenFormIcon("ShieldAlert");
      setScenFormDesc("");
    }
  };

  // Step Form Save
  const handleSaveStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingStepsScenId) return;
    if (!stepFormQuestion.trim()) {
      toast.warning("Заполните текст вопроса!");
      return;
    }

    // Verify at least one correct and choices filled
    const invalidChoice = stepChoices.some((c) => !c.text.trim() || !c.explanation.trim());
    if (invalidChoice) {
      toast.warning("Заполните текст и объяснения для всех 3 вариантов!");
      return;
    }

    const hasCorrect = stepChoices.some((c) => c.isCorrect);
    if (!hasCorrect) {
      toast.warning("Пожалуйста, выберите хотя бы один верный вариант ответа!");
      return;
    }

    const targetScen = scenarios.find((s) => s.id === managingStepsScenId);
    if (!targetScen) return;

    let updatedSteps = [...targetScen.steps];
    if (editingStep) {
      // Edit step
      updatedSteps = updatedSteps.map((s) =>
        s.id === editingStep.id
          ? {
              ...s,
              question: stepFormQuestion.trim(),
              choices: stepChoices,
            }
          : s
      );
      toast.success("Шаг успешно обновлен!");
    } else {
      // Add step
      const newStep: Step = {
        id: Date.now(),
        question: stepFormQuestion.trim(),
        choices: stepChoices,
      };
      updatedSteps.push(newStep);
      toast.success("Шаг добавлен в сценарий!");
    }

    const updatedScenarios = scenarios.map((s) =>
      s.id === managingStepsScenId ? { ...s, steps: updatedSteps } : s
    );
    saveScenarios(updatedScenarios);

    setEditingStep(null);
    setStepFormQuestion("");
    setStepChoices([
      { text: "", isCorrect: false, explanation: "", scoreImpact: 0 },
      { text: "", isCorrect: false, explanation: "", scoreImpact: 0 },
      { text: "", isCorrect: false, explanation: "", scoreImpact: 0 }
    ]);
  };

  // Open Step Form
  const handleOpenStepForm = (step: Step | null) => {
    if (step) {
      setEditingStep(step);
      setStepFormQuestion(step.question);
      setStepChoices(step.choices.map((c) => ({ ...c })));
    } else {
      setEditingStep(null);
      setStepFormQuestion("");
      setStepChoices([
        { text: "", isCorrect: false, explanation: "", scoreImpact: 0 },
        { text: "", isCorrect: false, explanation: "", scoreImpact: 0 },
        { text: "", isCorrect: false, explanation: "", scoreImpact: 0 }
      ]);
    }
  };

  // Delete Step
  const handleDeleteStep = (stepId: number) => {
    if (!managingStepsScenId) return;
    if (!window.confirm("Удалить этот шаг из сценария?")) return;

    const targetScen = scenarios.find((s) => s.id === managingStepsScenId);
    if (!targetScen) return;

    const updatedSteps = targetScen.steps.filter((s) => s.id !== stepId);
    const updatedScenarios = scenarios.map((s) =>
      s.id === managingStepsScenId ? { ...s, steps: updatedSteps } : s
    );
    saveScenarios(updatedScenarios);
    toast.success("Шаг удален");
  };

  // JSON Save
  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        toast.error("JSON должен быть массивом сценариев!");
        return;
      }
      saveScenarios(parsed);
      setShowJsonModal(false);
      toast.success("Сценарии импортированы!");
    } catch (e: any) {
      toast.error("Ошибка парсинга: " + e.message);
    }
  };

  const handleOpenJsonModal = () => {
    setJsonText(JSON.stringify(scenarios, null, 2));
    setShowJsonModal(true);
  };

  const ICON_OPTIONS = ["ShieldAlert", "Scan", "UserCheck", "Search", "Target", "Info", "Wrench", "Lock", "GraduationCap"];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-tactical-border pb-4 gap-4">
        <div>
          <h2 className="font-oswald text-2xl uppercase tracking-wider text-foreground flex items-center gap-2">
            <Icon name="Target" size={24} className="text-primary" />
            Тренажер тактических ситуаций
          </h2>
          <p className="text-sm text-muted-foreground font-ibm mt-1">
            Практическое обучение действиям в карауле, патрулировании и при задержаниях.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Admin Edit Mode toggle */}
          {isAdmin && !activeScenario && !managingStepsScenId && !editingScenario && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 text-xs font-mono border px-4 py-2 transition-all ${
                isEditMode
                  ? "bg-primary border-primary text-primary-foreground font-bold shadow-lg"
                  : "bg-tactical-card border-tactical-border text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
            >
              <Icon name="Edit" size={13} />
              {isEditMode ? "Выйти из редактора" : "Редактор сценариев"}
            </button>
          )}

          {/* Back button from study mode */}
          {activeScenario && (
            <button
              onClick={handleBackToScenarios}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-mono bg-tactical-card border border-tactical-border hover:border-primary/50 px-4 py-2 transition-all"
            >
              <Icon name="ArrowLeft" size={14} />
              К сценариям
            </button>
          )}

          {/* Back button from managing steps */}
          {managingStepsScenId && (
            <button
              onClick={() => {
                setManagingStepsScenId(null);
                setEditingStep(null);
              }}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-mono bg-tactical-card border border-tactical-border hover:border-primary/50 px-4 py-2 transition-all"
            >
              <Icon name="ArrowLeft" size={14} />
              К списку сценариев
            </button>
          )}
        </div>
      </div>

      {/* JSON Import/Export Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-tactical-card border-2 border-primary/50 p-6 rounded-lg max-w-2xl w-full space-y-4 shadow-[0_0_24px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-center border-b border-tactical-border pb-2">
              <h3 className="font-oswald text-lg uppercase tracking-wider text-gold flex items-center gap-2">
                <Icon name="RefreshCw" size={18} />
                Импорт / Экспорт JSON сценариев
              </h3>
              <button onClick={() => setShowJsonModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" size={20} />
              </button>
            </div>
            <textarea
              className="w-full h-80 bg-black/60 border border-tactical-border text-green-400 font-mono text-xs p-3 focus:outline-none focus:border-primary rounded scrollbar-thin"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
            <div className="flex justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                  toast.success("JSON сценариев скопирован!");
                }}
                className="bg-tactical-card border border-tactical-border hover:border-primary/50 text-foreground font-mono text-xs uppercase px-4 py-2 rounded transition-colors"
              >
                Копировать JSON
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveJson}
                  className="bg-primary text-primary-foreground font-oswald text-xs tracking-widest uppercase px-6 py-2 hover:bg-primary/95 transition-colors rounded"
                >
                  Импортировать
                </button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="border border-tactical-border text-muted-foreground font-oswald text-xs tracking-widest uppercase px-4 py-2 hover:border-primary/30 transition-colors rounded"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Scenario Metadata creation/editing Form */}
      {isEditMode && editingScenario !== null && (
        <form onSubmit={handleSaveScenario} className="bg-tactical-card border-2 border-primary/40 p-6 rounded-lg space-y-4 animate-fade-in max-w-xl mx-auto card-glow">
          <h3 className="font-oswald text-lg uppercase tracking-wider text-gold border-b border-tactical-border pb-2">
            {editingScenario.id ? "Редактирование сценария" : "Создание нового сценария"}
          </h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Название сценария</label>
              <input
                type="text"
                className="w-full bg-tactical-panel border border-tactical-border text-foreground px-3 py-2 text-xs font-ibm focus:outline-none focus:border-primary rounded"
                placeholder="Дежурство на КПП-1: Черный Gelandewagen"
                value={scenFormTitle}
                onChange={(e) => setScenFormTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Вводное описание ситуации</label>
              <textarea
                className="w-full h-24 bg-tactical-panel border border-tactical-border text-foreground px-3 py-2 text-xs font-ibm focus:outline-none focus:border-primary rounded resize-none"
                placeholder="Опишите ситуацию, в которой оказывается курсант..."
                value={scenFormDesc}
                onChange={(e) => setScenFormDesc(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Категория</label>
                <input
                  type="text"
                  className="w-full bg-tactical-panel border border-tactical-border text-foreground px-3 py-2 text-xs font-ibm focus:outline-none focus:border-primary rounded"
                  placeholder="КПП, Патруль, Задержание"
                  value={scenFormCategory}
                  onChange={(e) => setScenFormCategory(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Сложность</label>
                <select
                  className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 text-xs font-ibm focus:outline-none focus:border-primary rounded"
                  value={scenFormDifficulty}
                  onChange={(e) => setScenFormDifficulty(e.target.value as any)}
                >
                  <option value="Легко">Легко</option>
                  <option value="Средне">Средне</option>
                  <option value="Сложно">Сложно</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Иконка</label>
                <select
                  className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 text-xs font-ibm focus:outline-none focus:border-primary rounded"
                  value={scenFormIcon}
                  onChange={(e) => setScenFormIcon(e.target.value)}
                >
                  {ICON_OPTIONS.map((ico) => (
                    <option key={ico} value={ico}>{ico}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="bg-primary text-primary-foreground font-oswald text-xs tracking-widest uppercase px-6 py-2.5 hover:bg-primary/95 transition-colors rounded">
              Сохранить
            </button>
            <button type="button" onClick={() => setEditingScenario(null)} className="border border-tactical-border text-muted-foreground font-oswald text-xs tracking-widest uppercase px-4 py-2.5 hover:border-primary/30 transition-colors rounded">
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* 3. Steps Manager View */}
      {isEditMode && managingStepsScenId !== null && managingScenario && (
        <div className="space-y-6 animate-fade-in">
          {/* Info Block */}
          <div className="bg-tactical-card border border-tactical-border p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 card-glow">
            <div>
              <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-wider">КОНСТРУКТОР ШАГОВ</span>
              <h3 className="font-oswald text-lg uppercase tracking-wider text-foreground mt-0.5">{managingScenario.title}</h3>
              <p className="text-xs text-muted-foreground font-ibm">{managingScenario.description}</p>
            </div>
            {!editingStep && (
              <button
                onClick={() => handleOpenStepForm(null)}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-mono text-xs uppercase tracking-wider px-4 py-2.5 border border-primary/20 flex items-center gap-1.5 shadow-lg shrink-0 rounded"
              >
                <Icon name="Plus" size={13} /> Добавить шаг
              </button>
            )}
          </div>

          {/* Add / Edit Step Form */}
          {editingStep !== null && (
            <form onSubmit={handleSaveStep} className="bg-tactical-card border-2 border-primary/40 p-5 rounded-lg space-y-4 max-w-2xl mx-auto card-glow">
              <h4 className="font-oswald text-sm uppercase tracking-wider text-gold border-b border-tactical-border pb-1">
                {editingStep.id ? "Редактирование шага" : "Новый шаг сценария"}
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Вопрос / Описание ситуации на данном шаге</label>
                  <textarea
                    className="w-full h-20 bg-tactical-panel border border-tactical-border text-foreground px-3 py-2 text-xs font-ibm focus:outline-none focus:border-primary rounded resize-none"
                    placeholder="Например: Гражданин отказывается показывать паспорт. Ваши действия?"
                    value={stepFormQuestion}
                    onChange={(e) => setStepFormQuestion(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-4 pt-2 border-t border-tactical-border/50">
                  <span className="block text-xs font-mono text-primary uppercase font-bold">Варианты решений (Должно быть ровно 3 варианта)</span>
                  
                  {stepChoices.map((choice, idx) => (
                    <div key={idx} className="p-3 bg-black/30 border border-tactical-border/60 space-y-2 rounded">
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-mono text-gold font-bold">Вариант {idx + 1}</span>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={choice.isCorrect}
                              onChange={(e) => {
                                const updated = [...stepChoices];
                                // If setting to true, we can set others to false, or allow multiple. Standard is single correct choice. Let's make it single correct.
                                if (e.target.checked) {
                                  updated.forEach((c, i) => { c.isCorrect = i === idx; });
                                } else {
                                  updated[idx].isCorrect = false;
                                }
                                setStepChoices(updated);
                              }}
                              className="accent-primary"
                            />
                            <span className="text-[10px] font-mono text-foreground">Правильный ответ</span>
                          </label>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono text-muted-foreground">Влияние:</span>
                            <input
                              type="number"
                              className="w-16 bg-tactical-panel border border-tactical-border text-foreground px-2 py-0.5 text-[10px] font-mono text-center focus:outline-none rounded"
                              value={choice.scoreImpact}
                              onChange={(e) => {
                                const updated = [...stepChoices];
                                updated[idx].scoreImpact = Number(e.target.value) || 0;
                                setStepChoices(updated);
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <input
                        type="text"
                        className="w-full bg-tactical-panel border border-tactical-border text-foreground px-3 py-1.5 text-xs font-ibm focus:outline-none focus:border-primary rounded"
                        placeholder="Текст решения..."
                        value={choice.text}
                        onChange={(e) => {
                          const updated = [...stepChoices];
                          updated[idx].text = e.target.value;
                          setStepChoices(updated);
                        }}
                        required
                      />

                      <input
                        type="text"
                        className="w-full bg-tactical-panel border border-tactical-border text-foreground px-3 py-1.5 text-xs font-ibm focus:outline-none focus:border-primary rounded"
                        placeholder="Объяснение и анализ после выбора..."
                        value={choice.explanation}
                        onChange={(e) => {
                          const updated = [...stepChoices];
                          updated[idx].explanation = e.target.value;
                          setStepChoices(updated);
                        }}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="bg-primary text-primary-foreground font-oswald text-xs tracking-widest uppercase px-5 py-2 hover:bg-primary/95 transition-colors rounded">
                  Сохранить шаг
                </button>
                <button type="button" onClick={() => setEditingStep(null)} className="border border-tactical-border text-muted-foreground font-oswald text-xs tracking-widest uppercase px-4 py-2 hover:border-primary/30 transition-colors rounded">
                  Отмена
                </button>
              </div>
            </form>
          )}

          {/* Steps list */}
          <div className="space-y-3">
            {managingScenario.steps.length === 0 ? (
              <div className="bg-tactical-card border border-tactical-border p-8 text-center text-muted-foreground font-ibm text-xs">
                В сценарии ещё нет шагов. Нажмите «Добавить шаг», чтобы наполнить симуляцию.
              </div>
            ) : (
              managingScenario.steps.map((step, idx) => (
                <div key={step.id} className="bg-tactical-card border border-tactical-border p-4 rounded-lg card-glow flex justify-between items-start gap-4">
                  <div className="space-y-2">
                    <span className="font-mono text-xs text-gold font-bold">Шаг {idx + 1}</span>
                    <p className="text-xs text-foreground font-ibm font-semibold">{step.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                      {step.choices.map((c, cIdx) => (
                        <div key={cIdx} className={`p-2 border text-[10px] rounded font-ibm leading-tight ${c.isCorrect ? "border-green-500/30 bg-green-950/10 text-green-400" : "border-tactical-border bg-black/20 text-muted-foreground"}`}>
                          <span className="font-bold">Вариант {cIdx + 1}: </span> {c.text} <span className="font-mono text-[9px] font-bold">({c.scoreImpact > 0 ? `+${c.scoreImpact}` : c.scoreImpact} б.)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenStepForm(step)}
                      className="text-[10px] text-primary hover:underline uppercase tracking-wider flex items-center gap-1 border border-tactical-border hover:border-primary/40 px-2 py-1 bg-black/20"
                    >
                      <Icon name="Edit" size={10} /> Изменить
                    </button>
                    <button
                      onClick={() => handleDeleteStep(step.id)}
                      className="p-1 text-red-500 hover:text-red-400 border border-tactical-border hover:border-red-500/40 rounded bg-black/20"
                    >
                      <Icon name="Trash2" size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. Scenario Selection Grid */}
      {!activeScenario && managingStepsScenId === null && editingScenario === null && (
        <div className="space-y-6">
          {/* Editor control options */}
          {isEditMode && (
            <div className="flex flex-wrap justify-between items-center gap-3 bg-tactical-card border-2 border-dashed border-primary/30 p-4 rounded-lg card-glow">
              <div className="text-xs text-muted-foreground font-ibm">
                <span className="text-primary font-bold">Редактор симулятора активен.</span> Вы можете изменять существующие тактические ситуации, настраивать шаги ответов или импортировать/экспортировать JSON-бэкапы.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenScenarioForm(null)}
                  className="bg-primary/10 hover:bg-primary/20 border border-primary/40 text-foreground font-mono text-xs uppercase tracking-wider px-4 py-2 flex items-center gap-1 rounded transition-colors"
                >
                  <Icon name="Plus" size={12} /> Создать сценарий
                </button>
                <button
                  onClick={handleOpenJsonModal}
                  className="bg-tactical-card border border-tactical-border hover:border-primary/40 text-foreground font-mono text-xs uppercase tracking-wider px-4 py-2 flex items-center gap-1 rounded transition-colors"
                >
                  <Icon name="RefreshCw" size={12} className="text-gold" /> Импорт / Экспорт JSON
                </button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {scenarios.map((s) => {
              const result = completedScenarios[s.id];
              const isPassed = result?.passed;
              const hasPlayed = !!result;

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (isEditMode) {
                      setManagingStepsScenId(s.id);
                      setEditingStep(null);
                    } else {
                      handleStartScenario(s);
                    }
                  }}
                  className={`corner-mark bg-tactical-card border p-6 flex flex-col justify-between transition-all group cursor-pointer ${
                    hasPlayed && isPassed
                      ? "border-green-500/30 bg-green-950/5 hover:border-green-500/60"
                      : hasPlayed && !isPassed
                      ? "border-red-500/30 bg-red-950/5 hover:border-red-500/60"
                      : "border-tactical-border hover:border-primary/40"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 border flex items-center justify-center ${
                            hasPlayed && isPassed
                              ? "bg-green-950 border-green-500/30 text-green-400"
                              : hasPlayed && !isPassed
                              ? "bg-red-950 border-red-500/30 text-red-400"
                              : "bg-tactical-panel border-tactical-border text-muted-foreground group-hover:text-primary group-hover:border-primary/40"
                          } transition-colors`}
                        >
                          <Icon name={s.icon} size={20} />
                        </div>
                        <div>
                          <h3 className="font-oswald text-sm font-semibold tracking-wide text-foreground">
                            {s.title}
                          </h3>
                          <span className="text-[9px] font-mono uppercase text-muted-foreground">
                            {s.category} · {s.difficulty}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {hasPlayed && !isEditMode && (
                          isPassed ? (
                            <span className="rank-badge text-green-400 border border-green-800 bg-green-950/40 px-1.5 py-0.5 text-[9px] flex items-center gap-0.5 select-none">
                              <Icon name="CheckCircle" size={9} />
                              Пройден ({result.score} б.)
                            </span>
                          ) : (
                            <span className="rank-badge text-red-400 border border-red-800 bg-red-950/40 px-1.5 py-0.5 text-[9px] flex items-center gap-0.5 select-none">
                              <Icon name="XCircle" size={9} />
                              Провален ({result.score} б.)
                            </span>
                          )
                        )}
                        {!hasPlayed && !isEditMode && (
                          <span className="rank-badge text-yellow-500 border border-yellow-800 bg-yellow-950/10 px-1.5 py-0.5 text-[9px]">
                            Не пройден
                          </span>
                        )}

                        {/* Edit metadata & Delete options */}
                        {isEditMode && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenScenarioForm(s)}
                              className="p-1 text-muted-foreground hover:text-gold border border-tactical-border hover:border-gold/40 rounded bg-black/20"
                              title="Редактировать параметры сценария"
                            >
                              <Icon name="Edit" size={12} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteScenario(s.id, e)}
                              className="p-1 text-muted-foreground hover:text-red-400 border border-tactical-border hover:border-red-500/40 rounded bg-black/20"
                              title="Удалить сценарий"
                            >
                              <Icon name="Trash2" size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-ibm leading-relaxed">
                      {s.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-tactical-border/40 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Вопросов: {s.steps.length}
                    </span>
                    <button className="font-oswald text-xs tracking-wider uppercase px-4 py-2 transition-colors border bg-primary text-primary-foreground border-primary hover:bg-primary/95 rounded">
                      {isEditMode ? "Редактировать шаги" : "Начать сценарий"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Scenario Active Game Screen */}
      {!isEditMode && activeScenario && (
        <div className="animate-fade-in space-y-6">
          <div className="flex justify-between items-center border-b border-tactical-border pb-3">
            <button
              onClick={handleBackToScenarios}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors uppercase tracking-wider font-oswald"
            >
              <Icon name="ChevronLeft" size={14} /> Назад к списку
            </button>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span>Счет: <span className={scenarioScore >= 60 ? "text-green-400" : "text-primary"}>{scenarioScore} б.</span></span>
              <span>Шаг {currentStepIdx + 1} из {activeScenario.steps.length}</span>
            </div>
          </div>

          {answersHistory.length === activeScenario.steps.length && !showFeedback ? (
            /* Final Summary Screen */
            <div className="bg-tactical-card border border-tactical-border p-6 corner-mark space-y-6 text-center max-w-2xl mx-auto">
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center border-2 border-dashed border-tactical-border">
                  <Icon
                    name={scenarioScore >= 60 ? "CheckCircle" : "AlertTriangle"}
                    size={36}
                    className={scenarioScore >= 60 ? "text-green-500 animate-pulse" : "text-primary"}
                  />
                </div>
                <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground">
                  {scenarioScore >= 60 ? "Тест успешно пройден" : "Тест провален"}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Итоговый счет: {scenarioScore} баллов (для сдачи требуется минимум 60 баллов)
                </p>
              </div>

              <div className="text-left space-y-4 border-y border-tactical-border/60 py-4 max-h-[300px] overflow-y-auto pr-2">
                <h4 className="font-oswald text-xs uppercase tracking-widest text-muted-foreground">
                  Детализация прохождения:
                </h4>
                {answersHistory.map((ans, idx) => (
                  <div key={idx} className="p-3 bg-tactical-panel/40 border border-tactical-border space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-ibm font-semibold text-foreground">
                        Вопрос {idx + 1}: {activeScenario.steps[idx] ? activeScenario.steps[idx].question : "Вопрос"}
                      </p>
                      <span
                        className={`rank-badge text-[9px] px-1.5 py-0.5 font-bold ${
                          ans.isCorrect ? "text-green-400 border border-green-800 bg-green-950/20" : "text-red-400 border border-red-800 bg-red-950/20"
                        }`}
                      >
                        {ans.isCorrect ? "Верно" : "Неверно"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-ibm italic">
                      Ваш выбор: "{ans.choiceText}"
                    </p>
                    <p className="text-xs text-muted-foreground font-ibm border-t border-tactical-border/30 pt-1.5 mt-1.5">
                      <strong>Анализ ситуации: </strong>
                      {ans.explanation}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => handleStartScenario(activeScenario)}
                  className="bg-tactical-panel border border-tactical-border hover:border-primary/50 text-foreground font-oswald text-xs uppercase tracking-widest px-6 py-2.5 transition-colors"
                >
                  Пройти заново
                </button>
                <button
                  onClick={handleBackToScenarios}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-oswald text-xs uppercase tracking-widest px-6 py-2.5 transition-colors"
                >
                  Вернуться в меню
                </button>
              </div>
            </div>
          ) : (
            /* Active Step Question Screen */
            <div className="grid md:grid-cols-12 gap-6 items-start">
              {/* Question & Choices */}
              <div className="md:col-span-8 space-y-6">
                <div className="bg-tactical-card border border-tactical-border p-6 corner-mark space-y-4">
                  <span className="text-[10px] font-mono text-yellow-500 uppercase tracking-widest block">
                    ВВОДНАЯ СИТУАЦИЯ
                  </span>
                  <p className="text-sm font-ibm text-foreground leading-relaxed">
                    {activeScenario.steps[currentStepIdx] ? activeScenario.steps[currentStepIdx].question : ""}
                  </p>
                </div>

                <div className="space-y-3">
                  {activeScenario.steps[currentStepIdx] && activeScenario.steps[currentStepIdx].choices.map((c, idx) => {
                    const isSelected = selectedChoiceIdx === idx;
                    return (
                      <button
                        key={idx}
                        disabled={showFeedback}
                        onClick={() => handleChoose(idx)}
                        className={`w-full text-left corner-mark border p-4 transition-all flex items-start gap-4 ${
                          showFeedback
                            ? isSelected
                              ? c.isCorrect
                                ? "border-green-500 bg-green-950/10 cursor-default"
                                : "border-red-500 bg-red-950/10 cursor-default"
                              : c.isCorrect
                              ? "border-green-500/40 bg-green-950/5 cursor-default"
                              : "border-tactical-border opacity-50 cursor-default"
                            : isSelected
                            ? "border-primary bg-primary/5 card-glow"
                            : "border-tactical-border hover:border-primary/40 hover:bg-tactical-panel/20"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            showFeedback
                              ? c.isCorrect
                                ? "border-green-500 text-green-400 bg-green-950/40"
                                : isSelected
                                ? "border-red-500 text-red-400 bg-red-950/40"
                                : "border-tactical-border"
                              : isSelected
                              ? "border-primary text-primary bg-primary/20"
                              : "border-tactical-border text-transparent"
                          }`}
                        >
                          {showFeedback ? (
                            c.isCorrect ? (
                              <Icon name="Check" size={10} />
                            ) : (
                              isSelected && <Icon name="X" size={10} />
                            )
                          ) : (
                            isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs font-ibm text-foreground leading-relaxed">
                          {c.text}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2">
                  {!showFeedback ? (
                    <button
                      disabled={selectedChoiceIdx === null}
                      onClick={handleCheckAnswer}
                      className="bg-primary text-primary-foreground font-oswald text-xs tracking-widest uppercase py-3 px-8 hover:bg-primary/95 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 rounded"
                    >
                      Принять решение <Icon name="ShieldCheck" size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={handleNextStep}
                      className="bg-primary text-primary-foreground font-oswald text-xs tracking-widest uppercase py-3 px-8 hover:bg-primary/95 transition-colors flex items-center gap-1.5 rounded"
                    >
                      {currentStepIdx < activeScenario.steps.length - 1 ? (
                        <>
                          Следующий шаг <Icon name="ArrowRight" size={14} />
                        </>
                      ) : (
                        <>
                          Завершить сценарий <Icon name="Award" size={14} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Sidebar Description / Real-time Feedback */}
              <div className="md:col-span-4 space-y-4">
                <div className="bg-tactical-card border border-tactical-border/60 p-4 corner-mark">
                  <h4 className="font-oswald text-xs uppercase tracking-widest text-muted-foreground border-b border-tactical-border pb-2 mb-3">
                    Описание ситуации
                  </h4>
                  <p className="text-xs text-muted-foreground font-ibm leading-relaxed">
                    {activeScenario.description}
                  </p>
                </div>

                {showFeedback && selectedChoiceIdx !== null && activeScenario.steps[currentStepIdx] && (
                  <div
                    className={`border p-4 corner-mark animate-fade-in space-y-2.5 rounded ${
                      activeScenario.steps[currentStepIdx].choices[selectedChoiceIdx].isCorrect
                        ? "border-green-500/50 bg-green-950/10"
                        : "border-red-500/50 bg-red-950/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        name={
                          activeScenario.steps[currentStepIdx].choices[selectedChoiceIdx].isCorrect
                            ? "CheckCircle"
                            : "AlertTriangle"
                        }
                        size={16}
                        className={
                          activeScenario.steps[currentStepIdx].choices[selectedChoiceIdx].isCorrect
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      />
                      <span
                        className={`text-xs font-mono uppercase tracking-wider ${
                          activeScenario.steps[currentStepIdx].choices[selectedChoiceIdx].isCorrect
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {activeScenario.steps[currentStepIdx].choices[selectedChoiceIdx].isCorrect
                          ? "Решение верно"
                          : "Решение ошибочно"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-ibm leading-relaxed">
                      {activeScenario.steps[currentStepIdx].choices[selectedChoiceIdx].explanation}
                    </p>
                    <div className="text-[10px] font-mono text-muted-foreground/60 border-t border-tactical-border/30 pt-2 flex justify-between">
                      <span>Счёт:</span>
                      <span
                        className={
                          activeScenario.steps[currentStepIdx].choices[selectedChoiceIdx].scoreImpact >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {activeScenario.steps[currentStepIdx].choices[selectedChoiceIdx].scoreImpact >= 0
                          ? `+${activeScenario.steps[currentStepIdx].choices[selectedChoiceIdx].scoreImpact}`
                          : activeScenario.steps[currentStepIdx].choices[selectedChoiceIdx].scoreImpact}{" "}
                        б.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
