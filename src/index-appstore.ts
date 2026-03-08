import 'dotenv/config';
import { format } from 'date-fns';
import { collectAppStoreReviews, getAppInfo } from './collectors/app-store.js';
import { analyzeBatch } from './analyzers/app-store.js';
import { generateAppStoreReport, saveAppStoreReport } from './generators/app-store-markdown.js';
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
  console.log('🚀 Starting SHEIN App Store Analysis...\n');

  const today = format(new Date(), 'yyyy-MM-dd');

  try {
    // Step 1: Get app info
    console.log('📱 Fetching app information...');
    const appInfo = await getAppInfo(APP_STORE_CONFIG.appId);
    console.log(`✅ App: ${appInfo.name}`);
    console.log(`   Rating: ${appInfo.averageRating}/5.0`);
    console.log(`   Total Reviews: ${appInfo.totalReviews.toLocaleString()}\n`);

    // Step 2: Collect reviews
    const reviews = await collectAppStoreReviews(APP_STORE_CONFIG);

    if (reviews.length === 0) {
      console.log('❌ No reviews collected. Exiting.');
      return;
    }

    // Step 3: Analyze with Qwen AI
    const analyzed = await analyzeBatch(reviews);

    // Step 4: Generate reports
    console.log('📝 Generating reports...\n');

    // English report
    const englishReport = generateAppStoreReport(analyzed, today, 'en', appInfo);
    saveAppStoreReport(englishReport, today, 'en');

    // Chinese report
    const chineseReport = generateAppStoreReport(analyzed, today, 'zh', appInfo);
    saveAppStoreReport(chineseReport, today, 'zh');

    // Step 5: Print summary
    console.log('\n📊 Analysis Summary:');
    console.log(`   Total Reviews: ${analyzed.length}`);
    console.log(
      `   Positive: ${analyzed.filter((r) => r.sentiment.sentiment === 'positive').length}`
    );
    console.log(
      `   Neutral: ${analyzed.filter((r) => r.sentiment.sentiment === 'neutral').length}`
    );
    console.log(
      `   Negative: ${analyzed.filter((r) => r.sentiment.sentiment === 'negative').length}`
    );

    // Count topics
    const topicCounts: { [topic: string]: number } = {};
    analyzed.forEach((review) => {
      review.topics.forEach((topic) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    console.log('\n🏷️  Top Topics:');
    Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([topic, count]) => {
        console.log(`   ${topic}: ${count}`);
      });

    console.log('\n✅ App Store analysis complete!');
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

main();
