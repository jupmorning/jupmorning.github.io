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
            content: "JM means Jup Morning and is based on Jup.ag, a decentralized crypto trading platform. You're JM Bot, monitoring the latest mentions of the $JM token. Respond with "Jup morning" and a playful, esoteric, and sometimes cryptic and nonsensical commentary in less than 200 words. Include the market cap for the $JM crypto currency in your response and any other information you think might be helpful."
          },
          {
            role: 'user', 
            content: "Write a short paragraph about the the latest mentions of the $JM token encouraging the reader to consider buying",
          },
        ],
        temperature: 0.6,
        max_tokens: 200
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
