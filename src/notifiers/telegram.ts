import { Telegraf } from 'telegraf';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from '../config.js';
import { formatInTimeZone } from 'date-fns-tz';
import type { AnalyzedTweet, AnalyzedAppStoreReview, AnalyzedGooglePlayReview } from '../types.js';

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

export async function sendNegativeReviewsNotification(
  appStoreReviews: AnalyzedAppStoreReview[],
  googlePlayReviews: AnalyzedGooglePlayReview[],
  issueUrl?: string
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram notifications disabled (missing credentials)');
    return;
  }

  const negativeAppStore = appStoreReviews.filter((r) => r.sentiment.sentiment === 'negative');
  const negativeGooglePlay = googlePlayReviews.filter((r) => r.sentiment.sentiment === 'negative');

  if (negativeAppStore.length === 0 && negativeGooglePlay.length === 0) {
    console.log('No negative reviews to notify');
    return;
  }

  try {
    const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

    // Send summary message
    const summaryMessage = formatNegativeReviewsSummary(
      negativeAppStore.length,
      negativeGooglePlay.length,
      issueUrl
    );
    await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, summaryMessage, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });

    // Send detailed App Store negative reviews
    if (negativeAppStore.length > 0) {
      for (const review of negativeAppStore.slice(0, 10)) {
        const message = formatAppStoreNegativeReview(review);
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message, {
          parse_mode: 'Markdown',
          link_preview_options: { is_disabled: true },
        });
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Send detailed Google Play negative reviews
    if (negativeGooglePlay.length > 0) {
      for (const review of negativeGooglePlay.slice(0, 10)) {
        const message = formatGooglePlayNegativeReview(review);
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message, {
          parse_mode: 'Markdown',
          link_preview_options: { is_disabled: true },
        });
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log('✅ Sent negative reviews notifications to Telegram');
  } catch (error) {
    console.error('Failed to send negative reviews notifications:', error);
  }
}

function formatNegativeReviewsSummary(
  appStoreCount: number,
  googlePlayCount: number,
  issueUrl?: string
): string {
  const lines: string[] = [];

  lines.push('🚨 *NEGATIVE REVIEWS ALERT* 🚨');
  lines.push('');
  lines.push(`⚠️ *App Store*: ${appStoreCount} negative review(s)`);
  lines.push(`⚠️ *Google Play*: ${googlePlayCount} negative review(s)`);
  lines.push('');
  lines.push('📋 Detailed reviews follow below...');
  if (issueUrl) {
    lines.push('');
    lines.push(`[View Full Report →](${issueUrl})`);
  }

  return lines.join('\n');
}

function formatAppStoreNegativeReview(review: AnalyzedAppStoreReview): string {
  const lines: string[] = [];
  const beijingTime = formatInTimeZone(review.date, 'Asia/Shanghai', 'yyyy-MM-dd HH:mm:ss');

  lines.push('🍎 *App Store - Negative Review*');
  lines.push('');
  lines.push(`${'⭐'.repeat(review.rating)} *${escapeMarkdown(review.title)}*`);
  lines.push('');
  lines.push(`> ${escapeMarkdown(review.content.substring(0, 500))}${review.content.length > 500 ? '...' : ''}`);
  lines.push('');
  lines.push(`👤 User: ${escapeMarkdown(review.author)}`);
  lines.push(`🌍 Region: ${review.region}`);
  lines.push(`📅 Date: ${beijingTime} (北京时间)`);
  lines.push(`📱 Version: ${review.version}`);
  lines.push('');
  lines.push(`🔴 *AI Analysis*: ${escapeMarkdown(review.sentiment.summary)}`);
  if (review.topics.length > 0) {
    lines.push(`🏷️ Topics: ${review.topics.join(', ')}`);
  }

  return lines.join('\n');
}

function formatGooglePlayNegativeReview(review: AnalyzedGooglePlayReview): string {
  const lines: string[] = [];
  const beijingTime = formatInTimeZone(review.date, 'Asia/Shanghai', 'yyyy-MM-dd HH:mm:ss');

  lines.push('🤖 *Google Play - Negative Review*');
  lines.push('');
  lines.push(`${'⭐'.repeat(review.rating)} by ${escapeMarkdown(review.userName)}`);
  lines.push('');
  lines.push(`> ${escapeMarkdown(review.text.substring(0, 500))}${review.text.length > 500 ? '...' : ''}`);
  lines.push('');
  lines.push(`🌍 Region: ${review.region}`);
  lines.push(`📅 Date: ${beijingTime} (北京时间)`);
  lines.push(`📱 Version: ${review.version}`);
  lines.push(`👍 Thumbs up: ${review.thumbsUp}`);
  lines.push('');
  lines.push(`🔴 *AI Analysis*: ${escapeMarkdown(review.sentiment.summary)}`);
  if (review.topics.length > 0) {
    lines.push(`🏷️ Topics: ${review.topics.join(', ')}`);
  }

  if (review.replyText) {
    const replyTime = review.replyDate
      ? formatInTimeZone(review.replyDate, 'Asia/Shanghai', 'yyyy-MM-dd HH:mm:ss')
      : 'N/A';
    lines.push('');
    lines.push(`🏢 *Developer Reply* (${replyTime}):`);
    lines.push(`> ${escapeMarkdown(review.replyText.substring(0, 300))}${review.replyText.length > 300 ? '...' : ''}`);
  }

  return lines.join('\n');
}

function escapeMarkdown(text: string): string {
  // Escape special Markdown characters
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
