'use strict';

require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function transcribeVoice(bot, fileId) {
  // Step 1: Get the file path from Telegram
  const fileInfo = await bot.telegram.getFile(fileId);
  const filePath = fileInfo.file_path;

  // Step 2: Download the OGG audio file
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const audioResponse = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
  const audioBuffer = Buffer.from(audioResponse.data);

  // Step 3: Send to OpenAI Whisper for transcription
  const form = new FormData();
  form.append('file', audioBuffer, {
    filename: 'voice.ogg',
    contentType: 'audio/ogg',
  });
  form.append('model', 'whisper-1');
  form.append('language', 'en');

  const transcription = await openai.audio.transcriptions.create({
    file: new File([audioBuffer], 'voice.ogg', { type: 'audio/ogg' }),
    model: 'whisper-1',
    language: 'en',
  });

  return transcription.text;
}

module.exports = { transcribeVoice };
