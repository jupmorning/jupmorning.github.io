const Parser = require('rss-parser');
const { OpenAI } = require('openai');
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const parser = new Parser();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner, repo] = process.env.GITHUB_REPO.split('/');
const filePath = process.env.GITHUB_FILE_PATH;

exports.handler = async () => {
  try {
    // Fetch RSS feed
    const feed = await parser.parseURL(process.env.RSS_FEED_URL);
    const recentItems = feed.items.slice(0, 5);

    // Get existing posts from GitHub
    let existingData = [];
    let sha;

    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
      existingData = JSON.parse(Buffer.from(data.content, 'base64').toString());
      sha = data.sha;
    } catch (error) {
      if (error.status === 404) {
        existingData = [];
      } else {
        throw error;
      }
    }

    const existingLinks = new Set(existingData.map(p => p.link));
    const newItems = recentItems.filter(item => !existingLinks.has(item.link));

    for (const item of newItems) {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: `Provide a short, funny commentary about this: ${item.title}` }]
      });

      const commentary = response.choices[0].message.content.trim();

      existingData.unshift({
        title: item.title,
        link: item.link,
        comment: commentary,
        timestamp: new Date().toISOString()
      });
    }

    existingData = existingData.slice(0, 50);

    // Commit updated posts to GitHub
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: 'Automated update: RSS feed posts + AI commentary',
      content: Buffer.from(JSON.stringify(existingData, null, 2)).toString('base64'),
      sha
    });

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
