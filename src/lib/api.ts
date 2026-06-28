// ─── Mock mode: если VITE_USE_MOCK=true — все вызовы идут в локальные заглушки ──
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
let mockApiPromise: Promise<typeof import("./mock-api")> | null = null;

if (USE_MOCK) {
  console.log("%c⚡ MOCK MODE — бэкенд не используется", "color: #f59e0b; font-weight: bold; font-size: 14px");
  mockApiPromise = import("./mock-api");
}

function getMockApi() {
  if (!mockApiPromise) {
    mockApiPromise = import("./mock-api");
  }
  return mockApiPromise;
}

const API_BASE = "/supabase-api";
const AUTH_URL = `${API_BASE}/auth`;
const ADMIN_URL = `${API_BASE}/admin-users`;
const REQUESTS_URL = `${API_BASE}/requests`;
const NOTIFICATIONS_URL = `${API_BASE}/notifications`;
const PROMOTIONS_URL = `${API_BASE}/promotions`;
const RATINGS_URL = `${API_BASE}/ratings`;
const WEEKLY_REPORTS_URL = `${API_BASE}/weekly-reports`;

export function getToken(): string | null {
  return localStorage.getItem("avng_token");
}

export function setToken(token: string) {
  localStorage.setItem("avng_token", token);
}

export function removeToken() {
  localStorage.removeItem("avng_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { "X-Session-Token": token } : {};
}

// Robust JSON fetch wrapper
async function safeFetch(url: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let errMsg = `HTTP error ${res.status}`;
    try {
      const data = JSON.parse(text);
      errMsg = data.error || data.detail || errMsg;
    } catch {
      if (text) {
        errMsg = text.replace(/<[^>]*>/g, '').trim().substring(0, 150) || text.substring(0, 150);
      }
    }
    throw new Error(errMsg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export async function apiLogin(static_id: string, password: string) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.apiLogin(static_id, password);
  }
  return safeFetch(`${AUTH_URL}/?action=login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ static_id, password }),
  });
}

export async function apiRegister(static_id: string, password: string, name: string) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.apiRegister(static_id, password, name);
  }
  return safeFetch(`${AUTH_URL}/?action=register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ static_id, password, name }),
  });
}

export async function apiMe(): Promise<User | null> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.apiMe();
  }
  const token = getToken();
  if (!token) return null;
  try {
    const data = await safeFetch(`${AUTH_URL}/?action=me`, {
      headers: { "X-Session-Token": token },
    });
    return data.user as User;
  } catch {
    return null;
  }
}

export async function fetchInstructors(): Promise<User[]> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.fetchInstructors();
  }
  const data = await safeFetch(`${AUTH_URL}/?action=instructors`, { headers: authHeaders() });
  return data.instructors;
}

export async function apiLogout() {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.apiLogout();
  }
  const token = getToken();
  if (!token) return;
  try {
    await safeFetch(`${AUTH_URL}/?action=logout`, {
      method: "POST",
      headers: { "X-Session-Token": token },
    });
  } finally {
    removeToken();
  }
}

export async function adminListUsers(): Promise<AdminUser[]> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.adminListUsers();
  }
  const data = await safeFetch(ADMIN_URL, { headers: authHeaders() });
  return data.users;
}

export async function adminCreateUser(payload: {
  static_id: string;
  password: string;
  name: string;
  rank: string;
  unit: string;
  role: "cadet" | "instructor" | "head_avng" | "chief_instructor" | "senior_instructor" | "junior_instructor" | "deputy_head" | "dismissed" | "senior_ufsvng";
  is_whitelisted: boolean;
  discord_id?: string | null;
  avatar_url?: string | null;
}) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.adminCreateUser(payload);
  }
  return safeFetch(ADMIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
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
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.adminUpdateUser(id, payload);
  }
  return safeFetch(`${ADMIN_URL}?id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
}

export async function adminRemoveUser(id: number) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.adminRemoveUser(id);
  }
  return safeFetch(`${ADMIN_URL}?id=${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export interface User {
  id: number;
  static_id: string;
  name: string;
  rank: string;
  unit: string;
  role: "cadet" | "instructor" | "head_avng" | "chief_instructor" | "senior_instructor" | "junior_instructor" | "deputy_head" | "dismissed" | "senior_ufsvng";
  created_at: string;
  last_seen?: string;
  discord_id?: string | null;
  avatar_url?: string | null;
}

export interface AdminUser extends User {
  is_whitelisted: boolean;
  created_at: string;
}

export type RequestType = "lecture" | "practice" | "exam" | "report" | "dismissal";
export type RequestStatus = "created" | "pending" | "approved" | "rejected";

export interface TrainingRequest {
  id: number;
  type: RequestType;
  subject: string;
  description: string | null;
  preferred_date: string | null;
  status: RequestStatus;
  instructor_comment: string | null;
  created_at: string;
  updated_at: string;
  cadet_name: string;
  cadet_rank: string;
  cadet_static_id: string;
  cadet_id: number;
  reviewer_name: string | null;
  cadet_discord_id?: string | null;
  instructor_id?: number | null;
  target_instructor_name?: string | null;
}

export interface Grade {
  id: number;
  subject: string;
  type: "lecture" | "practice" | "exam";
  grade: number;
  comment: string | null;
  graded_at: string;
  cadet_name: string;
  cadet_rank: string;
  cadet_id: number;
  cadet_static_id?: string | null;
  instructor_name: string;
}

// ===== Requests API =====

export async function fetchRequests(): Promise<TrainingRequest[]> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.fetchRequests();
  }
  const data = await safeFetch(REQUESTS_URL, { headers: authHeaders() });
  return data.requests;
}

export async function createRequest(payload: {
  type: RequestType;
  subject: string;
  description?: string;
  preferred_date?: string;
  discord_message_id?: string;
  discord_channel_id?: string;
  instructor_id?: number;
}) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.createRequest(payload);
  }
  return safeFetch(REQUESTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
}

export async function reviewRequest(id: number, status: "approved" | "rejected", comment?: string) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.reviewRequest(id, status, comment);
  }
  return safeFetch(`${REQUESTS_URL}?action=review&id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status, comment }),
  });
}

export async function startReviewRequest(id: number) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.startReviewRequest(id);
  }
  return safeFetch(`${REQUESTS_URL}?action=start_review&id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
}

export async function cancelReviewRequest(id: number) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.cancelReviewRequest(id);
  }
  return safeFetch(`${REQUESTS_URL}?action=cancel_review&id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
}

export async function fetchGrades(): Promise<Grade[]> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.fetchGrades();
  }
  const data = await safeFetch(`${REQUESTS_URL}?action=grades`, { headers: authHeaders() });
  return data.grades;
}

export async function createGrade(payload: {
  cadet_id: number;
  subject: string;
  type: "lecture" | "practice" | "exam";
  grade: number;
  comment?: string;
  request_id?: number;
}) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.createGrade(payload);
  }
  return safeFetch(`${REQUESTS_URL}?action=grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
}

// ===== Notifications API =====

export interface Notification {
  id: number;
  user_id?: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function fetchNotifications(): Promise<{ notifications: Notification[]; unread_count: number }> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.fetchNotifications();
  }
  return safeFetch(NOTIFICATIONS_URL, { headers: authHeaders() });
}

export async function markAllNotificationsRead() {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.markAllNotificationsRead();
  }
  return safeFetch(`${NOTIFICATIONS_URL}?action=read`, {
    method: "PUT",
    headers: authHeaders(),
  });
}

// ===== Ratings API =====

export interface InstructorRating {
  id: number;
  name: string;
  rank: string;
  unit: string;
  discord_id?: string | null;
  avatar_url?: string | null;
  points: number;
  lectures_count: number;
  practices_count: number;
  exams_count: number;
  reviews_count: number;
}

export async function fetchRatings(timeframe: "daily" | "weekly" | "monthly" | "yearly" = "weekly"): Promise<{ instructors: InstructorRating[] }> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.fetchRatings(timeframe);
  }
  return safeFetch(`${RATINGS_URL}?timeframe=${timeframe}`, { headers: authHeaders() });
}

export async function markNotificationRead(id: number) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.markNotificationRead(id);
  }
  return safeFetch(`${NOTIFICATIONS_URL}?action=read_one&id=${id}`, {
    method: "PUT",
    headers: authHeaders(),
  });
}

// ===== Promotions API =====

export type PromotionType = "junior_sergeant" | "sergeant";

export interface PromotionRequirementItem {
  category: string;
  label: string;
  type: "lecture" | "practice" | "exam" | "test";
  subject: string;
  completed: boolean;
  grade?: number;
  graded_at?: string;
}

export interface PromotionCheckResult {
  promotion_type: PromotionType;
  label: string;
  items: PromotionRequirementItem[];
  completed_count: number;
  total_count: number;
  all_completed: boolean;
}

export interface PromotionReport {
  id: number;
  promotion_type: PromotionType;
  status: "pending" | "approved" | "rejected";
  instructor_comment: string | null;
  created_at: string;
  reviewed_at: string | null;
  cadet_name: string;
  cadet_rank: string;
  cadet_static_id: string;
  cadet_id: number;
  cadet_discord_id?: string | null;
  reviewer_name: string | null;
}

export async function checkPromotionRequirements(type: PromotionType, cadetId?: number): Promise<PromotionCheckResult> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.checkPromotionRequirements(type, cadetId);
  }
  let url = `${PROMOTIONS_URL}?action=check&type=${type}`;
  if (cadetId) url += `&cadet_id=${cadetId}`;
  return safeFetch(url, { headers: authHeaders() });
}

export async function fetchPromotionReports(): Promise<PromotionReport[]> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.fetchPromotionReports();
  }
  const data = await safeFetch(PROMOTIONS_URL, { headers: authHeaders() });
  return data.reports;
}

export async function createPromotionReport(promotion_type: PromotionType) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.createPromotionReport(promotion_type);
  }
  return safeFetch(PROMOTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ promotion_type }),
  });
}

export async function reviewPromotionReport(id: number, status: "approved" | "rejected", comment?: string) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.reviewPromotionReport(id, status, comment);
  }
  return safeFetch(`${PROMOTIONS_URL}?action=review&id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status, comment }),
  });
}

export async function fetchInstructorPromotionConfig(unit?: string): Promise<{ points_config: any[] | null; ranks_flow: any[] | null }> {
  if (USE_MOCK) {
    return { points_config: null, ranks_flow: null };
  }
  const queryParam = unit ? `&unit=${encodeURIComponent(unit)}` : "";
  return safeFetch(`${PROMOTIONS_URL}?action=instructor_config${queryParam}`, {
    headers: authHeaders(),
  });
}

export async function saveInstructorPromotionConfig(payload: { points_config: any[]; ranks_flow: any[]; unit?: string }) {
  if (USE_MOCK) {
    return { success: true };
  }
  return safeFetch(`${PROMOTIONS_URL}?action=save_instructor_config`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export interface InstructorPromotionReport {
  id: number;
  user_id: number;
  current_rank: string;
  target_rank: string;
  total_points: number;
  items_completed: Array<{
    num: number;
    name: string;
    points: number;
    count: number;
    links: string[];
  }>;
  status: "pending" | "approved" | "rejected";
  instructor_comment: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  instructor_name?: string;
  instructor_static_id?: string;
  instructor_unit?: string;
  instructor_id?: number;
  instructor_discord_id?: string | null;
  reviewer_name?: string | null;
}

export async function fetchInstructorPromotionReports(): Promise<InstructorPromotionReport[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await safeFetch(`${PROMOTIONS_URL}?action=instructor_reports`, {
    headers: authHeaders(),
  });
  return data.reports || [];
}

export async function submitInstructorPromotionReport(payload: {
  current_rank: string;
  target_rank: string;
  total_points: number;
  items_completed: any[];
}) {
  if (USE_MOCK) {
    return { ok: true, id: Date.now() };
  }
  return safeFetch(`${PROMOTIONS_URL}?action=submit_instructor_report`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function reviewInstructorPromotionReport(id: number, status: "approved" | "rejected", comment: string) {
  if (USE_MOCK) {
    return { ok: true };
  }
  return safeFetch(`${PROMOTIONS_URL}?action=review_instructor_report&id=${id}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status, comment }),
  });
}

export async function fetchDiscordProfile(discordId: string) {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.fetchDiscordProfile(discordId);
  }
  return safeFetch(`${AUTH_URL}/?action=discord&id=${discordId}`);
}

export interface WeeklyReportItem {
  count: number;
  links: string[];
}

export interface WeeklyReport {
  id: number;
  user_id: number;
  instructor_name: string;
  instructor_rank: string;
  instructor_static_id: string;
  week_start: string;
  items: Record<string, WeeklyReportItem>;
  total_points: number;
  status: "pending" | "approved" | "rejected";
  reviewer_comment: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export async function fetchWeeklyReports(): Promise<WeeklyReport[]> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.fetchWeeklyReports();
  }
  const data = await safeFetch(WEEKLY_REPORTS_URL, {
    headers: authHeaders(),
  });
  return data.reports || [];
}

export async function submitWeeklyReport(weekStart: string, items: Record<string, WeeklyReportItem>): Promise<{ success: boolean; id: number }> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.submitWeeklyReport(weekStart, items);
  }
  return safeFetch(WEEKLY_REPORTS_URL, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ week_start: weekStart, items }),
  });
}

export async function reviewWeeklyReport(
  id: number,
  status: "approved" | "rejected",
  comment?: string,
  items?: Record<string, WeeklyReportItem>
): Promise<{ success: boolean }> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.reviewWeeklyReport(id, status, comment, items);
  }
  return safeFetch(`${WEEKLY_REPORTS_URL}?action=review&id=${id}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status, comment, items }),
  });
}

export async function getWeeklyReportsAutoFill(weekStart: string): Promise<{
  counts: Record<string, number>;
}> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.getWeeklyReportsAutoFill(weekStart);
  }
  return safeFetch(`${WEEKLY_REPORTS_URL}?action=auto_fill&week_start=${weekStart}`, {
    headers: authHeaders(),
  });
}

export interface ActivityDef {
  key: string;
  label: string;
  points: number;
  isAdditional?: boolean;
}

export async function fetchWeeklyReportsSettings(): Promise<{ activities: ActivityDef[] }> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.fetchWeeklyReportsSettings();
  }
  return safeFetch(`${WEEKLY_REPORTS_URL}?action=get_settings`, {
    headers: authHeaders(),
  });
}

export async function saveWeeklyReportsSettings(activities: ActivityDef[]): Promise<{ success: boolean }> {
  if (USE_MOCK) {
    const mock = await getMockApi();
    return mock.saveWeeklyReportsSettings(activities);
  }
  return safeFetch(`${WEEKLY_REPORTS_URL}?action=save_settings`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ activities }),
  });
}

export interface InstructorWarning {
  id: number;
  user_id: number;
  reason: string;
  is_active: boolean;
  created_at: string;
  issued_by_name: string;
}

export async function uploadEvidenceFile(file: File): Promise<string> {
  if (USE_MOCK) {
    return `/uploads/mock_evidence_${Date.now()}.${file.type.split("/")[1] || "png"}`;
  }
  const res = await safeFetch(`${PROMOTIONS_URL}?action=upload_evidence`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": file.type },
    body: file,
  });
  return res.url;
}

export async function fetchAvailableActivities(): Promise<{ grades: Grade[]; reports: PromotionReport[] }> {
  if (USE_MOCK) {
    return { grades: [], reports: [] };
  }
  return safeFetch(`${PROMOTIONS_URL}?action=available_activities`, {
    headers: authHeaders(),
  });
}

export async function fetchUserWarnings(userId?: number): Promise<InstructorWarning[]> {
  if (USE_MOCK) {
    return [];
  }
  let url = `${PROMOTIONS_URL}?action=warnings`;
  if (userId) url += `&user_id=${userId}`;
  const res = await safeFetch(url, { headers: authHeaders() });
  return res.warnings || [];
}

export async function issueWarning(userId: number, reason: string): Promise<{ success: boolean }> {
  if (USE_MOCK) {
    return { success: true };
  }
  return safeFetch(`${PROMOTIONS_URL}?action=issue_warning`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, reason }),
  });
}

export async function dismissWarning(warningId: number): Promise<{ success: boolean }> {
  if (USE_MOCK) {
    return { success: true };
  }
  return safeFetch(`${PROMOTIONS_URL}?action=dismiss_warning`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ warning_id: warningId }),
  });
}