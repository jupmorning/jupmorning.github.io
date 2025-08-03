const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

exports.handler = async (event) => {
  try {
    if (!configuration.apiKey) {
      console.error("Missing OpenAI API Key.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OpenAI API Key." }),
      };
    }

    const { text } = JSON.parse(event.body || '{}');

    if (!text) {
      console.error("No text provided in request.");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing tweet text." }),
      };
    }

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are JM Bot, a weird, retro space explorer who gives witty and cosmic one-liner commentary on tweets that mention $JM. Always be a little mysterious.",
        },
        { role: "user", content: `Tweet: "${text}"` },
      ],
      temperature: 0.9,
      max_tokens: 60,
    });

    const comment = completion.data.choices[0].message.content.trim();

    return {
      statusCode: 200,
      body: JSON.stringify({ comment }),
    };
  } catch (error) {
    console.error("OpenAI API call failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "AI commentary failed.", details: error.message }),
    };
  }
};
