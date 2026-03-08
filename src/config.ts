import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { join } from 'path';
import type { Config } from './types.js';

config();

export const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';
export const QWEN_API_KEY = process.env.QWEN_API_KEY || '';
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
export const LANGUAGE = (process.env.LANGUAGE || 'both') as 'en' | 'zh' | 'both';

export function loadConfig(): Config {
  const configPath = join(process.cwd(), 'config', 'config.yml');
  const content = readFileSync(configPath, 'utf8');
  return load(content) as Config;
}

export const OUTPUT_DIR = join(process.cwd(), 'reports');
export const PUBLIC_DIR = join(process.cwd(), 'public');
