import express from 'express';
import { KokoroTTS } from 'kokoro-js';
import path from 'path';
import fs from 'fs/promises';

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

app.get('/api/voices', async (req, res) => {
  try {
    const tts = await getModel();
    res.json({ voices: Object.keys(tts.voices) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list voices' });
  }
});

app.post('/api/generate', async (req, res) => {
  const { text, voice = 'am_adam', speed = 1 } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }
  try {
    const tts = await getModel();
    const parts = text
      .split(/\s*---\s*/)
      .map(t => t.trim())
      .filter(Boolean);

    const audioBuffers = [];
    for (let i = 0; i < parts.length; i++) {
      const audio = await tts.generate(parts[i], { voice, speed });
      const outPath = path.join(process.cwd(), `audio_${i}.wav`);
      await audio.save(outPath);
      const buf = await fs.readFile(outPath);
      await fs.unlink(outPath);
      audioBuffers.push(buf.toString('base64'));
    }

    res.json({ audios: audioBuffers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});

app.use(express.static('ui'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
