import { clog, mapRange } from "@aurellis/helpers";
import { BYTE_OFFSETS, type DecodeResult, type WAVBitDepth } from "../types.ts";

/**
 * Get a little-endian PCM or IEEE float from a DataView.
 * Signedness is determined by WAV convention.
 */
const decoders: {
	[key: string]: (view: DataView, pos: number) => number;
} = {
	i8: (view, pos) => mapRange(view.getUint8(pos), [0, (1 << 8) - 1], [-1, 1]),
	i16: (view, pos) => mapRange(view.getInt16(pos, true), [-(1 << 15), (1 << 15) - 1], [-1, 1]),
	i24: (view, pos) => {
		const byte1 = view.getUint8(pos);
		const byte2 = view.getUint8(pos + 1);
		const byte3 = view.getUint8(pos + 2);
		let val = (byte3 << 16) | (byte2 << 8) | byte1;
		if (val & 0x800000) val |= 0xff000000;
		return mapRange(val, [-0x800000, 0x7fffff], [-1, 1]);
	},
	i32: (view, pos) => mapRange(view.getInt32(pos, true), [-0x80000000, 0x7fffffff], [-1, 1]),
	f32: (view, pos) => view.getFloat32(pos, true),
	f64: (view, pos) => view.getFloat64(pos, true) // Pretty sure this isn't even valid in the WAV spec, but I guess it is technically possible.
};

/**
 * Returns a function that accepts a data view and a position and decodes the data specified by the format arguments into a float from [-1, 1].
 * @param float Whether the data is already encoded as a float.
 * @param bits The bit depth of the encoded data. 8-bit depth is treated as u8, but all other depths are signed.
 */
export function byteDecoderLE(float: boolean, bits: WAVBitDepth): (view: DataView, pos: number) => number {
	const key = (float ? "f" : "i") + bits;
	if (!(key in decoders)) clog(`The specified bit format (${key}) is not a valid WAV format, your audio file may be corrupted. WAV will treat the audio as i8.`, "Warning");
	return decoders[key] ?? decoders.i8;
}

/**
 * Decode a WAV file from a byte-array. This assumes that the file is a valid WAV.
 * @param bytes The input byte-array.
 */
export function decode(bytes: Uint8Array): DecodeResult {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
	let fmtOffset = 0;
	// Incase there are chunks before fmt
	while (view.getUint32(fmtOffset + 12) !== 0x666d7420) {
		fmtOffset += 4;
		fmtOffset += view.getUint32(fmtOffset + 12, true);
		fmtOffset += 4;
	}
	// Get fmt
	const float = view.getUint16(BYTE_OFFSETS.FORMAT + fmtOffset, true) === 3;
	const channelCount = view.getUint16(BYTE_OFFSETS.CHANNELS + fmtOffset, true);
	const sampleRate = view.getUint32(BYTE_OFFSETS.SAMPLE_RATE + fmtOffset, true);
	let bitsPerSample = view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE + fmtOffset, true);
	bitsPerSample = [8, 16, 24, 32].includes(bitsPerSample) ? bitsPerSample : 16;

	// In case there are chunks between fmt and data
	let dataOffset = fmtOffset + BYTE_OFFSETS.DATA_CHUNK;
	while (view.getUint32(dataOffset) !== 0x64617461) {
		dataOffset += 4;
		dataOffset += view.getUint32(dataOffset, true);
		dataOffset += 4;
	}

	const dataStart = dataOffset + 8;
	const dataLength = view.getUint32(dataOffset + 4, true);
	const sampleLength = dataLength / ((channelCount * bitsPerSample) / 8);
	const channels = Array.from({ length: channelCount }, () => new Float64Array(sampleLength));
	for (let cursor = dataStart, block = 0; block < sampleLength; block++) {
		for (let channel = 0; channel < channelCount; channel++) {
			channels[channel][block] = byteDecoderLE(float, bitsPerSample as WAVBitDepth)(view, cursor);
			cursor += bitsPerSample / 8;
		}
	}
	return { sampleRate, channelData: channels };
}
