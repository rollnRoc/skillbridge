import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';
import { comparePassword, hashPassword, validatePasswordStrength } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { grantCredits } from '../utils/credit.js';
import crypto from 'crypto';

// ─── Register ──────────────────────────────────────────────────────────────────

interface RegisterIndividualDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  language?: 'TR' | 'EN';
}

export async function registerIndividual(dto: RegisterIndividualDto) {
  const pwError = validatePasswordStrength(dto.password);
  if (pwError) throw new AppError(400, pwError);

  const exists = await prisma.user.findUnique({ where: { email: dto.email } });
  if (exists) throw new AppError(409, 'Bu e-posta adresi zaten kullanılıyor');

  const passwordHash = await hashPassword(dto.password);
  const user = await prisma.user.create({
    data: {
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'INDIVIDUAL',
      language: dto.language ?? 'TR',
      credits: 0,
    },
  });

  // Hoş geldin kontörü
  await grantCredits(user.id, 50, 'WELCOME_BONUS', 'Hoş geldin hediyesi');

  return _issueTokens(user.id, user.role, undefined);
}

interface RegisterCorporateDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  taxNumber?: string;
  language?: 'TR' | 'EN';
}

export async function registerCorporate(dto: RegisterCorporateDto) {
  const pwError = validatePasswordStrength(dto.password);
  if (pwError) throw new AppError(400, pwError);

  const exists = await prisma.user.findUnique({ where: { email: dto.email } });
  if (exists) throw new AppError(409, 'Bu e-posta adresi zaten kullanılıyor');

  const passwordHash = await hashPassword(dto.password);

  const { user, company } = await prisma.$transaction(async (tx) => {
    // Önce kullanıcıyı oluştur (companyId olmadan)
    const user = await tx.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'CORPORATE_ADMIN',
        language: dto.language ?? 'TR',
        credits: 0,
      },
    });

    // Şirketi oluştur ve admin'e bağla
    const company = await tx.company.create({
      data: {
        name: dto.companyName,
        taxNumber: dto.taxNumber,
        adminUserId: user.id,
        credits: 50, // Hoş geldin kontörü şirket havuzuna
      },
    });

    // Kullanıcıyı şirkete bağla
    await tx.user.update({
      where: { id: user.id },
      data: { companyId: company.id },
    });

    await tx.creditLog.create({
      data: {
        userId: user.id,
        amount: 50,
        type: 'WELCOME_BONUS',
        description: 'Kurumsal hoş geldin hediyesi',
      },
    });

    return { user, company };
  });

  return _issueTokens(user.id, user.role, company.id);
}

// ─── Login ─────────────────────────────────────────────────────────────────────

export async function login(email: string, rememberMe = false) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'E-posta hatalı');
  }

  if (rememberMe) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { rememberToken: token },
    });
  }

  return _issueTokens(user.id, user.role, user.companyId ?? undefined);
}

/**
 * E-posta + şifre ile giriş — **tüm roller** (INDIVIDUAL, CORPORATE_ADMIN, **PLATFORM_ADMIN**).
 * Platform yöneticileri hem bu uç hem `/superadmin/login` ile oturum açabilir.
 */
export async function loginWithPassword(email: string, password: string, rememberMe = false) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'E-posta veya şifre hatalı');
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, 'E-posta veya şifre hatalı');
  }

  if (rememberMe) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { rememberToken: token },
    });
  }

  return _issueTokens(user.id, user.role, user.companyId ?? undefined);
}

/** Yalnızca PLATFORM_ADMIN: e-posta + şifre ile giriş (HTTP-only çerezler controller’da set edilir). */
export async function loginSuperAdmin(email: string, password: string, rememberMe = false) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'E-posta veya şifre hatalı');
  }

  if (user.role !== 'PLATFORM_ADMIN') {
    throw new AppError(403, 'Bu giriş yalnızca platform yöneticileri içindir');
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, 'E-posta veya şifre hatalı');
  }

  if (rememberMe) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { rememberToken: token },
    });
  }

  return _issueTokens(user.id, user.role, user.companyId ?? undefined);
}

// ─── Refresh Token ─────────────────────────────────────────────────────────────

export async function refreshToken(token: string) {
  let payload: { id: string; role: string; companyId?: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'Geçersiz yenileme token\'ı');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.isActive) throw new AppError(401, 'Kullanıcı bulunamadı');

  return _issueTokens(user.id, user.role, user.companyId ?? undefined);
}

// ─── Forgot / Reset Password ───────────────────────────────────────────────────

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Güvenlik: kullanıcı yoksa da başarı döndür
  if (!user) return { message: 'Şifre sıfırlama bağlantısı gönderildi' };

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

  await prisma.user.update({
    where: { id: user.id },
    data: { rememberToken: `reset:${token}:${expires.toISOString()}` },
  });

  // TODO: Resend ile e-posta gönder
  console.log(`[DEV] Şifre sıfırlama token'ı: ${token}`);

  return { message: 'Şifre sıfırlama bağlantısı gönderildi' };
}

export async function resetPassword(token: string, newPassword: string) {
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) throw new AppError(400, pwError);

  const user = await prisma.user.findFirst({
    where: { rememberToken: { startsWith: `reset:${token}:` } },
  });

  if (!user?.rememberToken) throw new AppError(400, 'Geçersiz veya süresi dolmuş bağlantı');

  const parts = user.rememberToken.split(':');
  const expires = new Date(parts[2]);
  if (expires < new Date()) throw new AppError(400, 'Bağlantının süresi dolmuş (24 saat)');

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, rememberToken: null },
  });

  return { message: 'Şifre başarıyla güncellendi' };
}

// ─── Me ────────────────────────────────────────────────────────────────────────

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      language: true,
      credits: true,
      emailVerified: true,
      department: true,
      occupation: true,
      company: {
        select: {
          id: true,
          name: true,
          credits: true,
        },
      },
      createdAt: true,
    },
  });
  if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');
  return user;
}

export async function updateProfile(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    department?: string | null;
    occupation?: string | null;
  }
) {
  await getMe(userId);
  const update: {
    firstName?: string;
    lastName?: string;
    department?: string | null;
    occupation?: string | null;
  } = {};
  if (data.firstName !== undefined) update.firstName = data.firstName.trim();
  if (data.lastName !== undefined) update.lastName = data.lastName.trim();
  if (data.department !== undefined) update.department = data.department?.trim() ? data.department.trim() : null;
  if (data.occupation !== undefined) update.occupation = data.occupation?.trim() ? data.occupation.trim() : null;

  if (data.firstName !== undefined && !data.firstName.trim()) throw new AppError(400, 'Ad boş olamaz');
  if (data.lastName !== undefined && !data.lastName.trim()) throw new AppError(400, 'Soyad boş olamaz');

  if (Object.keys(update).length === 0) return getMe(userId);

  return prisma.user.update({
    where: { id: userId },
    data: update,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      language: true,
      credits: true,
      emailVerified: true,
      department: true,
      occupation: true,
      company: {
        select: {
          id: true,
          name: true,
          credits: true,
        },
      },
      createdAt: true,
    },
  });
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function _issueTokens(id: string, role: string, companyId?: string) {
  const payload = { id, role, companyId };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}
