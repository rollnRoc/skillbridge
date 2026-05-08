import { apiClient } from './api-client';
import axios from 'axios';

export interface TestDraft {
  id: string;
  title: string;
  documentId?: string;
  parameters: Record<string, unknown>;
  timeLimit?: number;
  createdAt: string;
}

export interface GeneratedQuestion {
  id: string;
  type: string;
  content: string;
  options: { id: string; text: string }[] | null;
  correctAnswer: unknown;
  orderIndex: number;
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type QuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_CORRECT' | 'OPEN_ENDED' | 'YES_NO';

const OFFLINE_TESTS_KEY = 'skillbridge.offlineTests';
const GEMINI_MODEL = 'gemini-1.5-flash';

function allowOfflineFallback(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_OFFLINE_FALLBACK !== 'false';
}

function isApiUnavailable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const status = err.response?.status;
  return !err.response || status === 404 || status === 502 || status === 503 || status === 504;
}

function loadOfflineTests(): TestDetail[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_TESTS_KEY);
    return raw ? (JSON.parse(raw) as TestDetail[]) : [];
  } catch {
    return [];
  }
}

function saveOfflineTests(tests: TestDetail[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OFFLINE_TESTS_KEY, JSON.stringify(tests));
}

function mapQuestionTypeLabel(t: QuestionType): string {
  if (t === 'MULTIPLE_CHOICE') return 'Çoktan seçmeli';
  if (t === 'MULTIPLE_CORRECT') return 'Çoklu doğru';
  if (t === 'OPEN_ENDED') return 'Açık uçlu';
  return 'Evet/Hayır';
}

function extractJsonArray(text: string): unknown[] | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      const maybeQuestions = (parsed as { questions?: unknown }).questions;
      if (Array.isArray(maybeQuestions)) return maybeQuestions;
    }
  } catch {
    // Fall back to bracket slicing below.
  }

  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildDiverseFallbackQuestions(
  title: string,
  count: number,
  language: 'TR' | 'EN'
): GeneratedQuestion[] {
  const trStems = [
    'Aşağıdaki durumda en doğru ilk adım hangisidir?',
    'Bu senaryoda riskleri azaltmak için en etkili yaklaşım hangisidir?',
    'Verilen bilgiye göre hangi seçenek en tutarlı karardır?',
    'Süreç kalitesini artırmak için hangi aksiyon önceliklendirilmelidir?',
    'Bu olayın temel nedeni için en güçlü açıklama hangisidir?',
    'Ekip iletişimini güçlendirmek için hangi yöntem en uygundur?',
    'Kaynak planlamasında en rasyonel tercih hangisidir?',
    'Hata oranını düşürmek için hangi kontrol mekanizması seçilmelidir?',
    'Müşteri memnuniyetini korumak için hangi karar daha doğrudur?',
    'Bu durumda mevzuata uyum için hangi adım atılmalıdır?',
  ];

  const enStems = [
    'What is the most appropriate first step in this situation?',
    'Which approach best reduces risk in this scenario?',
    'Based on the given information, which decision is most consistent?',
    'Which action should be prioritized to improve process quality?',
    'What is the strongest explanation for the root cause?',
    'Which method is most suitable to improve team communication?',
    'Which option is the most rational resource-planning choice?',
    'Which control mechanism best reduces error rates?',
    'Which decision better protects customer satisfaction?',
    'Which step is required for compliance in this case?',
  ];

  const stems = language === 'TR' ? trStems : enStems;

  return Array.from({ length: count }).map((_, i) => {
    const stem = stems[i % stems.length];
    const topic = `${title} (${i + 1})`;
    const targetCorrect = (['a', 'b', 'c', 'd'] as const)[i % 4];
    const correctText = language === 'TR'
      ? `Veri temelli ve proaktif aksiyon planı (${i + 1})`
      : `Data-driven proactive action plan (${i + 1})`;
    const distractors = language === 'TR'
      ? [
          `Durumu pasif izleyip beklemek (${i + 1})`,
          `Sorumluluğu dış kaynağa devretmek (${i + 1})`,
          `Kanıt toplamadan hızlı karar vermek (${i + 1})`,
        ]
      : [
          `Wait passively and monitor (${i + 1})`,
          `Transfer responsibility externally (${i + 1})`,
          `Decide quickly without evidence (${i + 1})`,
        ];

    const ids = ['a', 'b', 'c', 'd'] as const;
    let di = 0;
    const options = ids.map((id) => {
      if (id === targetCorrect) return { id, text: correctText };
      const text = distractors[(di + i) % distractors.length] ?? distractors[0];
      di += 1;
      return { id, text };
    });

    return {
      id: `offline-q-${Date.now()}-${i}`,
      type: 'MULTIPLE_CHOICE',
      content: language === 'TR' ? `${topic}: ${stem}` : `${topic}: ${stem}`,
      options,
      correctAnswer: targetCorrect,
      orderIndex: i,
    };
  });
}

function rebalanceMultipleChoiceAnswers(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const ids = ['a', 'b', 'c', 'd'] as const;
  let mcIndex = 0;

  return questions.map((q) => {
    if (q.type !== 'MULTIPLE_CHOICE' || !q.options || q.options.length < 2) return q;

    const target = ids[mcIndex % ids.length];
    mcIndex += 1;

    const options = q.options.map((o) => ({ id: o.id.toLowerCase(), text: o.text }));
    const currentCorrectId = typeof q.correctAnswer === 'string' ? q.correctAnswer.toLowerCase() : null;
    const currentCorrectOption =
      (currentCorrectId && options.find((o) => o.id === currentCorrectId)) ||
      options[0];

    if (!currentCorrectOption) return q;

    const distractors = options.filter((o) => o.id !== currentCorrectOption.id);
    const normalized = ids.map((id) => {
      if (id === target) return { id, text: currentCorrectOption.text };
      const next = distractors.shift();
      return next ? { id, text: next.text } : { id, text: `Seçenek ${id.toUpperCase()}` };
    });

    return {
      ...q,
      options: normalized,
      correctAnswer: target,
    };
  });
}

function ensureOptionTextVariety(
  questions: GeneratedQuestion[],
  language: 'TR' | 'EN'
): GeneratedQuestion[] {
  const bank =
    language === 'TR'
      ? [
          'Kök neden analizi yapıp plan oluşturmak',
          'Önleyici kontrol listesi uygulamak',
          'Süreç adımlarını ölçümlerle doğrulamak',
          'Paydaşlarla net rol-sorumluluk belirlemek',
          'Alternatif senaryolarla risk simülasyonu yapmak',
          'Kararı kanıt ve veri ile desteklemek',
          'Aksiyonları zaman-planına bağlamak',
          'Uygulama sonrası geri bildirim döngüsü kurmak',
          'Kalite kriterlerini baştan tanımlamak',
          'Kontrol noktalarını periyodik izlemek',
          'Yetki ve onay mekanizmasını netleştirmek',
          'Kaynakları öncelik sırasına göre dağıtmak',
        ]
      : [
          'Perform root-cause analysis and create a plan',
          'Apply a preventive control checklist',
          'Validate process steps with measurements',
          'Clarify stakeholder roles and ownership',
          'Run risk simulations with alternative scenarios',
          'Support decisions with evidence and data',
          'Tie actions to a clear timeline',
          'Create a feedback loop after execution',
          'Define quality criteria upfront',
          'Monitor control points periodically',
          'Clarify approval and authority flow',
          'Allocate resources by priority',
        ];

  const usedSignatures = new Set<string>();

  return questions.map((q, i) => {
    if (q.type !== 'MULTIPLE_CHOICE' || !q.options || q.options.length < 2) return q;

    const ids = ['a', 'b', 'c', 'd'] as const;
    const currentCorrectId = typeof q.correctAnswer === 'string' ? q.correctAnswer.toLowerCase() : 'a';
    const targetCorrect = ids.includes(currentCorrectId as (typeof ids)[number])
      ? (currentCorrectId as (typeof ids)[number])
      : ('a' as const);

    const correctText =
      q.options.find((o) => o.id.toLowerCase() === targetCorrect)?.text?.trim() ||
      bank[(i * 3) % bank.length];

    const start = (i * 3) % bank.length;
    const distractorPool = Array.from({ length: bank.length }, (_, k) => bank[(start + k) % bank.length])
      .filter((t) => t !== correctText);

    const d1 = distractorPool[0] ?? `Seçenek B ${i + 1}`;
    const d2 = distractorPool[1] ?? `Seçenek C ${i + 1}`;
    const d3 = distractorPool[2] ?? `Seçenek D ${i + 1}`;

    let di = 0;
    const rebuilt = ids.map((id) => {
      if (id === targetCorrect) return { id, text: correctText };
      const t = [d1, d2, d3][di] ?? `${language === 'TR' ? 'Seçenek' : 'Option'} ${id.toUpperCase()} ${i + 1}`;
      di += 1;
      return { id, text: t };
    });

    const sig = rebuilt.map((o) => o.text.toLowerCase()).join('|');
    if (usedSignatures.has(sig)) {
      const bumped = rebuilt.map((o, idx) => ({
        ...o,
        text: `${o.text} ${language === 'TR' ? '- varyant' : '- variant'} ${i + 1}.${idx + 1}`,
      }));
      usedSignatures.add(bumped.map((o) => o.text.toLowerCase()).join('|'));
      return { ...q, options: bumped, correctAnswer: targetCorrect };
    }

    usedSignatures.add(sig);
    return { ...q, options: rebuilt, correctAnswer: targetCorrect };
  });
}

async function generateQuestionsWithGemini(params: {
  title: string;
  questionCount: number;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  language: 'TR' | 'EN';
  additionalInstructions?: string;
}): Promise<GeneratedQuestion[] | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  const typeLabels = params.questionTypes.map(mapQuestionTypeLabel).join(', ');
  const prompt = [
    params.language === 'TR'
      ? 'Sen kıdemli bir ölçme-değerlendirme uzmanısın. Her soru kökü benzersiz olmalı; aynı cümleyi tekrar etme.'
      : 'You are a senior assessment expert. Each question stem must be unique; do not repeat the same sentence.',
    params.language === 'TR'
      ? `Konu: ${params.title}`
      : `Topic: ${params.title}`,
    params.language === 'TR'
      ? `Soru sayısı: ${params.questionCount}`
      : `Question count: ${params.questionCount}`,
    params.language === 'TR'
      ? `Zorluk: ${params.difficulty}`
      : `Difficulty: ${params.difficulty}`,
    params.language === 'TR'
      ? `Soru türleri: ${typeLabels}`
      : `Question types: ${typeLabels}`,
    params.additionalInstructions
      ? (params.language === 'TR'
          ? `Ek talimatlar: ${params.additionalInstructions}`
          : `Additional instructions: ${params.additionalInstructions}`)
      : null,
    params.language === 'TR'
      ? 'Sadece geçerli JSON döndür. Biçim: [{"type":"MULTIPLE_CHOICE","content":"...","options":[{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."},{"id":"d","text":"..."}],"correctAnswer":"a"}]'
      : 'Return valid JSON only. Format: [{"type":"MULTIPLE_CHOICE","content":"...","options":[{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."},{"id":"d","text":"..."}],"correctAnswer":"a"}]',
  ].filter(Boolean).join('\n\n');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) return null;
  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  const parsed = extractJsonArray(text);
  if (!parsed || parsed.length === 0) return null;

  const normalized = (parsed
    .map((q, i) => {
      const obj = q as {
        type?: string;
        content?: string;
        options?: Array<{ id?: string; text?: string }>;
        correctAnswer?: unknown;
      };
      const type = (obj.type ?? 'MULTIPLE_CHOICE') as QuestionType;
      const content = (obj.content ?? '').trim();
      const options = Array.isArray(obj.options)
        ? obj.options
            .map((o, idx) => ({
              id: (o.id ?? ['a', 'b', 'c', 'd'][idx] ?? `o${idx + 1}`).toLowerCase(),
              text: (o.text ?? '').trim(),
            }))
            .filter((o) => o.text !== '')
        : null;

      if (!content) return null;

      if (type === 'MULTIPLE_CHOICE') {
        const mcOptions = options && options.length >= 2
          ? options.slice(0, 4)
          : [
              { id: 'a', text: 'Seçenek A' },
              { id: 'b', text: 'Seçenek B' },
              { id: 'c', text: 'Seçenek C' },
              { id: 'd', text: 'Seçenek D' },
            ];
        const firstId = mcOptions[0]?.id ?? 'a';
        const correct = typeof obj.correctAnswer === 'string' && mcOptions.some((o) => o.id === obj.correctAnswer)
          ? obj.correctAnswer
          : firstId;
        return {
          id: `offline-q-${Date.now()}-${i}`,
          type: 'MULTIPLE_CHOICE',
          content,
          options: mcOptions,
          correctAnswer: correct,
          orderIndex: i,
        } satisfies GeneratedQuestion;
      }

      if (type === 'YES_NO') {
        const correct = obj.correctAnswer === 'no' ? 'no' : 'yes';
        return {
          id: `offline-q-${Date.now()}-${i}`,
          type: 'YES_NO',
          content,
          options: [
            { id: 'yes', text: params.language === 'TR' ? 'Evet' : 'Yes' },
            { id: 'no', text: params.language === 'TR' ? 'Hayır' : 'No' },
          ],
          correctAnswer: correct,
          orderIndex: i,
        } satisfies GeneratedQuestion;
      }

      return {
        id: `offline-q-${Date.now()}-${i}`,
        type: 'OPEN_ENDED',
        content,
        options: null,
        correctAnswer: null,
        orderIndex: i,
      } satisfies GeneratedQuestion;
    })
    .filter((x) => x !== null)
    .slice(0, params.questionCount)
  ) as GeneratedQuestion[];

  return normalized.length > 0 ? normalized : null;
}

function toDraft(test: TestDetail): TestDraft {
  return {
    id: test.id,
    title: test.title,
    documentId: test.documentId,
    parameters: test.parameters,
    timeLimit: test.timeLimit,
    createdAt: test.createdAt,
  };
}

export async function createTestDraft(params: {
  title: string;
  documentId?: string;
  timeLimit?: number;
  parameters?: Record<string, unknown>;
}): Promise<TestDraft> {
  try {
    const res = await apiClient.post<TestDraft>('/api/tests', params);
    return res.data;
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;

    const now = new Date().toISOString();
    const draft: TestDetail = {
      id: `offline-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: params.title,
      documentId: params.documentId,
      parameters: params.parameters ?? {},
      timeLimit: params.timeLimit,
      createdAt: now,
      isPublished: false,
      isTemplate: false,
      shareToken: undefined,
      questions: [],
    };
    const tests = loadOfflineTests();
    tests.unshift(draft);
    saveOfflineTests(tests);
    return toDraft(draft);
  }
}

export interface TestDetail extends TestDraft {
  isPublished: boolean;
  isTemplate: boolean;
  shareToken?: string;
  questions: GeneratedQuestion[];
}

export async function getTest(testId: string): Promise<TestDetail> {
  try {
    const res = await apiClient.get<TestDetail>(`/api/tests/${testId}`);
    return res.data;
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    const found = loadOfflineTests().find((t) => t.id === testId);
    if (!found) throw err;
    return found;
  }
}

export async function updateTest(testId: string, data: { title?: string; timeLimit?: number }): Promise<TestDetail> {
  try {
    const res = await apiClient.patch<TestDetail>(`/api/tests/${testId}`, data);
    return res.data;
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    const tests = loadOfflineTests();
    const idx = tests.findIndex((t) => t.id === testId);
    if (idx < 0) throw err;
    tests[idx] = {
      ...tests[idx],
      title: data.title ?? tests[idx].title,
      timeLimit: data.timeLimit ?? tests[idx].timeLimit,
    };
    saveOfflineTests(tests);
    return tests[idx];
  }
}

export async function publishTest(testId: string): Promise<TestDetail> {
  try {
    const res = await apiClient.post<TestDetail>(`/api/tests/${testId}/publish`);
    return res.data;
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    const tests = loadOfflineTests();
    const idx = tests.findIndex((t) => t.id === testId);
    if (idx < 0) throw err;
    tests[idx] = {
      ...tests[idx],
      isPublished: true,
      shareToken: tests[idx].shareToken ?? `offline-${tests[idx].id}`,
    };
    saveOfflineTests(tests);
    return tests[idx];
  }
}

export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/tests/questions/${questionId}`);
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    const tests = loadOfflineTests();
    let changed = false;
    const next = tests.map((t) => {
      const filtered = t.questions.filter((q) => q.id !== questionId);
      if (filtered.length !== t.questions.length) changed = true;
      return changed ? { ...t, questions: filtered } : t;
    });
    if (changed) saveOfflineTests(next);
  }
}

export async function listTests(): Promise<(TestDraft & { isPublished: boolean; _count: { questions: number } })[]> {
  try {
    const res = await apiClient.get('/api/tests');
    return res.data;
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    return loadOfflineTests().map((t) => ({
      ...toDraft(t),
      isPublished: t.isPublished,
      _count: { questions: t.questions.length },
    }));
  }
}

export async function generateQuestionsForTest(
  testId: string,
  params: {
    questionCount?: number;
    difficulty?: Difficulty;
    questionTypes?: QuestionType[];
    language?: 'TR' | 'EN';
    additionalInstructions?: string;
    competencies?: string[];
  }
): Promise<GeneratedQuestion[]> {
  try {
    const res = await apiClient.post<GeneratedQuestion[]>(
      `/api/tests/${testId}/generate-questions`,
      params
    );
    return res.data;
  } catch (err) {
    if (!allowOfflineFallback() || !isApiUnavailable(err)) throw err;
    const tests = loadOfflineTests();
    const idx = tests.findIndex((t) => t.id === testId);
    if (idx < 0) throw err;

    const count = Math.max(1, Math.min(20, params.questionCount ?? 5));
    const generatedFromGemini = await generateQuestionsWithGemini({
      title: tests[idx].title,
      questionCount: count,
      difficulty: params.difficulty ?? 'intermediate',
      questionTypes: params.questionTypes ?? ['MULTIPLE_CHOICE'],
      language: params.language ?? 'TR',
      additionalInstructions: params.additionalInstructions,
    });

    const generated: GeneratedQuestion[] =
      generatedFromGemini ??
      buildDiverseFallbackQuestions(tests[idx].title, count, params.language ?? 'TR');

    const balanced = rebalanceMultipleChoiceAnswers(generated);
    const varied = ensureOptionTextVariety(balanced, params.language ?? 'TR');
    tests[idx] = { ...tests[idx], questions: varied };
    saveOfflineTests(tests);
    return varied;
  }
}
