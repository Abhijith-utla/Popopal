export class AudioPlayer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private initialized = false

  async start() {
    if (this.initialized) return
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 })
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 512
    await this.audioContext.audioWorklet.addModule('/audio/AudioPlayerProcessor.worklet.js')
    this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-player-processor')
    this.workletNode.connect(this.analyser)
    this.analyser.connect(this.audioContext.destination)
    this.initialized = true
  }

  bargeIn() {
    if (!this.workletNode) return
    this.workletNode.port.postMessage({ type: 'barge-in' })
  }

  stop() {
    try { this.audioContext?.close() } catch {}
    try { this.analyser?.disconnect() } catch {}
    try { this.workletNode?.disconnect() } catch {}
    this.initialized = false
    this.audioContext = null
    this.analyser = null
    this.workletNode = null
  }

  playAudio(samples: Float32Array) {
    if (!this.initialized || !this.workletNode) return
    this.workletNode.port.postMessage({ type: 'audio', audioData: samples })
  }
}
