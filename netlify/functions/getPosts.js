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

  try {
    const feed = await parser.parseURL(process.env.RSS_FEED_URL);
    const recentItems = feed.items.slice(0, 10);

    let existingData = [];
    let sha;

    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
      existingData = JSON.parse(Buffer.from(data.content, 'base64').toString());
      sha = data.sha;
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    const existingLinks = new Set(existingData.map(p => p.link));
    const newItems = recentItems.filter(item => !existingLinks.has(item.link));

    console.log('New items to add:', newItems.length);

    for (const item of newItems) {
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

      const commentary = response.choices?.[0]?.message?.content?.trim() || '🛸 JM Bot is recalibrating...';

      existingData.unshift({
        title: item.title,
        link: item.link,
        comment: commentary,
        timestamp: new Date().toISOString()
      });
    }

    existingData = existingData.slice(0, 50);

    const updateResponse = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: 'Automated update: RSS + AI commentary',
      content: Buffer.from(JSON.stringify(existingData, null, 2)).toString('base64'),
      sha,
      branch: 'main'
    });

    console.log('GitHub update response:', updateResponse.status);

    return {
      statusCode: 200,
      body: JSON.stringify(existingData)
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
