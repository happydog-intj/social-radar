import { format } from 'date-fns';
import { collectTweets } from './collectors/twitter.js';
import { analyzeBatch } from './analyzers/qwen.js';
import { generateMarkdownReport, saveReport } from './generators/markdown.js';
import { generateRSSFeed } from './generators/rss.js';
import { sendTelegramNotification, formatTelegramMessage } from './notifiers/telegram.js';
import { LANGUAGE } from './config.js';

async function main() {
  console.log('🔭 Social Radar - Starting Twitter analysis...');

  const today = format(new Date(), 'yyyy-MM-dd');

  try {
    // Step 1: Collect tweets
    console.log('📊 Collecting tweets from monitored accounts...');
    const tweets = await collectTweets();
    console.log(`  ✓ Collected ${tweets.length} tweets`);

    if (tweets.length === 0) {
      console.log('No tweets found. Exiting.');
      return;
    }

    // Step 2: Analyze with Qwen
    console.log('🧠 Analyzing tweets with Qwen...');
    const analyzed = await analyzeBatch(tweets);
    console.log(`  ✓ Analyzed ${analyzed.length} tweets`);

    // Calculate stats
    const sheinRelated = analyzed.filter((t) => t.sheinRelevance.isRelevant);
    const sentiment = {
      positive: analyzed.filter((t) => t.sentiment.sentiment === 'positive').length,
      negative: analyzed.filter((t) => t.sentiment.sentiment === 'negative').length,
      neutral: analyzed.filter((t) => t.sentiment.sentiment === 'neutral').length,
    };

    console.log('');
    console.log('📈 Analysis Results:');
    console.log(`  Total tweets: ${analyzed.length}`);
    console.log(`  SHEIN related: ${sheinRelated.length} (${((sheinRelated.length / analyzed.length) * 100).toFixed(1)}%)`);
    console.log(`  Sentiment: ${sentiment.positive} positive, ${sentiment.neutral} neutral, ${sentiment.negative} negative`);
    console.log('');

    // Step 3: Generate reports
    console.log('📝 Generating reports...');
    const languages = LANGUAGE === 'both' ? ['en', 'zh'] : [LANGUAGE];

    for (const lang of languages as Array<'en' | 'zh'>) {
      const markdown = generateMarkdownReport(today, lang, analyzed);
      saveReport(markdown, today, lang);
    }

    // Step 4: Generate RSS feed
    console.log('📡 Generating RSS feed...');
    generateRSSFeed();

    // Step 5: Send notifications
    if (sheinRelated.length > 0) {
      console.log('📬 Sending notifications...');
      const telegramMessage = formatTelegramMessage(analyzed.length, sheinRelated);
      await sendTelegramNotification(telegramMessage);
    }

    console.log('');
    console.log('✅ Analysis complete!');
    console.log(`   Date: ${today}`);
    console.log(`   Total tweets: ${analyzed.length}`);
    console.log(`   SHEIN related: ${sheinRelated.length}`);
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

main();
