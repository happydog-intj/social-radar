import 'dotenv/config';
import { format } from 'date-fns';
import { collectGooglePlayReviews, getGooglePlayAppInfo } from './collectors/google-play.js';
import { analyzeBatch } from './analyzers/google-play.js';
import { generateGooglePlayReport } from './generators/google-play-markdown.js';
import type { GooglePlayConfig } from './types.js';

// Google Play configuration
const GOOGLE_PLAY_CONFIG: GooglePlayConfig = {
  appId: 'com.zzkko', // SHEIN app package ID
  regions: [
    { code: 'us', name: 'United States', language: 'en' },
    { code: 'gb', name: 'United Kingdom', language: 'en' },
    { code: 'in', name: 'India', language: 'en' },
    { code: 'br', name: 'Brazil', language: 'pt' },
    { code: 'mx', name: 'Mexico', language: 'es' },
  ],
  reviewsPerRegion: 100,
};

async function main() {
  console.error('🚀 Starting SHEIN Google Play Analysis...\n');

  const today = format(new Date(), 'yyyy-MM-dd');

  try {
    // Step 1: Get app info
    console.error('📱 Fetching app information...');
    const appInfo = await getGooglePlayAppInfo(GOOGLE_PLAY_CONFIG.appId);
    console.error(`✅ App: ${appInfo.name}`);
    console.error(`   Rating: ${appInfo.averageRating}/5.0`);
    console.error(`   Total Ratings: ${appInfo.totalRatings.toLocaleString()}`);
    console.error(`   Total Reviews: ${appInfo.totalReviews.toLocaleString()}`);
    console.error(`   Installs: ${appInfo.installs}\n`);

    // Step 2: Collect reviews
    const reviews = await collectGooglePlayReviews(GOOGLE_PLAY_CONFIG);

    if (reviews.length === 0) {
      console.error('❌ No reviews collected. Exiting.');
      return;
    }

    // Step 3: Analyze with Qwen AI
    const analyzed = await analyzeBatch(reviews);

    // Calculate stats
    const positive = analyzed.filter((r) => r.sentiment.sentiment === 'positive').length;
    const neutral = analyzed.filter((r) => r.sentiment.sentiment === 'neutral').length;
    const negative = analyzed.filter((r) => r.sentiment.sentiment === 'negative').length;
    const developerReplies = analyzed.filter((r) => r.replyText).length;

    // Step 4: Generate report (output to stdout)
    console.error('📝 Generating report...\n');
    const report = generateGooglePlayReport(analyzed, today, 'en', appInfo);

    // Output markdown to stdout (will be captured by workflow)
    console.log(report);

    // Output stats as JSON to stderr for Telegram notification
    console.error('\nSTATS_JSON_START');
    console.error(JSON.stringify({
      date: today,
      total: analyzed.length,
      positive,
      neutral,
      negative,
      developerReplies,
      positivePercent: ((positive / analyzed.length) * 100).toFixed(1),
      neutralPercent: ((neutral / analyzed.length) * 100).toFixed(1),
      negativePercent: ((negative / analyzed.length) * 100).toFixed(1),
    }));
    console.error('STATS_JSON_END');

    console.error('\n✅ Google Play analysis complete!');
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

main();
