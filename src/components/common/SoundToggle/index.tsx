import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSounds } from '../../../contexts/SoundContext';
import './SoundToggle.css';

const SoundToggle: React.FC = () => {
  const { soundEnabled, toggleSound, playToggleSound } = useSounds();

  const handleToggle = () => {
    if (soundEnabled) {
      // If currently enabled, disable WITHOUT playing sound (muting)
      toggleSound();
    } else {
      // If currently disabled, enable first then play confirmation sound (unmuting)
      toggleSound();
      // Small delay to ensure state is updated, then play confirmation
      setTimeout(() => playToggleSound(), 50);
    }
  };

  return (
    <button
      className="sound-toggle"
      onClick={handleToggle}
      aria-label={`${soundEnabled ? 'Disable' : 'Enable'} sound effects`}
      title={`${soundEnabled ? 'Disable' : 'Enable'} sound effects`}
    >
      {soundEnabled ? (
        <Volume2 size={18} />
      ) : (
        <VolumeX size={18} />
      )}
    </button>
  );
};

export default SoundToggle;