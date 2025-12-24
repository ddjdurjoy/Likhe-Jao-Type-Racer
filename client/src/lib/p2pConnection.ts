import SimplePeer from 'simple-peer';

export type P2PMessage = {
  type: 'join' | 'race-start' | 'typing-progress' | 'race-finish' | 'chat';
  data?: any;
  username?: string;
  timestamp?: number;
};

export type PlayerProgress = {
  username: string;
  progress: number;
  wpm: number;
  accuracy: number;
  finished?: boolean;
};

type EventCallback = (data: any) => void;

export class P2PConnection {
  private peer: SimplePeer.Instance | null = null;
  private isHost: boolean = false;
  private connected: boolean = false;
  private listeners: Map<string, EventCallback[]> = new Map();

  constructor() {}

  /**
   * Host creates a room and gets the WebRTC signal
   * Returns the signal to be stored with a simple room code
   */
  async createRoom(username: string): Promise<any> {
    this.isHost = true;

    return new Promise((resolve, reject) => {
      this.peer = new SimplePeer({
        initiator: true,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('signal', (signal) => {
        // Return the raw signal, not base64
        resolve(signal);
      });

      this.peer.on('connect', () => {
        this.connected = true;
        console.log('✅ Peer connected as HOST');
        this.emit('connected', { isHost: true });
      });

      this.peer.on('data', (data) => {
        this.handleIncomingData(data);
      });

      this.peer.on('error', (err) => {
        console.error('❌ Peer error (host):', err);
        this.emit('error', err);
        reject(err);
      });

      this.peer.on('close', () => {
        console.log('🔌 Connection closed');
        this.connected = false;
        this.emit('disconnected');
      });
    });
  }

  /**
   * Guest joins a room using the host's signal
   */
  async joinRoom(hostSignal: any, username: string): Promise<any> {
    this.isHost = false;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new SimplePeer({
          initiator: false,
          trickle: false,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('signal', (signal) => {
          // Return guest signal to be sent to host
          resolve(signal);
        });

        this.peer.on('connect', () => {
          this.connected = true;
          console.log('✅ Connected to host as GUEST');
          this.emit('connected', { isHost: false });

          // Send join message to host
          this.send({
            type: 'join',
            username,
            timestamp: Date.now()
          });
        });

        this.peer.on('data', (data) => {
          this.handleIncomingData(data);
        });

        this.peer.on('error', (err) => {
          console.error('❌ Peer error (guest):', err);
          this.emit('error', err);
          reject(err);
        });

        this.peer.on('close', () => {
          console.log('🔌 Connection closed');
          this.connected = false;
          this.emit('disconnected');
        });

        // Signal the host
        this.peer.signal(hostSignal);
      } catch (error) {
        console.error('❌ Failed to join room:', error);
        reject(error);
      }
    });
  }

  /**
   * Host accepts guest's signal to complete the connection
   */
  acceptPeer(guestSignal: any): void {
    try {
      if (this.peer) {
        this.peer.signal(guestSignal);
      }
    } catch (error) {
      console.error('❌ Failed to accept peer:', error);
      this.emit('error', error);
    }
  }

  /**
   * Send a message to the connected peer
   */
  send(message: P2PMessage): void {
    if (this.peer && this.connected) {
      try {
        this.peer.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Failed to send message:', error);
      }
    } else {
      console.warn('⚠️ Cannot send: not connected');
    }
  }

  /**
   * Handle incoming data from peer
   */
  private handleIncomingData(data: Buffer | string): void {
    try {
      const message: P2PMessage = JSON.parse(data.toString());
      
      // Emit the message type as an event
      if (message.type) {
        this.emit(message.type, message.data || message);
      }

      // Also emit a generic 'message' event
      this.emit('message', message);
    } catch (error) {
      console.error('❌ Failed to parse incoming data:', error);
    }
  }

  /**
   * Register an event listener
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove an event listener
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event to all registered listeners
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in ${event} callback:`, error);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if host
   */
  isRoomHost(): boolean {
    return this.isHost;
  }

  /**
   * Disconnect from peer
   */
  disconnect(): void {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connected = false;
    this.listeners.clear();
    console.log('👋 Disconnected from peer');
  }
}

export default P2PConnection;
