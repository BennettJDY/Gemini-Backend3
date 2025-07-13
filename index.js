import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

app.post('/v1/chat/completions', async (req, res) => {
  const { messages } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const streamMessage = {
    role: 'assistant',
    content: ''
  };

  const encoder = new TextEncoder();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: messages[messages.length - 1].content }]
            }
          ]
        })
      }
    );

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    for (const char of content) {
      streamMessage.content += char;
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: char } }] })}\n\n`);
      await new Promise((r) => setTimeout(r, 5)); // simulate streaming
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: 'Something went wrong.' })}\n\n`);
    res.end();
  }
});

app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});
app.post('/meals', async (req, res) => {
  const { people = 2, preferences = 'general' } = req.body;

  const geminiRequest = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Suggest 5 meal ideas for ${people} people who prefer ${preferences}. Respond in a short bullet list.`
          }
        ]
      }
    ]
  };

  try {
    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiRequest)
      }
    );

    const geminiData = await geminiRes.json();
    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No meals found.';

    res.json({ meals: reply });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Error fetching meals from Gemini' });
  }
});
