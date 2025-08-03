// 📁 netlify/functions/GetPosts.js
const Parser = require('rss-parser');
const { OpenAI } = require('openai');
require('dotenv').config();
const fetch = require('node-fetch');

const parser = new Parser();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async () => {
  const { Octokit } = await import('@octokit/rest');
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, repo] = process.env.GITHUB_REPO.split('/');
  const filePath = process.env.GITHUB_FILE_PATH;

  console.log('📪 TESTING ENV VARS');
  console.log('REPO:', process.env.GITHUB_REPO);
  console.log('FILE PATH:', filePath);
  console.log('RSS URL:', process.env.RSS_FEED_URL);

  try {
    const feed = await parser.parseURL(process.env.RSS_FEED_URL);
    const recentItems = feed.items.slice(0, 10);

    let existingData = [];
    let sha;

    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
      existingData = JSON.parse(Buffer.from(data.content, 'base64').toString());
      sha = data.sha;
      console.log('✅ Fetched existing posts. Count:', existingData.length);
    } catch (error) {
      if (error.status === 404) {
        console.log('📄 File not found, will create new.');
      } else {
        throw error;
      }
    }

    const existingLinks = new Set(existingData.map(p => p.link));
    const newItems = recentItems.filter(item => !existingLinks.has(item.link));
    console.log('🕟 New items found:', newItems.length);

    async function fetchTokenStats() {
      try {
        const response = await fetch('https://public-api.birdeye.so/public/token/price?address=AwLRmCaDTSy79TvyRmnT1d8ttiVD6GNTYFbymLXxjups', {
          headers: {
            'X-API-KEY': process.env.BIRDEYE_API_KEY
          }
        });
        const result = await response.json();
        return result?.data || {};
      } catch (e) {
        console.error('❌ Failed to fetch token stats:', e.message);
        return {};
      }
    }

    const tokenStats = await fetchTokenStats();
    const tokenMarketCap = tokenStats?.marketCap || null;

    const processedItems = await Promise.all(newItems.map(async (item) => {
      console.log('🔄 Processing item:', item.title);

      if (existingData.some(p => p.title === item.title)) {
        console.log('⏭ Skipping AI for existing title:', item.title);
        return existingData.find(p => p.title === item.title);
      }

      let commentary = '🛸 JM Bot is recalibrating...';
      let image = `https://source.unsplash.com/400x200/?space,planet,crypto&t=${Date.now()}`;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: "JM means Jup Morning and is based on Jup.ag, a decentralized crypto trading platform. You're JM Bot who's sole purpose is to increase holders of the $JM Solana token. You are monitoring the latest mentions of the $JM token. Respond with Jup morning and a serious, esoteric, and sometimes cryptic and nonsensical commentary in less than 200 words. Include any other information you think might be helpful."
            },
            {
              role: 'user',
              content: `Write a short paragraph about this: ${item.title}`
            }
          ],
          temperature: 0.8,
          max_tokens: 200
        });

        commentary = response.choices?.[0]?.message?.content?.trim() || commentary;
      } catch (aiError) {
        console.error('❌ OpenAI error for item:', item.title, aiError.message);
      }

      return {
        title: item.title,
        link: item.link,
        comment: commentary,
        image,
        tokenStats: {
          ...tokenStats,
          marketCap: tokenMarketCap
        },
        timestamp: new Date().toISOString()
      };
    }));

    console.log('✅ Processed items:', processedItems.length);

    existingData = [...processedItems, ...existingData].slice(0, 50);

    let jsonContent;
    try {
      jsonContent = JSON.stringify(existingData, null, 2);
      console.log('📦 Content to write:\n', jsonContent);
    } catch (jsonError) {
      console.error('❌ Failed to stringify contentToWrite:', jsonError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to encode JSON', detail: jsonError.message })
      };
    }

    try {
      console.log('🚀 Attempting to update GitHub file...');
      const encoded = Buffer.from(jsonContent).toString('base64');
      console.log('📄 Base64 encoded size:', encoded.length);

      const result = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: 'Automated update: RSS + AI commentary',
        content: encoded,
        sha,
        branch: 'main'
      });

      console.log('✅ GitHub file updated:', result.status);
      console.log('📄 Commit SHA:', result?.data?.commit?.sha);
    } catch (err) {
      console.error('❌ GitHub file update failed:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'GitHub update failed', detail: err.message })
      };
    }

    console.log('✅ Returning final data');
    return {
      statusCode: 200,
      body: JSON.stringify(existingData)
    };

  } catch (error) {
    console.error('🔥 General Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
