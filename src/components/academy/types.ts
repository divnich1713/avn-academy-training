export type Section =
  | "dashboard"
  | "materials"
  | "lectures"
  | "practices"
  | "exams"
  | "reports"
  | "promotions"
  | "grades"
  | "profile"
  | "instructor"
  | "ratings"
  | "instructors"
  | "testing"
  | "testing-history"
  | "testing-admin";

export type UserRole = "head_avng" | "deputy_head" | "chief_instructor" | "senior_instructor" | "instructor" | "junior_instructor" | "cadet" | "dismissed";

export const NAV_ITEMS: {
  id: Section;
  label: string;
  icon: string;
  roles: UserRole[];
}[] = [
  {
    id: "dashboard",
    label: "Главная",
    icon: "LayoutDashboard",
    roles: ["cadet"],
  },
  {
    id: "materials",
    label: "Обучающие материалы",
    icon: "BookOpen",
    roles: ["cadet", "instructor", "head_avng"],
  },
  {
    id: "lectures",
    label: "Лекции",
    icon: "GraduationCap",
    roles: ["cadet"],
  },
  {
    id: "practices",
    label: "Практики",
    icon: "Wrench",
    roles: ["cadet"],
  },
  {
    id: "exams",
    label: "Экзамены",
    icon: "ClipboardList",
    roles: ["cadet"],
  },
  {
    id: "testing",
    label: "Пройти тест",
    icon: "Award",
    roles: ["cadet"],
  },
  {
    id: "testing-history",
    label: "История тестов",
    icon: "History",
    roles: ["cadet"],
  },
  {
    id: "promotions",
    label: "Повышение",
    icon: "Medal",
    roles: ["cadet"],
  },
  {
    id: "grades",
    label: "Система оценок",
    icon: "BarChart3",
    roles: ["cadet"],
  },
  { id: "profile", label: "Профиль курсанта", icon: "User", roles: ["cadet", "instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"] },
  {
    id: "ratings",
    label: "Рейтинг инструкторов",
    icon: "Star",
    roles: ["cadet", "instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"],
  },
  {
    id: "instructors",
    label: "Инструкторы",
    icon: "ShieldAlert",
    roles: ["cadet", "instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"],
  },
  {
    id: "instructor",
    label: "Панель инструктора",
    icon: "Shield",
    roles: ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"],
  },
  {
    id: "testing-admin",
    label: "Результаты тестов",
    icon: "LineChart",
    roles: ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"],
  },
];

export const MOCK_CADET = {
  name: "Курсант Алексеев А.В.",
  rank: "Рядовой",
  unit: "АВНГ",
  id: "КУР-2024-0147",
  grade_avg: 4.3,
  completed: 12,
  total: 20,
};

export const MOCK_LECTURES = [
  {
    id: 1,
    title: "Тактика боя в городских условиях",
    instructor: "Кап. Воронов В.И.",
    date: "15.06.2024",
    status: "approved",
  },
  {
    id: 2,
    title: "Основы радиосвязи",
    instructor: "Ст. лейт. Панов Д.С.",
    date: "18.06.2024",
    status: "pending",
  },
  {
    id: 3,
    title: "Военная топография",
    instructor: "Майор Сидоров К.А.",
    date: "20.06.2024",
    status: "approved",
  },
];

export const MOCK_REPORTS = [
  {
    id: 1,
    title: "Рапорт на повышение в звании",
    date: "01.06.2024",
    status: "pending",
  },
  {
    id: 2,
    title: "Рапорт о прохождении практики",
    date: "28.05.2024",
    status: "approved",
  },
  {
    id: 3,
    title: "Запрос на дополнительное обучение",
    date: "20.05.2024",
    status: "rejected",
  },
];

export const MOCK_GRADES = [
  {
    subject: "Тактическая подготовка",
    grade: 5,
    date: "10.06.2024",
    instructor: "Кап. Воронов",
  },
  {
    subject: "Физическая подготовка",
    grade: 4,
    date: "08.06.2024",
    instructor: "Ст. лейт. Панов",
  },
  {
    subject: "Огневая подготовка",
    grade: 5,
    date: "05.06.2024",
    instructor: "Майор Сидоров",
  },
  {
    subject: "Военная история",
    grade: 4,
    date: "03.06.2024",
    instructor: "Подп. Ковалёв",
  },
  {
    subject: "Медицинская подготовка",
    grade: 3,
    date: "01.06.2024",
    instructor: "Кап. Зимина",
  },
];

export const MOCK_INSTRUCTOR_REQUESTS = [
  {
    id: 1,
    cadet: "Алексеев А.В.",
    type: "Лекция",
    subject: "Тактика",
    date: "14.06.2024",
    status: "pending",
  },
  {
    id: 2,
    cadet: "Борисов К.Н.",
    type: "Рапорт",
    subject: "Повышение",
    date: "13.06.2024",
    status: "pending",
  },
  {
    id: 3,
    cadet: "Васильев Д.О.",
    type: "Экзамен",
    subject: "Огневая подготовка",
    date: "12.06.2024",
    status: "approved",
  },
  {
    id: 4,
    cadet: "Григорьев П.М.",
    type: "Практика",
    subject: "Топография",
    date: "11.06.2024",
    status: "rejected",
  },
];

export const MOCK_MATERIALS = [
  {
    id: 1,
    title: "Вступительная лекция",
    category: "Лекции",
    pages: null,
    icon: "Presentation",
    url: "https://docs.google.com/presentation/d/1TunNnou9K9ZH_QDsmx0N-OKhSSRQot6o6J09dMgcp5c/edit?slide=id.p#slide=id.p",
  },
  {
    id: 2,
    title: "Лекция ФЗ о ФСВНГ и Внутреннему Уставу",
    category: "Лекции",
    pages: null,
    icon: "Presentation",
    url: "https://docs.google.com/document/d/1fir1wtveTcp5n5MQ-dJ25syfUWJ_QsyOaxjpjx6Vci8/edit?tab=t.0#heading=h.9m17jtlreqi2",
  },
  {
    id: 3,
    title: "Лекция УК,ПК и КОАП",
    category: "Лекции",
    pages: null,
    icon: "Presentation",
    url: "https://docs.google.com/presentation/d/18NqJPtXdvhpl5ChP-1VRfBP77ZsCmVSYOhGbDVqdygA/edit?slide=id.g3ed1b51981d_0_21#slide=id.g3ed1b51981d_0_21",
  },
  {
    id: 4,
    title: "Лекция Допуск к закрытой и охраняемой территории",
    category: "Лекции",
    pages: null,
    icon: "Presentation",
    url: "https://docs.google.com/presentation/d/1rk_v4cruYlBn4gd1zI2jgemZycuJnQqYseNnP5ARsG8/edit?slide=id.p#slide=id.p",
  },

  {
    id: 7,
    title: "Инструкция по патрулированию и охране КПП",
    category: "Памятки",
    pages: null,
    icon: "BookOpen",
    url: null,
    isModal: true,
  },
  {
    id: 8,
    title: "Порядок применения огнестрельного оружия, физ.силы и спецсредств",
    category: "Памятки",
    pages: null,
    icon: "ShieldAlert",
    url: null,
    isModal: true,
  },
  {
    id: 9,
    title: "Уголовный кодекс Российской Федерации",
    category: "Законы",
    pages: null,
    icon: "Scale",
    url: "https://forum.rmrp.ru/threads/ugolovnyj-kodeks-rossijskoj-federacii.58209/",
  },
  {
    id: 10,
    title: "Кодекс об административных правонарушениях Российской Федерации",
    category: "Законы",
    pages: null,
    icon: "Scale",
    url: "https://forum.rmrp.ru/threads/kodeks-ob-administrativnyx-pravonarushenijax-rossijskoj-federacii.58229/",
  },
  {
    id: 11,
    title: "Процессуальный кодекс Российской Федерации",
    category: "Законы",
    pages: null,
    icon: "Scale",
    url: "https://forum.rmrp.ru/threads/processualnyj-kodeks-rossijskoj-federacii.58424/",
  },
  {
    id: 12,
    title: "Федеральный закон «О государственной собственности, закрытых и охраняемых территориях»",
    category: "Законы",
    pages: null,
    icon: "Scale",
    url: "https://forum.rmrp.ru/threads/federalnyj-zakon-o-gosudarstvennoj-sobstvennosti-zakrytyx-i-oxranjaemyx-territorijax-no-86-fz.26625/",
  },
  {
    id: 13,
    title: "Федеральный закон «О федеральной службе войск национальной гвардии»",
    category: "Законы",
    pages: null,
    icon: "Scale",
    url: "https://forum.rmrp.ru/threads/federalnyj-zakon-o-federalnoj-sluzhbe-vojsk-nacionalnoj-gvardii-no-18-fz.25071/",
  },
  {
    id: 14,
    title: "Федеральный закон «О полиции»",
    category: "Законы",
    pages: null,
    icon: "Scale",
    url: "https://forum.rmrp.ru/threads/federalnyj-zakon-o-policii-no-74-fz.25074/",
  },
  {
    id: 15,
    title: "Федеральный закон «Об оружии»",
    category: "Законы",
    pages: null,
    icon: "Scale",
    url: "https://forum.rmrp.ru/threads/federalnyj-zakon-ob-oruzhii-no-34-fz.25068/",
  },
  {
    id: 16,
    title: "Инструкция по порядку задержания и ареста",
    category: "Памятки",
    pages: null,
    icon: "ShieldAlert",
    url: null,
    isModal: true,
  },
  {
    id: 17,
    title: "Памятка по Законному требованию",
    category: "Памятки",
    pages: null,
    icon: "ShieldAlert",
    url: null,
    isModal: true,
  },
  {
    id: 18,
    title: "Памятка по Личному обыску",
    category: "Памятки",
    pages: null,
    icon: "ShieldAlert",
    url: null,
    isModal: true,
  },
  {
    id: 19,
    title: "Памятка по разрешенному оружию и СИЗ",
    category: "Памятки",
    pages: null,
    icon: "Avtomat",
    url: null,
    isModal: true,
  },
  {
    id: 20,
    title: "Памятка по Реализации прав задержанного",
    category: "Памятки",
    pages: null,
    icon: "ShieldAlert",
    url: null,
    isModal: true,
  },
  {
    id: 21,
    title: "Памятка по Допуску на место проведения процессуальных действий",
    category: "Памятки",
    pages: null,
    icon: "ShieldAlert",
    url: null,
    isModal: true,
  },
  {
    id: 22,
    title: "Памятка по Основаниям для окончания задержания и освобождения",
    category: "Памятки",
    pages: null,
    icon: "ShieldAlert",
    url: null,
    isModal: true,
  },
  {
    id: 23,
    title: "Памятка по Допуску к закрытой и охраняемой территории",
    category: "Памятки",
    pages: null,
    icon: "ShieldAlert",
    url: null,
    isModal: true,
  },
  {
    id: 24,
    title: "Памятка: Карта Мира и Тен-Коды АВНГ",
    category: "Памятки",
    pages: null,
    icon: "Map",
    url: null,
    isModal: true,
  },
  {
    id: 25,
    title: "Памятка по присяге и строевым командам",
    category: "Памятки",
    pages: null,
    icon: "BookOpen",
    url: null,
    isModal: true,
  },
];