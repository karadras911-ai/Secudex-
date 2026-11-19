import { AUDIO_TRACKS, STAGES } from '../config/stages.js';

export function createVoicePlayer(state, sfx) {
  const audioState = {
    muted: false,
    activeKey: 'intro',
    player: new Audio(),
    urls: {
      intro: AUDIO_TRACKS.intro.url,
      scan: AUDIO_TRACKS.scan.url,
      transfer: AUDIO_TRACKS.transfer.url,
      finale: AUDIO_TRACKS.finale.url,
    },
  };
  audioState.player.preload = 'auto';

  let pendingIntroTrackRetry = false;

  function playVoiceTrack(trackKey) {
    audioState.activeKey = trackKey;
    document.body.setAttribute('data-audio-track', trackKey);
    const meta = AUDIO_TRACKS[trackKey] || AUDIO_TRACKS.intro;
    const labelEl = document.getElementById('audio-active-label');
    if (labelEl) labelEl.textContent = `Активная дорожка: ${meta.label}`;
    document.querySelectorAll('.audio-slot').forEach(el => {
      el.classList.toggle('playing', el.getAttribute('data-track-slot') === trackKey);
    });

    audioState.player.pause();
    audioState.player.currentTime = 0;

    const src = audioState.urls[trackKey];
    if (src && !audioState.muted) {
      audioState.player.src = src;
      audioState.player.play().catch(() => {
        if (trackKey === 'intro') pendingIntroTrackRetry = true;
      });
    }
  }

  function retryPendingIntroAudio() {
    sfx?.unlockAudio?.();
    if (!pendingIntroTrackRetry || audioState.muted) return;
    pendingIntroTrackRetry = false;
    if (state.stage === STAGES.INTRO && audioState.urls.intro && audioState.player.paused) {
      audioState.player.play().catch(() => {});
    }
  }
  window.addEventListener('pointerdown', retryPendingIntroAudio, { passive: true });
  window.addEventListener('keydown', retryPendingIntroAudio, { passive: true });

  document.querySelectorAll('[data-track-upload]').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      const key = e.target.getAttribute('data-track-upload');
      if (!file || !key) return;
      if (audioState.urls[key]?.startsWith('blob:')) URL.revokeObjectURL(audioState.urls[key]);
      audioState.urls[key] = URL.createObjectURL(file);
      const nameEl = document.getElementById(`track-name-${key}`);
      if (nameEl) nameEl.textContent = file.name;
      if (audioState.activeKey === key) playVoiceTrack(key);
    });
  });

  function toggleMute() {
    audioState.muted = !audioState.muted;
    if (audioState.muted) audioState.player.pause();
    return audioState.muted;
  }

  return {
    audioState,
    playVoiceTrack,
    toggleMute,
  };
}
