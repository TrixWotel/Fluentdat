// Voice messages and attachments: recording your voice (with a live waveform), playing a voice message back, and the
// small things about files (sizes, kinds, picture sizes). Nothing here knows where files are kept; app.js does.
import { el, icon } from './ui.js';

export const VOICE_MAX = 300;                        // seconds in one voice message
const TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm'];
export const extFor = (type) => ({ 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' }[String(type).split(';')[0]] || 'webm');

// record from the microphone until stop() (or cancel()); onTick gets { secs, level } about 20 times a second
export async function record({ getMedia, onTick } = {}) {
  if (!window.MediaRecorder) throw new Error('This browser can’t record audio.');
  const stream = await (getMedia || ((c) => navigator.mediaDevices.getUserMedia(c)))({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 48000 } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  let ac = null, an = null;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(stream).connect(an); } catch {}
  const buf = new Float32Array(1024), levels = [], started = performance.now();
  const secs = () => (performance.now() - started) / 1000;
  const timer = setInterval(() => {
    let rms = 0;
    if (an) { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; rms = Math.sqrt(s / buf.length); }
    levels.push(rms);
    if (onTick) onTick({ secs: secs(), level: Math.min(1, rms * 6) });
    if (secs() >= VOICE_MAX) api.stop();
  }, 50);
  rec.start(250);
  let stopping = null;
  const finish = () => { clearInterval(timer); for (const t of stream.getTracks()) t.stop(); if (ac) ac.close().catch(() => {}); };
  const api = {
    stop() {
      if (stopping) return stopping;
      const length = secs();
      stopping = new Promise((res) => {
        rec.onstop = () => {
          finish();
          const kind = (rec.mimeType || type || 'audio/webm').split(';')[0];
          res({ blob: new Blob(chunks, { type: kind }), type: kind, secs: Math.max(0.1, Math.round(length * 10) / 10), wave: waveOf(levels) });
        };
        try { rec.stop(); } catch { rec.onstop(); }
      });
      return stopping;
    },
    cancel() { if (stopping) return; stopping = Promise.resolve(null); rec.onstop = finish; try { rec.stop(); } catch { finish(); } },
  };
  return api;
}
// a recording's loudness as 48 bars (0–100), for the waveform
export function waveOf(levels, bars = 48) {
  if (!levels.length) return Array(bars).fill(8);
  const per = levels.length / bars, out = [];
  for (let i = 0; i < bars; i++) { let m = 0; for (let j = Math.floor(i * per); j < Math.max(Math.floor((i + 1) * per), Math.floor(i * per) + 1) && j < levels.length; j++) m = Math.max(m, levels[j]); out.push(m); }
  const top = Math.max(...out, 0.02);
  return out.map((v) => Math.max(6, Math.round((v / top) * 100)));
}
export const clock = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// a voice message: play/pause, its waveform (click to jump), the time, and how fast. getUrl(path) → a link to the audio.
// The audio isn't on the page, so it keeps playing while the conversation redraws around it.
export function voicePlayer(f, getUrl) {
  const wave = (Array.isArray(f.wave) && f.wave.length ? f.wave : Array(48).fill(30)).slice(0, 64).map((v) => Math.max(6, Math.min(100, Number(v) || 6)));
  const total = Number(f.secs) || 0;
  const bars = wave.map((v) => el('i', { style: `height:${v}%` }));
  const time = el('span', { className: 'vt' }, clock(total));
  const play = el('button', { className: 'vplay', title: 'Play' }, icon('play', 16));
  const speed = el('button', { className: 'vspeed', title: 'Speed' }, '1×');
  const box = el('div', { className: 'voice' }, play, el('div', { className: 'vwave' }, ...bars), time, speed);
  let audio = null, rate = 1;
  const draw = () => {
    const at = audio ? audio.currentTime : 0, len = total || (audio && isFinite(audio.duration) ? audio.duration : 0) || 1;
    const k = Math.round((at / len) * bars.length);
    bars.forEach((b, i) => b.classList.toggle('past', i < k));
    time.textContent = audio && (at > 0 || !audio.paused) ? clock(at) : clock(total);
    play.replaceChildren(icon(audio && !audio.paused ? 'pause' : 'play', 16));
    play.title = audio && !audio.paused ? 'Pause' : 'Play';
  };
  const ensure = async () => {
    if (audio) return audio;
    play.disabled = true;
    try {
      audio = new Audio(await getUrl(f.path));
      audio.playbackRate = rate;
      for (const ev of ['timeupdate', 'play', 'pause', 'ended']) audio.addEventListener(ev, draw);
      audio.addEventListener('ended', () => { audio.currentTime = 0; draw(); });
    } finally { play.disabled = false; }
    return audio;
  };
  play.onclick = async () => { try { const a = await ensure(); if (a.paused) { stopOthers(a); await a.play(); } else a.pause(); } catch (e) { box.classList.add('broken'); box.title = 'Couldn’t play this voice message.'; } draw(); };
  box.querySelector('.vwave').onclick = async (e) => {
    const r = e.currentTarget.getBoundingClientRect(), frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    try { const a = await ensure(); a.currentTime = frac * (total || a.duration || 0); if (a.paused) { stopOthers(a); await a.play(); } } catch {}
    draw();
  };
  speed.onclick = () => { rate = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1; speed.textContent = rate + '×'; if (audio) audio.playbackRate = rate; };
  return box;
}
// one voice message at a time
const playing = new Set();
function stopOthers(a) { for (const x of playing) if (x !== a) x.pause(); playing.clear(); playing.add(a); }

// ---------- files ----------
export const fileSize = (n) => (n < 1024 ? `${n} bytes` : n < 1048576 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`);
export const isImage = (type) => /^image\/(png|jpeg|gif|webp|avif)$/i.test(type || '');
export const isVideo = (type) => /^video\/(mp4|webm|ogg|quicktime)$/i.test(type || '');
export const isAudio = (type) => /^audio\//i.test(type || '');
// a picture's size (for laying it out before it loads)
export async function pictureSize(file) {
  try { const b = await createImageBitmap(file); const s = { w: b.width, h: b.height }; b.close && b.close(); return s; } catch { return {}; }
}
