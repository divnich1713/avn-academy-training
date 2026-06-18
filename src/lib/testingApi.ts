import { getToken } from "./api";

const TESTING_API_URL = import.meta.env.VITE_TESTING_API_URL || "/supabase-api/testing";

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "X-Session-Token": token } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${TESTING_API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.error || `HTTP error ${res.status}`);
  }

  return res.json();
}

export interface Question {
  question_id: number;
  type: "choice" | "multichoice" | "matching" | "essay";
  question_text: string;
  options: any; // choice: list, matching: {keys, shuffled_values}, multichoice: list
  subject: string;
  progress: number;
  total_questions: number;
}

export interface ActiveSession {
  active: boolean;
  attempt_id?: number;
  subject?: string;
  difficulty?: number;
  warnings_count?: number;
  remaining_seconds?: number;
  is_frozen?: boolean;
  answered_count?: number;
  total_questions?: number;
  time_limit_per_question?: number;
  passing_score_percent?: number;
}

export interface CadetAttempt {
  id: number;
  subject: string;
  difficulty: number;
  status: "in_progress" | "completed" | "aborted";
  start_elo: number;
  end_elo: number | null;
  warnings_count: number;
  started_at: string;
  completed_at: string | null;
  avg_score: number;
}

export interface CadetDashboard {
  mastery_percent: number;
  rank_in_group: string;
  percentile: number;
  subject_mastery: Record<string, number>;
  attempts: CadetAttempt[];
}

export interface AdminAttempt {
  attempt_id: number;
  subject: string;
  cadet_name: string;
  static_id: string;
  rank: string;
  unit: string;
  difficulty: number;
  status: "in_progress" | "completed" | "aborted";
  start_elo: number;
  end_elo: number | null;
  score_percent: number;
  started_at: string;
  completed_at: string | null;
}

export interface TopicDifficulty {
  topic: string;
  difficulty_elo: number;
  questions_count: number;
}

export interface TimePerQuestion {
  type: string;
  avg_time_seconds: number;
  answers_analyzed: number;
}

export interface ScoreDistribution {
  bucket: string;
  count: number;
}

export const testingApi = {
  async getActiveSession(): Promise<ActiveSession> {
    return request("/api/tests/active-session");
  },

  async getSubjects(): Promise<string[]> {
    return request("/api/tests/subjects");
  },

  async startTest(subject: string, difficulty: number, timerMinutes: number): Promise<{ attempt_id: number; start_elo: number; expires_at: string }> {
    return request("/api/tests/start", {
      method: "POST",
      body: JSON.stringify({ subject, difficulty, timer_minutes: timerMinutes }),
    });
  },

  async freezeTest(attemptId: number): Promise<{ message: string; remaining_seconds: number }> {
    return request(`/api/tests/freeze?attempt_id=${attemptId}`, {
      method: "POST",
    });
  },

  async resumeTest(attemptId: number): Promise<{ message: string; expires_at: string }> {
    return request(`/api/tests/resume?attempt_id=${attemptId}`, {
      method: "POST",
    });
  },

  async getNextQuestion(attemptId: number): Promise<Question | { completed: boolean }> {
    return request(`/api/tests/next-question?attempt_id=${attemptId}`);
  },

  async submitAnswer(attemptId: number, questionId: number, answer: any): Promise<{
    type: string;
    is_correct: boolean | null;
    grade: number | null;
    correct_answer: any;
    explanation: string;
    new_rating: number;
    completed: boolean;
    certificate?: {
      cadet_name: string;
      static_id: string;
      rank: string;
      unit: string;
      subject: string;
      completed_at: string;
      correct_answers_count: number;
      total_questions: number;
      percentage: number;
      grade: number;
      passed: boolean;
    } | null;
  }> {
    return request("/api/tests/submit-answer", {
      method: "POST",
      body: JSON.stringify({ attempt_id: attemptId, question_id: questionId, answer }),
    });
  },

  async sendWarning(attemptId: number, warningsCount: number): Promise<{ warnings_count: number; aborted: boolean }> {
    return request("/api/tests/warn", {
      method: "POST",
      body: JSON.stringify({ attempt_id: attemptId, warnings_count: warningsCount }),
    });
  },

  async getCadetDashboard(): Promise<CadetDashboard> {
    return request("/api/stats/cadet/dashboard");
  },

  async getAdminDashboard(): Promise<{ attempts: AdminAttempt[] }> {
    return request("/api/stats/admin/dashboard");
  },

  async getD3TopicDifficulty(): Promise<TopicDifficulty[]> {
    return request("/api/stats/d3/topic-difficulty");
  },

  async getD3TimePerQuestion(): Promise<TimePerQuestion[]> {
    return request("/api/stats/d3/time-per-question");
  },

  async getD3ScoreDistribution(): Promise<ScoreDistribution[]> {
    return request("/api/stats/d3/score-distribution");
  },

  async getQuestionsAdmin(): Promise<QuestionAdmin[]> {
    return request("/api/tests/questions-admin");
  },

  async createQuestionAdmin(payload: QuestionAdmin): Promise<QuestionAdmin> {
    return request("/api/tests/questions-admin", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateQuestionAdmin(id: number, payload: Partial<QuestionAdmin>): Promise<QuestionAdmin> {
    return request(`/api/tests/questions-admin/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteQuestionAdmin(id: number): Promise<{ success: boolean }> {
    return request(`/api/tests/questions-admin/${id}`, {
      method: "DELETE",
    });
  },

  async getSettingsAdmin(): Promise<TestSettings[]> {
    return request("/api/tests/settings-admin");
  },

  async updateSettingsAdmin(payload: TestSettings): Promise<TestSettings> {
    return request("/api/tests/settings-admin", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getAttemptDetails(attemptId: number): Promise<{ questions: AttemptDetailQuestion[] }> {
    return request(`/api/tests/attempt-details?attempt_id=${attemptId}`);
  },
};

export interface AttemptDetailQuestion {
  id: number;
  question_text: string;
  type: "choice" | "multichoice" | "matching" | "essay";
  options: any;
  correct_answer: any;
  explanation: string | null;
  student_answer: any;
  is_correct: boolean | null;
  grade: number | null;
  feedback: string | null;
}

export interface TestSettings {
  id?: number;
  subject: string;
  timer_minutes: number;
  question_count: number;
  base_elo: number;
  time_limit_per_question: number;
  passing_score_percent: number;
}

export interface QuestionAdmin {
  id?: number;
  subject: string;
  type: "choice" | "multichoice" | "matching" | "essay";
  question_text: string;
  options: any;
  correct_answer: any;
  explanation?: string;
  elo_rating?: number;
  criteria_matrix?: any;
}

