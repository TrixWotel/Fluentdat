// Fluentdat's calls: voice, video and screen sharing, straight between browsers (WebRTC, every pair connected).
// The people in a call meet in one private Supabase Realtime channel: presence says who's there and whether their
// mic, camera and screen are on; broadcast messages carry each pair's offers, answers and network candidates.
// (supabase/setup.sql only lets the people in that DM, or that server's members, into the channel.) Each pair
// negotiates the "perfect negotiation" way, so either side may change what it sends at any time without clashing.
const AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
const VIDEO = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };

// what went wrong with the camera or microphone, in words
export function mediaTrouble(e, what = 'microphone') {
  const n = (e && e.name) || '';
  if (/NotAllowed|Security/.test(n)) return `Fluentdat isn’t allowed to use your ${what}. Allow it in the browser (in Fluent: the bar at the top of the tab, or Site Settings) and try again.`;
  if (/NotFound|Overconstrained/.test(n)) return `No ${what} was found. Plug one in and try again.`;
  if (/NotReadable|Abort/.test(n)) return `Your ${what} is busy (another app may be using it).`;
  return `Couldn’t start your ${what}: ${(e && e.message) || e}`;
}

export async function joinCall({ store, topic, me, video = false, mic = true, deaf = false, silent = false, getMedia, getScreen, onUpdate = () => {}, onEnd = () => {} }) {
  const media = getMedia || ((c) => navigator.mediaDevices.getUserMedia(c));
  const screenMedia = getScreen || ((c) => navigator.mediaDevices.getDisplayMedia(c));
  const self = { pid: 'p' + crypto.randomUUID().replace(/-/g, '').slice(0, 16), uid: me.id, mic, deaf, cam: false, screen: false, speaking: false, warning: '' };
  const peers = new Map();
  // (your screen goes out in a stream of its own that keeps its name between shares, so the others can tell it from your camera)
  let local = null, screen = null, ended = false, ch = null;
  const screenBox = new MediaStream();
  const update = () => { if (!ended) try { onUpdate(api); } catch (e) { console.error(e); } };

  // your microphone (and camera): a call still works without them, just listening
  try { local = await media({ audio: AUDIO, video: video ? VIDEO : false }); }
  catch (e) {
    if (video) { try { local = await media({ audio: AUDIO }); self.warning = mediaTrouble(e, 'camera'); } catch (e2) { self.warning = mediaTrouble(e2); } }
    else self.warning = mediaTrouble(e);
  }
  if (!local) { local = new MediaStream(); self.mic = false; }
  self.cam = local.getVideoTracks().length > 0;
  const micTrack = () => local.getAudioTracks()[0] || null;
  const camTrack = () => local.getVideoTracks()[0] || null;
  const applyMic = () => { const t = micTrack(); if (t) t.enabled = self.mic && !self.deaf; };
  applyMic();

  // who's speaking: a level meter on each voice (yours included)
  let ac = null;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  const meter = (stream) => {
    if (!ac || !stream.getAudioTracks().length) return null;
    try { const src = ac.createMediaStreamSource(stream), an = ac.createAnalyser(); an.fftSize = 512; src.connect(an); return { an, buf: new Float32Array(an.fftSize) }; } catch { return null; }
  };
  const loud = (m) => { if (!m) return false; m.an.getFloatTimeDomainData(m.buf); let s = 0; for (const v of m.buf) s += v * v; return Math.sqrt(s / m.buf.length) > 0.02; };
  let myMeter = meter(local);
  const meterTimer = setInterval(() => {
    let changed = false;
    const me2 = self.mic && !self.deaf && loud(myMeter);
    if (me2 !== self.speaking) { self.speaking = me2; changed = true; }
    for (const p of peers.values()) { const s = p.meta.mic !== false && loud(p.meter); if (s !== p.speaking) { p.speaking = s; changed = true; } }
    if (changed) update();
  }, 150);

  // ---- the meeting place ----
  ch = store.callChannel(topic, self.pid);
  const signal = (to, data) => ch.send({ type: 'broadcast', event: 'signal', payload: { from: self.pid, to, uid: me.id, ...data } });
  const meta = () => ({ uid: me.id, mic: self.mic && !self.deaf && !!micTrack(), deaf: self.deaf, cam: self.cam && !!camTrack(), screen: self.screen,
    camStream: local.id, screenStream: screenBox.id, at: Date.now() });
  const announce = () => { try { ch.track(meta()); } catch {} };

  function peer(pid) {
    let p = peers.get(pid);
    if (p) return p;
    const pc = new RTCPeerConnection({ iceServers: store.iceServers() });
    p = { pid, uid: null, pc, polite: self.pid > pid, makingOffer: false, ignoreOffer: false, seen: false, born: Date.now(),
      meta: {}, streams: new Map(), audio: null, meter: null, speaking: false, senders: {} };
    peers.set(pid, p);
    // what you send: your microphone, your camera, your screen (each on its own, so they can change separately)
    if (micTrack()) p.senders.mic = pc.addTrack(micTrack(), local); else pc.addTransceiver('audio', { direction: 'recvonly' });
    if (camTrack()) p.senders.cam = pc.addTrack(camTrack(), local);
    if (screen && screen.getVideoTracks()[0]) p.senders.screen = pc.addTrack(screen.getVideoTracks()[0], screenBox);
    pc.ontrack = ({ track, streams }) => {
      const s = streams[0] || new MediaStream([track]);
      p.streams.set(s.id, s);
      if (track.kind === 'audio') {
        p.audio = p.audio || Object.assign(new Audio(), { autoplay: true });
        p.audio.srcObject = new MediaStream([track]);
        p.audio.muted = self.deaf || silent;
        p.audio.play().catch(() => {});
        p.meter = meter(new MediaStream([track]));
      }
      for (const ev of ['mute', 'unmute', 'ended']) track.addEventListener(ev, update);
      s.onremovetrack = update;
      update();
    };
    pc.onicecandidate = ({ candidate }) => { if (candidate) signal(pid, { candidate: candidate.toJSON() }); };
    pc.onnegotiationneeded = async () => {
      try { p.makingOffer = true; await pc.setLocalDescription(); signal(pid, { description: pc.localDescription.toJSON() }); }
      catch (e) { console.warn('call: offer', e); } finally { p.makingOffer = false; }
    };
    pc.oniceconnectionstatechange = () => {
      clearTimeout(p.stuck);
      if (pc.iceConnectionState === 'failed') pc.restartIce();
      else if (pc.iceConnectionState === 'disconnected') p.stuck = setTimeout(() => { if (pc.iceConnectionState === 'disconnected') pc.restartIce(); }, 4000);
      update();
    };
    pc.onconnectionstatechange = update;
    return p;
  }
  function drop(pid) {
    const p = peers.get(pid); if (!p) return;
    peers.delete(pid);
    try { p.pc.close(); } catch {}
    if (p.audio) { p.audio.srcObject = null; p.audio.remove(); }
    update();
  }
  // each person's signals are handled one after another, in the order they came (an offer's candidates can arrive
  // while the offer is still being taken in, and must wait for it)
  function onSignal({ payload: m }) {
    if (!m || m.to !== self.pid || m.from === self.pid) return;
    const p = peer(m.from);
    p.queue = (p.queue || Promise.resolve()).then(() => handleSignal(p, m));
  }
  async function handleSignal(p, m) {
    const pc = p.pc;
    if (m.uid) p.uid = m.uid;
    try {
      if (m.description) {
        const collision = m.description.type === 'offer' && (p.makingOffer || pc.signalingState !== 'stable');
        p.ignoreOffer = !p.polite && collision;
        if (p.ignoreOffer) return;
        await pc.setRemoteDescription(m.description);
        if (m.description.type === 'offer') { await pc.setLocalDescription(); signal(m.from, { description: pc.localDescription.toJSON() }); }
      } else if (m.candidate) {
        try { await pc.addIceCandidate(m.candidate); } catch (e) { if (!p.ignoreOffer) throw e; }
      }
    } catch (e) { console.warn('call: signal', e); }
  }
  // who's here: everyone's presence (one per open call, so the same person on two devices is two)
  function onPresence() {
    const st = ch.presenceState() || {}, here = new Set();
    for (const [pid, metas] of Object.entries(st)) {
      if (pid === self.pid || !metas || !metas.length) continue;
      here.add(pid);
      const p = peer(pid);
      p.seen = true; p.meta = metas[metas.length - 1] || {}; p.uid = p.meta.uid || p.uid;
    }
    for (const [pid, p] of peers) if (!here.has(pid) && (p.seen || Date.now() - p.born > 15000)) drop(pid);
    update();
  }
  ch.on('broadcast', { event: 'signal' }, onSignal);
  ch.on('presence', { event: 'sync' }, onPresence);
  await new Promise((res, rej) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; rej(new Error('The call didn’t connect in time. Check your connection and try again.')); } }, 15000);
    ch.subscribe((status, err) => {
      if (done) { if (status === 'CHANNEL_ERROR' || status === 'CLOSED') { if (!ended) { self.warning = 'The call’s connection dropped. Trying again…'; update(); } } return; }
      if (status === 'SUBSCRIBED') { done = true; clearTimeout(t); announce(); res(); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        done = true; clearTimeout(t);
        const msg = String((err && err.message) || '');
        rej(new Error(/unauthori[sz]ed|denied|policy|permission|rls/i.test(msg) || status === 'CHANNEL_ERROR'
          ? 'Fluentdat couldn’t join the call’s private channel. If calls have never worked, run the newest supabase/setup.sql in Supabase.'
          : 'The call didn’t connect in time. Check your connection and try again.'));
      }
    });
  }).catch((e) => { cleanup(); throw e; });

  function cleanup() {
    ended = true;
    clearInterval(meterTimer);
    for (const pid of [...peers.keys()]) drop(pid);
    try { ch.untrack(); } catch {}
    store.dropChannel(ch);
    for (const t of [...local.getTracks(), ...(screen ? screen.getTracks() : [])]) t.stop();
    if (ac) ac.close().catch(() => {});
  }
  // (someone who joined but never answered presence: let their half-made connection go)
  const tidy = setInterval(() => { for (const [pid, p] of peers) if (!p.seen && Date.now() - p.born > 15000) drop(pid); }, 5000);

  // a track that just started or stopped, for every person in the call
  function sendTrack(kind, track, stream) {
    for (const p of peers.values()) {
      const s = p.senders[kind];
      if (s) s.replaceTrack(track).catch(() => {});
      else if (track) p.senders[kind] = p.pc.addTrack(track, stream);
    }
  }
  const api = {
    topic, self,
    local: () => local, screenStream: () => screen,
    people: () => [...peers.values()].filter((p) => p.seen || p.uid).map((p) => {
      // (the same stream object each time for the same picture, so a video on screen isn't restarted)
      const live = (id) => {
        const s = id && p.streams.get(id), v = s && s.getVideoTracks().find((t) => t.readyState === 'live');
        if (!v) return null;
        p.views = p.views || {};
        if (!p.views[id] || p.views[id].getVideoTracks()[0] !== v) p.views[id] = new MediaStream([v]);
        return p.views[id];
      };
      return { pid: p.pid, uid: p.uid, mic: p.meta.mic !== false, deaf: !!p.meta.deaf, speaking: p.speaking,
        cam: p.meta.cam ? live(p.meta.camStream) : null, screen: p.meta.screen ? live(p.meta.screenStream) : null,
        connected: ['connected', 'completed'].includes(p.pc.iceConnectionState), state: p.pc.connectionState };
    }),
    async setMic(on) {
      if (on && !micTrack()) {          // (no microphone yet: ask again)
        try { const s = await media({ audio: AUDIO }); const t = s.getAudioTracks()[0]; local.addTrack(t); myMeter = meter(local); sendTrack('mic', t, local); self.warning = ''; }
        catch (e) { self.warning = mediaTrouble(e); update(); return false; }
      }
      self.mic = on; if (on) self.deaf = false; applyMic(); for (const p of peers.values()) if (p.audio) p.audio.muted = self.deaf || silent;
      announce(); update(); return true;
    },
    setDeaf(on) { self.deaf = on; applyMic(); for (const p of peers.values()) if (p.audio) p.audio.muted = on || silent; announce(); update(); },
    async setCam(on) {
      if (on && !camTrack()) {
        let s; try { s = await media({ video: VIDEO }); } catch (e) { self.warning = mediaTrouble(e, 'camera'); update(); return false; }
        const t = s.getVideoTracks()[0]; local.addTrack(t); sendTrack('cam', t, local);
      } else if (!on && camTrack()) {
        const t = camTrack(); t.stop(); local.removeTrack(t); sendTrack('cam', null, local);    // (stopped, so the camera light goes off)
      }
      self.cam = on; self.warning = ''; announce(); update(); return true;
    },
    async setScreen(on) {
      if (on && !screen) {
        try { screen = await screenMedia({ video: { frameRate: { ideal: 30 } }, audio: false }); } catch (e) { if (!/NotAllowed|Abort/.test(e && e.name)) { self.warning = mediaTrouble(e, 'screen'); update(); } return false; }
        const t = screen.getVideoTracks()[0];
        t.addEventListener('ended', () => api.setScreen(false));          // (the browser's own "Stop sharing")
        for (const old of screenBox.getTracks()) screenBox.removeTrack(old);
        screenBox.addTrack(t);
        sendTrack('screen', t, screenBox);
      } else if (!on && screen) {
        for (const t of screen.getTracks()) t.stop();
        for (const old of screenBox.getTracks()) screenBox.removeTrack(old);
        sendTrack('screen', null, screenBox);
        screen = null;
      }
      self.screen = !!screen; announce(); update(); return true;
    },
    leave() { if (ended) return; clearInterval(tidy); cleanup(); onEnd(); },
    get ended() { return ended; },
  };
  update();
  return api;
}
