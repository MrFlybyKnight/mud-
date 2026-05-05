// emotionUtils.ts - Proprietary Emotion Detection Engine for MuD
// Copyright TGC/Ologi - Mack's IP

export interface EmotionThresholds {
  hrChange: { min: number; max: number };
  hrvPattern: string;
  voicePitch: { min: number; max: number };
  speechRate: { min: number; max: number };
  volume: { min: number; max: number };
  temporalPattern?: string;
}

// Your proprietary emotion mapping based on biometric patterns
const EMOTION_SIGNATURES: Record<string, EmotionThresholds> = {
  anger: {
    hrChange: { min: 15, max: 25 },
    hrvPattern: 'decreased',
    voicePitch: { min: 10, max: 30 },
    speechRate: { min: 15, max: 25 },
    volume: { min: 3, max: 5 },
    temporalPattern: 'sustained_elevation'
  },
  fear: {
    hrChange: { min: 20, max: 35 },
    hrvPattern: 'irregular',
    voicePitch: { min: 30, max: 50 },
    speechRate: { min: -10, max: 30 }, // Can be slower or faster
    volume: { min: -2, max: 4 },
    temporalPattern: 'spike_sustained'
  },
  sadness: {
    hrChange: { min: -10, max: -5 },
    hrvPattern: 'slight_increase',
    voicePitch: { min: -20, max: -10 },
    speechRate: { min: -30, max: -20 },
    volume: { min: -3, max: -2 },
    temporalPattern: 'gradual_decrease'
  },
  happiness: {
    hrChange: { min: 10, max: 15 },
    hrvPattern: 'regular',
    voicePitch: { min: 5, max: 15 },
    speechRate: { min: 0, max: 10 },
    volume: { min: 1, max: 2 },
    temporalPattern: 'smooth_elevation'
  },
  anxiety: {
    hrChange: { min: 10, max: 20 },
    hrvPattern: 'highly_irregular',
    voicePitch: { min: 15, max: 25 },
    speechRate: { min: 10, max: 15 },
    volume: { min: -1, max: 3 },
    temporalPattern: 'sustained_irregularity'
  },
  calm: {
    hrChange: { min: -5, max: 5 },
    hrvPattern: 'regular',
    voicePitch: { min: -5, max: 5 },
    speechRate: { min: -5, max: 5 },
    volume: { min: -1, max: 1 },
    temporalPattern: 'stable'
  }
};

