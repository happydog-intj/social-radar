import 'dotenv/config';
import { format } from 'date-fns';
import { collectAppStoreReviews, getAppInfo } from './collectors/app-store.js';
import { analyzeBatch } from './analyzers/app-store.js';
import { generateAppStoreReport } from './generators/app-store-markdown.js';
import { sendNegativeReviewsNotification } from './notifiers/telegram.js';
import type { AppStoreConfig } from './types.js';

// App Store configuration
const APP_STORE_CONFIG: AppStoreConfig = {
  appId: '878577184', // SHEIN app ID
  regions: [
    { code: 'us', name: 'United States', language: 'en' },
    { code: 'gb', name: 'United Kingdom', language: 'en' },
    { code: 'ca', name: 'Canada', language: 'en' },
    { code: 'au', name: 'Australia', language: 'en' },
  ],
  maxReviewsPerRegion: 50,
};

async function main() {
  console.error('🚀 Starting SHEIN App Store Analysis...\n');

  const today = format(new Date(), 'yyyy-MM-dd');

  try {
    // Step 1: Get app info
    console.error('📱 Fetching app information...');
    const appInfo = await getAppInfo(APP_STORE_CONFIG.appId);
    console.error(`✅ App: ${appInfo.name}`);
    console.error(`   Rating: ${appInfo.averageRating}/5.0`);
    console.error(`   Total Reviews: ${appInfo.totalReviews.toLocaleString()}\n`);

    // Step 2: Collect reviews
    const reviews = await collectAppStoreReviews(APP_STORE_CONFIG);

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

    // Step 4: Generate report (output to stdout)
    console.error('📝 Generating report...\n');
    const report = generateAppStoreReport(analyzed, today, 'en', appInfo);

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
      positivePercent: ((positive / analyzed.length) * 100).toFixed(1),
      neutralPercent: ((neutral / analyzed.length) * 100).toFixed(1),
      negativePercent: ((negative / analyzed.length) * 100).toFixed(1),
    }));
    console.error('STATS_JSON_END');

    // Send detailed negative reviews to Telegram
    console.error('\n📤 Sending negative reviews to Telegram...');
    await sendNegativeReviewsNotification(analyzed, [], undefined);

    console.error('\n✅ App Store analysis complete!');
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

main();
