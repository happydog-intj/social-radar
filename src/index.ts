import { format } from 'date-fns';
import { collectTweets } from './collectors/twitter.js';
import { analyzeBatch } from './analyzers/qwen.js';
import { generateMarkdownReport } from './generators/markdown.js';
import { LANGUAGE } from './config.js';

async function main() {
  console.error('🔭 Social Radar - Starting Twitter analysis...');

  const today = format(new Date(), 'yyyy-MM-dd');

  try {
    // Step 1: Collect tweets
    console.error('📊 Collecting tweets from monitored accounts...');
    const tweets = await collectTweets();
    console.error(`  ✓ Collected ${tweets.length} tweets`);

    if (tweets.length === 0) {
      console.error('No tweets found. Exiting.');
      return;
    }

    // Step 2: Analyze with Qwen
    console.error('🧠 Analyzing tweets with Qwen...');
    const analyzed = await analyzeBatch(tweets);
    console.error(`  ✓ Analyzed ${analyzed.length} tweets`);

    // Calculate stats
    const sheinRelated = analyzed.filter((t) => t.sheinRelevance.isRelevant);
    const sentiment = {
      positive: analyzed.filter((t) => t.sentiment.sentiment === 'positive').length,
      negative: analyzed.filter((t) => t.sentiment.sentiment === 'negative').length,
      neutral: analyzed.filter((t) => t.sentiment.sentiment === 'neutral').length,
    };

    console.error('');
    console.error('📈 Analysis Results:');
    console.error(`  Total tweets: ${analyzed.length}`);
    console.error(`  SHEIN related: ${sheinRelated.length} (${((sheinRelated.length / analyzed.length) * 100).toFixed(1)}%)`);
    console.error(`  Sentiment: ${sentiment.positive} positive, ${sentiment.neutral} neutral, ${sentiment.negative} negative`);
    console.error('');

    // Step 3: Generate report (output to stdout)
    console.error('📝 Generating report...');
    const language = LANGUAGE === 'both' ? 'en' : LANGUAGE;
    const markdown = generateMarkdownReport(today, language, analyzed);

    // Output markdown to stdout (will be captured by workflow)
    console.log(markdown);

    // Output stats as JSON to stderr for Telegram notification
    console.error('');
    console.error('STATS_JSON_START');
    console.error(JSON.stringify({
      date: today,
      total: analyzed.length,
      sheinRelated: sheinRelated.length,
      sheinPercent: ((sheinRelated.length / analyzed.length) * 100).toFixed(1),
      positive: sentiment.positive,
      neutral: sentiment.neutral,
      negative: sentiment.negative,
    }));
    console.error('STATS_JSON_END');

    console.error('');
    console.error('✅ Analysis complete!');
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

main();
