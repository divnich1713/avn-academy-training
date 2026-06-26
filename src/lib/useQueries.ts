/**
 * P1-6: Shared React Query hooks — replaces manual useEffect + useState patterns
 * with TanStack Query for automatic caching, deduplication, and background refetch.
 *
 * P2: Accelerated polling — requests every 10s, notifications every 8s when tab
 * is active. Falls back to 60s when the tab is hidden (visibility-aware).
 * Instant refetch on window focus via refetchOnWindowFocus.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRequests,
  fetchGrades,
  fetchInstructors,
  fetchRatings,
  fetchNotifications,
  fetchPromotionReports,
  adminListUsers,
  adminRemoveUser,
  createRequest,
  reviewRequest,
  createGrade,
  markAllNotificationsRead,
  markNotificationRead,
  reviewPromotionReport,
  createPromotionReport,
  fetchInstructorPromotionConfig,
  saveInstructorPromotionConfig,
  TrainingRequest,
  Grade,
  User,
  InstructorRating,
} from "@/lib/api";
import { useSmartRefetchInterval } from "@/lib/useSmartPolling";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const queryKeys = {
  requests: ["requests"] as const,
  grades: ["grades"] as const,
  instructors: ["instructors"] as const,
  ratings: (timeframe: string) => ["ratings", timeframe] as const,
  notifications: ["notifications"] as const,
  promotionReports: ["promotionReports"] as const,
  adminUsers: ["adminUsers"] as const,
  instructorPromotionConfig: ["instructorPromotionConfig"] as const,
};

// ─── Helper: invalidate all core data after a mutation ────────────────────────
function invalidateCore(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.requests });
  qc.invalidateQueries({ queryKey: queryKeys.notifications });
  qc.invalidateQueries({ queryKey: queryKeys.grades });
}

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function useRequests() {
  const interval = useSmartRefetchInterval(10_000, 60_000);
  return useQuery({
    queryKey: queryKeys.requests,
    queryFn: fetchRequests,
    staleTime: 5_000,              // Fresh for 5 seconds (was 60s)
    refetchInterval: interval,     // 10s active / 60s hidden (was 120s)
    refetchOnWindowFocus: true,    // Instant refetch when switching back
    placeholderData: [] as TrainingRequest[],
  });
}

export function useGrades() {
  const interval = useSmartRefetchInterval(30_000, 120_000);
  return useQuery({
    queryKey: queryKeys.grades,
    queryFn: fetchGrades,
    staleTime: 10_000,             // Fresh for 10 seconds (was 60s)
    refetchInterval: interval,     // 30s active / 120s hidden (was 120s)
    refetchOnWindowFocus: true,
    placeholderData: [] as Grade[],
  });
}

export function useInstructors() {
  return useQuery({
    queryKey: queryKeys.instructors,
    queryFn: fetchInstructors,
    staleTime: 5 * 60_000,  // Instructors list changes rarely
    placeholderData: [] as User[],
  });
}

export function useRatings(timeframe: "daily" | "weekly" | "monthly" | "yearly" = "weekly") {
  return useQuery({
    queryKey: queryKeys.ratings(timeframe),
    queryFn: () => fetchRatings(timeframe),
    staleTime: 60_000,
    placeholderData: { instructors: [] as InstructorRating[] },
  });
}

export function useNotifications() {
  const interval = useSmartRefetchInterval(8_000, 60_000);
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: fetchNotifications,
    staleTime: 3_000,              // Fresh for 3 seconds (was 15s)
    refetchInterval: interval,     // 8s active / 60s hidden (was 30s)
    refetchOnWindowFocus: true,    // Instant refetch when switching back
    placeholderData: { notifications: [], unread_count: 0 },
  });
}

export function usePromotionReports() {
  const interval = useSmartRefetchInterval(30_000, 120_000);
  return useQuery({
    queryKey: queryKeys.promotionReports,
    queryFn: fetchPromotionReports,
    staleTime: 10_000,             // (was 60s)
    refetchInterval: interval,     // 30s active / 120s hidden (was none)
    refetchOnWindowFocus: true,
    placeholderData: [],
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: adminListUsers,
    staleTime: 120_000,       // Whitelist users fresh for 2 minutes
    refetchOnWindowFocus: true,
    placeholderData: [],
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      // Cascade: new request → refresh requests list + notifications for instructors
      invalidateCore(qc);
    },
  });
}

export function useReviewRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: "approved" | "rejected"; comment?: string }) =>
      reviewRequest(id, status, comment),
    onSuccess: () => {
      // Cascade: review creates notifications + auto-grades
      invalidateCore(qc);
    },
  });
}

export function useCreateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGrade,
    onSuccess: () => {
      // Cascade: grade creation may trigger notifications
      invalidateCore(qc);
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useReviewPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: "approved" | "rejected"; comment?: string }) =>
      reviewPromotionReport(id, status, comment),
    onSuccess: () => {
      // Cascade: promotion review notifies cadet
      qc.invalidateQueries({ queryKey: queryKeys.promotionReports });
      invalidateCore(qc);
    },
  });
}

export function useCreatePromotionReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPromotionReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.promotionReports });
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminRemoveUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
  });
}

export function useInstructorPromotionConfig() {
  return useQuery({
    queryKey: queryKeys.instructorPromotionConfig,
    queryFn: fetchInstructorPromotionConfig,
    staleTime: 5 * 60_000,
  });
}

export function useSaveInstructorPromotionConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveInstructorPromotionConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.instructorPromotionConfig });
    },
  });
}
