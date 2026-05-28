import { useEffect, useRef } from 'react';

/**
 * Lightweight in-browser Voice Activity Detection.
 *
 * When `enabled` is true we open the mic, run it through an AnalyserNode and
 * classify each ~50ms frame as speech vs. silence/background using:
 *   - RMS energy above a noise-floor threshold
 *   - Spectral energy concentrated in the human voice band (300–3400 Hz)
 *   - Short hangover so brief pauses inside a sentence don't flip the flag
 *
 * Returns a ref whose `.current` is `true` only while the user is actually
 * speaking. The caller can poll this ref from its own interval — no extra
 * React renders per audio frame.
 */
export function useVoiceActivity(enabled: boolean) {
  const speakingRef = useRef<boolean>(false);
  const noiseFloorRef = useRef<number>(0.01); // adaptive

  useEffect(() => {
    if (!enabled) {
      speakingRef.current = false;
      return;
    }

    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let rafId: number | null = null;
    let cancelled = false;
    let lastSpeechAt = 0;

    const AC = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          },
        });
        if (cancelled) return;

        audioCtx = new AC();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);

        const time = new Float32Array(analyser.fftSize);
        const freq = new Uint8Array(analyser.frequencyBinCount);
        const sampleRate = audioCtx.sampleRate;
        const binHz = sampleRate / analyser.fftSize;
        const voiceLoBin = Math.floor(300 / binHz);
        const voiceHiBin = Math.min(freq.length - 1, Math.ceil(3400 / binHz));

        const tick = () => {
          if (cancelled || !analyser) return;
          analyser.getFloatTimeDomainData(time);
          analyser.getByteFrequencyData(freq);

          // RMS energy
          let sum = 0;
          for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
          const rms = Math.sqrt(sum / time.length);

          // Spectral concentration in voice band
          let voiceEnergy = 0;
          let totalEnergy = 0;
          for (let i = 0; i < freq.length; i++) {
            const v = freq[i];
            totalEnergy += v;
            if (i >= voiceLoBin && i <= voiceHiBin) voiceEnergy += v;
          }
          const voiceRatio = totalEnergy > 0 ? voiceEnergy / totalEnergy : 0;

          // Adaptive noise floor — slow EMA only while quiet
          if (rms < noiseFloorRef.current * 1.5) {
            noiseFloorRef.current = noiseFloorRef.current * 0.95 + rms * 0.05;
          }
          const threshold = Math.max(0.015, noiseFloorRef.current * 3);

          const now = performance.now();
          const isSpeech = rms > threshold && voiceRatio > 0.45;
          if (isSpeech) {
            lastSpeechAt = now;
            speakingRef.current = true;
          } else if (now - lastSpeechAt > 350) {
            // 350ms hangover — covers natural pauses between words
            speakingRef.current = false;
          }

          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } catch (err) {
        console.warn('[VAD] mic unavailable, falling back to manual mode', err);
      }
    })();

    return () => {
      cancelled = true;
      speakingRef.current = false;
      if (rafId != null) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => undefined);
    };
  }, [enabled]);

  return speakingRef;
}
