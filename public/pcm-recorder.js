class PCMRecorder extends AudioWorkletProcessor {
  constructor() { super(); this.frames = []; this.length = 0; }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) {
      this.frames.push(new Float32Array(channel)); this.length += channel.length;
      if (this.length >= sampleRate / 4) {
        const samples = new Float32Array(this.length);
        let offset = 0;
        for (const frame of this.frames) { samples.set(frame, offset); offset += frame.length; }
        this.port.postMessage(samples, [samples.buffer]); this.frames = []; this.length = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-recorder', PCMRecorder);