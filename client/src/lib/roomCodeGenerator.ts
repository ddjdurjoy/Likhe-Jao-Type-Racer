/**
 * Generate simple, memorable room codes
 * Format: WORD-NUMBER (e.g., "TIGER-42", "OCEAN-78")
 */

const WORDS = [
  // Animals
  'TIGER', 'LION', 'EAGLE', 'SHARK', 'WOLF', 'BEAR', 'HAWK', 'FOX',
  'PANDA', 'ZEBRA', 'RHINO', 'COBRA', 'WHALE', 'ORCA', 'LYNX', 'RAVEN',
  
  // Nature
  'OCEAN', 'RIVER', 'STORM', 'THUNDER', 'BLAZE', 'FROST', 'CLOUD', 'WIND',
  'SOLAR', 'LUNAR', 'STAR', 'COMET', 'METEOR', 'FLAME', 'WAVE', 'PEAK',
  
  // Colors
  'CRIMSON', 'AZURE', 'EMERALD', 'GOLDEN', 'SILVER', 'VIOLET', 'SCARLET', 'JADE',
  
  // Power words
  'FORCE', 'POWER', 'TURBO', 'NITRO', 'ROCKET', 'BLITZ', 'FLASH', 'SONIC',
  'ULTRA', 'MEGA', 'HYPER', 'SUPER', 'ALPHA', 'OMEGA', 'PRIME', 'DELTA',
];

/**
 * Generate a simple room code like "TIGER-42"
 */
export function generateSimpleRoomCode(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const number = Math.floor(Math.random() * 100);
  return `${word}-${number}`;
}

/**
 * Validate room code format
 */
export function isValidRoomCode(code: string): boolean {
  const pattern = /^[A-Z]+-\d+$/;
  return pattern.test(code);
}

/**
 * Encode WebRTC signal data to store it with room code
 * Returns a shortened, more manageable format
 */
export function encodeSignal(signal: any): string {
  const json = JSON.stringify(signal);
  // Use base64 but we'll store it separately
  return btoa(json);
}

/**
 * Decode WebRTC signal data
 */
export function decodeSignal(encoded: string): any {
  try {
    const json = atob(encoded);
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to decode signal:', error);
    return null;
  }
}

/**
 * For public rooms: Generate a simple lobby code
 */
export function generateLobbyCode(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  return word;
}
