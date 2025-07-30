/**
 * Return Uint8Array with WAV data encoded
 * @param raw The raw audio as Float32Array[]
 * @param sampleRate The sample rate of the audio
 */
export function encode(raw: Float32Array[], sampleRate = 44100): Uint8Array {
	const bitDepth = 16;
	const channels = raw.length; // 1 for mono, 2 for stereo
	const byteRate = (sampleRate * channels * bitDepth) / 8;
	const blockAlign = (channels * bitDepth) / 8;
	const audioDataLength = raw[0].length * channels * (bitDepth / 8);
	const wavBuffer = new ArrayBuffer(44 + audioDataLength);
	const view = new DataView(wavBuffer);

	// Write the RIFF header
	view.setUint32(0, 0x52494646, false); // "RIFF"
	view.setUint32(4, 36 + audioDataLength, true); // Chunk size
	view.setUint32(8, 0x57415645, false); // "WAVE"

	// Write the fmt subchunk
	view.setUint32(12, 0x666d7420, false); // "fmt "
	view.setUint32(16, 16, true); // Subchunk1 size (16 for PCM)
	view.setUint16(20, 1, true); // Audio format (1 for PCM)
	view.setUint16(22, channels, true); // Number of channels (1 or 2)
	view.setUint32(24, sampleRate, true); // Sample rate
	view.setUint32(28, byteRate, true); // Byte rate
	view.setUint16(32, blockAlign, true); // Block align
	view.setUint16(34, bitDepth, true); // Bits per sample

	// Write the data subchunk
	view.setUint32(36, 0x64617461, false); // "data"
	view.setUint32(40, audioDataLength, true); // Data subchunk size

	// Write interleaved audio data (or mono if only one channel)
	let offset = 44;
	for (let i = 0; i < raw[0].length; i++) {
		// Left or mono channel sample
		const leftSample = Math.max(-1, Math.min(1, raw[0][i]));
		const leftIntSample = leftSample < 0 ? leftSample * 0x8000 : leftSample * 0x7fff;
		view.setInt16(offset, leftIntSample, true);
		offset += 2;

		// Right channel sample (if stereo)
		if (raw[1]) {
			const rightSample = Math.max(-1, Math.min(1, raw[1][i]));
			const rightIntSample = rightSample < 0 ? rightSample * 0x8000 : rightSample * 0x7fff;
			view.setInt16(offset, rightIntSample, true);
			offset += 2;
		}
	}

	return new Uint8Array(wavBuffer);
}
