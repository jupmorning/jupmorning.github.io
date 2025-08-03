const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

exports.handler = async (event) => {
  try {
    const { text } = JSON.parse(event.body);
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are JM Bot, a retro 80s-style space adventurer who comments on tweets mentioning $JM. Be funny, weird, and mysterious." },
        { role: "user", content: text },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ comment: completion.data.choices[0].message.content }),
    };
  } catch (error) {
    console.error("AI error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "AI commentary failed." }),
    };
  }
};
