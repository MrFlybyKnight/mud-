export interface CalibrationPhrase {
  id: number;
  phrase: string;
  targetRange: string;
  duration: number;
}

export const calibrationSequence: CalibrationPhrase[] = [
  { id: 1, phrase: 'Blue circle, smooth stone, slow crow', targetRange: 'round vowels, low resonance', duration: 5 },
  { id: 2, phrase: 'Bright triangle, crisp white, quick silver', targetRange: 'high tone, sharp consonants', duration: 5 },
  { id: 3, phrase: 'Green rectangle, rough texture, warm amber', targetRange: 'mid tone, mixed resonance', duration: 5 },
  { id: 4, phrase: 'Soft silver sphere, smooth surface, slow whisper', targetRange: 'fricatives, sibilants', duration: 5 },
  { id: 5, phrase: 'Bold black box, bright copper top, big spark', targetRange: 'plosives, speech force', duration: 5 },
  { id: 6, phrase: 'Narrow moon, calm morning, known name', targetRange: 'nasals, voice warmth', duration: 5 },
  { id: 7, phrase: 'Red oval, rough rope, raw coral', targetRange: 'r-sounds, vocal tension', duration: 5 },
  { id: 8, phrase: 'Yellow diamond, hollow shadow, shallow water', targetRange: 'lateral sounds, breath support', duration: 5 },
  { id: 9, phrase: 'Sharp edges, stretched fabric, fresh mesh', targetRange: 'blended consonants, precision', duration: 5 },
  { id: 10, phrase: 'Orange globe, strong hold, long gold', targetRange: 'back vowels, vocal depth', duration: 5 },
  { id: 11, phrase: 'Thin line, fine light, quiet night', targetRange: 'high front vowels, soft tone', duration: 5 },
  { id: 12, phrase: 'Purple thunder, firm border, further order', targetRange: 'full vocal range, stamina', duration: 5 },
];
