// Generates placeholder SFX WAVs into public/sfx. Replace with real audio later.
const fs = require("fs");
const path = require("path");
const RATE = 22050;

function tone(freq, dur, type) {
  const n = Math.floor(RATE * dur);
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * 8); // quick decay
    let f = freq;
    if (type === "rise") f = freq * (1 + t * 2);
    if (type === "fall") f = freq * (1 - t * 0.5);
    let s = Math.sin(2 * Math.PI * f * t);
    if (type === "noise") s = Math.random() * 2 - 1;
    const v = Math.max(-1, Math.min(1, s * env));
    data.writeInt16LE((v * 32767) | 0, i * 2);
  }
  return data;
}

function wav(samples) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + samples.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);  // PCM
  header.writeUInt16LE(1, 22);  // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(samples.length, 40);
  return Buffer.concat([header, samples]);
}

const sfx = {
  jump: tone(440, 0.15, "rise"),
  throw: tone(300, 0.12, "noise"),
  stomp: tone(120, 0.18, "fall"),
  coin: tone(880, 0.18, "plain"),
  hurt: tone(220, 0.25, "fall"),
  peel: tone(660, 0.1, "plain"),
};

const force = process.argv.includes("--force");
const dir = path.join("public", "sfx");
fs.mkdirSync(dir, { recursive: true });
for (const [name, samples] of Object.entries(sfx)) {
  const file = path.join(dir, name + ".wav");
  if (fs.existsSync(file) && !force) { console.log("skip (exists): " + file); continue; }
  fs.writeFileSync(file, wav(samples));
  console.log("wrote " + file);
}
