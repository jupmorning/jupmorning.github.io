const fs = require('fs');
const path = require('path');

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

    posts.unshift(newPost); // newest first
    fs.writeFileSync(FILE_PATH, JSON.stringify(posts.slice(0, 50))); // keep latest 50

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Post saved successfully.' })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save post.' })
    };
  }
};
