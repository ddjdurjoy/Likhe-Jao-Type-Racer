/**
 * Public Room Manager
 * Manages a simple in-memory public lobby for same-WiFi connections
 */

interface PublicRoom {
  code: string;
  hostUsername: string;
  hostSignal: any;
  createdAt: number;
  players: string[];
}

// In-memory public rooms (resets on page reload)
const publicRooms = new Map<string, PublicRoom>();

/**
 * Create a public room
 */
export function createPublicRoom(code: string, hostUsername: string, hostSignal: any): void {
  publicRooms.set(code, {
    code,
    hostUsername,
    hostSignal,
    createdAt: Date.now(),
    players: [hostUsername],
  });
  
  // Auto-cleanup after 5 minutes
  setTimeout(() => {
    publicRooms.delete(code);
  }, 5 * 60 * 1000);
}

/**
 * Get available public rooms
 */
export function getPublicRooms(): PublicRoom[] {
  const now = Date.now();
  const rooms: PublicRoom[] = [];
  
  publicRooms.forEach((room) => {
    // Only show rooms less than 5 minutes old
    if (now - room.createdAt < 5 * 60 * 1000) {
      rooms.push(room);
    } else {
      publicRooms.delete(room.code);
    }
  });
  
  return rooms;
}

/**
 * Get a specific public room
 */
export function getPublicRoom(code: string): PublicRoom | null {
  const room = publicRooms.get(code);
  if (room) {
    const now = Date.now();
    if (now - room.createdAt < 5 * 60 * 1000) {
      return room;
    } else {
      publicRooms.delete(code);
    }
  }
  return null;
}

/**
 * Add player to public room
 */
export function joinPublicRoom(code: string, username: string): boolean {
  const room = publicRooms.get(code);
  if (room && room.players.length < 4) { // Max 4 players
    room.players.push(username);
    return true;
  }
  return false;
}

/**
 * Remove player from public room
 */
export function leavePublicRoom(code: string, username: string): void {
  const room = publicRooms.get(code);
  if (room) {
    room.players = room.players.filter(p => p !== username);
    if (room.players.length === 0) {
      publicRooms.delete(code);
    }
  }
}

/**
 * Store guest signal for public room
 */
const guestSignals = new Map<string, { username: string; signal: any }[]>();

export function addGuestSignal(roomCode: string, username: string, signal: any): void {
  if (!guestSignals.has(roomCode)) {
    guestSignals.set(roomCode, []);
  }
  guestSignals.get(roomCode)!.push({ username, signal });
}

export function getGuestSignals(roomCode: string): { username: string; signal: any }[] {
  return guestSignals.get(roomCode) || [];
}

export function clearGuestSignals(roomCode: string): void {
  guestSignals.delete(roomCode);
}
