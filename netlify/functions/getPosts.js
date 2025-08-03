const fs = require('fs');
const path = require('path');

const FILE_PATH = '/tmp/sharedPosts.json';

exports.handler = async function () {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf-8');
      return {
        statusCode: 200,
        body: data,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        }
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify([]),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        }
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to read shared posts.' })
    };
  }
};
