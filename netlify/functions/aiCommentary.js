const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { tweet } = JSON.parse(event.body);

  const prompt = `Read the following tweet and provide a short, witty, space-themed comment in the voice of a cosmic AI assistant named JM Bot:\n\nTweet: "${tweet}"\n\nJM Bot:`;

  try {
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 60,
        temperature: 0.8
      })
    });

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.text?.trim() || "🛸 JM Bot is recalibrating...";

    return {
      statusCode: 200,
      body: JSON.stringify({ comment: aiResponse })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'AI request failed' })
    };
  }
};
