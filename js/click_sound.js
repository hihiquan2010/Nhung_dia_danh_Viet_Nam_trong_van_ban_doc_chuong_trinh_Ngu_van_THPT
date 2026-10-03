const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playClickSound() {
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";

  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    40,
    audioContext.currentTime + 0.05,
  );

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.05,
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.05);
}

window.addEventListener("pointerdown", playClickSound);
