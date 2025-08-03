// 📁 netlify/functions/GetPosts.js
const Parser = require('rss-parser');
const { OpenAI } = require('openai');
require('dotenv').config();

const parser = new Parser();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async () => {
  const { Octokit } = await import('@octokit/rest');
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, repo] = process.env.GITHUB_REPO.split('/');
  const filePath = process.env.GITHUB_FILE_PATH;

  console.log('🧪 TESTING ENV VARS');
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
    console.log('🆕 New items found:', newItems.length);

    for (const item of newItems) {
      console.log('🔄 Processing item:', item.title);
      let commentary = '🛸 JM Bot is recalibrating...';

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

      try {
        existingData.unshift({
          title: item.title,
          link: item.link,
          comment: commentary,
          timestamp: new Date().toISOString()
        });
      } catch (pushError) {
        console.error('❌ Failed to push item to existingData:', pushError.message);
      }
    }

    const contentToWrite = existingData.slice(0, 50);
    const jsonContent = JSON.stringify(contentToWrite, null, 2);
    console.log('📦 Content to write:\n', jsonContent);

    try {
      console.log('🛰 Attempting to update GitHub file...');
      const result = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: 'Automated update: RSS + AI commentary',
        content: Buffer.from(jsonContent).toString('base64'),
        sha,
        branch: 'main'
      });

      console.log('✅ GitHub file updated:', result.status);
    } catch (err) {
      console.error('❌ GitHub file update failed:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'GitHub update failed', detail: err.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(contentToWrite)
    };

  } catch (error) {
    console.error('🔥 General Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
