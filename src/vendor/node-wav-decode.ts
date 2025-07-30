import type { DecodeResult } from "../types.ts";

type DecodeTable = {
	[f: string]: (buffer: Uint8Array, offset: number, output: Float32Array[], channels: number, samples: number) => void;
};

const data_decoders: DecodeTable = {
	pcm8: (buffer, offset, output, channels, samples) => {
		let input = new Uint8Array(buffer.buffer, offset);
		let pos = 0;
		for (let i = 0; i < samples; ++i) {
			for (let ch = 0; ch < channels; ++ch) {
				let data = input[pos++] - 128;
				output[ch][i] = data < 0 ? data / 128 : data / 127;
			}
		}
	},
	pcm16: (buffer, offset, output, channels, samples) => {
		let input = new Int16Array(buffer.buffer, offset);
		let pos = 0;
		for (let i = 0; i < samples; ++i) {
			for (let ch = 0; ch < channels; ++ch) {
				let data = input[pos++];
				output[ch][i] = data < 0 ? data / 32768 : data / 32767;
			}
		}
	},
	pcm24: (buffer, offset, output, channels, samples) => {
		let input = new Uint8Array(buffer.buffer, offset);
		let pos = 0;
		for (let i = 0; i < samples; ++i) {
			for (let ch = 0; ch < channels; ++ch) {
				let x0 = input[pos++];
				let x1 = input[pos++];
				let x2 = input[pos++];
				let xx = x0 + (x1 << 8) + (x2 << 16);
				let data = xx > 8388608 ? xx - 16777216 : xx;
				output[ch][i] = data < 0 ? data / 8388608 : data / 8388607;
			}
		}
	},
	pcm32: (buffer, offset, output, channels, samples) => {
		let input = new Int32Array(buffer.buffer, offset);
		let pos = 0;
		for (let i = 0; i < samples; ++i) {
			for (let ch = 0; ch < channels; ++ch) {
				let data = input[pos++];
				output[ch][i] = data < 0 ? data / 2147483648 : data / 2147483647;
			}
		}
	},
	pcm32f: (buffer, offset, output, channels, samples) => {
		let input = new Float32Array(buffer.buffer, offset);
		let pos = 0;
		for (let i = 0; i < samples; ++i) {
			for (let ch = 0; ch < channels; ++ch) output[ch][i] = input[pos++];
		}
	},
	pcm64f: (buffer, offset, output, channels, samples) => {
		let input = new Float64Array(buffer.buffer, offset);
		let pos = 0;
		for (let i = 0; i < samples; ++i) {
			for (let ch = 0; ch < channels; ++ch) output[ch][i] = input[pos++];
		}
	}
};

function lookup$1(bitDepth: number, floatingPoint: boolean) {
	let name = "pcm" + bitDepth + (floatingPoint ? "f" : "");
	let fn = data_decoders[name];
	if (!fn) throw new TypeError("Unsupported data format: " + name);
	return fn;
}

export function decode(bytes: Uint8Array): DecodeResult {
	let pos = bytes.byteOffset,
		end = bytes.byteLength;
	let v = new DataView(bytes.buffer);
	function u8() {
		let x = v.getUint8(pos);
		pos++;
		return x;
	}
	function u16() {
		let x = v.getUint16(pos, true);
		pos += 2;
		return x;
	}
	function u32() {
		let x = v.getUint32(pos, true);
		pos += 4;
		return x;
	}
	function string(len: number) {
		let str = "";
		for (let i = 0; i < len; ++i) str += String.fromCharCode(u8());
		return str;
	}
	if (string(4) !== "RIFF") throw new TypeError("Invalid WAV file");
	u32();
	if (string(4) !== "WAVE") throw new TypeError("Invalid WAV file");
	let fmt;
	while (pos < end) {
		let type = string(4);
		let size = u32();
		let next = pos + size;
		switch (type) {
			case "fmt ":
				let formatId = u16();
				if (formatId !== 1 && formatId !== 3) throw new TypeError("Unsupported format in WAV file: " + formatId.toString(16));
				fmt = {
					format: "lpcm",
					floatingPoint: formatId === 3,
					channels: u16(),
					sampleRate: u32(),
					byteRate: u32(),
					blockSize: u16(),
					bitDepth: u16()
				};
				break;
			case "data":
				if (!fmt) throw new TypeError('Missing "fmt " chunk.');
				let samples = Math.floor(size / fmt.blockSize);
				let channels = fmt.channels;
				let sampleRate = fmt.sampleRate;
				let channelData = [];
				for (let ch = 0; ch < channels; ++ch) channelData[ch] = new Float32Array(samples);
				lookup$1(fmt.bitDepth, fmt.floatingPoint)(bytes, pos, channelData, channels, samples);
				return {
					sampleRate,
					channelData
				};
		}
		pos = next;
	}
	return { sampleRate: 44100, channelData: [] };
}
