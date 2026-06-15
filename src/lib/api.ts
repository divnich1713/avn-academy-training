// ─── Mock mode: если VITE_USE_MOCK=true — все вызовы идут в локальные заглушки ──
import * as mockApi from "./mock-api";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
if (USE_MOCK) console.log("%c⚡ MOCK MODE — бэкенд не используется", "color: #f59e0b; font-weight: bold; font-size: 14px");

const AUTH_URL = "https://nsybygrjwrzhrpvlzpyv.supabase.co/functions/v1/auth";
const ADMIN_URL = "https://nsybygrjwrzhrpvlzpyv.supabase.co/functions/v1/admin-users";
const REQUESTS_URL = "https://nsybygrjwrzhrpvlzpyv.supabase.co/functions/v1/requests";
const NOTIFICATIONS_URL = "https://nsybygrjwrzhrpvlzpyv.supabase.co/functions/v1/notifications";
const PROMOTIONS_URL = "https://nsybygrjwrzhrpvlzpyv.supabase.co/functions/v1/promotions";

export function getToken(): string | null {
  return localStorage.getItem("avng_token");
}

export function setToken(token: string) {
  localStorage.setItem("avng_token", token);
}

export function removeToken() {
  localStorage.removeItem("avng_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { "X-Session-Token": token } : {};
}

export async function apiLogin(static_id: string, password: string) {
  if (USE_MOCK) return mockApi.apiLogin(static_id, password);
  const res = await fetch(`${AUTH_URL}/?action=login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ static_id, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка входа");
  return data as { token: string; user: User };
}

export async function apiMe(): Promise<User | null> {
  if (USE_MOCK) return mockApi.apiMe();
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${AUTH_URL}/?action=me`, {
    headers: { "X-Session-Token": token },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as User;
}

export async function fetchInstructors(): Promise<User[]> {
  if (USE_MOCK) return mockApi.fetchInstructors();
  const res = await fetch(`${AUTH_URL}/?action=instructors`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.instructors;
}

export async function apiLogout() {
  if (USE_MOCK) return mockApi.apiLogout();
  const token = getToken();
  if (!token) return;
  await fetch(`${AUTH_URL}/?action=logout`, {
    method: "POST",
    headers: { "X-Session-Token": token },
  });
  removeToken();
}

export async function adminListUsers(): Promise<AdminUser[]> {
  if (USE_MOCK) return mockApi.adminListUsers();
  const res = await fetch(ADMIN_URL, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.users;
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
  if (USE_MOCK) return mockApi.adminCreateUser(payload);
  const res = await fetch(ADMIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
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
  if (USE_MOCK) return mockApi.adminUpdateUser(id, payload);
  const res = await fetch(`${ADMIN_URL}?id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function adminRemoveUser(id: number) {
  if (USE_MOCK) return mockApi.adminRemoveUser(id);
  const res = await fetch(`${ADMIN_URL}?id=${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export interface User {
  id: number;
  static_id: string;
  name: string;
  rank: string;
  unit: string;
  role: "cadet" | "instructor" | "head_avng" | "chief_instructor" | "senior_instructor" | "junior_instructor" | "deputy_head" | "dismissed";
  created_at: string;
  last_seen?: string;
  discord_id?: string | null;
  avatar_url?: string | null;
}

export interface AdminUser extends User {
  is_whitelisted: boolean;
  created_at: string;
}

export type RequestType = "lecture" | "practice" | "exam" | "report";
export type RequestStatus = "pending" | "approved" | "rejected";

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
  instructor_name: string;
}

// ===== Requests API =====

export async function fetchRequests(): Promise<TrainingRequest[]> {
  if (USE_MOCK) return mockApi.fetchRequests();
  const res = await fetch(REQUESTS_URL, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.requests;
}

export async function createRequest(payload: {
  type: RequestType;
  subject: string;
  description?: string;
  preferred_date?: string;
}) {
  if (USE_MOCK) return mockApi.createRequest(payload);
  const res = await fetch(REQUESTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function reviewRequest(id: number, status: "approved" | "rejected", comment?: string) {
  if (USE_MOCK) return mockApi.reviewRequest(id, status, comment);
  const res = await fetch(`${REQUESTS_URL}?action=review&id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status, comment }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function fetchGrades(): Promise<Grade[]> {
  if (USE_MOCK) return mockApi.fetchGrades();
  const res = await fetch(`${REQUESTS_URL}?action=grades`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
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
  if (USE_MOCK) return mockApi.createGrade(payload);
  const res = await fetch(`${REQUESTS_URL}?action=grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// ===== Notifications API =====

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function fetchNotifications(): Promise<{ notifications: Notification[]; unread_count: number }> {
  if (USE_MOCK) return mockApi.fetchNotifications();
  const res = await fetch(NOTIFICATIONS_URL, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function markAllNotificationsRead() {
  if (USE_MOCK) return mockApi.markAllNotificationsRead();
  const res = await fetch(`${NOTIFICATIONS_URL}?action=read`, {
    method: "PUT",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// ===== Ratings API =====
const RATINGS_URL = "https://nsybygrjwrzhrpvlzpyv.supabase.co/functions/v1/ratings";

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
  if (USE_MOCK) return mockApi.fetchRatings(timeframe);
  const res = await fetch(`${RATINGS_URL}?timeframe=${timeframe}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function markNotificationRead(id: number) {
  if (USE_MOCK) return mockApi.markNotificationRead(id);
  const res = await fetch(`${NOTIFICATIONS_URL}?action=read_one&id=${id}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// ===== Promotions API =====

export type PromotionType = "junior_sergeant" | "sergeant";

export interface PromotionRequirementItem {
  category: string;
  label: string;
  type: "lecture" | "practice" | "exam";
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
  reviewer_name: string | null;
}

export async function checkPromotionRequirements(type: PromotionType, cadetId?: number): Promise<PromotionCheckResult> {
  if (USE_MOCK) return mockApi.checkPromotionRequirements(type, cadetId);
  let url = `${PROMOTIONS_URL}?action=check&type=${type}`;
  if (cadetId) url += `&cadet_id=${cadetId}`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function fetchPromotionReports(): Promise<PromotionReport[]> {
  if (USE_MOCK) return mockApi.fetchPromotionReports();
  const res = await fetch(PROMOTIONS_URL, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.reports;
}

export async function createPromotionReport(promotion_type: PromotionType) {
  if (USE_MOCK) return mockApi.createPromotionReport(promotion_type);
  const res = await fetch(PROMOTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ promotion_type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function reviewPromotionReport(id: number, status: "approved" | "rejected", comment?: string) {
  if (USE_MOCK) return mockApi.reviewPromotionReport(id, status, comment);
  const res = await fetch(`${PROMOTIONS_URL}?action=review&id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status, comment }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function fetchDiscordProfile(discordId: string) {
  if (USE_MOCK) return mockApi.fetchDiscordProfile(discordId);
  const res = await fetch(`${AUTH_URL}/?action=discord&id=${discordId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load Discord profile");
  return data;
}