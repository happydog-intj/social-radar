// Type definitions for Twitter Radar

export interface TwitterAccount {
  username: string;
  userId?: string;
  priority: 'high' | 'medium' | 'low';
  description?: string;
}

export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  createdAt: string;
  metrics?: {
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    impressionCount?: number;
  };
  entities?: {
    hashtags?: string[];
    mentions?: string[];
    urls?: string[];
  };
  referencedTweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // -1 到 1
  confidence: number; // 0 到 1
  summary: string;
}

export interface SheinRelevance {
  isRelevant: boolean;
  confidence: number; // 0 到 1
  reason: string;
  keywords: string[];
}

export interface AnalyzedTweet extends Tweet {
  sentiment: SentimentAnalysis;
  sheinRelevance: SheinRelevance;
  analyzedAt: string;
}

export interface DigestSection {
  title: string;
  tweets: AnalyzedTweet[];
}

export interface Digest {
  date: string;
  summary: {
    totalTweets: number;
    sheinRelated: number;
    sentimentBreakdown: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  sections: DigestSection[];
  language: 'en' | 'zh';
}

export interface Config {
  twitter: {
    accounts: TwitterAccount[];
    maxTweetsPerAccount: number;
    sinceDays: number;
  };
  qwen: {
    model: string;
    apiKey: string;
    endpoint?: string;
  };
  shein: {
    keywords: string[];
    brands: string[];
    relatedTerms: string[];
  };
  output: {
    formats: string[];
    createIssues: boolean;
  };
  notifications: {
    telegram?: {
      enabled: boolean;
      botToken?: string;
      chatId?: string;
    };
  };
}
