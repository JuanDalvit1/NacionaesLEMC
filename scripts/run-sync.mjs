/**
 * Carrega .env e .env.local antes de rodar o sync (garante GOOGLE_SHEETS_API_KEY quando só está em .env.local).
 * Execute na raiz do projeto: npm run sync
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

dotenv.config();
dotenv.config({ path: path.join(root, '.env.local'), override: true });

const { runSync } = await import('../server/sync-engine.ts');
const result = await runSync();
console.log(JSON.stringify(result, null, 2));
