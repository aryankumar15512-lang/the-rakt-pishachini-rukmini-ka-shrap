import { LanguageCode } from './storyData.ts';
import {
  getNativeRaktVoiceBridge,
  getNativeVoiceDurationMs,
  stopNativeRaktVoiceBridge,
} from './horrorAudio.ts';

function pcmFloat32ToBase64Int16(float32Array: Float32Array): string {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Manages client-side communication with our server-side Gemini endpoints:
 * - TTS (`gemini-3.8-flash-tts`)
 * - Music (`lyria-3-clip-preview` / `lyria-3-pro-preview`)
 * - Audio Transcription (`gemini-3.5-transcribe`)
 * - High Thinking Lore Oracle (`gemini-4-argon` with ThinkingLevel.HIGH)
 * - High-Quality Image Generation (`gemini-3-pro-image` with 1K, 2K, 4K)
 * - Image Creation & Editing (`gemini-nano-banana-2.1`)
 * - Text-to-Video & Image-to-Video (`gemini-omni-1.2-flash` with 16:9 / 9:16)
 * - Real-time Voice Conversations (`gemini-3.8-live` via WebSocket)
 */
export class GeminiClientManager {
  private currentAudio: HTMLAudioElement | null = null;
  private musicAudio: HTMLAudioElement | null = null;

  // Live API state
  private liveWs: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  public isLiveActive = false;

  // Audio recording for gemini-3.5-transcribe
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecordingWhisper = false;

  /**
   * 1. Narrate text via server-side `gemini-3.8-flash-tts`
   */
  async speakText(text: string, lang: LanguageCode): Promise<void> {
    this.stopSpeech();

    const speakWithBrowserAsyncQueue = async (rawText: string) => {
      if (typeof window === 'undefined') {
        return;
      }
      const nativeBridge = getNativeRaktVoiceBridge();
      if (!nativeBridge && !('speechSynthesis' in window)) {
        return;
      }
      const win = window as Window & {
        activeUtterances?: SpeechSynthesisUtterance[];
      };
      if (!Array.isArray(win.activeUtterances)) {
        win.activeUtterances = [];
      }

      const rawClauses = rawText
        .replace(/["""]/g, '')
        .split(/(?<=[।.!?;—\n])\s*|\s*,\s*/u)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const shortChunks: string[] = [];
      for (const clause of rawClauses) {
        const words = clause.split(/\s+/u).filter(Boolean);
        if (words.length < 12) {
          shortChunks.push(clause);
        } else {
          for (let i = 0; i < words.length; i += 10) {
            shortChunks.push(words.slice(i, i + 10).join(' '));
          }
        }
      }

      for (const chunk of shortChunks) {
        if (nativeBridge) {
          try {
            nativeBridge.speak(chunk, 0.9, 0.72);
          } catch {
            // Ignore native bridge errors
          }
          await new Promise<void>((resolve) =>
            window.setTimeout(resolve, getNativeVoiceDurationMs(chunk)),
          );
          continue;
        }

        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.lang = 'hi-IN';
          utterance.rate = 0.9;
          utterance.pitch = 0.72;

          const voices = window.speechSynthesis.getVoices();
          const matchedHindiVoice = voices.find((v) =>
            v.lang.toLowerCase().startsWith('hi'),
          );
          if (matchedHindiVoice) {
            utterance.voice = matchedHindiVoice;
          }

          win.activeUtterances!.push(utterance);
          let settled = false;
          const finishChunk = (withPause: boolean) => {
            if (settled) return;
            settled = true;
            const idx = win.activeUtterances!.indexOf(utterance);
            if (idx !== -1) {
              win.activeUtterances!.splice(idx, 1);
            }
            if (withPause) {
              window.setTimeout(() => resolve(), 600);
            } else {
              resolve();
            }
          };

          utterance.onend = () => finishChunk(true);
          utterance.onerror = () => finishChunk(false);
          window.speechSynthesis.speak(utterance);
        });
      }
    };

    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          lang,
          voice: 'Kore',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.audioDataUrl) {
        if (data.fallbackClientSpeech && 'speechSynthesis' in window) {
          await speakWithBrowserAsyncQueue(text);
          return;
        }
        throw new Error(data.error || 'TTS failed');
      }

      this.currentAudio = new Audio(data.audioDataUrl);
      await new Promise<void>((resolve, reject) => {
        if (!this.currentAudio) {
          resolve();
          return;
        }
        this.currentAudio.onended = () => {
          window.setTimeout(() => resolve(), 600);
        };
        this.currentAudio.onerror = () => resolve();
        this.currentAudio.play().catch(reject);
      });
    } catch {
      await speakWithBrowserAsyncQueue(text);
    }
  }

  stopSpeech() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    stopNativeRaktVoiceBridge();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const win = window as Window & {
        activeUtterances?: SpeechSynthesisUtterance[];
      };
      if (Array.isArray(win.activeUtterances)) {
        win.activeUtterances.length = 0;
      }
      window.speechSynthesis.cancel();
    }
  }

  /**
   * 2. Generate Horror Soundtrack via `lyria-3-clip-preview` or `lyria-3-pro-preview`
   */
  async generateSoundtrack(
    prompt: string,
    mode: 'clip' | 'pro',
  ): Promise<{ audioDataUrl: string; lyrics: string; model: string }> {
    const res = await fetch('/api/gemini/music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mode }),
    });
    const data = await res.json();
    if (!res.ok || !data.audioDataUrl) {
      throw new Error(data.error || 'Music generation failed');
    }

    if (this.musicAudio) {
      this.musicAudio.pause();
    }
    this.musicAudio = new Audio(data.audioDataUrl);
    this.musicAudio.loop = true;
    this.musicAudio.volume = 0.65;
    void this.musicAudio.play();

    return data;
  }

  /**
   * 3. Record microphone snippet & transcribe via `gemini-3.5-transcribe`
   */
  async toggleWhisperTranscribe(
    lang: LanguageCode,
    onTranscribed: (transcript: string) => void,
    onStatus: (status: string) => void,
  ): Promise<void> {
    if (this.isRecordingWhisper && this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.isRecordingWhisper = false;
      onStatus('Transcribing whisper via gemini-3.5-transcribe...');
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(this.recordedChunks, {
        type: this.mediaRecorder?.mimeType || 'audio/webm',
      });
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64data = String(reader.result || '');
          const base64Clean = base64data.includes(',')
            ? base64data.split(',')[1]
            : base64data;

          const res = await fetch('/api/gemini/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Clean,
              mimeType: blob.type || 'audio/webm',
              lang,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Transcription error');
          onTranscribed(data.transcript || '');
          onStatus('Transcription complete.');
        } catch (err: unknown) {
          onStatus(
            `Error: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      };
      reader.readAsDataURL(blob);
    };

    this.mediaRecorder.start();
    this.isRecordingWhisper = true;
    onStatus('Recording whisper... Click again to transcribe.');
  }

  /**
   * 4. High Thinking Tantrik Oracle query (`gemini-4-argon` with ThinkingLevel.HIGH)
   */
  async askTantrikOracle(
    query: string,
    gameState: Record<string, unknown>,
    lang: LanguageCode,
  ): Promise<string> {
    const res = await fetch('/api/gemini/think', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, gameState, lang }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Oracle thinking failed');
    }
    return data.answer || '';
  }

  /**
   * 5. Generate High-Quality Relic/Horror Vision (`gemini-3-pro-image` with 1K, 2K, 4K)
   */
  async generateProImage(
    prompt: string,
    imageSize: '1K' | '2K' | '4K',
    aspectRatio = '16:9',
  ): Promise<{ imageUrl: string; imageSize: string }> {
    const res = await fetch('/api/gemini/image-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, imageSize, aspectRatio }),
    });
    const data = await res.json();
    if (!res.ok || !data.imageUrl) {
      throw new Error(data.error || 'Pro image generation failed');
    }
    return data;
  }

  /**
   * 6. Create or Edit Image (`gemini-nano-banana-2.1`)
   */
  async createOrEditImage(
    prompt: string,
    imageBase64?: string,
    imageMimeType?: string,
  ): Promise<{ imageUrl: string }> {
    const res = await fetch('/api/gemini/image-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, imageBase64, imageMimeType }),
    });
    const data = await res.json();
    if (!res.ok || !data.imageUrl) {
      throw new Error(data.error || 'Image edit failed');
    }
    return data;
  }

  /**
   * 7. Generate Video from Text or Animate Uploaded Image (`gemini-omni-1.2-flash`)
   */
  async generateOrAnimateVideo(
    prompt: string,
    aspectRatio: '16:9' | '9:16',
    imageBase64?: string,
    imageMimeType?: string,
  ): Promise<{ videoUrl: string; aspectRatio: string }> {
    const res = await fetch('/api/gemini/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspectRatio,
        imageBase64,
        imageMimeType,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.videoUrl) {
      throw new Error(data.error || 'Video generation failed');
    }
    return data;
  }

  /**
   * 8. Real-time Voice Conversation via `gemini-3.8-live` WebSocket bridge
   */
  async toggleLiveSession(
    onTranscript: (speaker: 'You' | 'Spirit', text: string) => void,
    onStatus: (status: string, active: boolean) => void,
    onVoiceActivity: (loudness: number) => void,
  ): Promise<void> {
    if (this.isLiveActive) {
      this.stopLiveSession();
      onStatus('Live Mic Muted', false);
      return;
    }

    onStatus('Connecting to Gemini Live (gemini-3.8-live)...', true);
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/api/live`);
    this.liveWs = ws;

    this.inputAudioCtx = new AudioContext({ sampleRate: 16000 });
    this.outputAudioCtx = new AudioContext({ sampleRate: 24000 });
    this.nextStartTime = 0;

    ws.onopen = async () => {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (!this.inputAudioCtx) return;
        const source = this.inputAudioCtx.createMediaStreamSource(
          this.mediaStream,
        );
        this.processor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);
        source.connect(this.processor);
        this.processor.connect(this.inputAudioCtx.destination);

        this.processor.onaudioprocess = (e) => {
          if (!this.isLiveActive || ws.readyState !== WebSocket.OPEN) return;
          const channelData = e.inputBuffer.getChannelData(0);

          // Compute RMS loudness so Rukmini (the blind witch) can hear the player's voice!
          let sumSq = 0;
          for (let i = 0; i < channelData.length; i++) {
            sumSq += channelData[i] * channelData[i];
          }
          const rms = Math.sqrt(sumSq / channelData.length);
          if (rms > 0.025) {
            onVoiceActivity(rms);
          }

          const base64Audio = pcmFloat32ToBase64Int16(channelData);
          ws.send(JSON.stringify({ audio: base64Audio }));
        };

        this.isLiveActive = true;
        onStatus('LIVE VOICE ON (Rukmini can hear you!)', true);
      } catch (err: unknown) {
        onStatus(
          `Mic error: ${err instanceof Error ? err.message : String(err)}`,
          false,
        );
        this.stopLiveSession();
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'input_transcript' && msg.text) {
          onTranscript('You', msg.text);
        } else if (msg.type === 'output_transcript' && msg.text) {
          onTranscript('Spirit', msg.text);
        } else if (msg.type === 'audio' && msg.audio && this.outputAudioCtx) {
          this.play24kPcmChunk(this.outputAudioCtx, msg.audio);
        } else if (msg.type === 'interrupted') {
          this.nextStartTime = this.outputAudioCtx?.currentTime || 0;
        }
      } catch (e) {
        console.error('Error parsing Live WS message:', e);
      }
    };

    ws.onerror = () => {
      onStatus('Live session error', false);
      this.stopLiveSession();
    };

    ws.onclose = () => {
      if (this.isLiveActive) {
        this.stopLiveSession();
        onStatus('Live session closed', false);
      }
    };
  }

  private play24kPcmChunk(ctx: AudioContext, base64Pcm: string) {
    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    if (this.nextStartTime < now) {
      this.nextStartTime = now;
    }
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  stopLiveSession() {
    this.isLiveActive = false;
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.inputAudioCtx) {
      void this.inputAudioCtx.close();
      this.inputAudioCtx = null;
    }
    if (this.outputAudioCtx) {
      void this.outputAudioCtx.close();
      this.outputAudioCtx = null;
    }
    if (this.liveWs) {
      this.liveWs.close();
      this.liveWs = null;
    }
  }
}
