// netlify/functions/savePost.js
const fs = require('fs');
const FILE_PATH = '/tmp/sharedPosts.json';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const newPost = JSON.parse(event.body);
    let posts = [];

    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf-8');
      posts = JSON.parse(data);
    }

    posts.unshift(newPost); // add newest post to top
    fs.writeFileSync(FILE_PATH, JSON.stringify(posts.slice(0, 50)));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Post saved' })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save post' })
    };
  }
};
