import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env files before importing app/routes so SDK clients get correct keys at module init time.
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(__dirname, '..', '..', '..', '.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createApp } = require('./app') as typeof import('./app');

// Warn about missing or placeholder env vars
const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET', 'ANTHROPIC_API_KEY'];
for (const v of REQUIRED_VARS) {
  const val = process.env[v];
  if (!val || val.endsWith('...') || val.startsWith('change-me')) {
    console.warn(`⚠️  [ENV] ${v} is not set or is a placeholder. Some features may fail.`);
  }
}

const port = process.env.PORT || 3001;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`SkillBridge API çalışıyor: http://localhost:${port}`);
});

server.on('error', console.error);
