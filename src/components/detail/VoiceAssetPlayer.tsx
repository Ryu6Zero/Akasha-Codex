import { useEffect, useRef, useState } from 'react';
import type { VoiceAsset } from '../../types';

type VoiceAssetPlayerProps = {
  voice: VoiceAsset;
};

export function VoiceAssetPlayer({ voice }: VoiceAssetPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [voice.fileUrl]);

  async function togglePlayback(): Promise<void> {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  }

  function seek(value: number): void {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  return (
    <div className="voice-asset-player">
      <audio
        ref={audioRef}
        src={voice.fileUrl}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />
      <button type="button" disabled={!voice.fileUrl} onClick={togglePlayback}>
        {isPlaying ? '暂停' : '播放'}
      </button>
      <div className="voice-player-main">
        <strong>{voice.label}</strong>
        {voice.line || voice.subtitle ? <p>{voice.line || voice.subtitle}</p> : null}
        <input
          aria-label={`${voice.label} playback position`}
          min="0"
          max={duration || 0}
          step="0.01"
          type="range"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <small>{formatTime(currentTime)} / {formatTime(duration)}</small>
      </div>
    </div>
  );
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
