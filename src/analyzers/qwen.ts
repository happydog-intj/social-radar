import axios from 'axios';
import { QWEN_API_KEY, loadConfig } from '../config.js';
import type { Tweet, SentimentAnalysis, SheinRelevance, AnalyzedTweet } from '../types.js';

const QWEN_API_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

export async function analyzeTweetWithQwen(tweet: Tweet): Promise<AnalyzedTweet> {
  const sentiment = await analyzeSentiment(tweet.text);
  const sheinRelevance = await analyzeSheinRelevance(tweet.text);

  return {
    ...tweet,
    sentiment,
    sheinRelevance,
    analyzedAt: new Date().toISOString(),
  };
}

async function analyzeSentiment(text: string): Promise<SentimentAnalysis> {
  if (!QWEN_API_KEY) {
    console.warn('QWEN_API_KEY not set, skipping sentiment analysis');
    return {
      sentiment: 'neutral',
      score: 0,
      confidence: 0,
      summary: 'Analysis unavailable',
    };
  }

  try {
    const config = loadConfig();

    const prompt = `请分析以下推文的情感倾向。返回JSON格式：
{
  "sentiment": "positive/negative/neutral",
  "score": -1到1之间的数值（-1最负面，1最正面，0中性）,
  "confidence": 0到1之间的置信度,
  "summary": "简短的情感分析摘要（1-2句话）"
}

推文内容：
${text}

只返回JSON，不要其他内容。`;

    const response = await axios.post(
      QWEN_API_ENDPOINT,
      {
        model: config.qwen.model,
        input: {
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        parameters: {
          result_format: 'message',
          temperature: 0.3,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.output?.choices?.[0]?.message?.content || '{}';

    // Extract JSON from response (handle code blocks)
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1].split('```')[0].trim();
    }

    const result = JSON.parse(jsonStr);

    return {
      sentiment: result.sentiment || 'neutral',
      score: result.score || 0,
      confidence: result.confidence || 0.5,
      summary: result.summary || 'No summary available',
    };
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    return {
      sentiment: 'neutral',
      score: 0,
      confidence: 0,
      summary: 'Analysis failed',
    };
  }
}

async function analyzeSheinRelevance(text: string): Promise<SheinRelevance> {
  if (!QWEN_API_KEY) {
    console.warn('QWEN_API_KEY not set, using keyword matching');
    return simpleSheinCheck(text);
  }

  try {
    const config = loadConfig();

    const prompt = `请分析以下推文是否与SHEIN（希音）品牌相关。考虑以下因素：
- 是否直接提到SHEIN或相关品牌
- 是否讨论与SHEIN相关的话题（快时尚、在线购物等）
- 是否使用SHEIN相关的话题标签

返回JSON格式：
{
  "isRelevant": true/false,
  "confidence": 0到1之间的置信度,
  "reason": "判断原因（1-2句话）",
  "keywords": ["识别到的关键词列表"]
}

SHEIN相关关键词包括：${config.shein.keywords.join(', ')}
SHEIN品牌：${config.shein.brands.join(', ')}
相关术语：${config.shein.relatedTerms.join(', ')}

推文内容：
${text}

只返回JSON，不要其他内容。`;

    const response = await axios.post(
      QWEN_API_ENDPOINT,
      {
        model: config.qwen.model,
        input: {
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        parameters: {
          result_format: 'message',
          temperature: 0.3,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.output?.choices?.[0]?.message?.content || '{}';

    // Extract JSON from response
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1].split('```')[0].trim();
    }

    const result = JSON.parse(jsonStr);

    return {
      isRelevant: result.isRelevant || false,
      confidence: result.confidence || 0.5,
      reason: result.reason || 'No reason provided',
      keywords: result.keywords || [],
    };
  } catch (error) {
    console.error('SHEIN relevance analysis failed:', error);
    return simpleSheinCheck(text);
  }
}

function simpleSheinCheck(text: string): SheinRelevance {
  const config = loadConfig();
  const lowerText = text.toLowerCase();

  const foundKeywords: string[] = [];

  // Check keywords
  for (const keyword of config.shein.keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }

  // Check brands
  for (const brand of config.shein.brands) {
    if (lowerText.includes(brand.toLowerCase())) {
      foundKeywords.push(brand);
    }
  }

  const isRelevant = foundKeywords.length > 0;

  return {
    isRelevant,
    confidence: isRelevant ? 0.7 : 0.3,
    reason: isRelevant
      ? `Found keywords: ${foundKeywords.join(', ')}`
      : 'No SHEIN-related keywords found',
    keywords: foundKeywords,
  };
}

export async function analyzeBatch(tweets: Tweet[]): Promise<AnalyzedTweet[]> {
  const results: AnalyzedTweet[] = [];

  for (let i = 0; i < tweets.length; i++) {
    console.error(`Analyzing tweet ${i + 1}/${tweets.length}...`);

    try {
      const analyzed = await analyzeTweetWithQwen(tweets[i]);
      results.push(analyzed);

      // Rate limiting - wait 500ms between requests
      if (i < tweets.length - 1) {
        await sleep(500);
      }
    } catch (error) {
      console.error(`Failed to analyze tweet ${tweets[i].id}:`, error);
      // Add with default analysis
      results.push({
        ...tweets[i],
        sentiment: {
          sentiment: 'neutral',
          score: 0,
          confidence: 0,
          summary: 'Analysis failed',
        },
        sheinRelevance: {
          isRelevant: false,
          confidence: 0,
          reason: 'Analysis failed',
          keywords: [],
        },
        analyzedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
