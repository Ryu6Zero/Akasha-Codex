import { useCallback } from 'react';
import type { AppPreferences } from '../types';

export type SoundCue = 'navigation' | 'save' | 'error' | 'link' | 'add';

let sharedAudioContext: AudioContext | null = null;

const CUE_FREQUENCIES: Record<SoundCue, [number, number]> = {
  navigation: [520, 860],
  save: [640, 960],
  error: [220, 150],
  link: [740, 1040],
  add: [460, 720],
};

export function useSound(preferences: AppPreferences): (cue: SoundCue) => void {
  return useCallback(
    (cue: SoundCue) => {
      if (preferences.soundMode === 'off' || preferences.soundVolume <= 0) return;
      try {
        const context = getAudioContext();
        if (!context) return;
        const [startFrequency, endFrequency] = CUE_FREQUENCIES[cue];
        const intensity = preferences.soundMode === 'full' ? 1 : 0.58;
        const gainValue = 0.08 * preferences.soundVolume * intensity;
        const duration = cue === 'error' ? 0.16 : 0.13;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = cue === 'error' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(startFrequency, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, context.currentTime + duration * 0.62);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(gainValue, context.currentTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration + 0.02);
      } catch {
        // Audio feedback is optional and must never block the app.
      }
    },
    [preferences.soundMode, preferences.soundVolume],
  );
}

function getAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') sharedAudioContext = new AudioContextClass();
  if (sharedAudioContext.state === 'suspended') void sharedAudioContext.resume();
  return sharedAudioContext;
}
