import { KokoroTTS } from "kokoro-js";

const model_id = "onnx-community/Kokoro-82M-ONNX";
const tts = await KokoroTTS.from_pretrained(model_id, {
  dtype: "q8", // Options: "fp32", "fp16", "q8", "q4", "q4f16"
});

//const text = "Life is like a box of chocolates. You never know what you're gonna get.";
const text = "In the case of an invoice without an order, an invoice position is automatically deposited.";
const audio = await tts.generate(text, {
  // Use `tts.list_voices()` to list all available voices
  voice: "am_adam",
});
audio.save("audio.wav");