let audioCtx = null;

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

export function playSwordSound() {
  if (!audioCtx) return;
  try {
     const bufferSize = audioCtx.sampleRate * 0.2; // 0.2 seconds
     const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
     const data = buffer.getChannelData(0);
     for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // white noise
     }
     const noiseSource = audioCtx.createBufferSource();
     noiseSource.buffer = buffer;

     const filter = audioCtx.createBiquadFilter();
     filter.type = 'bandpass';
     // Sweep filter frequency to sound like a whoosh
     filter.frequency.setValueAtTime(500, audioCtx.currentTime);
     filter.frequency.exponentialRampToValueAtTime(6000, audioCtx.currentTime + 0.1);
     filter.Q.value = 3;

     const gain = audioCtx.createGain();
     gain.gain.setValueAtTime(0, audioCtx.currentTime);
     gain.gain.linearRampToValueAtTime(2, audioCtx.currentTime + 0.05); // quick attack
     gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2); // decay

     noiseSource.connect(filter);
     filter.connect(gain);
     gain.connect(audioCtx.destination);
     
     noiseSource.start();
  } catch (e) {
    console.warn("Audio play failed", e);
  }
}

export function playSquishSound() {
  if (!audioCtx) return;
  try {
     const osc = audioCtx.createOscillator();
     const gainNode = audioCtx.createGain();

     osc.type = 'sine';
     // Fast drop in pitch
     osc.frequency.setValueAtTime(800, audioCtx.currentTime);
     osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
     
     gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
     gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.02);
     gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

     osc.connect(gainNode);
     gainNode.connect(audioCtx.destination);

     osc.start();
     osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

export function playExplosionSound() {
  if (!audioCtx) return;
  try {
     const bufferSize = audioCtx.sampleRate * 2.0; // 2s explosion
     const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
     const data = buffer.getChannelData(0);
     for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.3)); // slow decay
     }
     const noiseSource = audioCtx.createBufferSource();
     noiseSource.buffer = buffer;

     const filter = audioCtx.createBiquadFilter();
     filter.type = 'lowpass';
     filter.frequency.setValueAtTime(800, audioCtx.currentTime);
     filter.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 1.5);

     const gainNode = audioCtx.createGain();
     gainNode.gain.setValueAtTime(4.0, audioCtx.currentTime); // Extra Loud Distortion Peak
     gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.0);

     noiseSource.connect(filter);
     filter.connect(gainNode);
     gainNode.connect(audioCtx.destination);

     noiseSource.start();
  } catch (e) {}
}

export function playLoseLifeSound() {
  if (!audioCtx) return;
  try {
     const osc = audioCtx.createOscillator();
     const gainNode = audioCtx.createGain();

     osc.type = 'sine';
     // Two quick sad beeps
     osc.frequency.setValueAtTime(400, audioCtx.currentTime);
     osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.15);

     gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
     gainNode.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.02);
     gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
     gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.18);

     gainNode.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 0.2);
     gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

     osc.connect(gainNode);
     gainNode.connect(audioCtx.destination);

     osc.start();
     osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {}
}

export function playBombFuseSound() {
  if (!audioCtx) return;
  try {
     // Rapid ticking/hissing sound for bomb fuse
     const bufferSize = audioCtx.sampleRate * 0.4; // 0.4 seconds
     const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
     const data = buffer.getChannelData(0);

     // Create ticking pattern with noise pulses
     const tickInterval = audioCtx.sampleRate * 0.05; // 50ms ticks
     for (let i = 0; i < bufferSize; i++) {
       const tickPhase = i % tickInterval;
       if (tickPhase < audioCtx.sampleRate * 0.02) {
         data[i] = Math.random() * 2 - 1; // noise burst
       } else {
         data[i] = 0;
       }
     }

     const noiseSource = audioCtx.createBufferSource();
     noiseSource.buffer = buffer;

     const filter = audioCtx.createBiquadFilter();
     filter.type = 'highpass';
     filter.frequency.setValueAtTime(2000, audioCtx.currentTime);

     const gainNode = audioCtx.createGain();
     gainNode.gain.setValueAtTime(1.5, audioCtx.currentTime);
     gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

     noiseSource.connect(filter);
     filter.connect(gainNode);
     gainNode.connect(audioCtx.destination);

     noiseSource.start();
  } catch (e) {}
}
