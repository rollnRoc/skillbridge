import { apiClient } from './api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'INDIVIDUAL' | 'CORPORATE_ADMIN' | 'PLATFORM_ADMIN';
  credits: number;
  emailVerified: boolean;
  createdAt: string;
  company?: { id: string; name: string } | null;
}

export interface CreditLog {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
}

export interface CreditSummary {
  totalGranted: number;
  totalSpent: number;
  userCount: number;
}

export interface AdminCompany {
  id: string;
  name: string;
  credits: number;
  createdAt: string;
  _count: { users: number };
}

export interface AssessmentConfig {
  level1Min: number;
  level2Min: number;
  level3Min: number;
  level4Min: number;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function listAdminUsers(): Promise<AdminUser[]> {
  const res = await apiClient.get<AdminUser[]>('/api/admin/users');
  return res.data;
}

export async function updateUserRole(userId: string, role: string): Promise<AdminUser> {
  const res = await apiClient.patch<AdminUser>(`/api/admin/users/${userId}/role`, { role });
  return res.data;
}

// ─── Credits ─────────────────────────────────────────────────────────────────

export async function getCreditLogs(params?: { userId?: string; type?: string; limit?: number }): Promise<CreditLog[]> {
  const res = await apiClient.get<CreditLog[]>('/api/admin/credits/logs', { params });
  return res.data;
}

export async function grantCreditsToUser(userId: string, amount: number, description?: string): Promise<{ message: string; user: AdminUser }> {
  const res = await apiClient.post('/api/admin/credits/grant', { userId, amount, description });
  return res.data;
}

export async function getCreditSummary(): Promise<CreditSummary> {
  const res = await apiClient.get<CreditSummary>('/api/admin/credits/summary');
  return res.data;
}

// ─── Companies ───────────────────────────────────────────────────────────────

export async function listCompanies(): Promise<AdminCompany[]> {
  const res = await apiClient.get<AdminCompany[]>('/api/admin/companies');
  return res.data;
}

export async function grantCreditsToCompany(companyId: string, amount: number, description?: string): Promise<{ message: string }> {
  const res = await apiClient.post(`/api/admin/companies/${companyId}/grant-credits`, { amount, description });
  return res.data;
}

// ─── Assessment Config ───────────────────────────────────────────────────────

export async function getAssessmentConfigAdmin(): Promise<AssessmentConfig> {
  const res = await apiClient.get<AssessmentConfig>('/api/admin/assessment-config');
  return res.data;
}

export async function updateAssessmentConfigAdmin(payload: AssessmentConfig): Promise<AssessmentConfig> {
  const res = await apiClient.put<AssessmentConfig>('/api/admin/assessment-config', payload);
  return res.data;
}
