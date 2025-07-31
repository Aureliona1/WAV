import { ArrOp, clamp } from "@aurellis/helpers";
import { BYTE_OFFSETS, type WAVBitDepth, type WAVFormat } from "../types.ts";

/**
 * Write a little-endian PCM or IEEE float to a DataView.
 * Signedness is determined by WAV convention.
 */
const encoders: {
	[key: string]: (view: DataView, pos: number, value: number) => void;
} = {
	i8: (view, pos, value) => {
		view.setUint8(pos, Math.round((clamp(value, [-1, 1]) + 1) * 127.5));
	},

	i16: (view, pos, value) => {
		view.setInt16(pos, Math.round(clamp(value, [-1, 1]) * 32767), true);
	},

	i24: (view, pos, value) => {
		const scaled = Math.round(clamp(value, [-1, 1]) * 8388607);
		let v = scaled < 0 ? scaled + 0x1000000 : scaled;
		view.setUint8(pos, v & 0xff);
		view.setUint8(pos + 1, (v >> 8) & 0xff);
		view.setUint8(pos + 2, (v >> 16) & 0xff);
	},

	i32: (view, pos, value) => {
		view.setInt32(pos, Math.round(clamp(value, [-1, 1]) * 2147483647), true);
	},

	f32: (view, pos, value) => {
		view.setFloat32(pos, clamp(value, [-1, 1]), true);
	},

	f64: (view, pos, value) => {
		view.setFloat64(pos, clamp(value, [-1, 1]), true);
	}
};

/**
 * Return an encode function of the specified bit depth and float.
 * Defaults to Uint8 if depth and float are invalid.
 */
function getEncoder(float: boolean, bits: WAVBitDepth): (view: DataView, pos: number, value: number) => void {
	const key = (float ? "f" : "i") + bits;
	return encoders[key] ?? encoders.i8;
}

/**
 * Encode audio data into a WAV file byte-array.
 * @param channelData The raw channel samples as float 32 values from 0-1.
 * @param sampleRate The sample rate of the audio.
 * @param format The format of the output (Default - 16-bit Int).
 */
export function encode(channelData: Float32Array[], sampleRate = 44100, format: WAVFormat = "16-bit Int"): Uint8Array {
	const channelCount = channelData.length; // 1 for mono, 2 for stereo
	const bitDepth = Number(format.substring(0, 2)) as WAVBitDepth;
	const bytesPerSec = (sampleRate * channelCount * bitDepth) / 8;
	const bytesPerBlock = (channelCount * bitDepth) / 8;
	const audioDataLength = channelData[0].length * channelCount * (bitDepth / 8);
	const float = format.at(-2) === "a";
	const outputBuffer = new ArrayBuffer(44 + audioDataLength);
	const view = new DataView(outputBuffer);

	// Write the RIFF header
	view.setUint32(0, 0x52494646, false); // "RIFF"
	view.setUint32(BYTE_OFFSETS.FILE_SIZE, 36 + audioDataLength, true);
	view.setUint32(8, 0x57415645, false); // "WAVE"

	// Write the fmt subchunk
	view.setUint32(12, 0x666d7420, false); // "fmt "
	view.setUint32(16, 16, true); // fmt chunk size, 16 for all cases here.
	view.setUint16(BYTE_OFFSETS.FORMAT, float ? 3 : 1, true);
	view.setUint16(BYTE_OFFSETS.CHANNELS, channelCount, true);
	view.setUint32(BYTE_OFFSETS.SAMPLE_RATE, sampleRate, true); // Sample rate
	view.setUint32(BYTE_OFFSETS.BYTES_PER_SEC, bytesPerSec, true); // Byte rate
	view.setUint16(BYTE_OFFSETS.BYTES_PER_BLOCK, bytesPerBlock, true); // Block align
	view.setUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, bitDepth, true); // Bits per sample

	// Write the data subchunk
	view.setUint32(36, 0x64617461, false); // "data"
	view.setUint32(BYTE_OFFSETS.SAMPLE_LENGTH, audioDataLength, true); // Data subchunk size

	// Interleave the channels.
	const interleavedSamples = ArrOp.interleave(...channelData);
	// Map to desired bit depth and write to buffer.
	for (let i = 0; i < interleavedSamples.length; i++) {
		getEncoder(float, bitDepth)(view, 44 + (i / 4) * (bitDepth / 8), interleavedSamples[i]);
	}

	return new Uint8Array(outputBuffer);
}
