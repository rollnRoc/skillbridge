import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AppError } from '../middleware/error.middleware.js';

export interface AssessmentConfig {
  level1Min: number;
  level2Min: number;
  level3Min: number;
  level4Min: number;
}

export const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = {
  level1Min: 80,
  level2Min: 70,
  level3Min: 60,
  level4Min: 50,
};

const CONFIG_PATH = path.resolve(process.cwd(), 'apps', 'api', 'src', 'config', 'assessment-config.json');

function validateConfig(config: AssessmentConfig) {
  const values = [config.level1Min, config.level2Min, config.level3Min, config.level4Min];
  const allNumbers = values.every((v) => Number.isFinite(v));
  if (!allNumbers) throw new AppError(400, 'Tüm eşikler sayısal olmalıdır');

  if (values.some((v) => v < 0 || v > 100)) {
    throw new AppError(400, 'Eşik değerleri 0-100 aralığında olmalıdır');
  }

  if (!(config.level1Min > config.level2Min && config.level2Min > config.level3Min && config.level3Min > config.level4Min)) {
    throw new AppError(400, 'Eşik sıralaması level1 > level2 > level3 > level4 olmalıdır');
  }
}

async function ensureConfigFile() {
  try {
    await fs.access(CONFIG_PATH);
  } catch {
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_ASSESSMENT_CONFIG, null, 2), 'utf-8');
  }
}

export async function getAssessmentConfig(): Promise<AssessmentConfig> {
  await ensureConfigFile();
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as AssessmentConfig;
    validateConfig(parsed);
    return parsed;
  } catch {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_ASSESSMENT_CONFIG, null, 2), 'utf-8');
    return DEFAULT_ASSESSMENT_CONFIG;
  }
}

export async function saveAssessmentConfig(config: AssessmentConfig): Promise<AssessmentConfig> {
  validateConfig(config);
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  return config;
}
