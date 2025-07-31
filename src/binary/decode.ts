import { BYTE_OFFSETS, type DecodeResult, type WAVBitDepth } from "../types.ts";

/**
 * Get a little-endian PCM or IEEE float from a DataView.
 * Signedness is determined by WAV convention.
 */
const decoders: {
	[key: string]: (view: DataView, pos: number) => number;
} = {
	i8: (view, pos) => view.getUint8(pos),
	i16: (view, pos) => view.getInt16(pos, true),
	i24: (view, pos) => {
		const byte1 = view.getUint8(pos);
		const byte2 = view.getUint8(pos + 1);
		const byte3 = view.getUint8(pos + 2);
		let val = (byte3 << 16) | (byte2 << 8) | byte1;
		if (val & 0x800000) val |= 0xff000000;
		return val;
	},
	i32: (view, pos) => view.getInt32(pos, true),
	f32: (view, pos) => view.getFloat32(pos, true),
	f64: (view, pos) => view.getFloat64(pos, true) // Pretty sure this isn't even valid in the WAV spec, but I guess it is technically possible.
};

/**
 * Return a decode function of the specified bit depth and float.
 * Defaults to Uint8 if depth and float are invalid.
 */
function getDecoder(float: boolean, bits: WAVBitDepth): (view: DataView, pos: number) => number {
	const key = (float ? "f" : "i") + bits;
	return decoders[key] ?? decoders.i8;
}

/**
 * Decode a WAV file from a byte-array. This assumes that the file is a valid WAV.
 * @param bytes The input byte-array.
 */
export function decode(bytes: Uint8Array): DecodeResult {
	const view = new DataView(bytes.buffer);
	const float = view.getUint16(BYTE_OFFSETS.FORMAT, true) === 3;
	const channelCount = view.getUint16(BYTE_OFFSETS.CHANNELS, true);
	const sampleRate = view.getUint32(BYTE_OFFSETS.SAMPLE_RATE, true);
	let bitsPerSample = view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, true);
	// Validate this since we can't decode otherwise.
	bitsPerSample = [8, 16, 24, 32].includes(bitsPerSample) ? bitsPerSample : 16;
	const sampleLength = (bytes.length - 44) / ((channelCount * bitsPerSample) / 8);
	const channels = Array.from({ length: channelCount }, () => new Float32Array(sampleLength));
	for (let cursor = BYTE_OFFSETS.SAMPLE_START, block = 0; cursor < bytes.length; block++) {
		for (let channel = 0; channel < channelCount; channel++) {
			channels[channel][block] = getDecoder(float, bitsPerSample as WAVBitDepth)(view, cursor);
			cursor += bitsPerSample / 8;
		}
	}
	return { sampleRate, channelData: channels };
}
