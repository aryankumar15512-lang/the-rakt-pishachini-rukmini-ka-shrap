import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

function getGenAI(apiVersion?: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      ...(apiVersion ? { apiVersion } : {}),
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): {
  status: number;
  message: string;
  isQuotaError: boolean;
  isNotFoundError: boolean;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const isQuotaError =
    raw.includes('429') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('exceeded your current quota');
  const isNotFoundError =
    raw.includes('404') ||
    raw.includes('NOT_FOUND') ||
    raw.includes('is not found');
  const isAuthError =
    raw.includes('403') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('API_KEY_INVALID');

  if (isQuotaError) {
    return {
      status: 429,
      isQuotaError: true,
      isNotFoundError: false,
      message:
        'Free-tier quota reached for this paid model. Upgrading to a paid tier increases your quota — you can select a billing-enabled API key in the Settings > Secrets panel.',
    };
  }
  if (isAuthError) {
    return {
      status: 403,
      isQuotaError: false,
      isNotFoundError: false,
      message:
        'API key permission denied or invalid. Please check or select your API key in the Settings > Secrets panel.',
    };
  }
  return {
    status: isNotFoundError ? 404 : 500,
    isQuotaError: false,
    isNotFoundError,
    message: raw,
  };
}

/**
 * Generates a real 16-bit 24kHz mono WAV horror soundtrack buffer (tanpura drone,
 * sub-bass heartbeat, eerie wind modulation, and metallic payal ankle bells)
 * when Lyria preview is unavailable on the user's current API key tier.
 */
function synthesizeProceduralHorrorTrackWav(durationSeconds = 12): string {
  const sampleRate = 24000;
  const numSamples = sampleRate * durationSeconds;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF WAV Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // 1. Deep ominous tanpura / dark drone (D2 = 73.42Hz, A2 = 110Hz, F2 = 87.31Hz)
    const drone =
      0.26 * Math.sin(2 * Math.PI * 73.42 * t) +
      0.18 * Math.sin(2 * Math.PI * 110.0 * t + Math.sin(t * 1.5)) +
      0.14 * Math.sin(2 * Math.PI * 87.31 * t);

    // 2. Slow eerie atmospheric pulse
    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.25 * t);

    // 3. Rhythmic payal (ankle bell) metallic chimes every 1.5 seconds
    const beatPhase = t % 1.5;
    let payal = 0;
    if (beatPhase < 0.22) {
      const env = Math.exp(-beatPhase * 22);
      payal =
        env *
        0.28 *
        (Math.sin(2 * Math.PI * 2860 * t) +
          0.7 * Math.sin(2 * Math.PI * 3540 * t) +
          0.5 * Math.sin(2 * Math.PI * 4320 * t));
    } else if (beatPhase >= 0.28 && beatPhase < 0.48) {
      const env = Math.exp(-(beatPhase - 0.28) * 24);
      payal =
        env *
        0.22 *
        (Math.sin(2 * Math.PI * 3120 * t) +
          0.7 * Math.sin(2 * Math.PI * 3950 * t));
    }

    // 4. Low heartbeat thump every 1.5s
    let heartbeat = 0;
    if (beatPhase < 0.18) {
      const hbEnv = Math.exp(-beatPhase * 18);
      heartbeat = hbEnv * 0.35 * Math.sin(2 * Math.PI * 48 * t);
    }

    const sample = Math.max(
      -0.95,
      Math.min(0.95, drone * lfo + payal + heartbeat),
    );
    const int16 = Math.floor(sample * 32767);
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  return buffer.toString('base64');
}

// 1. Convert text to speech using gemini-3.8-flash-tts
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const { text, lang = 'hi', voice = 'Kore', style } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required for TTS.' });
      return;
    }

    const ai = getGenAI('v1alpha');
    const speechStyle =
      style ||
      (lang === 'hi'
        ? 'Eerie, haunting Indian horror narrator with dramatic tension and chilling whispers'
        : 'Dark, ominous horror narrator with dramatic tension and chilling whispers');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style: speechStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res
        .status(500)
        .json({ error: 'No audio returned from gemini-3.8-flash-tts' });
      return;
    }

    res.json({
      audioDataUrl: `data:audio/wav;base64,${base64Audio}`,
    });
  } catch (err: unknown) {
    console.warn('TTS notice:', err instanceof Error ? err.message : err);
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({
      error: formatted.message,
      fallbackClientSpeech: true,
    });
  }
});

// 2. Generate music using lyria-3-clip-preview (30s) or lyria-3-pro-preview (full track)
app.post('/api/gemini/music', async (req, res) => {
  const { prompt, mode = 'clip', imageBase64, imageMimeType } = req.body;
  const model =
    mode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
  const textPrompt =
    prompt ||
    'Generate a terrifying 1992 Indian gothic horror mansion soundtrack with haunting ankle bells (payal), deep tanpura drone, distant thunder, and eerie whispers.';

  const contents = imageBase64
    ? {
        parts: [
          { text: textPrompt },
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType || 'image/png',
            },
          },
        ],
      }
    : textPrompt;

  // Try v1alpha first (required for preview models like lyria-3-clip-preview / lyria-3-pro-preview)
  for (const apiVer of ['v1alpha', 'v1beta']) {
    try {
      const ai = getGenAI(apiVer);
      const response = await ai.models.generateContentStream({
        model,
        contents,
      });

      const audioChunks: Buffer[] = [];
      let lyrics = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length > 0) {
        const audioBase64 = Buffer.concat(audioChunks).toString('base64');
        res.json({
          audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
          lyrics,
          model,
        });
        return;
      }
    } catch (err: unknown) {
      console.warn(
        `Lyria (${model} on ${apiVer}) notice:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Seamless synthesized horror score fallback when Lyria preview is unavailable or quota-limited on the current key
  const wavBase64 = synthesizeProceduralHorrorTrackWav(mode === 'pro' ? 20 : 12);
  res.json({
    audioDataUrl: `data:audio/wav;base64,${wavBase64}`,
    lyrics:
      '[Instrumental 1992 Thakur Mansion Horror Score: Tanpura Drone & Payal Bells]',
    model: `${model} (Synthesized Studio Fallback — upgrade key in Settings > Secrets for Lyria cloud stream)`,
  });
});

// 3. Transcribe audio using gemini-3.5-transcribe
app.post('/api/gemini/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', lang = 'hi' } = req.body;
    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 is required.' });
      return;
    }

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text:
              lang === 'hi'
                ? 'Transcribe this spoken audio accurately in Hindi or English.'
                : 'Transcribe this spoken audio accurately.',
          },
        ],
      },
    });

    res.json({ transcript: response.text || '' });
  } catch (err: unknown) {
    console.warn('Transcribe notice:', err instanceof Error ? err.message : err);
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// 4. High Thinking mode using gemini-4-argon with ThinkingLevel.HIGH (no maxOutputTokens)
app.post('/api/gemini/think', async (req, res) => {
  const { query, gameState, lang = 'hi' } = req.body;
  if (!query) {
    res.status(400).json({ error: 'Query is required.' });
    return;
  }

  const systemPrompt =
    lang === 'hi'
      ? `तुम तांत्रिक कालभैरव और चौकीदार की प्राचीन सर्वज्ञ आत्मा हो जो 'द रक्त पिशाचिनी: रुक्मिणी का श्राप' (1992 ठाकुर हवेली) के रहस्यों को जानती है। खिलाड़ी की स्थिति: ${JSON.stringify(
          gameState || {},
        )}। गहन तांत्रिक विश्लेषण करके खिलाड़ी को रुक्मिणी (अंधी रक्त-पिशाचिनी जो केवल आवाज़ सुनती है) से बचने, 4 शापित वस्तुओं (पायल, दुपट्टा, खंजर, अस्थि कलश) को ढूंढने और हवन कुंड में भस्म करने की सटीक रणनीति बताओ।`
      : `You are the omniscient Tantrik Lore Oracle of Thakur Mansion (1992) in 'The Rakt Pishachini: Rukmini Ka Shrap'. Current game state: ${JSON.stringify(
          gameState || {},
        )}. Analyze deeply and provide tactical survival advice against the blind Blood Witch Rukmini (who hunts by sound/ankle bells) and how to locate and incinerate the 4 cursed relics (Anklet, Bridal Veil, Sacrificial Dagger, Bone Urn) in the courtyard well.`;

  const ai = getGenAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: query,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    res.json({
      answer: response.text || '',
      model: 'gemini-4-argon',
    });
    return;
  } catch (primaryErr: unknown) {
    const formatted = formatGeminiError(primaryErr);
    console.warn('Primary gemini-4-argon notice:', formatted.message);

    // If free-tier quota is exhausted on gemini-4-argon, try gemini-3.8-flash with ThinkingLevel.HIGH
    if (formatted.isQuotaError || formatted.isNotFoundError) {
      try {
        const fallbackResp = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: query,
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH,
            },
          },
        });

        const billingNote =
          lang === 'hi'
            ? '\n\n[सूचना: आपके वर्तमान API Key पर gemini-4-argon का Free Tier कोटा समाप्त हो गया है। अधिक कोटा के लिए Settings > Secrets पैनल में Billing-enabled Paid API Key चुनें।]'
            : '\n\n[Note: Free-tier quota for gemini-4-argon was reached. Upgrading to a paid tier increases your quota — select a billing-enabled API key in the Settings > Secrets panel.]';

        res.json({
          answer: (fallbackResp.text || '') + billingNote,
          model: 'gemini-3.8-flash (High Thinking Fallback)',
        });
        return;
      } catch {
        // If both models hit free-tier rate limits, return lore-accurate tactical response + billing guidance
      }
    }

    const tacticalLoreFallback =
      lang === 'hi'
        ? `तांत्रिक कालभैरव की चेतावनी (Tantrik Oracle Analysis):\n1. रुक्मिणी (रक्त-पिशाचिनी) आग में जलने से अंधी हो चुकी है, पर वह पायल की गूंज और आपकी सांसों/माइक की आवाज़ से शिकार को ट्रैक करती है।\n2. हवेली के चारों कोनों (उत्तरी कक्ष, पूर्वी गलियारा, पश्चिमी तहखाना, दक्षिणी मंडप) से 4 शापित वस्तुएं—घुंघरू पायल, लाल दुपट्टा, बलि खंजर, और अस्थि कलश—एकत्रित करें।\n3. जब एक साथी आवाज़ करके रुक्मिणी को दूर ले जाए, तब दूसरा साथी आंगन के सूखे कुएं (Havan Kund) के पास जाकर 'GRAB (E)' दबाए और सभी शापित वस्तुएं अग्नि में भस्म कर दे!\n\n[API Quota Notice: ${formatted.message}]`
        : `Tantrik Kalbhairav Tactical Analysis:\n1. Acoustic Stealth: Rukmini was blinded in the 1992 sacrificial fire but hunts by sound. Monitor her distance on the Payal Radar and mute your microphone when she is within 8 meters.\n2. Chamber Sweep: Collect the 4 cursed relics (Bridal Anklet, Burnt Crimson Veil, Sacrificial Dagger, and Blackened Bone Urn) from the corner pedestals.\n3. Courtyard Incineration: Have one teammate draw Rukmini toward the outer colonnade with a quick chat or whisper while the carrier rushes to the central courtyard well (Havan Kund) and presses GRAB (E / Space) to incinerate all relics.\n\n[API Quota Notice: ${formatted.message}]`;

    res.json({
      answer: tacticalLoreFallback,
      model: 'gemini-4-argon (Tactical Archive)',
      quotaNotice: formatted.message,
    });
  }
});

// 5. Generate high-quality images using gemini-3-pro-image (with 1K, 2K, 4K size selector)
app.post('/api/gemini/image-pro', async (req, res) => {
  try {
    const {
      prompt,
      imageSize = '1K',
      aspectRatio = '16:9',
    } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    const validSizes = ['1K', '2K', '4K'];
    const selectedSize = validSizes.includes(imageSize) ? imageSize : '1K';

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image',
      contents: {
        parts: [
          {
            text: `${prompt} — dark cinematic 1992 Indian gothic horror atmosphere, Thakur Mansion, cursed crimson bridal aesthetics, eerie volumetric fog`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize: selectedSize,
        },
      },
    });

    let imageUrl = '';
    let textOut = '';
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textOut += part.text;
      }
    }

    if (!imageUrl) {
      res
        .status(500)
        .json({ error: 'No image returned from gemini-3-pro-image.' });
      return;
    }

    res.json({
      imageUrl,
      text: textOut,
      model: 'gemini-3-pro-image',
      imageSize: selectedSize,
    });
  } catch (err: unknown) {
    console.warn('Pro image notice:', err instanceof Error ? err.message : err);
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// 6. Create & edit images using gemini-nano-banana-2.1
app.post('/api/gemini/image-edit', async (req, res) => {
  try {
    const {
      prompt,
      imageBase64,
      imageMimeType = 'image/png',
      aspectRatio = '1:1',
      imageSize = '1K',
    } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    const ai = getGenAI();
    const parts: Array<
      | { inlineData: { data: string; mimeType: string } }
      | { text: string }
    > = [];

    if (imageBase64) {
      const cleanBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: imageMimeType,
        },
      });
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    let imageUrl = '';
    let textOut = '';
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textOut += part.text;
      }
    }

    if (!imageUrl) {
      res
        .status(500)
        .json({ error: 'No image returned from gemini-nano-banana-2.1.' });
      return;
    }

    res.json({ imageUrl, text: textOut, model: 'gemini-nano-banana-2.1' });
  } catch (err: unknown) {
    console.warn(
      'Nano banana 2.1 notice:',
      err instanceof Error ? err.message : err,
    );
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// 7. Generate video from text OR animate uploaded photo into video using gemini-omni-1.2-flash via Interactions API
app.post('/api/gemini/video', async (req, res) => {
  try {
    const {
      prompt,
      imageBase64,
      imageMimeType = 'image/png',
      aspectRatio = '16:9',
      duration = '5s',
    } = req.body;

    const validAspect = aspectRatio === '9:16' ? '9:16' : '16:9';
    const ai = getGenAI('v1alpha');

    const textPrompt =
      prompt ||
      'Cinematic dark horror shot inside 1992 Thakur Mansion courtyard well with flickering lanterns, red bridal veil floating in the storm, and eerie mist.';

    const inputPayload = imageBase64
      ? [
          {
            type: 'image' as const,
            mime_type: imageMimeType,
            data: imageBase64.includes(',')
              ? imageBase64.split(',')[1]
              : imageBase64,
          },
          {
            type: 'text' as const,
            text: textPrompt,
          },
        ]
      : textPrompt;

    const interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.2-flash',
        input: inputPayload,
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: validAspect,
          duration,
          resolution: '720p',
        },
      },
      { timeout: 300000 },
    );

    const videoPart = interaction.output_video;
    if (videoPart?.data) {
      const mime = videoPart.mime_type || 'video/mp4';
      res.json({
        videoUrl: `data:${mime};base64,${videoPart.data}`,
        aspectRatio: validAspect,
        model: 'gemini-omni-1.2-flash',
      });
      return;
    }
    if (videoPart?.uri) {
      res.json({
        videoUrl: videoPart.uri,
        aspectRatio: validAspect,
        model: 'gemini-omni-1.2-flash',
      });
      return;
    }

    res
      .status(500)
      .json({ error: 'No video returned from gemini-omni-1.2-flash.' });
  } catch (err: unknown) {
    console.warn(
      'Video generation notice:',
      err instanceof Error ? err.message : err,
    );
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// 8. Real-time Voice Conversations via Live API (gemini-3.8-live) over WebSocket (/api/live)
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  if (url.pathname === '/api/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  let sessionPromise: ReturnType<GoogleGenAI['live']['connect']> | null = null;
  try {
    const ai = getGenAI('v1alpha');
    sessionPromise = ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
        systemInstruction:
          'You are the spirit of the old watchman and the cursed echo of Rukmini inside Thakur Mansion (1992). Keep responses atmospheric, concise, and suspenseful in Hindi or English matching the player. Warn the player when they speak too loudly because the blind Blood Witch Rukmini hunts by sound and ankle bells (payal), and guide them to find the 4 cursed relics (Anklet, Bridal Veil, Dagger, Bone Urn) and burn them in the courtyard well.',
      },
      callbacks: {
        onopen: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'connected' }));
          }
        },
        onmessage: (message: LiveServerMessage) => {
          if (clientWs.readyState !== WebSocket.OPEN) return;
          const content = message.serverContent;
          if (content?.inputTranscription?.text) {
            clientWs.send(
              JSON.stringify({
                type: 'input_transcript',
                text: content.inputTranscription.text,
              }),
            );
          }
          if (content?.outputTranscription?.text) {
            clientWs.send(
              JSON.stringify({
                type: 'output_transcript',
                text: content.outputTranscription.text,
              }),
            );
          }
          for (const part of content?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              clientWs.send(
                JSON.stringify({
                  type: 'audio',
                  audio: part.inlineData.data,
                }),
              );
            }
          }
          if (content?.interrupted) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }
        },
        onerror: (err: unknown) => {
          console.warn('Live API notice:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                message:
                  err instanceof Error ? err.message : 'Live session error',
              }),
            );
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'closed' }));
          }
        },
      },
    });

    clientWs.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!sessionPromise) return;
        sessionPromise
          .then((session) => {
            if (msg.audio) {
              session.sendRealtimeInput({
                audio: {
                  data: msg.audio,
                  mimeType: 'audio/pcm;rate=16000',
                },
              });
            } else if (msg.text) {
              session.sendRealtimeInput({
                text: msg.text,
              });
            }
          })
          .catch((e) => console.warn('Realtime input notice:', e));
      } catch (e) {
        console.warn('Invalid WS message:', e);
      }
    });

    clientWs.on('close', () => {
      if (sessionPromise) {
        sessionPromise
          .then((session) => session.close())
          .catch(() => {});
      }
    });
  } catch (err: unknown) {
    console.warn('Live API connection notice:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`The Rakt Pishachini server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
