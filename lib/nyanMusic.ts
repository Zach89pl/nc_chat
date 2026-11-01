// Muzyczka w stylu 8-bit. Jeśli w folderze public jest plik nyan.mp3,
// gra ten plik. W przeciwnym razie gra własną melodię z syntezatora.

const STEP = 0.1; // długość jednej szesnastki w sekundach

// Melodia (numery nut MIDI, null = pauza) – 4 takty po 16 kroków
const MELODY: (number | null)[] = [
  72, null, 76, null, 79, null, 76, null, 84, null, 79, null, 76, null, 74, null,
  72, null, 74, null, 76, null, 77, null, 79, null, null, null, 77, 76, 74, null,
  69, null, 72, null, 76, null, 72, null, 81, null, 76, null, 72, null, 71, null,
  69, null, 71, null, 72, null, 74, null, 76, null, 74, null, 72, null, null, null,
];

// Bas – jedna nuta podstawowa na takt
const BASS = [48, 43, 45, 41];

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class NyanMusic {
  private ctx?: AudioContext;
  private master?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private step = 0;
  private nextTime = 0;
  private file: HTMLAudioElement | null = null;
  private checked = false;
  private playing = false;

  async start() {
    if (this.playing) return;
    this.playing = true;

    if (!this.checked) {
      this.checked = true;
      try {
        const res = await fetch("/nyan.mp3", { method: "HEAD" });
        if (res.ok) {
          this.file = new Audio("/nyan.mp3");
          this.file.loop = true;
          this.file.volume = 0.4;
        }
      } catch {}
    }
    if (!this.playing) return;

    if (this.file) {
      this.file.play().catch(() => {});
      return;
    }

    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    const ctx = this.ctx;
    await ctx.resume();
    if (!this.playing) return;

    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setTargetAtTime(0.08, ctx.currentTime, 0.03);
    this.nextTime = ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
    this.timer = undefined;
    this.file?.pause();
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  private schedule() {
    const ctx = this.ctx!;
    while (this.nextTime < ctx.currentTime + 0.15) {
      const note = MELODY[this.step];
      if (note !== null) this.note(freq(note), this.nextTime, 0.18, "square", 0.5);
      if (this.step % 2 === 0) {
        const root = BASS[Math.floor(this.step / 16)];
        const octave = this.step % 4 === 0 ? 0 : 12;
        this.note(freq(root + octave), this.nextTime, 0.15, "triangle", 0.9);
      }
      this.nextTime += STEP;
      this.step = (this.step + 1) % MELODY.length;
    }
  }

  private note(hz: number, t: number, dur: number, type: OscillatorType, vol: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}
