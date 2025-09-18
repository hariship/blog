import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SoundContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
  playButtonSound: () => void;
  playHoverSound: () => void;
  playKeypadBeep: () => void;
  playToggleSound: () => void;
  playDropdownSound: () => void;
  playNavigationSound: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const useSounds = () => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSounds must be used within a SoundProvider');
  }
  return context;
};

interface SoundProviderProps {
  children: ReactNode;
}

export const SoundProvider: React.FC<SoundProviderProps> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('lcars-sound-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('lcars-sound-enabled', JSON.stringify(newValue));
  };

  // Use keypad beep for button clicks too
  const playButtonSound = () => {
    playKeypadBeep();
  };

  // Subtle hover sound
  const playHoverSound = () => {
    if (!soundEnabled) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Very subtle hover tone
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.03);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.03);
    } catch (error) {
      console.warn('Audio not available:', error);
    }
  };

  const playKeypadBeep = () => {
    if (!soundEnabled) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();

      oscillator.connect(volume);
      volume.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
      oscillator.type = 'square';

      volume.gain.setValueAtTime(0.025, ctx.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.06);

      setTimeout(() => ctx.close(), 100);
    } catch (error) {
      console.warn('Audio not available:', error);
    }
  };

  // Toggle sound (for theme/sound toggles) - lower pitch, smooth
  const playToggleSound = () => {
    if (!soundEnabled) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();

      oscillator.connect(volume);
      volume.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      oscillator.type = 'sine';

      volume.gain.setValueAtTime(0.04, ctx.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.12);

      setTimeout(() => ctx.close(), 150);
    } catch (error) {
      console.warn('Audio not available:', error);
    }
  };

  // Dropdown sound - quick chirp
  const playDropdownSound = () => {
    if (!soundEnabled) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();

      oscillator.connect(volume);
      volume.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.04);
      oscillator.type = 'triangle';

      volume.gain.setValueAtTime(0.03, ctx.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.04);

      setTimeout(() => ctx.close(), 80);
    } catch (error) {
      console.warn('Audio not available:', error);
    }
  };

  // Navigation sound (for page changes) - swoosh
  const playNavigationSound = () => {
    if (!soundEnabled) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();

      oscillator.connect(volume);
      volume.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
      oscillator.type = 'sawtooth';

      volume.gain.setValueAtTime(0.025, ctx.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);

      setTimeout(() => ctx.close(), 200);
    } catch (error) {
      console.warn('Audio not available:', error);
    }
  };

  return (
    <SoundContext.Provider value={{ soundEnabled, toggleSound, playButtonSound, playHoverSound, playKeypadBeep, playToggleSound, playDropdownSound, playNavigationSound }}>
      {children}
    </SoundContext.Provider>
  );
};