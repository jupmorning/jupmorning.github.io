const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  const searchQuery = encodeURIComponent(`"JM" OR "$JM" OR "#JM"`);
  const endpoint = `https://api.twitter.com/2/tweets/search/recent?query=${searchQuery}&max_results=10&tweet.fields=text,author_id&expansions=author_id&user.fields=username`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${bearerToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }

    const data = await response.json();

    const users = new Map();
    if (data.includes && data.includes.users) {
      data.includes.users.forEach(user => users.set(user.id, user.username));
    }

    const tweets = data.data.map(tweet => ({
      text: tweet.text,
      username: users.get(tweet.author_id) || 'unknown'
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ tweets })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
