import { Telegraf } from 'telegraf';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from '../config.js';
import type { AnalyzedTweet } from '../types.js';

export async function sendTelegramNotification(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram notifications disabled (missing credentials)');
    return;
  }

  try {
    const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

    await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });

    console.log('✅ Sent Telegram notification');
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}

export function formatTelegramMessage(
  totalTweets: number,
  sheinRelated: AnalyzedTweet[]
): string {
  const lines: string[] = [];

  lines.push('🔭 *Social Radar Report*');
  lines.push('');
  lines.push(`📊 Total tweets analyzed: ${totalTweets}`);
  lines.push(`🎯 SHEIN related: ${sheinRelated.length}`);
  lines.push('');

  if (sheinRelated.length > 0) {
    lines.push('*Top SHEIN-related tweets:*');
    lines.push('');

    for (const tweet of sheinRelated.slice(0, 5)) {
      const emoji = {
        positive: '😊',
        negative: '😞',
        neutral: '😐',
      }[tweet.sentiment.sentiment];

      lines.push(`${emoji} @${tweet.authorUsername}`);
      lines.push(`${tweet.text.substring(0, 100)}...`);
      lines.push(`[View Tweet](https://twitter.com/${tweet.authorUsername}/status/${tweet.id})`);
      lines.push('');
    }
  }

  lines.push('[View Full Report →](https://YOUR_USERNAME.github.io/twitter-radar)');

  return lines.join('\n');
}
