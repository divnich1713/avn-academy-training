import React, { useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { User } from "@/lib/api";
import { toast } from "sonner";
import { testingApi } from "@/lib/testingApi";

interface Card {
  id: string;
  front: string;
  backTitle: string;
  backDescription: string;
  details?: string[];
}

interface Deck {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  badgeColor: string;
  cards: Card[];
}

const DEFAULT_DECKS: Deck[] = [
  {
    id: "uk-rf",
    name: "Уголовный Кодекс (УК РФ)",
    description: "Изучение ключевых статей УК РФ, касающихся незаконного проникновения, хранения оружия, превышения полномочий и неподчинения.",
    icon: "Scale",
    color: "from-red-950/40 to-red-900/10 border-red-800/40 text-red-400",
    badgeColor: "bg-red-950/60 border-red-800/80 text-red-400",
    cards: [
      {
        id: "uk-62",
        front: "Статья 62 УК РФ",
        backTitle: "Статья 62 УК РФ",
        backDescription: "Незаконное проникновение или нахождение на закрытом объекте.",
        details: [
          "Проникновение на закрытую территорию (ст. 62.1: 40k штраф / 4 года).",
          "Проникновение на территорию воинской части / ВЧ (ст. 62.3): 80k штраф или лишение свободы на срок 5 лет. СПРП «★★★»."
        ]
      },
      {
        id: "uk-63",
        front: "Статья 63 УК РФ",
        backTitle: "Статья 63 УК РФ",
        backDescription: "Незаконный оборот оружия, боеприпасов и средств индивидуальной защиты.",
        details: [
          "Приобретение, ношение оружия от 100 ед. (ст. 63.1) или бронежилетов / запрещенных СИЗ (ст. 63.2) — 4 года.",
          "Открытое ношение оружия в общественных местах (ст. 63.3) — 5 лет. Нанесение вреда с использованием оружия (ст. 63.4) — 6 лет."
        ]
      },
      {
        id: "uk-77",
        front: "Статья 77 УК РФ",
        backTitle: "Статья 77 УК РФ",
        backDescription: "Превышение должностных полномочий.",
        details: [
          "Выход должностного лица за пределы полномочий (ст. 77.1) — 600k штраф или 3 года. СПРП «★★».",
          "Задержание сотрудником при отсутствии оснований по ПК (ст. 77.4) или выдвижение незаконных требований (ст. 77.5) — 3 года."
        ]
      },
      {
        id: "uk-93",
        front: "Статья 93 УК РФ",
        backTitle: "Статья 93 УК РФ",
        backDescription: "Помеха в осуществлении деятельности сотрудника государственной власти.",
        details: [
          "Намеренные попытки отвлекать сотрудника после предупреждения о недопустимости помех.",
          "Влечет за собой штраф в размере шестидесяти тысяч (60.000) рублей или лишение свободы на 3 года. СПРП «★★»."
        ]
      },
      {
        id: "uk-90",
        front: "Статья 90 УК РФ",
        backTitle: "Статья 90 УК РФ",
        backDescription: "Применение насилия в отношении представителя власти.",
        details: [
          "Применение насилия, не опасного для жизни/здоровья (ст. 90.1) — 4 года. СПРП «★★★».",
          "Применение насилия, опасного для жизни/здоровья (ст. 90.2) — 6 лет. Угроза применения насилия (ст. 90.3) — 2 года."
        ]
      }
    ]
  },
  {
    id: "koap-rf",
    name: "Кодекс об АП (КоАП РФ)",
    description: "Административные правонарушения: мелкое хулиганство, нарушение порядка у КПП, оскорбление сотрудников.",
    icon: "ShieldAlert",
    color: "from-amber-950/40 to-amber-900/10 border-amber-800/40 text-amber-400",
    badgeColor: "bg-amber-950/60 border-amber-800/80 text-amber-400",
    cards: [
      {
        id: "koap-5-1",
        front: "Статья 5.1 КоАП РФ",
        backTitle: "Статья 5.1 КоАП РФ",
        backDescription: "Мелкое хулиганство.",
        details: [
          "Нарушение общественного порядка, выражающее явное неуважение к обществу.",
          "Сопровождается нецензурной бранью в общественных местах, оскорбительным приставанием к гражданам."
        ]
      },
      {
        id: "koap-5-5",
        front: "Статья 5.5 КоАП РФ",
        backTitle: "Статья 5.5 КоАП РФ",
        backDescription: "Нарушение правил дорожного движения.",
        details: [
          "Несоблюдение ПДД на прилегающих к АВНГ территориях.",
          "Опасное вождение, езда по встречной полосе или парковка в зоне действия знаков/КПП."
        ]
      },
      {
        id: "koap-6-2",
        front: "Статья 6.2 КоАП РФ",
        backTitle: "Статья 6.2 КоАП РФ",
        backDescription: "Нарушение общественного порядка у КПП.",
        details: [
          "Умышленная блокировка въезда/выезда с территории Академии АВНГ.",
          "Создание помех движению военной техники, отказ отогнать транспортное средство по требованию дежурного."
        ]
      },
      {
        id: "koap-7-1",
        front: "Статья 7.1 КоАП РФ",
        backTitle: "Статья 7.1 КоАП РФ",
        backDescription: "Оскорбление государственного служащего.",
        details: [
          "Унижение чести и достоинства сотрудника ФСВНГ или полиции при исполнении им должностных обязанностей.",
          "Выражается в устной, письменной форме, в виде жестов или оскорбительных надписей."
        ]
      }
    ]
  },
  {
    id: "pk-rf",
    name: "Процессуальный Кодекс (ПК РФ)",
    description: "Стадии законного задержания граждан, проведение обыска, допроса и правила зачитывания прав задержанному.",
    icon: "ClipboardList",
    color: "from-blue-950/40 to-blue-900/10 border-blue-800/40 text-blue-400",
    badgeColor: "bg-blue-950/60 border-blue-800/80 text-blue-400",
    cards: [
      {
        id: "pk-stage-1",
        front: "Стадия 1 Задержания",
        backTitle: "Стадия 1: Идентификация и фиксация",
        backDescription: "Первичное ограничение свободы и установление контакта.",
        details: [
          "1. Представиться (назвать звание, фамилию), предъявить жетон/удостоверение.",
          "2. Назвать причину ограничения свободы и статью.",
          "3. Надеть наручники, провести первичный досмотр на наличие оружия."
        ]
      },
      {
        id: "pk-stage-2",
        front: "Стадия 2 Задержания",
        backTitle: "Стадия 2: Правило Миранды",
        backDescription: "Зачитывание прав задержанному лицу.",
        details: [
          "Необходимо зачитать права сразу после фиксации в наручниках.",
          "Если права не зачитаны или зачитаны неверно, задержание признается незаконным."
        ]
      },
      {
        id: "pk-stage-3",
        front: "Стадия 3 Задержания",
        backTitle: "Стадия 3: Первичный обыск и транспортировка",
        backDescription: "Изъятие опасных предметов и посадка в транспорт.",
        details: [
          "Провести обыск на месте на наличие холодного/огнестрельного оружия, отмычек, наркотиков.",
          "Изъять все опасные предметы и поместить задержанного в патрульный автомобиль."
        ]
      },
      {
        id: "pk-stage-4",
        front: "Стадия 4 Задержания",
        backTitle: "Стадия 4: Оформление и арест в КПЗ",
        backDescription: "Процедура в департаменте полиции / штабе.",
        details: [
          "Провести вторичный детальный обыск, установить личность по базе данных.",
          "Предоставить право на телефонный звонок и адвоката.",
          "Составить протокол задержания, внести в реестр и поместить в камеру."
        ]
      },
      {
        id: "pk-miranda",
        front: "Правило Миранды (Текст)",
        backTitle: "Текст правила Миранды",
        backDescription: "Формулировка, которую обязан знать каждый курсант наизусть.",
        details: [
          "«Вы имеете право хранить молчание. Всё, что вы скажете, может и будет использовано против вас в суде.",
          "Вы имеете право на адвоката. Если вы не можете оплатить услуги адвоката, он будет предоставлен государством.",
          "Вам понятны ваши права?»"
        ]
      }
    ]
  },
  {
    id: "ustav-avng",
    name: "ФЗ и Устав АВНГ",
    description: "Внутренний устав Академии, субординация, несение службы на постах и правила применения силы.",
    icon: "Shield",
    color: "from-emerald-950/40 to-emerald-900/10 border-emerald-800/40 text-emerald-400",
    badgeColor: "bg-emerald-950/60 border-emerald-800/80 text-emerald-400",
    cards: [
      {
        id: "ustav-force",
        front: "Применение физической силы",
        backTitle: "Правила применения физ. силы",
        backDescription: "Условия использования физического воздействия.",
        details: [
          "Применяется для пресечения преступлений или административных правонарушений.",
          "Для преодоления противодействия законным требованиям сотрудника.",
          "Разрешено только в случае, если ненасильственные способы неэффективны."
        ]
      },
      {
        id: "ustav-spec",
        front: "Применение спецсредств",
        backTitle: "Применение специальных средств",
        backDescription: "Использование дубинки, тайзера или наручников.",
        details: [
          "1. Для отражения нападения на сотрудника, курсантов или гражданских.",
          "2. Для пресечения оказываемого сотруднику сопротивления.",
          "3. Для задержания лица при попытке к бегству или неподчинении."
        ]
      },
      {
        id: "ustav-weapon",
        front: "Применение огнестрельного оружия",
        backTitle: "Применение огнестрельного оружия",
        backDescription: "Крайняя мера защиты жизни и важных государственных объектов.",
        details: [
          "Для защиты граждан и себя от нападения, угрожающего смертью или тяжким вредом.",
          "Для отражения группового или вооруженного нападения на объекты АВНГ.",
          "Для пресечения побега вооруженного лица."
        ]
      },
      {
        id: "ustav-subordination",
        front: "Субординация и этика",
        backTitle: "Регламент общения и субординации",
        backDescription: "Правила речевого общения военнослужащих АВНГ.",
        details: [
          "Обращение строго по форме: «Товарищ [Звание], разрешите обратиться?»",
          "Запрещен сленг, нецензурная брань, панибратство.",
          "Вместо «Да / Нет / Ок» говорить «Так точно / Никак нет / Принято»."
        ]
      },
      {
        id: "ustav-kpp1",
        front: "Обязанности на КПП-1",
        backTitle: "Регламент несения службы на КПП-1",
        backDescription: "Инструкция для часовых на главном въезде.",
        details: [
          "1. Проверять документы у всех въезжающих и заходящих на территорию.",
          "2. Докладывать в рацию о состоянии поста каждые 10 минут.",
          "3. При обнаружении угрозы закрыть ворота, занять укрытие и доложить в рацию."
        ]
      }
    ]
  }
];

export function Flashcards({ authUser }: { authUser?: User }) {
  // Load custom decks from localStorage, fall back to DEFAULT_DECKS
  const [decks, setDecks] = useState<Deck[]>(() => {
    try {
      const saved = localStorage.getItem("avng_custom_flashcards_decks");
      return saved ? JSON.parse(saved) : DEFAULT_DECKS;
    } catch {
      return DEFAULT_DECKS;
    }
  });

  // Checking admin rights
  const isAdmin = useMemo(() => {
    if (!authUser) return false;
    return ["head_avng", "deputy_head", "chief_instructor", "senior_ufsvng"].includes(authUser.role);
  }, [authUser]);

  useEffect(() => {
    testingApi.getCustomMaterials("flashcards")
      .then((data) => {
        if (data && Array.isArray(data)) {
          setDecks(data);
          localStorage.setItem("avng_custom_flashcards_decks", JSON.stringify(data));
        } else if (!data) {
          const local = localStorage.getItem("avng_custom_flashcards_decks");
          if (local && isAdmin) {
            try {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed) && parsed.length > 0) {
                testingApi.saveCustomMaterials("flashcards", parsed)
                  .then(() => console.log("Successfully auto-uploaded local flashcards to DB"))
                  .catch((err) => console.error("Auto-upload flashcards failed:", err));
              }
            } catch {}
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load flashcards from DB:", err);
      });
  }, [isAdmin]);

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<string, "remembered" | "forgotten">>({});

  // Edit Mode state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  
  // Editing Deck State
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deckFormName, setDeckFormName] = useState("");
  const [deckFormDesc, setDeckFormDesc] = useState("");
  const [deckFormIcon, setDeckFormIcon] = useState("Scale");
  const [deckFormColor, setDeckFormColor] = useState("from-red-950/40 to-red-900/10 border-red-800/40 text-red-400");
  const [deckFormBadge, setDeckFormBadge] = useState("bg-red-950/60 border-red-800/80 text-red-400");

  // Managing cards of a specific deck
  const [managingCardsDeckId, setManagingCardsDeckId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [cardFormFront, setCardFormFront] = useState("");
  const [cardFormBackTitle, setCardFormBackTitle] = useState("");
  const [cardFormBackDesc, setCardFormBackDesc] = useState("");
  const [cardFormDetailsText, setCardFormDetailsText] = useState("");

  // JSON Import/Export State
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState("");

  // Load global progress from localStorage
  const [learnedStats, setLearnedStats] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem("avn_flashcards_learned");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const activeDeck = useMemo(() => {
    return decks.find((d) => d.id === selectedDeckId) || null;
  }, [selectedDeckId, decks]);

  const managingDeck = useMemo(() => {
    return decks.find((d) => d.id === managingCardsDeckId) || null;
  }, [managingCardsDeckId, decks]);

  // Save decks helper
  const saveDecks = (updatedDecks: Deck[]) => {
    setDecks(updatedDecks);
    localStorage.setItem("avng_custom_flashcards_decks", JSON.stringify(updatedDecks));
    testingApi.saveCustomMaterials("flashcards", updatedDecks)
      .then(() => {
        toast.success("Колоды сохранены в базу данных фракции!");
      })
      .catch((err) => {
        console.error("Failed to save flashcards to DB:", err);
        toast.error("Не удалось сохранить колоды на сервере: " + err.message);
      });
  };

  // Start study session for a deck
  const startDeck = (deckId: string, shuffleCards = false) => {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;

    let cardsToUse = [...deck.cards];
    if (cardsToUse.length === 0) {
      toast.warning("В этой колоде пока нет карточек!");
      return;
    }

    if (shuffleCards) {
      cardsToUse.sort(() => Math.random() - 0.5);
    }

    setSelectedDeckId(deckId);
    setSessionCards(cardsToUse);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setAnswers({});
  };

  // Reset studying progress for a specific deck
  const resetProgress = (deckId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = { ...learnedStats };
    delete updated[deckId];
    setLearnedStats(updated);
    localStorage.setItem("avn_flashcards_learned", JSON.stringify(updated));
    toast.success("Прогресс изучения колоды сброшен");
  };

  const handleAnswer = (status: "remembered" | "forgotten") => {
    if (!activeDeck) return;
    const currentCard = sessionCards[currentCardIndex];
    
    // Save answer for this session
    setAnswers((prev) => ({
      ...prev,
      [currentCard.id]: status
    }));

    // Update global learned status if remembered
    if (status === "remembered") {
      setLearnedStats((prev) => {
        const deckLearned = prev[activeDeck.id] || [];
        if (!deckLearned.includes(currentCard.id)) {
          const updatedDeck = [...deckLearned, currentCard.id];
          const updated = { ...prev, [activeDeck.id]: updatedDeck };
          localStorage.setItem("avn_flashcards_learned", JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    } else {
      // If forgotten, remove from learned list if it was there
      setLearnedStats((prev) => {
        const deckLearned = prev[activeDeck.id] || [];
        if (deckLearned.includes(currentCard.id)) {
          const updatedDeck = deckLearned.filter((id) => id !== currentCard.id);
          const updated = { ...prev, [activeDeck.id]: updatedDeck };
          localStorage.setItem("avn_flashcards_learned", JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }

    // Go to next card with brief transition
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => prev + 1);
    }, 200);
  };

  const shuffleCurrentSession = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setSessionCards((prev) => [...prev].sort(() => Math.random() - 0.5));
      setCurrentCardIndex(0);
      setAnswers({});
    }, 200);
  };

  const restartCurrentSession = () => {
    setIsFlipped(false);
    setTimeout(() => {
      // Restore default order from the active deck
      if (activeDeck) {
        setSessionCards([...activeDeck.cards]);
      }
      setCurrentCardIndex(0);
      setAnswers({});
    }, 200);
  };

  // Calculate statistics
  const sessionStats = useMemo(() => {
    const total = sessionCards.length;
    if (total === 0) return { remembered: 0, forgotten: 0, percent: 0 };
    
    let remembered = 0;
    let forgotten = 0;
    Object.values(answers).forEach((val) => {
      if (val === "remembered") remembered++;
      if (val === "forgotten") forgotten++;
    });

    return {
      remembered,
      forgotten,
      percent: Math.round((remembered / total) * 100)
    };
  }, [answers, sessionCards]);

  // Deck form save
  const handleSaveDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckFormName.trim() || !deckFormDesc.trim()) {
      toast.warning("Заполните название и описание колоды!");
      return;
    }

    if (editingDeck) {
      // Edit deck
      const updated = decks.map((d) =>
        d.id === editingDeck.id
          ? {
              ...d,
              name: deckFormName.trim(),
              description: deckFormDesc.trim(),
              icon: deckFormIcon,
              color: deckFormColor,
              badgeColor: deckFormBadge,
            }
          : d
      );
      saveDecks(updated);
      toast.success("Колода успешно отредактирована!");
    } else {
      // Create new deck
      const newDeckId = "deck_" + Date.now();
      const newDeck: Deck = {
        id: newDeckId,
        name: deckFormName.trim(),
        description: deckFormDesc.trim(),
        icon: deckFormIcon,
        color: deckFormColor,
        badgeColor: deckFormBadge,
        cards: [],
      };
      saveDecks([...decks, newDeck]);
      toast.success("Колода успешно создана!");
    }

    setEditingDeck(null);
  };

  // Delete Deck
  const handleDeleteDeck = (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Вы уверены, что хотите безвозвратно удалить эту колоду и все её карточки?")) {
      return;
    }
    const updated = decks.filter((d) => d.id !== deckId);
    saveDecks(updated);
    toast.success("Колода удалена");
  };

  // Open deck edit form
  const handleOpenDeckForm = (deck: Deck | null) => {
    if (deck) {
      setEditingDeck(deck);
      setDeckFormName(deck.name);
      setDeckFormDesc(deck.description);
      setDeckFormIcon(deck.icon);
      setDeckFormColor(deck.color);
      setDeckFormBadge(deck.badgeColor);
    } else {
      setEditingDeck(null);
      setDeckFormName("");
      setDeckFormDesc("");
      setDeckFormIcon("Scale");
      setDeckFormColor("from-red-950/40 to-red-900/10 border-red-800/40 text-red-400");
      setDeckFormBadge("bg-red-950/60 border-red-800/80 text-red-400");
    }
  };

  // Card Form Save
  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingCardsDeckId) return;
    if (!cardFormFront.trim() || !cardFormBackTitle.trim() || !cardFormBackDesc.trim()) {
      toast.warning("Заполните все основные поля карточки!");
      return;
    }

    const details = cardFormDetailsText
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);

    const targetDeck = decks.find((d) => d.id === managingCardsDeckId);
    if (!targetDeck) return;

    let updatedCards = [...targetDeck.cards];
    if (editingCard) {
      // Edit card
      updatedCards = updatedCards.map((c) =>
        c.id === editingCard.id
          ? {
              ...c,
              front: cardFormFront.trim(),
              backTitle: cardFormBackTitle.trim(),
              backDescription: cardFormBackDesc.trim(),
              details: details.length > 0 ? details : undefined,
            }
          : c
      );
      toast.success("Карточка сохранена!");
    } else {
      // Add card
      const newCard: Card = {
        id: "card_" + Date.now(),
        front: cardFormFront.trim(),
        backTitle: cardFormBackTitle.trim(),
        backDescription: cardFormBackDesc.trim(),
        details: details.length > 0 ? details : undefined,
      };
      updatedCards.push(newCard);
      toast.success("Карточка добавлена!");
    }

    const updatedDecks = decks.map((d) =>
      d.id === managingCardsDeckId ? { ...d, cards: updatedCards } : d
    );
    saveDecks(updatedDecks);

    setEditingCard(null);
    setCardFormFront("");
    setCardFormBackTitle("");
    setCardFormBackDesc("");
    setCardFormDetailsText("");
  };

  // Open Card Form
  const handleOpenCardForm = (card: Card | null) => {
    if (card) {
      setEditingCard(card);
      setCardFormFront(card.front);
      setCardFormBackTitle(card.backTitle);
      setCardFormBackDesc(card.backDescription);
      setCardFormDetailsText((card.details || []).join("\n"));
    } else {
      setEditingCard(null);
      setCardFormFront("");
      setCardFormBackTitle("");
      setCardFormBackDesc("");
      setCardFormDetailsText("");
    }
  };

  // Delete Card
  const handleDeleteCard = (cardId: string) => {
    if (!managingCardsDeckId) return;
    if (!window.confirm("Удалить эту карточку?")) return;

    const targetDeck = decks.find((d) => d.id === managingCardsDeckId);
    if (!targetDeck) return;

    const updatedCards = targetDeck.cards.filter((c) => c.id !== cardId);
    const updatedDecks = decks.map((d) =>
      d.id === managingCardsDeckId ? { ...d, cards: updatedCards } : d
    );
    saveDecks(updatedDecks);
    toast.success("Карточка удалена");
  };

  // JSON Save
  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        toast.error("Неверный формат: JSON должен быть массивом колод!");
        return;
      }
      saveDecks(parsed);
      setShowJsonModal(false);
      toast.success("Конфигурация успешно импортирована!");
    } catch (e: any) {
      toast.error("Ошибка парсинга JSON: " + e.message);
    }
  };

  const handleOpenJsonModal = () => {
    setJsonText(JSON.stringify(decks, null, 2));
    setShowJsonModal(true);
  };

  // Color options for decks
  const THEME_OPTIONS = [
    {
      name: "Красный (УК РФ)",
      color: "from-red-950/40 to-red-900/10 border-red-800/40 text-red-400",
      badgeColor: "bg-red-950/60 border-red-800/80 text-red-400"
    },
    {
      name: "Оранжевый (КоАП РФ)",
      color: "from-amber-950/40 to-amber-900/10 border-amber-800/40 text-amber-400",
      badgeColor: "bg-amber-950/60 border-amber-800/80 text-amber-400"
    },
    {
      name: "Синий (ПК РФ)",
      color: "from-blue-950/40 to-blue-900/10 border-blue-800/40 text-blue-400",
      badgeColor: "bg-blue-950/60 border-blue-800/80 text-blue-400"
    },
    {
      name: "Зеленый (Устав)",
      color: "from-emerald-950/40 to-emerald-900/10 border-emerald-800/40 text-emerald-400",
      badgeColor: "bg-emerald-950/60 border-emerald-800/80 text-emerald-400"
    },
    {
      name: "Фиолетовый",
      color: "from-purple-950/40 to-purple-900/10 border-purple-800/40 text-purple-400",
      badgeColor: "bg-purple-950/60 border-purple-800/80 text-purple-400"
    }
  ];

  const ICON_OPTIONS = ["Scale", "ShieldAlert", "ClipboardList", "Shield", "Info", "Calendar", "GraduationCap", "Users", "FileText", "Lock"];

  // Main UI render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-tactical-border pb-4 gap-4">
        <div>
          <h2 className="font-oswald text-2xl uppercase tracking-wider text-foreground flex items-center gap-2">
            <Icon name="Brain" size={24} className="text-primary animate-pulse" />
            Карточки законов
          </h2>
          <p className="text-sm text-muted-foreground font-ibm mt-1">
            Интерактивная система обучения и проверки знаний УК РФ, КоАП РФ, Процессуального кодекса и Устава.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Admin Edit Mode toggle */}
          {isAdmin && !selectedDeckId && !managingCardsDeckId && !editingDeck && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 text-xs font-mono border px-4 py-2 transition-all ${
                isEditMode
                  ? "bg-primary border-primary text-primary-foreground font-bold shadow-lg"
                  : "bg-tactical-card border-tactical-border text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
            >
              <Icon name="Edit" size={13} />
              {isEditMode ? "Выйти из редактора" : "Режим редактора"}
            </button>
          )}

          {/* Back button from study mode */}
          {selectedDeckId && activeDeck && (
            <button
              onClick={() => setSelectedDeckId(null)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-mono bg-tactical-card border border-tactical-border hover:border-primary/50 px-4 py-2 transition-all"
            >
              <Icon name="ArrowLeft" size={14} />
              К выбору колод
            </button>
          )}

          {/* Back button from managing cards */}
          {managingCardsDeckId && (
            <button
              onClick={() => {
                setManagingCardsDeckId(null);
                setEditingCard(null);
              }}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-mono bg-tactical-card border border-tactical-border hover:border-primary/50 px-4 py-2 transition-all"
            >
              <Icon name="ArrowLeft" size={14} />
              К списку колод
            </button>
          )}
        </div>
      </div>

      {/* JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-tactical-card border-2 border-primary/50 p-6 rounded-lg max-w-2xl w-full space-y-4 shadow-[0_0_24px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-center border-b border-tactical-border pb-2">
              <h3 className="font-oswald text-lg uppercase tracking-wider text-gold flex items-center gap-2">
                <Icon name="RefreshCw" size={18} />
                Импорт / Экспорт JSON колод
              </h3>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground font-ibm leading-relaxed">
              Вы можете скопировать этот текст для сохранения бэкапа или вставить сюда JSON-массив колод для полной перезаписи базы карточек.
            </p>
            <textarea
              className="w-full h-80 bg-black/60 border border-tactical-border text-green-400 font-mono text-xs p-3 focus:outline-none focus:border-primary rounded scrollbar-thin"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
            <div className="flex justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                  toast.success("JSON скопирован в буфер обмена!");
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

      {/* 2. Deck metadata creation / editing form */}
      {isEditMode && editingDeck !== null && (
        <form onSubmit={handleSaveDeck} className="bg-tactical-card border-2 border-primary/40 p-6 rounded-lg space-y-4 animate-fade-in max-w-xl mx-auto card-glow">
          <h3 className="font-oswald text-lg uppercase tracking-wider text-gold border-b border-tactical-border pb-2">
            {editingDeck.id ? "Редактирование колоды" : "Создание новой колоды"}
          </h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Название колоды</label>
              <input
                type="text"
                className="w-full bg-tactical-panel border border-tactical-border text-foreground px-3 py-2 text-xs font-ibm focus:outline-none focus:border-primary rounded"
                placeholder="Уголовный Кодекс (УК РФ)"
                value={deckFormName}
                onChange={(e) => setDeckFormName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Описание колоды</label>
              <textarea
                className="w-full h-20 bg-tactical-panel border border-tactical-border text-foreground px-3 py-2 text-xs font-ibm focus:outline-none focus:border-primary rounded resize-none"
                placeholder="Краткое описание изучаемых в этой колоде статей..."
                value={deckFormDesc}
                onChange={(e) => setDeckFormDesc(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Иконка</label>
                <select
                  className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 text-xs font-ibm focus:outline-none focus:border-primary rounded"
                  value={deckFormIcon}
                  onChange={(e) => setDeckFormIcon(e.target.value)}
                >
                  {ICON_OPTIONS.map((ico) => (
                    <option key={ico} value={ico}>{ico}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Стиль и цвет темы</label>
                <select
                  className="w-full bg-tactical-panel border border-tactical-border text-foreground p-2 text-xs font-ibm focus:outline-none focus:border-primary rounded"
                  value={THEME_OPTIONS.findIndex((x) => x.color === deckFormColor)}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    if (THEME_OPTIONS[idx]) {
                      setDeckFormColor(THEME_OPTIONS[idx].color);
                      setDeckFormBadge(THEME_OPTIONS[idx].badgeColor);
                    }
                  }}
                >
                  {THEME_OPTIONS.map((opt, idx) => (
                    <option key={idx} value={idx}>{opt.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="bg-primary text-primary-foreground font-oswald text-xs tracking-widest uppercase px-6 py-2.5 hover:bg-primary/95 transition-colors rounded"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setEditingDeck(null)}
              className="border border-tactical-border text-muted-foreground font-oswald text-xs tracking-widest uppercase px-4 py-2.5 hover:border-primary/30 transition-colors rounded"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* 3. Cards Manager Form (inside a specific deck) */}
      {isEditMode && managingCardsDeckId !== null && managingDeck && (
        <div className="space-y-6 animate-fade-in">
          {/* Info Header */}
          <div className="bg-tactical-card border border-tactical-border p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 card-glow">
            <div>
              <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-wider">КОНСТРУКТОР КАРТОЧЕК</span>
              <h3 className="font-oswald text-lg uppercase tracking-wider text-foreground mt-0.5">{managingDeck.name}</h3>
              <p className="text-xs text-muted-foreground font-ibm">{managingDeck.description}</p>
            </div>
            {!editingCard && (
              <button
                onClick={() => handleOpenCardForm(null)}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-mono text-xs uppercase tracking-wider px-4 py-2.5 border border-primary/20 flex items-center gap-1.5 shadow-lg shrink-0 rounded"
              >
                <Icon name="Plus" size={13} /> Добавить карточку
              </button>
            )}
          </div>

          {/* Add / Edit Card form block */}
          {editingCard !== null && (
            <form onSubmit={handleSaveCard} className="bg-tactical-card border-2 border-primary/40 p-5 rounded-lg space-y-4 max-w-xl mx-auto card-glow">
              <h4 className="font-oswald text-sm uppercase tracking-wider text-gold border-b border-tactical-border pb-1">
                {editingCard.id ? "Редактирование карточки" : "Новая карточка в колоде"}
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Лицевая сторона (Например, номер статьи)</label>
                  <input
                    type="text"
                    className="w-full bg-tactical-panel border border-tactical-border text-foreground px-3 py-2 text-xs font-ibm focus:outline-none focus:border-primary rounded"
                    placeholder="Статья 62 УК РФ"
                    value={cardFormFront}
                    onChange={(e) => setCardFormFront(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Заголовок оборотной стороны (Короткая суть)</label>
                  <input
                    type="text"
                    className="w-full bg-tactical-panel border border-tactical-border text-foreground px-3 py-2 text-xs font-ibm focus:outline-none focus:border-primary rounded"
                    placeholder="Статья 62 УК РФ: Незаконное проникновение"
                    value={cardFormBackTitle}
                    onChange={(e) => setCardFormBackTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Основное описание / Ответ</label>
                  <textarea
                    className="w-full h-20 bg-tactical-panel border border-tactical-border text-foreground px-3 py-2 text-xs font-ibm focus:outline-none focus:border-primary rounded resize-none"
                    placeholder="Основное описание статьи или её юридический смысл..."
                    value={cardFormBackDesc}
                    onChange={(e) => setCardFormBackDesc(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase font-semibold">Детальные пункты (Один пункт в строке - необязательно)</label>
                  <textarea
                    className="w-full h-24 bg-tactical-panel border border-tactical-border text-foreground px-3 py-2 text-xs font-ibm focus:outline-none focus:border-primary rounded font-mono"
                    placeholder="Пункт 1&#10;Пункт 2&#10;Пункт 3"
                    value={cardFormDetailsText}
                    onChange={(e) => setCardFormDetailsText(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground font-mono mt-1 block">
                    Каждая новая строка преобразуется в отдельный маркированный пункт (bullet point).
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground font-oswald text-xs tracking-widest uppercase px-5 py-2 hover:bg-primary/95 transition-colors rounded"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="border border-tactical-border text-muted-foreground font-oswald text-xs tracking-widest uppercase px-4 py-2 hover:border-primary/30 transition-colors rounded"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

          {/* Cards List table */}
          <div className="bg-tactical-card border border-tactical-border rounded-lg card-glow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-tactical-border bg-tactical-panel/40">
                    <th className="p-3 text-muted-foreground uppercase font-semibold w-1/4">Лицевая сторона</th>
                    <th className="p-3 text-muted-foreground uppercase font-semibold w-1/4">Оборот (Заголовок)</th>
                    <th className="p-3 text-muted-foreground uppercase font-semibold w-2/5">Описание</th>
                    <th className="p-3 text-muted-foreground uppercase font-semibold text-right w-24">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {managingDeck.cards.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground font-ibm">
                        В этой колоде ещё нет карточек. Нажмите кнопку «Добавить карточку», чтобы начать наполнение.
                      </td>
                    </tr>
                  ) : (
                    managingDeck.cards.map((c) => (
                      <tr key={c.id} className="border-b border-tactical-border/50 hover:bg-tactical-panel/20">
                        <td className="p-3 font-bold text-foreground truncate max-w-[120px]">{c.front}</td>
                        <td className="p-3 text-gold truncate max-w-[150px]">{c.backTitle}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-[250px]" title={c.backDescription}>
                          {c.backDescription}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => handleOpenCardForm(c)}
                              className="text-[10px] text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
                            >
                              <Icon name="Edit" size={10} /> Изменить
                            </button>
                            <button
                              onClick={() => handleDeleteCard(c.id)}
                              className="text-[10px] text-red-500 hover:text-red-400 hover:underline uppercase tracking-wider flex items-center gap-1"
                            >
                              <Icon name="Trash2" size={10} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Deck Grid / selection screen */}
      {!selectedDeckId && managingCardsDeckId === null && editingDeck === null && (
        <div className="space-y-6 animate-fade-in">
          {/* Editor control options */}
          {isEditMode && (
            <div className="flex flex-wrap justify-between items-center gap-3 bg-tactical-card border-2 border-dashed border-primary/30 p-4 rounded-lg card-glow">
              <div className="text-xs text-muted-foreground font-ibm">
                <span className="text-primary font-bold">Редактор активен.</span> Вы можете редактировать метаданные колод, управлять внутренними картами или импортировать/экспортировать полную базу данных в формате JSON.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenDeckForm(null)}
                  className="bg-primary/10 hover:bg-primary/20 border border-primary/40 text-foreground font-mono text-xs uppercase tracking-wider px-4 py-2 flex items-center gap-1 rounded transition-colors"
                >
                  <Icon name="Plus" size={12} /> Создать колоду
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {decks.map((deck) => {
              const learnedCount = (learnedStats[deck.id] || []).length;
              const totalCount = deck.cards.length;
              const progressPercent = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;

              return (
                <div
                  key={deck.id}
                  onClick={() => {
                    if (isEditMode) {
                      setManagingCardsDeckId(deck.id);
                      setEditingCard(null);
                    } else {
                      startDeck(deck.id);
                    }
                  }}
                  className={`bg-tactical-card border-2 border-tactical-border hover:border-primary/60 bg-gradient-to-br ${deck.color} p-6 rounded-lg cursor-pointer transition-all duration-300 hover:translate-y-[-2px] card-glow flex flex-col justify-between group`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded border ${deck.badgeColor}`}>
                        <Icon name={deck.icon} size={24} />
                      </div>
                      
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono text-xs text-muted-foreground bg-black/40 border border-tactical-border px-2.5 py-1 rounded">
                          {totalCount} {totalCount === 1 ? "карточка" : totalCount < 5 ? "карточки" : "карточек"}
                        </span>
                        
                        {/* Edit metadata & Delete options */}
                        {isEditMode && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenDeckForm(deck)}
                              className="p-1 text-muted-foreground hover:text-gold border border-tactical-border hover:border-gold/40 rounded bg-black/20"
                              title="Редактировать параметры колоды"
                            >
                              <Icon name="Edit" size={12} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteDeck(deck.id, e)}
                              className="p-1 text-muted-foreground hover:text-red-400 border border-tactical-border hover:border-red-500/40 rounded bg-black/20"
                              title="Удалить колоду"
                            >
                              <Icon name="Trash2" size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="font-oswald text-lg uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
                      {deck.name}
                    </h3>
                    <p className="text-sm text-muted-foreground font-ibm mt-2 line-clamp-3">
                      {deck.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-tactical-border/60">
                    <div className="flex justify-between items-center text-xs font-mono text-muted-foreground mb-1.5" onClick={(e) => e.stopPropagation()}>
                      <span>Изучено: {learnedCount} / {totalCount} ({progressPercent}%)</span>
                      {learnedCount > 0 && !isEditMode && (
                        <button
                          onClick={(e) => resetProgress(deck.id, e)}
                          className="text-red-500 hover:text-red-400 hover:underline flex items-center gap-1"
                          title="Сбросить прогресс изучения колоды"
                        >
                          <Icon name="Trash2" size={12} />
                          Сбросить
                        </button>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-black/50 border border-tactical-border/50 h-2 rounded overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <button className="w-full mt-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 group-hover:border-primary text-foreground font-oswald text-sm tracking-wider uppercase py-2 transition-colors">
                      {isEditMode ? "Редактировать карточки" : "Начать изучение"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Studying Session */}
      {!isEditMode && selectedDeckId && activeDeck && currentCardIndex < sessionCards.length && (
        <div className="max-w-xl mx-auto space-y-6">
          {/* Session Progress Header */}
          <div className="flex items-center justify-between text-sm font-mono text-muted-foreground">
            <span className="text-gold font-semibold uppercase tracking-wider">{activeDeck.name}</span>
            <span>
              Карточка {currentCardIndex + 1} из {sessionCards.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-black/50 border border-tactical-border/40 h-2 rounded overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${(currentCardIndex / sessionCards.length) * 100}%` }}
            />
          </div>

          {/* The 3D Flip Card Container */}
          <div className="perspective-1000 w-full h-[360px] relative">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className={`w-full h-full relative preserve-3d duration-500 transition-transform cursor-pointer select-none ${
                isFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* FRONT FACE */}
              <div className="absolute inset-0 w-full h-full backface-hidden bg-tactical-card border-2 border-tactical-border rounded-xl p-8 flex flex-col justify-between card-glow corner-mark">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs tracking-widest text-primary uppercase font-bold">
                    Лицевая сторона
                  </span>
                  <Icon name={activeDeck.icon} size={20} className="text-muted-foreground" />
                </div>

                <div className="text-center my-auto px-4">
                  <h4 className="font-oswald text-3xl md:text-4xl text-foreground tracking-wide font-bold">
                    {sessionCards[currentCardIndex].front}
                  </h4>
                  <div className="w-16 h-1 bg-primary/40 mx-auto mt-4 rounded-full" />
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors">
                  <Icon name="RefreshCw" size={12} className="animate-spin-slow" />
                  Нажмите, чтобы перевернуть карточку
                </div>
              </div>

              {/* BACK FACE */}
              <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-tactical-card border-2 border-primary/50 rounded-xl p-6 flex flex-col justify-between card-glow shadow-[0_0_20px_rgba(160,30,45,0.15)]">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs tracking-widest text-gold uppercase font-bold">
                    Обратная сторона
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {sessionCards[currentCardIndex].front}
                  </span>
                </div>

                <div className="my-auto overflow-y-auto pr-1 max-h-[220px] scrollbar-thin">
                  <h4 className="font-oswald text-xl text-primary uppercase tracking-wider mb-3">
                    {sessionCards[currentCardIndex].backTitle}
                  </h4>
                  <p className="text-base text-foreground font-ibm font-medium mb-3 leading-relaxed">
                    {sessionCards[currentCardIndex].backDescription}
                  </p>
                  {sessionCards[currentCardIndex].details && (
                    <ul className="space-y-2 border-t border-tactical-border/60 pt-3">
                      {sessionCards[currentCardIndex].details?.map((detail, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground font-ibm flex items-start gap-2">
                          <span className="text-gold font-bold mt-0.5">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors pt-2">
                  <Icon name="RefreshCw" size={12} />
                  Нажмите, чтобы перевернуть обратно
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: Помню / Забыл */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleAnswer("forgotten")}
              className="flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/60 hover:border-red-800 text-red-400 hover:text-red-300 font-oswald tracking-widest uppercase py-3.5 px-6 rounded-lg transition-all active:scale-95 shadow-sm"
            >
              <Icon name="X" size={18} />
              Забыл
            </button>
            <button
              onClick={() => handleAnswer("remembered")}
              className="flex items-center justify-center gap-2 bg-green-950/20 hover:bg-green-950/40 border border-green-900/60 hover:border-green-800 text-green-400 hover:text-green-300 font-oswald tracking-widest uppercase py-3.5 px-6 rounded-lg transition-all active:scale-95 shadow-sm"
            >
              <Icon name="Check" size={18} />
              Помню
            </button>
          </div>

          {/* Middle actions: Shuffle / Restart / Back */}
          <div className="flex justify-between items-center pt-2 border-t border-tactical-border/60">
            <button
              onClick={shuffleCurrentSession}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono bg-tactical-card border border-tactical-border px-3 py-1.5 rounded transition-all"
              title="Перемешать текущие карточки"
            >
              <Icon name="RefreshCw" size={12} className="text-gold" />
              Перемешать
            </button>

            <button
              onClick={restartCurrentSession}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono bg-tactical-card border border-tactical-border px-3 py-1.5 rounded transition-all"
              title="Начать заново в исходном порядке"
            >
              <Icon name="RefreshCw" size={12} />
              Сбросить сессию
            </button>
          </div>
        </div>
      )}

      {/* 6. Results Screen */}
      {!isEditMode && selectedDeckId && currentCardIndex >= sessionCards.length && sessionCards.length > 0 && (
        <div className="max-w-xl mx-auto">
          <div className="bg-tactical-card border-2 border-primary/50 p-6 md:p-8 rounded-lg corner-mark card-glow text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto shadow-md">
              <Icon name="Award" size={40} className="text-gold animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="font-oswald text-2xl uppercase tracking-wider text-foreground">
                Колода полностью пройдена!
              </h3>
              <p className="text-sm font-mono text-gold uppercase tracking-widest">
                {activeDeck?.name}
              </p>
            </div>

            {/* Session scores */}
            <div className="grid grid-cols-3 gap-2 border-y border-tactical-border/60 py-6 max-w-sm mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 font-mono">
                  {sessionStats.remembered}
                </div>
                <div className="text-xs text-muted-foreground font-ibm">Помню</div>
              </div>
              <div className="text-center border-x border-tactical-border/60">
                <div className="text-2xl font-bold text-red-400 font-mono">
                  {sessionStats.forgotten}
                </div>
                <div className="text-xs text-muted-foreground font-ibm">Забыл</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gold font-mono">
                  {sessionStats.percent}%
                </div>
                <div className="text-xs text-muted-foreground font-ibm">Точность</div>
              </div>
            </div>

            {/* Verdict message */}
            <p className="text-sm font-ibm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {sessionStats.percent === 100
                ? "Идеальный результат, курсант! Вы отлично знаете законы и регламенты службы."
                : sessionStats.percent >= 60
                ? "Хороший результат. Рекомендуем повторить забытые статьи, чтобы довести знания до автоматизма."
                : "Неудовлетворительно. Вам необходимо тщательно подучить статьи перед сдачей экзамена."}
            </p>

            {/* List of forgotten cards for quick review */}
            {sessionStats.forgotten > 0 && (
              <div className="text-left border border-tactical-border/60 rounded bg-black/30 p-4 max-h-[180px] overflow-y-auto space-y-2.5">
                <span className="text-xs font-mono text-red-400 uppercase font-bold block mb-1">
                  Статьи для повторения:
                </span>
                {sessionCards
                  .filter((card) => answers[card.id] === "forgotten")
                  .map((card) => (
                    <div key={card.id} className="text-xs border-b border-tactical-border/40 pb-2 last:border-b-0 last:pb-0">
                      <span className="text-foreground font-semibold font-mono block mb-0.5">{card.front}</span>
                      <span className="text-muted-foreground leading-relaxed">{card.backDescription}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={restartCurrentSession}
                className="flex-1 bg-primary text-primary-foreground font-oswald text-sm tracking-wider uppercase py-3 hover:bg-primary/90 transition-all font-semibold rounded"
              >
                Повторить заново
              </button>
              <button
                onClick={() => startDeck(selectedDeckId!, true)}
                className="flex-1 bg-tactical-card border border-tactical-border hover:border-primary/50 text-foreground font-oswald text-sm tracking-wider uppercase py-3 hover:bg-primary/10 transition-all rounded"
              >
                Перемешать и пройти
              </button>
            </div>
            
            <button
              onClick={() => setSelectedDeckId(null)}
              className="text-xs text-muted-foreground hover:text-foreground font-mono transition-colors block mx-auto underline pt-2"
            >
              Вернуться к выбору колод
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
