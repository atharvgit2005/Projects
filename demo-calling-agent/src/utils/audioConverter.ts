/**
 * High-performance G.711 µ-law (mulaw) <-> PCM16 16-bit Audio Converter & Resampler.
 * Handles audio conversion between Twilio Media Streams (8kHz mulaw) and Gemini Live API (16kHz / 24kHz PCM16).
 */

// Precomputed µ-law to 16-bit PCM expansion table (256 entries)
const MULAW_TO_PCM16_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  const mulaw = ~i;
  const sign = (mulaw & 0x80) ? -1 : 1;
  const exponent = (mulaw >> 4) & 0x07;
  const mantissa = mulaw & 0x0f;
  let sample = (mantissa << 3) + 0x84;
  sample <<= exponent;
  sample -= 0x84;
  MULAW_TO_PCM16_TABLE[i] = sign * sample;
}

/**
 * Encodes a 16-bit linear PCM sample into 8-bit G.711 µ-law.
 */
function pcm16ToMuLawSample(pcm: number): number {
  const CLIP = 32635;
  const BIAS = 0x84;

  let sample = pcm;
  let sign = 0;

  if (sample < 0) {
    sample = -sample;
    sign = 0x80;
  }

  if (sample > CLIP) {
    sample = CLIP;
  }

  sample += BIAS;

  let exponent = 7;
  for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; expMask >>= 1) {
    exponent--;
  }

  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  const mulawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;
  return mulawByte;
}

export class AudioConverter {
  /**
   * Converts Twilio base64 µ-law 8kHz audio chunk to base64 PCM16 16kHz audio chunk for Gemini input.
   */
  public static mulaw8kToPcm16k(base64Mulaw: string): string {
    const mulawBuffer = Buffer.from(base64Mulaw, 'base64');
    const inputSamples = mulawBuffer.length;
    
    // 8kHz to 16kHz requires 2x samples
    const outputBuffer = Buffer.alloc(inputSamples * 2 * 2); // 2 samples per input, 2 bytes per sample (PCM16)

    for (let i = 0; i < inputSamples; i++) {
      const pcmCurrent = MULAW_TO_PCM16_TABLE[mulawBuffer[i]];
      const pcmNext = (i < inputSamples - 1) 
        ? MULAW_TO_PCM16_TABLE[mulawBuffer[i + 1]] 
        : pcmCurrent;

      // Sample 1 (exact)
      outputBuffer.writeInt16LE(pcmCurrent, i * 4);
      
      // Sample 2 (interpolated midpoint)
      const pcmInterpolated = Math.round((pcmCurrent + pcmNext) / 2);
      outputBuffer.writeInt16LE(pcmInterpolated, i * 4 + 2);
    }

    return outputBuffer.toString('base64');
  }

  /**
   * Converts Gemini base64 PCM16 (24kHz or 16kHz) output to Twilio base64 µ-law 8kHz audio chunk.
   * @param base64Pcm Base64 encoded PCM16 buffer from Gemini
   * @param inputSampleRate Input PCM sample rate (default 24000 or 16000)
   */
  public static pcmToMulaw8k(base64Pcm: string, inputSampleRate: number = 24000): string {
    const pcmBuffer = Buffer.from(base64Pcm, 'base64');
    const totalPcmSamples = pcmBuffer.length / 2;

    if (totalPcmSamples === 0) return '';

    // Calculate downsampling ratio (e.g. 24000 / 8000 = 3, 16000 / 8000 = 2)
    const ratio = inputSampleRate / 8000;
    const outputSamplesCount = Math.floor(totalPcmSamples / ratio);
    const mulawBuffer = Buffer.alloc(outputSamplesCount);

    for (let i = 0; i < outputSamplesCount; i++) {
      const pcmIndex = Math.floor(i * ratio);
      const byteOffset = pcmIndex * 2;
      
      if (byteOffset + 1 < pcmBuffer.length) {
        const pcmSample = pcmBuffer.readInt16LE(byteOffset);
        mulawBuffer[i] = pcm16ToMuLawSample(pcmSample);
      }
    }

    return mulawBuffer.toString('base64');
  }
}
