import type { DecodeResult } from "../types.ts";

type GetCollection = {
	[key: string]: (view: DataView, pos: number) => number;
};

function getKey(float: boolean, bits: number): keyof typeof get {
	return (float ? "f" : "i") + bits;
}

const get: GetCollection = {
	i8: (view, pos) => view.getUint8(pos),
	i16: (view, pos) => view.getInt16(pos, true),
	i24: (view, pos) => {
		const smallPart = view.getUint8(pos);
		const bigPart = view.getUint16(pos + 1, true);
		let combined = (bigPart << 8) | smallPart;
		if (combined & 0x800000) {
			combined |= 0xff000000;
		}

		return combined;
	},
	i32: (view, pos) => view.getInt32(pos, true),
	f32: (view, pos) => view.getFloat32(pos, true),
	f64: (view, pos) => view.getFloat64(pos, true) // Pretty sure this isn't even valid but whatever
};

export function decode(bytes: Uint8Array): DecodeResult {
	// RIFF header
	const view = new DataView(bytes.buffer);
	const float = view.getUint16(20, true) === 3;
	const channelCount = view.getUint16(22, true);
	const sampleRate = view.getUint32(24, true);
	// bytes/sec, we don't need this
	const bytesPerBlock = view.getUint16(32, true);
	const bitsPerSample = view.getUint16(34, true);
	const channels = new Array(channelCount).fill(new Float32Array(view.getUint32(40, true) / (channelCount * 4)));
	for (let cursor = 44, block = 0; cursor < bytes.length; block++) {
		for (let channel = 0; channel < channelCount; channel++) {
			channels[channel][block] = get[getKey(float, bitsPerSample)];
			cursor += bitsPerSample / 8;
		}
	}
	return { sampleRate, channelData: channels };
}
