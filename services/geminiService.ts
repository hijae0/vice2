
import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

export async function generateAnnouncementAudio(text: string): Promise<Uint8Array> {
  if (!API_KEY) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Stronger instruction to ensure both languages are voiced
  const systemPrompt = `You are an AI assistant specialized in Japanese train station announcements.
  Your task is to convert the following text to high-quality speech.
  
  CRITICAL INSTRUCTIONS:
  1. The input contains a Japanese announcement followed by an English announcement.
  2. You MUST voice BOTH the Japanese and the English parts in their entirety.
  3. Speak in a calm, female, professional announcer voice (typical of Tokyo trains).
  4. Ensure a natural pause (about 1 second) between the Japanese and English sections.
  5. DO NOT omit the English part under any circumstances.
  
  Format: [Japanese Speech] -> [Pause] -> [English Speech]`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `${systemPrompt}\n\nCONTENT TO ANNOUNCE:\n${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          // 'Kore' is usually a good fit for professional Japanese announcements
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data received from Gemini");

  return decodeBase64ToUint8(base64Audio);
}

function decodeBase64ToUint8(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes raw PCM to a downloadable WAV file
 */
export function createWavFile(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size
  view.setUint16(20, 1, true);  // AudioFormat (PCM)
  view.setUint16(22, 1, true);  // NumChannels (Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);

  const combined = new Uint8Array(wavHeader.byteLength + pcmData.length);
  combined.set(new Uint8Array(wavHeader), 0);
  combined.set(pcmData, wavHeader.byteLength);

  return new Blob([combined], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
