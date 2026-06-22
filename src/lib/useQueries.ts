/**
 * P1-6: Shared React Query hooks — replaces manual useEffect + useState patterns
 * with TanStack Query for automatic caching, deduplication, and background refetch.
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

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function useRequests() {
  return useQuery({
    queryKey: queryKeys.requests,
    queryFn: fetchRequests,
    staleTime: 60_000,        // Fresh for 60 seconds
    refetchInterval: 120_000, // Background refetch every 120s
    placeholderData: [] as TrainingRequest[],
  });
}

export function useGrades() {
  return useQuery({
    queryKey: queryKeys.grades,
    queryFn: fetchGrades,
    staleTime: 60_000,        // Fresh for 60 seconds
    refetchInterval: 120_000, // Background refetch every 120s
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
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: fetchNotifications,
    staleTime: 15_000,
    refetchInterval: 30_000,
    placeholderData: { notifications: [], unread_count: 0 },
  });
}

export function usePromotionReports() {
  return useQuery({
    queryKey: queryKeys.promotionReports,
    queryFn: fetchPromotionReports,
    staleTime: 60_000,        // Fresh for 60 seconds
    placeholderData: [],
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: adminListUsers,
    staleTime: 120_000,       // Whitelist users fresh for 2 minutes
    placeholderData: [],
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.requests });
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useReviewRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: "approved" | "rejected"; comment?: string }) =>
      reviewRequest(id, status, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.requests });
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useCreateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGrade,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.grades });
      qc.invalidateQueries({ queryKey: queryKeys.requests });
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
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
      qc.invalidateQueries({ queryKey: queryKeys.promotionReports });
      qc.invalidateQueries({ queryKey: queryKeys.requests });
    },
  });
}

export function useCreatePromotionReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPromotionReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.promotionReports });
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
