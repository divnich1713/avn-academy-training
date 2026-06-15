/**
 * Mock API — заглушки для локальной разработки без бэкенда.
 * Включается через VITE_USE_MOCK=true в .env
 *
 * Тестовые аккаунты:
 *   Курсант:    Static ID: 000001, пароль: 123456
 *   Инструктор: Static ID: 000002, пароль: 123456
 */

import type {
  User,
  AdminUser,
  TrainingRequest,
  Grade,
  Notification,
  RequestType,
  RequestStatus,
  InstructorRating,
} from "./api";

// ─── Хранилище (в памяти, сбрасывается при перезагрузке) ────────────────────

let mockToken: string | null = null;
let currentUserId: number | null = null;

const USERS: (AdminUser & { password: string })[] = [
  {
    id: 1,
    static_id: "000001",
    password: "123456",
    name: "Алексеев А.В.",
    rank: "Рядовой",
    unit: "АВНГ",
    role: "cadet",
    is_whitelisted: true,
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: 2,
    static_id: "000002",
    password: "123456",
    name: "Воронов В.И.",
    rank: "Капитан",
    unit: "АВНГ",
    role: "instructor",
    is_whitelisted: true,
    discord_id: "321703957240741889",
    created_at: "2026-01-10T08:00:00Z",
  },
  {
    id: 3,
    static_id: "000003",
    password: "123456",
    name: "Борисов К.Н.",
    rank: "Рядовой",
    unit: "АВНГ",
    role: "cadet",
    is_whitelisted: true,
    created_at: "2026-01-20T09:00:00Z",
  },
  {
    id: 4,
    static_id: "000004",
    password: "123456",
    name: "Васильев Д.О.",
    rank: "Ефрейтор",
    unit: "УВО",
    role: "cadet",
    is_whitelisted: true,
    created_at: "2026-02-01T11:00:00Z",
  },
  {
    id: 5,
    static_id: "000005",
    password: "123456",
    name: "Панов Д.С.",
    rank: "Старший лейтенант",
    unit: "АВНГ",
    role: "instructor",
    is_whitelisted: true,
    discord_id: "156119565555466240",
    created_at: "2026-01-12T08:30:00Z",
  },
];

let nextRequestId = 10;
let nextGradeId = 10;
let nextNotifId = 10;

const REQUESTS: TrainingRequest[] = [
  {
    id: 1,
    type: "lecture",
    subject: "Прослушать вступительную лекцию",
    description: "Первое посещение академии",
    preferred_date: "2026-06-20",
    status: "approved",
    instructor_comment: "Одобрено. Явиться к 09:00",
    created_at: "2026-06-10T08:00:00Z",
    updated_at: "2026-06-11T10:00:00Z",
    cadet_name: "Алексеев А.В.",
    cadet_rank: "Рядовой",
    cadet_static_id: "000001",
    cadet_id: 1,
    reviewer_name: "Кап. Воронов В.И.",
  },
  {
    id: 2,
    type: "practice",
    subject: "Огневая подготовка",
    description: null,
    preferred_date: "2026-06-22",
    status: "pending",
    instructor_comment: null,
    created_at: "2026-06-12T14:30:00Z",
    updated_at: "2026-06-12T14:30:00Z",
    cadet_name: "Алексеев А.В.",
    cadet_rank: "Рядовой",
    cadet_static_id: "000001",
    cadet_id: 1,
    reviewer_name: null,
  },
  {
    id: 3,
    type: "exam",
    subject: "Экзамен теоретические тесты — Устав ФСВНГ — ФЗ о ФСВНГ",
    description: "Готов к сдаче",
    preferred_date: "2026-06-25",
    status: "pending",
    instructor_comment: null,
    created_at: "2026-06-13T09:00:00Z",
    updated_at: "2026-06-13T09:00:00Z",
    cadet_name: "Борисов К.Н.",
    cadet_rank: "Рядовой",
    cadet_static_id: "000003",
    cadet_id: 3,
    reviewer_name: null,
  },
  {
    id: 4,
    type: "report",
    subject: "Рапорт на повышение в звании",
    description: "Прошу рассмотреть рапорт на присвоение звания ефрейтор",
    preferred_date: null,
    status: "rejected",
    instructor_comment: "Недостаточный срок службы",
    created_at: "2026-06-08T11:00:00Z",
    updated_at: "2026-06-09T15:00:00Z",
    cadet_name: "Алексеев А.В.",
    cadet_rank: "Рядовой",
    cadet_static_id: "000001",
    cadet_id: 1,
    reviewer_name: "Кап. Воронов В.И.",
  },
  {
    id: 5,
    type: "lecture",
    subject: "Лекция ФЗ о ФСВНГ и Внутреннему Уставу",
    description: null,
    preferred_date: "2026-06-18",
    status: "approved",
    instructor_comment: "Аудитория 204, 14:00",
    created_at: "2026-06-07T10:00:00Z",
    updated_at: "2026-06-08T09:00:00Z",
    cadet_name: "Васильев Д.О.",
    cadet_rank: "Ефрейтор",
    cadet_static_id: "000004",
    cadet_id: 4,
    reviewer_name: "Ст. лейт. Панов Д.С.",
  },
];

const GRADES: Grade[] = [
  { id: 1, subject: "Тактическая подготовка", type: "lecture", grade: 5, comment: "Отлично усвоен материал", graded_at: "2026-06-10T12:00:00Z", cadet_name: "Алексеев А.В.", cadet_rank: "Рядовой", cadet_id: 1, instructor_name: "Кап. Воронов В.И." },
  { id: 2, subject: "Физическая подготовка", type: "practice", grade: 4, comment: null, graded_at: "2026-06-08T14:00:00Z", cadet_name: "Алексеев А.В.", cadet_rank: "Рядовой", cadet_id: 1, instructor_name: "Ст. лейт. Панов Д.С." },
  { id: 3, subject: "Огневая подготовка", type: "exam", grade: 5, comment: "Высший балл", graded_at: "2026-06-05T11:00:00Z", cadet_name: "Алексеев А.В.", cadet_rank: "Рядовой", cadet_id: 1, instructor_name: "Кап. Воронов В.И." },
  { id: 4, subject: "Военная история", type: "lecture", grade: 4, comment: null, graded_at: "2026-06-03T10:00:00Z", cadet_name: "Алексеев А.В.", cadet_rank: "Рядовой", cadet_id: 1, instructor_name: "Ст. лейт. Панов Д.С." },
  { id: 5, subject: "Медицинская подготовка", type: "practice", grade: 3, comment: "Необходимо повторить", graded_at: "2026-06-01T16:00:00Z", cadet_name: "Алексеев А.В.", cadet_rank: "Рядовой", cadet_id: 1, instructor_name: "Кап. Воронов В.И." },
  { id: 6, subject: "Строевая подготовка", type: "practice", grade: 5, comment: null, graded_at: "2026-06-09T09:00:00Z", cadet_name: "Борисов К.Н.", cadet_rank: "Рядовой", cadet_id: 3, instructor_name: "Кап. Воронов В.И." },
  { id: 7, subject: "Тактическая подготовка", type: "lecture", grade: 4, comment: null, graded_at: "2026-06-10T12:00:00Z", cadet_name: "Васильев Д.О.", cadet_rank: "Ефрейтор", cadet_id: 4, instructor_name: "Ст. лейт. Панов Д.С." },
];

const NOTIFICATIONS: Notification[] = [
  { id: 1, type: "request_reviewed", title: "Запрос одобрен", message: "Ваш запрос на лекцию «Вступительная лекция» одобрен. request_id:1", is_read: false, created_at: "2026-06-11T10:00:00Z" },
  { id: 2, type: "grade_added", title: "Новая оценка", message: "Вам поставлена оценка 5 по дисциплине «Тактическая подготовка»", is_read: false, created_at: "2026-06-10T12:30:00Z" },
  { id: 3, type: "request_reviewed", title: "Рапорт отклонён", message: "Ваш рапорт «Рапорт на повышение в звании» отклонён. request_id:4", is_read: true, created_at: "2026-06-09T15:00:00Z" },
];

const RATINGS_DATA: { ratings: Record<number, { rating: number; comment: string | null }>; my_ratings: Record<number, { rating: number; comment: string | null }> } = {
  ratings: {
    2: { rating: 4, comment: null },
    5: { rating: 5, comment: "Отличный инструктор" },
  },
  my_ratings: {},
};

// ─── Утилиты ────────────────────────────────────────────────────────────────

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms + Math.random() * 200));

function getUser(): (AdminUser & { password: string }) | null {
  if (!currentUserId) return null;
  return USERS.find((u) => u.id === currentUserId) ?? null;
}

// ─── Auth API ───────────────────────────────────────────────────────────────

export async function apiLogin(static_id: string, password: string): Promise<{ token: string; user: User }> {
  await delay();
  const user = USERS.find((u) => u.static_id === static_id && u.password === password);
  if (!user) throw new Error("Неверный Static ID или пароль");
  if (!user.is_whitelisted) throw new Error("Вы не в вайтлисте. Обратитесь к инструктору");

  mockToken = "mock-token-" + Date.now();
  currentUserId = user.id;
  localStorage.setItem("avng_token", mockToken);
  localStorage.setItem("avng_mock_user_id", String(user.id));

  const { password: _, is_whitelisted: __, ...u } = user;
  return { token: mockToken, user: u };
}

export async function apiMe(): Promise<User | null> {
  await delay(150);
  const token = localStorage.getItem("avng_token");
  if (!token || !token.startsWith("mock-token-")) return null;

  // Восстановить сессию по сохранённому userId
  if (!currentUserId) {
    const saved = localStorage.getItem("avng_mock_user_id");
    if (saved) currentUserId = parseInt(saved);
    else return null;
  }

  const user = getUser();
  if (!user) return null;
  const { password: _, is_whitelisted: __, ...u } = user;
  return u;
}

export async function apiLogout(): Promise<void> {
  await delay(100);
  mockToken = null;
  currentUserId = null;
  localStorage.removeItem("avng_token");
  localStorage.removeItem("avng_mock_user_id");
}

// ─── Admin API ──────────────────────────────────────────────────────────────

export async function adminListUsers(): Promise<AdminUser[]> {
  await delay();
  return USERS.map(({ password: _, ...u }) => u);
}

export async function adminCreateUser(payload: {
  static_id: string;
  password: string;
  name: string;
  rank: string;
  unit: string;
  role: "cadet" | "instructor" | "head_avng" | "chief_instructor" | "senior_instructor" | "junior_instructor" | "deputy_head" | "dismissed";
  is_whitelisted: boolean;
  discord_id?: string | null;
  avatar_url?: string | null;
}) {
  await delay();
  if (USERS.find((u) => u.static_id === payload.static_id)) {
    throw new Error("Пользователь с таким Static ID уже существует");
  }
  const newUser = {
    id: Math.max(...USERS.map((u) => u.id)) + 1,
    ...payload,
    discord_id: payload.discord_id || null,
    avatar_url: payload.avatar_url || null,
    created_at: new Date().toISOString(),
  };
  USERS.push(newUser);
  return { ok: true, user_id: newUser.id };
}

export async function adminUpdateUser(id: number, payload: {
  static_id?: string;
  is_whitelisted?: boolean;
  role?: string;
  name?: string;
  rank?: string;
  unit?: string;
  password?: string;
  created_at?: string;
  discord_id?: string | null;
  avatar_url?: string | null;
}) {
  await delay();
  const user = USERS.find((u) => u.id === id);
  if (!user) throw new Error("Пользователь не найден");
  if (payload.static_id !== undefined) {
    // Check if static_id is already taken by another user
    const exists = USERS.find((u) => u.static_id === payload.static_id && u.id !== id);
    if (exists) throw new Error("Пользователь с таким Static ID уже существует");
    user.static_id = payload.static_id;
  }
  if (payload.name !== undefined) user.name = payload.name;
  if (payload.rank !== undefined) user.rank = payload.rank;
  if (payload.unit !== undefined) user.unit = payload.unit;
  if (payload.role !== undefined) user.role = payload.role as any;
  if (payload.is_whitelisted !== undefined) user.is_whitelisted = payload.is_whitelisted;
  if (payload.password) user.password = payload.password;
  if (payload.created_at !== undefined) user.created_at = payload.created_at;
  if (payload.discord_id !== undefined) user.discord_id = payload.discord_id;
  if (payload.avatar_url !== undefined) user.avatar_url = payload.avatar_url;
  return { ok: true };
}

export async function adminRemoveUser(id: number) {
  await delay();
  const idx = USERS.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("Пользователь не найден");
  USERS.splice(idx, 1);
  return { ok: true };
}

export async function fetchInstructors(): Promise<User[]> {
  await delay();
  const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"].includes(r);
  return USERS.filter((u) => isInstructor(u.role) && u.is_whitelisted).map(({ password: _, ...u }) => u);
}

// ─── Requests API ───────────────────────────────────────────────────────────

export async function fetchRequests(): Promise<TrainingRequest[]> {
  await delay();
  const user = getUser();
  if (!user) return [];
  const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"].includes(r);
  if (isInstructor(user.role)) return [...REQUESTS].reverse();
  return REQUESTS.filter((r) => r.cadet_id === user.id).reverse();
}

export async function createRequest(payload: {
  type: RequestType;
  subject: string;
  description?: string;
  preferred_date?: string;
}) {
  await delay();
  const user = getUser();
  if (!user) throw new Error("Не авторизован");
  const req: TrainingRequest = {
    id: nextRequestId++,
    type: payload.type,
    subject: payload.subject,
    description: payload.description || null,
    preferred_date: payload.preferred_date || null,
    status: "pending",
    instructor_comment: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    cadet_name: user.name,
    cadet_rank: user.rank,
    cadet_static_id: user.static_id,
    cadet_id: user.id,
    reviewer_name: null,
  };
  REQUESTS.push(req);
  return { ok: true, request_id: req.id };
}

export async function reviewRequest(id: number, status: "approved" | "rejected", comment?: string) {
  await delay();
  const req = REQUESTS.find((r) => r.id === id);
  if (!req) throw new Error("Запрос не найден");
  const user = getUser();
  req.status = status;
  req.instructor_comment = comment || null;
  req.reviewer_name = user ? `${user.rank} ${user.name}` : null;
  req.updated_at = new Date().toISOString();
  return { ok: true };
}

// ─── Grades API ─────────────────────────────────────────────────────────────

export async function fetchGrades(): Promise<Grade[]> {
  await delay();
  return [...GRADES].reverse();
}

export async function createGrade(payload: {
  cadet_id: number;
  subject: string;
  type: "lecture" | "practice" | "exam";
  grade: number;
  comment?: string;
  request_id?: number;
}) {
  await delay();
  const user = getUser();
  const cadet = USERS.find((u) => u.id === payload.cadet_id);
  if (!cadet) throw new Error("Курсант не найден");
  const grade: Grade = {
    id: nextGradeId++,
    subject: payload.subject,
    type: payload.type,
    grade: payload.grade,
    comment: payload.comment || null,
    graded_at: new Date().toISOString(),
    cadet_name: cadet.name,
    cadet_rank: cadet.rank,
    cadet_id: cadet.id,
    instructor_name: user ? `${user.rank} ${user.name}` : "Инструктор",
  };
  GRADES.push(grade);
  return { ok: true, grade_id: grade.id };
}

// ─── Notifications API ─────────────────────────────────────────────────────

export async function fetchNotifications(): Promise<{ notifications: Notification[]; unread_count: number }> {
  await delay(200);
  const unread = NOTIFICATIONS.filter((n) => !n.is_read).length;
  return { notifications: [...NOTIFICATIONS], unread_count: unread };
}

export async function markAllNotificationsRead() {
  await delay(100);
  NOTIFICATIONS.forEach((n) => (n.is_read = true));
  return { ok: true };
}

export async function markNotificationRead(id: number) {
  await delay(100);
  const n = NOTIFICATIONS.find((x) => x.id === id);
  if (n) n.is_read = true;
  return { ok: true };
}

// ─── Ratings API ────────────────────────────────────────────────────────────

export async function fetchRatings(timeframe: "daily" | "weekly" | "monthly" | "yearly" = "weekly"): Promise<{ instructors: import("./api").InstructorRating[] }> {
  await delay(200);
  
  // Calculate mock point statistics
  // Let's generate some mock numbers based on instructor ID
  const instructors: import("./api").InstructorRating[] = USERS
    .filter((u) => u.role === "instructor")
    .map((u) => {
      const isMe = u.id === (currentUserId || 2);
      
      // Seed with pseudo-random numbers
      const seed = u.id * 3;
      const tfMultiplier = timeframe === "daily" ? 0.2 : timeframe === "weekly" ? 1.2 : timeframe === "monthly" ? 4.5 : 45;
      
      const lectures = Math.floor((seed % 3 + 1) * tfMultiplier);
      const practices = Math.floor((seed % 4 + 2) * tfMultiplier);
      const exams = Math.floor((seed % 2 + 1) * tfMultiplier);
      const reviews = Math.floor((seed % 5 + 3) * tfMultiplier);
      
      // Calculate total points
      // Lectures: 5 points, Practices: 5 points, Exams: 10 points, Reviews/Reports: 2 points
      const points = (lectures * 5) + (practices * 5) + (exams * 10) + (reviews * 2);

      return {
        id: u.id,
        name: u.name,
        rank: u.rank,
        unit: u.unit,
        discord_id: u.discord_id,
        avatar_url: u.avatar_url,
        points,
        lectures_count: lectures,
        practices_count: practices,
        exams_count: exams,
        reviews_count: reviews,
      };
    })
    .sort((a, b) => b.points - a.points); // Sort descending by points

  return { instructors };
}

// ─── Promotion Mock API ─────────────────────────────────────────────────────

const MOCK_PROMOTION_REQUIREMENTS = {
  junior_sergeant: {
    label: "Мл. Сержант",
    rank: "Мл. Сержант",
    items: [
      { category: "Подготовка", label: "Строевая подготовка", type: "practice" as const, subject: "Строевая подготовка" },
      { category: "Подготовка", label: "Физическая подготовка (нормативы)", type: "practice" as const, subject: "Физическая подготовка" },
      { category: "Подготовка", label: "Тренировка по оружию", type: "practice" as const, subject: "Тренировка по оружию" },
      { category: "Подготовка", label: "Присяга", type: "practice" as const, subject: "Присяга" },
      { category: "Теория", label: "Вступительная лекция", type: "lecture" as const, subject: "Прослушать вступительную лекцию" },
      { category: "Теория", label: "Лекция ФЗ о ФСВНГ и Уставу", type: "lecture" as const, subject: "Лекция ФЗ о ФСВНГ и Внутреннему Уставу" },
      { category: "Практика", label: "Вышка — 30 мин (доклад каждые 10 мин)", type: "practice" as const, subject: "Вышка — 30 мин" },
      { category: "Практика", label: "Патруль по территории — 30 мин (доклад каждые 10 мин)", type: "practice" as const, subject: "Патруль по территории — 30 мин" },
      { category: "Дополнительно", label: "Заполнение личного дела", type: "practice" as const, subject: "Заполнение личного дела" },
      { category: "Аттестация", label: "Экзамен: Устав ФСВНГ и ФЗ о ФСВНГ", type: "exam" as const, subject: "Экзамен: Устав ФСВНГ и ФЗ о ФСВНГ" },
    ],
  },
  sergeant: {
    label: "Сержант",
    rank: "Сержант",
    items: [
      { category: "Подготовка", label: "Штраф", type: "practice" as const, subject: "Штраф" },
      { category: "Подготовка", label: "Задержание", type: "practice" as const, subject: "Задержание" },
      { category: "Подготовка", label: "Арест", type: "practice" as const, subject: "Арест" },
      { category: "Практика", label: "Наряд на КПП-1 — 30 мин (доклад каждые 10 мин)", type: "practice" as const, subject: "Наряд на КПП-1 — 30 мин" },
      { category: "Практика", label: "Наряд на КПП-2 — 1 час (доклад каждые 20 мин)", type: "practice" as const, subject: "Наряд на КПП-2 — 1 час" },
      { category: "Практика", label: "Участие в гос. поставке (4 шт, с инструктором)", type: "practice" as const, subject: "Участие в государственной поставке" },
      { category: "Практика", label: "Участие в досмотрах на 2 собеседованиях", type: "practice" as const, subject: "Участие в досмотровых мероприятиях" },
      { category: "Теория", label: "Лекция: УК / ПК / КоАП", type: "lecture" as const, subject: "Лекция УК, ПК и КоАП" },
      { category: "Теория", label: "Лекция: О ФЗ закрытых территорий", type: "lecture" as const, subject: "Лекция: О ФЗ закрытых территорий" },
      { category: "Аттестация", label: "Экзамен процедуры: Штраф, Задержание, Арест", type: "exam" as const, subject: "Экзамен процедуры: Штраф, Задержание, Арест" },
      { category: "Аттестация", label: "Экзамен тесты: УК, ПК, КоАП", type: "exam" as const, subject: "Экзамен тесты: УК, ПК, КоАП" },
    ],
  },
};

const PROMOTION_REPORTS: import("./api").PromotionReport[] = [];
let nextPromoId = 1;

export async function checkPromotionRequirements(type: import("./api").PromotionType, cadetId?: number): Promise<import("./api").PromotionCheckResult> {
  await delay(300);
  const targetId = cadetId || currentUserId || 1;
  const reqs = MOCK_PROMOTION_REQUIREMENTS[type];
  if (!reqs) throw new Error("Неверный тип повышения");

  // Get grades for the target user (mocked)
  const userGrades = GRADES.filter((g) => g.cadet_id === targetId && g.grade >= 3);
  const gradeMap = new Map<string, typeof userGrades[0]>();
  for (const g of userGrades) {
    gradeMap.set(`${g.type}::${g.subject}`, g);
  }

  let completedCount = 0;
  const items = reqs.items.map((item) => {
    const found = gradeMap.get(`${item.type}::${item.subject}`);
    const completed = !!found;
    if (completed) completedCount++;
    return {
      category: item.category,
      label: item.label,
      type: item.type,
      subject: item.subject,
      completed,
      grade: found ? found.grade : undefined,
      graded_at: found ? found.graded_at : undefined,
    };
  });

  return {
    promotion_type: type,
    label: reqs.label,
    items,
    completed_count: completedCount,
    total_count: reqs.items.length,
    all_completed: completedCount === reqs.items.length,
  };
}

export async function fetchPromotionReports(): Promise<import("./api").PromotionReport[]> {
  await delay(200);
  const user = USERS.find(u => u.id === (currentUserId || 1));
  const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"].includes(r);
  if (user && isInstructor(user.role)) {
    return [...PROMOTION_REPORTS];
  }
  return PROMOTION_REPORTS.filter(r => r.cadet_id === (currentUserId || 1));
}

export async function createPromotionReport(promotion_type: import("./api").PromotionType) {
  await delay(300);
  const user = USERS.find(u => u.id === (currentUserId || 1));
  if (!user) throw new Error("Пользователь не найден");

  // Verify requirements
  const check = await checkPromotionRequirements(promotion_type, user.id);
  if (!check.all_completed) {
    throw new Error("Не все требования выполнены");
  }

  const isDuplicate = PROMOTION_REPORTS.some(r => r.cadet_id === user.id && r.promotion_type === promotion_type && r.status === "pending");
  if (isDuplicate) throw new Error("У вас уже есть ожидающий рапорт");

  const newReport: import("./api").PromotionReport = {
    id: nextPromoId++,
    promotion_type,
    status: "pending",
    instructor_comment: null,
    created_at: new Date().toISOString(),
    reviewed_at: null,
    cadet_name: user.name,
    cadet_rank: user.rank,
    cadet_static_id: user.static_id,
    cadet_id: user.id,
    reviewer_name: null,
  };

  PROMOTION_REPORTS.unshift(newReport);

  // Add notifications to instructors
  const isInstructor = (r: string) => ["instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"].includes(r);
  USERS.filter(u => isInstructor(u.role)).forEach(inst => {
    NOTIFICATIONS.unshift({
      id: nextNotifId++,
      user_id: inst.id,
      type: "promotion_request",
      title: "Рапорт на повышение",
      message: `${user.rank} ${user.name} подал рапорт на повышение до ${MOCK_PROMOTION_REQUIREMENTS[promotion_type].label}.`,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  });

  return { success: true, id: newReport.id };
}

export async function reviewPromotionReport(id: number, status: "approved" | "rejected", comment?: string) {
  await delay(300);
  const report = PROMOTION_REPORTS.find(r => r.id === id);
  if (!report) throw new Error("Рапорт не найден");
  if (report.status !== "pending") throw new Error("Рапорт уже рассмотрен");

  const instructor = USERS.find(u => u.id === (currentUserId || 2));

  report.status = status;
  report.instructor_comment = comment || null;
  report.reviewed_at = new Date().toISOString();
  report.reviewer_name = instructor ? instructor.name : "Инструктор";

  if (status === "approved") {
    const cadet = USERS.find(u => u.id === report.cadet_id);
    if (cadet) {
      cadet.rank = MOCK_PROMOTION_REQUIREMENTS[report.promotion_type].rank;
      if (report.promotion_type === "sergeant") {
        cadet.unit = "УВО";
      }
    }
  }

  // Notify cadet
  NOTIFICATIONS.unshift({
    id: nextNotifId++,
    user_id: report.cadet_id,
    type: "promotion_reviewed",
    title: status === "approved" ? "Рапорт одобрен" : "Рапорт отклонён",
    message: `Инструктор ${instructor?.name || "Инструктор"} ${status === "approved" ? "одобрил" : "отклонил"} ваш рапорт на повышение.`,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  return { success: true };
}

export async function fetchDiscordProfile(discordId: string) {
  if (discordId === "321703957240741889") {
    return {
      username: "antigravity_bot",
      global_name: "Antigravity",
      avatar: { link: "https://cdn.discordapp.com/avatars/321703957240741889/a_02ef75b31d04cc61.gif" }
    };
  }
  if (discordId === "156119565555466240") {
    return {
      username: "panov_ds",
      global_name: "Панов Д.С.",
      avatar: { link: "" }
    };
  }
  try {
    const res = await fetch(`https://discordlookup.mesalytic.org/v1/user/${discordId}`);
    return await res.json();
  } catch {
    return { username: "discord_user", global_name: "Пользователь Discord" };
  }
}
