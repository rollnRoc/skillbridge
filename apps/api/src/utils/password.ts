import bcrypt from 'bcryptjs';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Şifre en az 8 karakter olmalıdır';
  if (!/[A-Z]/.test(password)) return 'Şifre en az 1 büyük harf içermelidir';
  if (!/[0-9]/.test(password)) return 'Şifre en az 1 rakam içermelidir';
  return null;
}
