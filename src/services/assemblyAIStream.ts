/**
 * AssemblyAI Universal-Streaming v3 client.
 *
 * Lifecycle:
 *   1. start() — fetches a temp token from `getAssemblyAIToken` Cloud Function,
 *      opens the WebSocket, starts mic capture, downsamples to 16 kHz PCM16,
 *      and pumps audio frames.
 *   2. On each finalized turn, derives a primary sentiment from transcript
 *      text (POSITIVE / NEGATIVE / NEUTRAL / FEARFUL) and invokes the
 *      onSentiment callback supplied by the caller.
 *   3. stop() — sends {type:"Terminate"}, closes the WebSocket, tears down
 *      the audio graph. ALWAYS call this; abandoned sessions accrue charges
 *      until the 3-hour cap.
 *
 * Auth: API key never enters the browser. The temp token is single-use per
 * session; reconnects must mint a fresh one.
 *
 * Audio format: PCM16 mono 16 kHz, little-endian, ~50 ms binary frames.
 */
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '../firebase/config';
import { classifyTranscriptSentiment, type PrimarySentiment } from '../utils/trancheUtils';

const WS_URL = 'wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speech_model=u3-rt-pro';
const TARGET_SAMPLE_RATE = 16000;
const FRAME_MS = 50;

export interface AssemblyAIStreamCallbacks {
  onSentiment: (sentiment: PrimarySentiment, transcript: string) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (err: Error) => void;
  onStateChange?: (state: 'idle' | 'connecting' | 'streaming' | 'closed') => void;
}

interface TurnEvent {
  type: 'Turn';
  end_of_turn: boolean;
  transcript: string;
  end_of_turn_confidence?: number;
}

// Inline AudioWorklet — captures Float32 mono samples and posts them to main.
const WORKLET_SRC = `
class PcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      // Copy because the underlying buffer is reused.
      this.port.postMessage(new Float32Array(input[0]));
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);
`;

export class AssemblyAIStream {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private srcNode: MediaStreamAudioSourceNode | null = null;
  private workletUrl: string | null = null;
  private buffer: Int16Array[] = [];
  private samplesPerFrame = 0;
  private collected = 0;
  private cb: AssemblyAIStreamCallbacks;
  private state: 'idle' | 'connecting' | 'streaming' | 'closed' = 'idle';
  private stoppedByUser = false;

  constructor(cb: AssemblyAIStreamCallbacks) {
    this.cb = cb;
  }

  isActive(): boolean {
    return this.state === 'streaming' || this.state === 'connecting';
  }

  async start(): Promise<void> {
    if (this.isActive()) return;
    this.stoppedByUser = false;
    this.setState('connecting');

    try {
      // 1. Mint token via Cloud Function (key stays server-side).
      const fn = httpsCallable<unknown, { token: string; expiresInSeconds: number }>(
        getFunctions(app),
        'getAssemblyAIToken',
      );
      const res = await fn({});
      const token = res.data.token;
      if (!token) throw new Error('No token returned from getAssemblyAIToken');

      // 2. Mic + audio context (browser native rate, downsampled below).
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const AudioCtxCtor =
        (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      this.audioCtx = new AudioCtxCtor();

      const blob = new Blob([WORKLET_SRC], { type: 'application/javascript' });
      this.workletUrl = URL.createObjectURL(blob);
      await this.audioCtx.audioWorklet.addModule(this.workletUrl);

      this.srcNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioCtx, 'pcm-capture');
      this.srcNode.connect(this.workletNode);
      // Don't connect to destination — we don't want to play mic back.

      this.samplesPerFrame = Math.round((TARGET_SAMPLE_RATE * FRAME_MS) / 1000); // 800
      this.buffer = [];
      this.collected = 0;

      const inputRate = this.audioCtx.sampleRate;
      this.workletNode.port.onmessage = (ev: MessageEvent<Float32Array>) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const pcm16 = floatTo16BitDownsample(ev.data, inputRate, TARGET_SAMPLE_RATE);
        this.buffer.push(pcm16);
        this.collected += pcm16.length;
        while (this.collected >= this.samplesPerFrame) {
          const frame = drainFrame(this.buffer, this.samplesPerFrame);
          this.collected -= this.samplesPerFrame;
          if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(frame.buffer);
          }
        }
      };

      // 3. Open WebSocket with token query param (no Authorization header in browser).
      this.ws = new WebSocket(`${WS_URL}&token=${encodeURIComponent(token)}`);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.setState('streaming');
        console.log('[AssemblyAI] WebSocket open');
      };

      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { type: string } & Partial<TurnEvent>;
          if (msg.type === 'Turn') {
            const turn = msg as TurnEvent;
            this.cb.onTranscript?.(turn.transcript, turn.end_of_turn);
            if (turn.end_of_turn && turn.transcript) {
              const sentiment = classifyTranscriptSentiment(turn.transcript);
              console.log('[AssemblyAI] turn final:', turn.transcript, '→', sentiment);
              this.cb.onSentiment(sentiment, turn.transcript);
            }
          } else if (msg.type === 'Termination') {
            console.log('[AssemblyAI] session terminated by server');
          }
        } catch (e) {
          console.warn('[AssemblyAI] message parse failed', e);
        }
      };

      this.ws.onerror = (ev) => {
        console.error('[AssemblyAI] WebSocket error', ev);
        this.cb.onError?.(new Error('AssemblyAI WebSocket error'));
      };

      this.ws.onclose = (ev) => {
        console.log('[AssemblyAI] WebSocket closed', ev.code, ev.reason);
        this.teardown();
        this.setState('closed');
      };
    } catch (err) {
      console.error('[AssemblyAI] start failed', err);
      this.cb.onError?.(err as Error);
      this.teardown();
      this.setState('closed');
    }
  }

  stop(): void {
    if (this.state === 'idle' || this.state === 'closed') return;
    this.stoppedByUser = true;
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // REQUIRED: gracefully terminate or session keeps billing until 3h cap.
        this.ws.send(JSON.stringify({ type: 'Terminate' }));
      }
    } catch (e) {
      console.warn('[AssemblyAI] terminate send failed', e);
    }
    try {
      this.ws?.close();
    } catch {
      /* noop */
    }
    this.teardown();
    this.setState('closed');
  }

  private teardown() {
    try { this.workletNode?.disconnect(); } catch { /* */ }
    try { this.srcNode?.disconnect(); } catch { /* */ }
    try { this.mediaStream?.getTracks().forEach((t) => t.stop()); } catch { /* */ }
    try { void this.audioCtx?.close(); } catch { /* */ }
    if (this.workletUrl) {
      try { URL.revokeObjectURL(this.workletUrl); } catch { /* */ }
    }
    this.workletNode = null;
    this.srcNode = null;
    this.mediaStream = null;
    this.audioCtx = null;
    this.workletUrl = null;
    this.buffer = [];
    this.collected = 0;
    this.ws = null;
    void this.stoppedByUser;
  }

  private setState(s: typeof this.state) {
    this.state = s;
    this.cb.onStateChange?.(s);
  }
}

// --- audio helpers ---

function floatTo16BitDownsample(input: Float32Array, inRate: number, outRate: number): Int16Array {
  if (inRate === outRate) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const ratio = inRate / outRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = idx - i0;
    const sample = input[i0] * (1 - frac) + input[i1] * frac;
    const s = Math.max(-1, Math.min(1, sample));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function drainFrame(buf: Int16Array[], n: number): Int16Array {
  const out = new Int16Array(n);
  let written = 0;
  while (written < n && buf.length) {
    const head = buf[0];
    const need = n - written;
    if (head.length <= need) {
      out.set(head, written);
      written += head.length;
      buf.shift();
    } else {
      out.set(head.subarray(0, need), written);
      buf[0] = head.subarray(need);
      written += need;
    }
  }
  return out;
}
