import { apiClient } from './api-client';
import axios from 'axios';

export interface Template {
  id: string;
  title: string;
  parameters: Record<string, unknown>;
  timeLimit: number | null;
  _count: { questions: number };
  createdAt: string;
}

export interface Question {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'MULTIPLE_CORRECT' | 'OPEN_ENDED' | 'YES_NO' | 'ORDERING';
  content: string;
  options: { id: string; text: string }[] | null;
  orderIndex: number;
}

export interface SessionResult {
  id: string;
  score: number | null;
  completedAt: string | null;
  aiReport: string | null;
  user?: { id: string; firstName: string; lastName: string; email: string };
  test: { id: string; title: string; parameters: Record<string, unknown> };
  answers: {
    questionId: string;
    response: unknown;
    question: { content: string; type: string; correctAnswer: unknown };
  }[];
}

export interface AssessmentConfig {
  level1Min: number;
  level2Min: number;
  level3Min: number;
  level4Min: number;
}

type OfflineQuestion = Question & { correctAnswer?: unknown };

type OfflineSession = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  aiReport: string | null;
  test: {
    id: string;
    title: string;
    parameters: Record<string, unknown>;
    shareToken?: string;
    questions: OfflineQuestion[];
  };
  answers: { questionId: string; response: unknown }[];
};

type OfflineTest = {
  id: string;
  title: string;
  parameters: Record<string, unknown>;
  shareToken?: string;
  questions: OfflineQuestion[];
  timeLimit?: number;
};

const OFFLINE_TESTS_KEY = 'skillbridge.offlineTests';
const OFFLINE_SESSIONS_KEY = 'skillbridge.offlineSessions';

const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = {
  level1Min: 80,
  level2Min: 70,
  level3Min: 60,
  level4Min: 50,
};

function allowOfflineFallback(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_OFFLINE_FALLBACK !== 'false';
}

function isApiUnavailable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const status = err.response?.status;
  return !err.response || status === 404 || status === 502 || status === 503 || status === 504;
}

function loadOfflineTests(): OfflineTest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_TESTS_KEY);
    return raw ? (JSON.parse(raw) as OfflineTest[]) : [];
  } catch {
    return [];
  }
}

function loadOfflineSessions(): OfflineSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as OfflineSession[]) : [];
  } catch {
    return [];
  }
}

function saveOfflineSessions(items: OfflineSession[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OFFLINE_SESSIONS_KEY, JSON.stringify(items));
}

function normalizeToArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

function isCorrectByType(type: string, response: unknown, correctAnswer: unknown): boolean | null {
  if (correctAnswer === null || correctAnswer === undefined) return null;
  if (type === 'MULTIPLE_CHOICE' || type === 'YES_NO') return response === correctAnswer;
  if (type === 'MULTIPLE_CORRECT') {
    const correct = normalizeToArray(correctAnswer);
    const given = normalizeToArray(response);
    return correct.length === given.length && correct.every((c) => given.includes(c));
  }
  if (type === 'ORDERING') {
    const correct = normalizeToArray(correctAnswer);
    const given = normalizeToArray(response);
    return correct.length === given.length && correct.every((c, i) => c === given[i]);
  }
  return null;
}

function calculateOfflineScore(session: OfflineSession): number {
  let totalGradable = 0;
  let correctCount = 0;

  for (const q of session.test.questions) {
    const answer = session.answers.find((a) => a.questionId === q.id);
    const result = isCorrectByType(q.type, answer?.response, q.correctAnswer);
    if (result === null) continue;
    totalGradable += 1;
    if (result) correctCount += 1;
  }

  if (totalGradable === 0) return 0;
  return Math.round((correctCount / totalGradable) * 100);
}

function toSessionResult(session: OfflineSession): SessionResult {
  return {
    id: session.id,
    score: session.score,
    completedAt: session.completedAt,
    aiReport: session.aiReport,
    test: {
      id: session.test.id,
      title: session.test.title,
      parameters: session.test.parameters,
    },
    answers: session.answers.map((a) => {
      const q = session.test.questions.find((x) => x.id === a.questionId);
      return {
        questionId: a.questionId,
        response: a.response,
        question: {
          content: q?.content ?? '',
          type: q?.type ?? 'MULTIPLE_CHOICE',
          correctAnswer: q?.correctAnswer ?? null,
        },
      };
    }),
  };
}

export async function fetchTemplates(params?: {
  search?: string;
  minQ?: number;
  maxQ?: number;
}): Promise<Template[]> {
  const res = await apiClient.get<Template[]>('/api/sessions/templates', { params });
  return res.data;
}

export async function previewTemplate(id: string) {
  const res = await apiClient.get(`/api/sessions/templates/${id}/preview`);
  return res.data as Template & { questions: Question[] };
}

export async function useTemplate(id: string) {
  const res = await apiClient.post(`/api/sessions/templates/${id}/use`);
  return res.data;
}

export async function startSession(testId?: string, shareToken?: string, participantName?: string) {
  try {
    const res = await apiClient.post('/api/sessions/start', { testId, shareToken, participantName });
    return res.data as { session: { id: string }; test: { title: string; timeLimit: number | null; questions: Question[] } };
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;

    const tests = loadOfflineTests();
    const found = tests.find((t) => (testId ? t.id === testId : t.shareToken === shareToken));
    if (!found) throw err;

    const session: OfflineSession = {
      id: `offline-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: new Date().toISOString(),
      completedAt: null,
      score: null,
      aiReport: null,
      test: {
        id: found.id,
        title: found.title,
        parameters: found.parameters ?? {},
        shareToken: found.shareToken,
        questions: found.questions ?? [],
      },
      answers: [],
    };

    const sessions = loadOfflineSessions();
    sessions.unshift(session);
    saveOfflineSessions(sessions);

    return {
      session: { id: session.id },
      test: {
        title: found.title,
        timeLimit: found.timeLimit ?? null,
        questions: (found.questions ?? []).map((q) => ({
          id: q.id,
          type: q.type as Question['type'],
          content: q.content,
          options: q.options ?? null,
          orderIndex: q.orderIndex ?? 0,
        })),
      },
    };
  }
}

export async function saveAnswer(sessionId: string, questionId: string, response: unknown) {
  try {
    await apiClient.post(`/api/sessions/${sessionId}/answer`, { questionId, response });
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    const sessions = loadOfflineSessions();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) return;
    const existing = sessions[idx].answers.findIndex((a) => a.questionId === questionId);
    if (existing >= 0) sessions[idx].answers[existing] = { questionId, response };
    else sessions[idx].answers.push({ questionId, response });
    saveOfflineSessions(sessions);
  }
}

export async function completeSession(sessionId: string) {
  try {
    const res = await apiClient.post(`/api/sessions/${sessionId}/complete`);
    return res.data as { session: { id: string; score: number }; breakdown: Record<string, number> };
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    const sessions = loadOfflineSessions();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) throw err;

    const score = calculateOfflineScore(sessions[idx]);
    sessions[idx] = {
      ...sessions[idx],
      score,
      completedAt: new Date().toISOString(),
    };
    saveOfflineSessions(sessions);

    return {
      session: { id: sessionId, score },
      breakdown: { total: sessions[idx].test.questions.length },
    };
  }
}

export async function getSessionResult(sessionId: string): Promise<SessionResult> {
  try {
    const res = await apiClient.get(`/api/sessions/${sessionId}/result`);
    return res.data;
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    const found = loadOfflineSessions().find((s) => s.id === sessionId);
    if (!found) throw err;
    return toSessionResult(found);
  }
}

export async function requestAIAnalysis(sessionId: string) {
  try {
    const res = await apiClient.post(`/api/sessions/${sessionId}/ai-analysis`);
    return res.data as { aiAnalysis: {
      strengthAreas: string[];
      improvementAreas: string[];
      developmentSuggestions: string[];
      careerGuidance: string;
      overallFeedback: string;
      competencyLevel: string;
    }};
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    const sessions = loadOfflineSessions();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) throw err;
    const score = sessions[idx].score ?? 0;
    const level =
      score >= 80 ? 'İleri' :
      score >= 70 ? 'Orta-İleri' :
      score >= 60 ? 'Orta' :
      score >= 50 ? 'Gelişen' : 'Başlangıç';

    const aiAnalysis = {
      strengthAreas: score >= 70 ? ['Temel bilgi hakimiyeti', 'Soru çözüm disiplini'] : ['Katılım ve süreklilik'],
      improvementAreas: ['Konu tekrarı', 'Soru çeşitliliği ile pratik'],
      developmentSuggestions: ['Haftalık planlı tekrar yapın', 'Yanlış soruları konu bazında sınıflandırın'],
      careerGuidance: 'Düzenli pratik ile bir üst seviyeye hızlı geçiş mümkün.',
      overallFeedback: `Offline değerlendirme tamamlandı. Mevcut başarı oranı: %${score}.`,
      competencyLevel: level,
    };

    sessions[idx] = {
      ...sessions[idx],
      aiReport: JSON.stringify({ aiAnalysis }),
    };
    saveOfflineSessions(sessions);
    return { aiAnalysis };
  }
}

export async function listUserSessions() {
  try {
    const res = await apiClient.get('/api/sessions');
    return res.data as SessionResult[];
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    return loadOfflineSessions().map(toSessionResult);
  }
}

export async function getAssessmentConfig(): Promise<AssessmentConfig> {
  try {
    const res = await apiClient.get<AssessmentConfig>('/api/sessions/assessment-config');
    return res.data;
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    return DEFAULT_ASSESSMENT_CONFIG;
  }
}
