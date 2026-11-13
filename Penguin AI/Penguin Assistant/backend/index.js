import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { OpenAI } from 'openai';

const app = express();
const PORT = 4000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Penguin API running ✅');
});

app.get('/get-steps', (req, res) => {
  const pkg = req.query.package?.toLowerCase();
  const stepsMap = {
    'gcc-pass1': [
      'tar -xf gcc-14.2.0.tar.xz',
      'cd gcc-14.2.0',
      'mkdir -v build && cd build',
      '../configure --target=$LFS_TGT --prefix=/tools ...'
    ]
    // add more packages later
  };
  if (stepsMap[pkg]) return res.json({ steps: stepsMap[pkg] });
  res.json({ steps: ['Package not supported yet.'] });
});

app.post('/analyze-error', async (req, res) => {
  const { error } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-3.5-turbo"
      messages: [
        {
          role: "system",
          content: "You are a Linux From Scratch expert helping to debug errors."
        },
        {
          role: "user",
          content: `Here is an error:\n${error}\n\nPlease suggest a fix.`
        }
      ]
    });

    const reply = response.choices[0].message.content;
    res.json({ fix: reply });
  } catch (err) {
    console.error('❌ AI Error:', err.message);
    res.json({ fix: 'AI analysis failed. Try again later.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
