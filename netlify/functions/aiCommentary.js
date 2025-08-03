const fetch = require('node-fetch');

exports.handler = async function(event) {
  try {
    const { text } = JSON.parse(event.body || '{}');

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ comment: 'No input text provided.' }),
      };
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: "You're JM Bot, a witty alien AI monitoring the latest mentions of the $JM token. Respond with brief, playful, and sometimes cryptic commentary in less than 30 words."
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.8,
        max_tokens: 60
      })
    });

    const data = await response.json();

    const comment = data.choices?.[0]?.message?.content?.trim() || '🛸 JM Bot is recalibrating...';

    return {
      statusCode: 200,
      body: JSON.stringify({ comment })
    };

  } catch (err) {
    console.error('AI Function Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ comment: '🛸 JM Bot crashed into Saturn. Try again later.' })
    };
  }
};
