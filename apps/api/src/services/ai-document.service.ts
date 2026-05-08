import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function handleAnthropicError(err: unknown): never {
  if (err instanceof Anthropic.AuthenticationError) {
    throw new AppError(503, 'AI servisi kimlik doğrulama hatası. Lütfen sistem yöneticisine başvurun.');
  }
  if (err instanceof Anthropic.RateLimitError) {
    throw new AppError(429, 'AI servisi istek limiti aşıldı. Lütfen biraz bekleyin.');
  }
  if (err instanceof Anthropic.APIConnectionError) {
    throw new AppError(503, 'AI servisine bağlanılamadı. İnternet bağlantınızı kontrol edin.');
  }
  if (err instanceof Anthropic.APIError) {
    throw new AppError(502, `AI servisi hatası: ${(err as Error).message}`);
  }
  throw err;
}

const DOCUMENT_TYPES = {
  competency_guide: 'Yetkinlik / Mesleki Beceri Rehberi',
  job_description: 'Görev Tanımı (RACI Bazlı)',
  competency_matrix: 'Yetkinlik Matrisi',
  case_document: 'Vaka / Senaryo Belgesi',
  performance_form: 'Performans Değerlendirme Formu',
  custom: 'Özel Doküman',
} as const;

export type DocumentType = keyof typeof DOCUMENT_TYPES;

interface GenerateDocumentParams {
  userId: string;
  topic: string;
  /** İsteğe bağlı; verilmezse tek tip profesyonel belge üretilir */
  documentType?: DocumentType;
  sector?: string;
  occupation?: string;
  language?: 'TR' | 'EN';
  additionalContext?: string;
}

function canUseLocalFallback(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.AI_FALLBACK_ENABLED !== 'false';
}

function buildLocalFallbackDocument(params: GenerateDocumentParams): string {
  const sectorLine = params.sector ? `- Sektor: ${params.sector}` : '';
  const occupationLine = params.occupation ? `- Meslek/Pozisyon: ${params.occupation}` : '';
  const contextBlock = params.additionalContext
    ? `\n## Ek Baglam\n\n${params.additionalContext}\n`
    : '';

  if (params.language === 'EN') {
    return `# ${params.topic}\n\n> Local fallback mode is active because the external AI service is unavailable/authentication failed.\n\n## Scope\n\n${[sectorLine, occupationLine].filter(Boolean).join('\n') || '- General professional context'}\n\n## Purpose\n\nThis draft is a structured starter document prepared locally. You can edit and finalize it before sharing.\n\n## Core Competencies\n\n| Competency | Description | Observable Indicator |\n|---|---|---|\n| Technical knowledge | Domain-level know-how | Produces accurate and complete outputs |\n| Communication | Clear written and verbal communication | Conveys expectations and outcomes clearly |\n| Problem solving | Analytical decision making | Proposes practical and measurable solutions |\n\n## Performance Criteria\n\n1. Defines measurable goals and output quality criteria.\n2. Uses evidence and examples while evaluating outcomes.\n3. Shares actionable improvement points.\n\n## Implementation Notes\n\n- Align document sections with your role architecture.\n- Add role-specific examples and scenarios.\n- Validate language and legal compliance before publishing.\n${contextBlock}\n## Next Steps\n\n- Convert this draft into your final company format.\n- Add role-specific KPIs and scoring bands.\n`;
  }

  return `# ${params.topic}\n\n> Harici AI servisine erisilemedigi icin yerel fallback modu ile taslak uretildi.\n\n## Kapsam\n\n${[sectorLine, occupationLine].filter(Boolean).join('\n') || '- Genel profesyonel baglam'}\n\n## Amac\n\nBu metin, kurumunuzda hizli duzenleme yapabilmeniz icin olusturulmus yapilandirilmis bir taslaktir.\n\n## Temel Yetkinlikler\n\n| Yetkinlik | Tanim | Gozlemlenebilir Gosterge |\n|---|---|---|\n| Teknik bilgi | Is alanina hakimiyet | Dogru ve eksiksiz teslimatlar sunar |\n| Iletisim | Yazili/sozlu acik iletisim | Beklenti ve ciktilari net aktarir |\n| Problem cozum | Analitik karar verme | Uygulanabilir cozum onerileri gelistirir |\n\n## Performans Kriterleri\n\n1. Olculebilir hedefler ve kalite kriterleri belirlenir.\n2. Degerlendirmede veri ve ornek kullanilir.\n3. Gelisim noktalarina yonelik aksiyonlar tanimlanir.\n\n## Uygulama Notlari\n\n- Belge bolumlerini rol yapiniza gore ozellestirin.\n- Pozisyona ozel senaryo/ornekler ekleyin.\n- Yayin oncesi dil ve uygunluk kontrolu yapin.\n${contextBlock}\n## Sonraki Adimlar\n\n- Taslagi kurum standardiniza gore son hale getirin.\n- Role ozel KPI ve puanlama araliklari ekleyin.\n`;
}

function buildSystemPrompt(language: 'TR' | 'EN') {
  if (language === 'EN') {
    return `You are an expert HR and professional development consultant.
Generate professional, structured documents for skills assessment and performance evaluation platforms.
Always respond in English with proper formatting using Markdown.
Structure your output clearly with headers, bullet points, and tables where appropriate.`;
  }
  return `Sen deneyimli bir İK ve profesyonel gelişim uzmanısın.
SkillBridge değerlendirme platformu için profesyonel, yapılandırılmış belgeler üretiyorsun.
Her zaman Türkçe yanıt ver. Markdown formatını kullan (başlıklar, maddeler, tablolar).
Belgelerin gerçek iş dünyasında kullanılabilir düzeyde olmasına dikkat et.`;
}

function buildUserPrompt(params: GenerateDocumentParams): string {
  const { topic, sector, occupation, additionalContext, language } = params;
  const lang = language === 'EN' ? 'English' : 'Türkçe';

  const contextLines = [
    sector && `Sektör: ${sector}`,
    occupation && `Meslek/Pozisyon: ${occupation}`,
    additionalContext && `Detaylı açıklama ve taksonomi bağlamı:\n${additionalContext}`,
  ].filter(Boolean).join('\n\n');

  if (language === 'EN') {
    return `**Topic:** ${topic}

${contextLines}

Create a professional, structured document in ${lang} for the SkillBridge assessment platform.
- Choose the most appropriate document structure for the topic (e.g. competency guide, job description with RACI, competency matrix, case study, performance criteria) — you decide what fits best.
- If taxonomy context (sector, occupation, competencies) is provided, align the document tightly with it.
- Use clear Markdown (headings, lists, tables where useful).
- Make it usable in real workplace settings.`;
  }

  return `**Konu:** ${topic}

${contextLines}

Lütfen SkillBridge değerlendirme platformu için ${lang} dilinde profesyonel, yapılandırılmış bir belge oluştur.

**Yönergeler:**
- Konuya ve yukarıdaki bağlama (detaylı açıklama + taksonomi: sektör, meslek, yetkinlikler) en uygun belge yapısını sen seç (ör. mesleki beceri rehberi, RACI’lı görev tanımı, yetkinlik matrisi, vaka senaryosu, performans ölçütleri).
- Taksonomi bilgisi varsa belgeyi bu çerçeveye göre özelleştir.
- Markdown kullan (başlıklar, tablolar, maddeler).
- İş dünyasında doğrudan kullanılabilir düzeyde olsun.`;
}

export async function generateDocument(params: GenerateDocumentParams) {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new AppError(503, 'AI servisi yapılandırılmamış (ANTHROPIC_API_KEY eksik).');
  }

  // Credit check
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: { company: true },
  });
  if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');

  const availableCredits =
    user.role === 'CORPORATE_ADMIN' ? (user.company?.credits ?? 0) : user.credits;

  if (availableCredits < 50) {
    throw new AppError(402, 'Yetersiz kontör. Doküman oluşturmak için 50 kontör gereklidir.');
  }

  // Generate with Claude (or local fallback in development)
  let generatedContent = '';
  let deductCredits = true;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: buildSystemPrompt(params.language ?? 'TR'),
      messages: [{ role: 'user', content: buildUserPrompt(params) }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new AppError(500, 'AI yanıtı alınamadı');
    generatedContent = content.text;
  } catch (err) {
    if (
      canUseLocalFallback() &&
      (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.APIConnectionError)
    ) {
      generatedContent = buildLocalFallbackDocument(params);
      deductCredits = false;
    } else {
      handleAnthropicError(err);
    }
  }

  if (deductCredits) {
    await prisma.$transaction(async (tx) => {
      if (user.role === 'CORPORATE_ADMIN' && user.companyId) {
        await tx.company.update({
          where: { id: user.companyId },
          data: { credits: { decrement: 50 } },
        });
      } else {
        await tx.user.update({
          where: { id: params.userId },
          data: { credits: { decrement: 50 } },
        });
      }

      await tx.creditLog.create({
        data: {
          userId: params.userId,
          amount: -50,
          type: 'DOC_GENERATION',
          description: `AI Doküman: ${params.topic.slice(0, 80)}`,
        },
      });
    });
  }

  return { content: generatedContent, fallbackUsed: !deductCredits };
}

export async function deductAnalysisCredits(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });
  if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');

  const available =
    user.role === 'CORPORATE_ADMIN' ? (user.company?.credits ?? 0) : user.credits;
  if (available < 10) throw new AppError(402, 'Yetersiz kontör. Analiz için 10 kontör gereklidir.');

  await prisma.$transaction(async (tx) => {
    if (user.role === 'CORPORATE_ADMIN' && user.companyId) {
      await tx.company.update({ where: { id: user.companyId }, data: { credits: { decrement: 10 } } });
    } else {
      await tx.user.update({ where: { id: userId }, data: { credits: { decrement: 10 } } });
    }
    await tx.creditLog.create({
      data: { userId, amount: -10, type: 'AI_ANALYSIS', description: 'CV+JD Eşleştirme' },
    });
  });
}

export async function saveGeneratedDocument(params: {
  userId: string;
  title: string;
  content: string;
  language?: 'TR' | 'EN';
  category?: string;
  description?: string;
}) {
  return prisma.document.create({
    data: {
      title: params.title,
      content: params.content,
      language: params.language ?? 'TR',
      category: params.category,
      description: params.description,
      ownerId: params.userId,
    },
  });
}
