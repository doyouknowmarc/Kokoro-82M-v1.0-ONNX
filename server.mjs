import express from 'express';
import { KokoroTTS } from 'kokoro-js';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

const MODEL_ID = 'onnx-community/Kokoro-82M-ONNX';
let ttsPromise = null;
async function getModel() {
  if (!ttsPromise) {
    ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, { dtype: 'q8' });
  }
  return ttsPromise;
}

app.post('/api/generate', async (req, res) => {
  const { text, voice = 'am_adam' } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }
  try {
    const tts = await getModel();
    const audio = await tts.generate(text, { voice });
    const outPath = path.join(process.cwd(), 'audio.wav');
    await audio.save(outPath);
    res.download(outPath, 'speech.wav');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});

app.use(express.static('ui'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
