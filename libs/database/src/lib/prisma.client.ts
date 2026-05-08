import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import sql from 'mssql';

function parseMssqlConfig(url: string): sql.config {
  const withoutScheme = url.replace(/^sqlserver:\/\//, '');
  const parts = withoutScheme.split(';');
  const [host, portStr] = parts[0].split(':');
  const params: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const eqIdx = part.indexOf('=');
    if (eqIdx !== -1) {
      params[part.slice(0, eqIdx).toLowerCase()] = part.slice(eqIdx + 1);
    }
  }
  return {
    server: host,
    port: portStr ? parseInt(portStr, 10) : 1433,
    database: params['database'],
    user: params['user'],
    password: params['password'],
    options: {
      encrypt: params['encrypt'] !== 'false',
      trustServerCertificate: params['trustservercertificate'] === 'true',
    },
  };
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL || '';
  const logOpt: ('query' | 'error' | 'warn')[] =
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'];
  const adapter = new PrismaMssql(parseMssqlConfig(url));
  return new PrismaClient({ adapter, log: logOpt });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
