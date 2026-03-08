import { TwitterApi } from 'twitter-api-v2';
import { TWITTER_BEARER_TOKEN, loadConfig } from '../config.js';
import type { Tweet, TwitterAccount } from '../types.js';

const client = new TwitterApi(TWITTER_BEARER_TOKEN);
const readOnlyClient = client.readOnly;

export async function collectTweets(): Promise<Tweet[]> {
  const config = loadConfig();
  const tweets: Tweet[] = [];

  if (!TWITTER_BEARER_TOKEN) {
    console.error('TWITTER_BEARER_TOKEN not set');
    return tweets;
  }

  // Calculate date range
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - config.twitter.sinceDays);
  const startTime = sinceDate.toISOString();

  for (const account of config.twitter.accounts) {
    try {
      console.log(`Fetching tweets from @${account.username}...`);

      // Get user by username
      const user = await readOnlyClient.v2.userByUsername(account.username);

      if (!user.data) {
        console.warn(`User @${account.username} not found`);
        continue;
      }

      // Fetch user's tweets
      const timeline = await readOnlyClient.v2.userTimeline(user.data.id, {
        max_results: Math.min(config.twitter.maxTweetsPerAccount, 100),
        start_time: startTime,
        'tweet.fields': [
          'created_at',
          'public_metrics',
          'entities',
          'referenced_tweets',
          'author_id',
        ],
        expansions: ['author_id'],
      });

      for (const tweet of timeline.data.data || []) {
        tweets.push({
          id: tweet.id,
          text: tweet.text,
          authorId: tweet.author_id || user.data.id,
          authorUsername: account.username,
          createdAt: tweet.created_at || new Date().toISOString(),
          metrics: tweet.public_metrics
            ? {
                likeCount: tweet.public_metrics.like_count,
                retweetCount: tweet.public_metrics.retweet_count,
                replyCount: tweet.public_metrics.reply_count,
                impressionCount: tweet.public_metrics.impression_count,
              }
            : undefined,
          entities: tweet.entities
            ? {
                hashtags: tweet.entities.hashtags?.map((h) => h.tag),
                mentions: tweet.entities.mentions?.map((m) => m.username),
                urls: tweet.entities.urls?.map((u) => u.expanded_url),
              }
            : undefined,
          referencedTweets: tweet.referenced_tweets as any,
        });
      }

      console.log(`  ✓ Fetched ${timeline.data.data?.length || 0} tweets`);

      // Rate limiting - wait 1 second between requests
      await sleep(1000);
    } catch (error) {
      console.error(`Failed to fetch tweets from @${account.username}:`, error);
    }
  }

  return tweets;
}

export async function getUserInfo(username: string): Promise<TwitterAccount | null> {
  try {
    const user = await readOnlyClient.v2.userByUsername(username, {
      'user.fields': ['description', 'public_metrics'],
    });

    if (!user.data) return null;

    return {
      username: user.data.username,
      userId: user.data.id,
      priority: 'medium',
      description: user.data.description,
    };
  } catch (error) {
    console.error(`Failed to get info for @${username}:`, error);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
