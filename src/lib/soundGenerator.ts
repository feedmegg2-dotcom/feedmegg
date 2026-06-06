// lib/soundGenerator.ts
// Enhanced Web Audio API sound generator with attention-grabbing alerts

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export const soundGenerator = {
  // 1. CHIME - Classic notification (already good)
  chime: () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  },

  // 2. CUCKOO - Distinctive two-tone (already good)
  cuckoo: () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523, now); // C5
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.start(now);
    osc1.stop(now + 0.15);
    
    // Second tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(392, now + 0.2); // G4
    gain2.gain.setValueAtTime(0.4, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.35);
  },

  // 3. AIR HORN - Harsh buzzy sound
  'air-horn': () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
    
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(500, now);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.02, now + 0.5);
    
    osc.start(now);
    osc.stop(now + 0.5);
  },

  // 4. KLAXON - Rising alarm
  klaxon: () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.3);
    osc.frequency.linearRampToValueAtTime(400, now + 0.6);
    
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    osc.start(now);
    osc.stop(now + 0.6);
  },

  // 5. ALARM CLOCK - Rapid pulsing
  'alarm-clock': () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600 + i * 100, now + i * 0.12);
      
      gain.gain.setValueAtTime(0.3, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.1);
      
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.1);
    }
  },

  // 6. FIRE ALARM - High pitched urgent
  'fire-alarm': () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
    
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
  },

  // 7. POLICE SIREN - Wailing effect
  'police-siren': () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
    osc.frequency.linearRampToValueAtTime(600, now + 0.6);
    
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    osc.start(now);
    osc.stop(now + 0.6);
  },

  // 8. AMBULANCE - Double wail
  ambulance: () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // First wail
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(900, now);
    osc1.frequency.linearRampToValueAtTime(1100, now + 0.25);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.start(now);
    osc1.stop(now + 0.25);
    
    // Second wail
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(700, now + 0.35);
    osc2.frequency.linearRampToValueAtTime(900, now + 0.6);
    gain2.gain.setValueAtTime(0.3, now + 0.35);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc2.start(now + 0.35);
    osc2.stop(now + 0.6);
  },

  // 9. CAR HORN - Loud honk
  'car-horn': () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    osc.start(now);
    osc.stop(now + 0.4);
  },

  // 10. TRAIN HORN - Deep powerful
  'train-horn': () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.5);
    
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc.start(now);
    osc.stop(now + 0.5);
  },

  // 11. FOGHORN - Low drone
  foghorn: () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    
    osc.start(now);
    osc.stop(now + 0.8);
  },

  // 12. LOUD DOORBELL - Bright double tone
  'loud-doorbell': () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000 - i * 200, now + i * 0.15);
      
      gain.gain.setValueAtTime(0.35, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.12);
      
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.12);
    }
  },

  // 13. LOUD BUZZER - Electric buzz
  'loud-buzzer': () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(500, now);
    
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(300, now);
    
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    osc.start(now);
    osc.stop(now + 0.35);
  },

  // 14. SIREN - Classic emergency
  siren: () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(1000, now + 0.3);
    osc.frequency.linearRampToValueAtTime(500, now + 0.6);
    
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    osc.start(now);
    osc.stop(now + 0.6);
  },
};

export function playSound(soundName: string) {
  try {
    const soundFunc = (soundGenerator as any)[soundName];
    if (soundFunc) {
      soundFunc();
    }
  } catch (e) {
    console.error('Sound error:', e);
  }
}
