import axios from 'axios';
import type { AppStoreReview, AppStoreConfig } from '../types.js';

export async function collectAppStoreReviews(
  config: AppStoreConfig
): Promise<AppStoreReview[]> {
  const reviews: AppStoreReview[] = [];

  for (const region of config.regions) {
    console.log(`📱 Fetching reviews from ${region.name} App Store...`);

    try {
      const url = `https://itunes.apple.com/${region.code}/rss/customerreviews/id=${config.appId}/sortby=mostrecent/json?l=${region.language}&cc=${region.code}`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      const entries = response.data?.feed?.entry || [];

      if (entries.length === 0) {
        console.log(`⚠️  No reviews found for ${region.name}`);
        continue;
      }

      for (const entry of entries) {
        reviews.push({
          id: entry.id.label,
          author: entry.author.name.label,
          rating: parseInt(entry['im:rating'].label),
          title: entry.title.label,
          content: entry.content.label,
          date: new Date(entry.updated.label),
          version: entry['im:version'].label,
          region: region.name,
          regionCode: region.code,
          voteSum: parseInt(entry['im:voteSum']?.label || '0'),
          voteCount: parseInt(entry['im:voteCount']?.label || '0'),
        });
      }

      console.log(`✅ Collected ${entries.length} reviews from ${region.name}`);

      // Rate limiting - wait 2 seconds between regions
      if (config.regions.indexOf(region) < config.regions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ Failed to fetch reviews from ${region.name}:`, error);
    }
  }

  console.log(`\n📊 Total reviews collected: ${reviews.length}`);
  return reviews;
}

export async function getAppInfo(appId: string): Promise<{
  name: string;
  averageRating: number;
  totalReviews: number;
  currentVersion: string;
}> {
  try {
    const url = `https://itunes.apple.com/lookup?id=${appId}`;
    const response = await axios.get(url);

    const app = response.data.results[0];

    return {
      name: app.trackName,
      averageRating: app.averageUserRating,
      totalReviews: app.userRatingCount,
      currentVersion: app.version,
    };
  } catch (error) {
    console.error('❌ Failed to fetch app info:', error);
    throw error;
  }
}
