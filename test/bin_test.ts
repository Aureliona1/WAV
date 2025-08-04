import { clog, compare } from "@aurellis/helpers";
import { decode } from "../src/binary/decode.ts";
import { assert } from "../src/vendor/assert.ts";
import { encode } from "../src/binary/encode.ts";
import { BYTE_OFFSETS } from "../src/types.ts";

clog("Encode tests depend on decode being correct, failures in decoding may result in test failures for encoding...", "Log", "Binary Tests");

Deno.test({
	name: "Decode Mono 16",
	fn: () => {
		const bin = Deno.readFileSync("test/input/mono16.wav");
		const dec = decode(bin);
		assert(dec.sampleRate === 44100);
		assert(dec.channelData.length === 1);
		assert(dec.channelData[0].every(x => x >= -1 && x <= 1));
	}
});

Deno.test({
	name: "Decode Mono 24",
	fn: () => {
		const bin = Deno.readFileSync("test/input/mono24.wav");
		const dec = decode(bin);
		assert(dec.sampleRate === 44100);
		assert(dec.channelData.length === 1);
		assert(dec.channelData[0].every(x => x >= -1 && x <= 1));
	}
});

Deno.test({
	name: "Decode Mono 32",
	fn: () => {
		const bin = Deno.readFileSync("test/input/mono32.wav");
		const dec = decode(bin);
		assert(dec.sampleRate === 44100);
		assert(dec.channelData.length === 1);
		assert(dec.channelData[0].every(x => x >= -1 && x <= 1));
	}
});

Deno.test({
	name: "Decode Stereo 16",
	fn: () => {
		const bin = Deno.readFileSync("test/input/stereo16.wav");
		const dec = decode(bin);
		assert(dec.sampleRate === 44100);
		assert(dec.channelData.length === 2);
		assert(dec.channelData[0].every(x => x >= -1 && x <= 1));
		assert(dec.channelData[1].every(x => x >= -1 && x <= 1));
	}
});

Deno.test({
	name: "Decode Stereo 24",
	fn: () => {
		const bin = Deno.readFileSync("test/input/stereo24.wav");
		const dec = decode(bin);
		assert(dec.sampleRate === 44100);
		assert(dec.channelData.length === 2);
		assert(dec.channelData[0].every(x => x >= -1 && x <= 1));
		assert(dec.channelData[1].every(x => x >= -1 && x <= 1));
	}
});

Deno.test({
	name: "Decode Stereo 32",
	fn: () => {
		const bin = Deno.readFileSync("test/input/stereo32.wav");
		const dec = decode(bin);
		assert(dec.sampleRate === 44100);
		assert(dec.channelData.length === 2);
		assert(dec.channelData[0].every(x => x >= -1 && x <= 1));
		assert(dec.channelData[1].every(x => x >= -1 && x <= 1));
	}
});

Deno.test({
	name: "Encode Mono 8",
	fn: () => {
		const dec = decode(Deno.readFileSync("test/input/mono32.wav"));
		const enc = encode(dec.channelData, dec.sampleRate, "8-bit Int");
		const view = new DataView(enc.buffer, enc.byteOffset, enc.byteLength);
		assert(view.getUint16(BYTE_OFFSETS.FORMAT, true) === 1);
		assert(view.getUint16(BYTE_OFFSETS.CHANNELS, true) === 1);
		assert(view.getUint32(BYTE_OFFSETS.SAMPLE_RATE, true) === 44100);
		assert(view.getUint16(BYTE_OFFSETS.BYTES_PER_BLOCK, true) === 1);
		assert(view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, true) === 8);
		assert(view.byteLength - 8 === view.getUint32(BYTE_OFFSETS.FILE_SIZE, true));
	}
});

Deno.test({
	name: "Encode Mono 16",
	fn: () => {
		const dec = decode(Deno.readFileSync("test/input/mono32.wav"));
		const enc = encode(dec.channelData, dec.sampleRate, "16-bit Int");
		const view = new DataView(enc.buffer, enc.byteOffset, enc.byteLength);
		assert(view.getUint16(BYTE_OFFSETS.FORMAT, true) === 1);
		assert(view.getUint16(BYTE_OFFSETS.CHANNELS, true) === 1);
		assert(view.getUint32(BYTE_OFFSETS.SAMPLE_RATE, true) === 44100);
		assert(view.getUint16(BYTE_OFFSETS.BYTES_PER_BLOCK, true) === 2);
		assert(view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, true) === 16);
		assert(view.byteLength - 8 === view.getUint32(BYTE_OFFSETS.FILE_SIZE, true));
	}
});

Deno.test({
	name: "Encode Mono 24",
	fn: () => {
		const dec = decode(Deno.readFileSync("test/input/mono32.wav"));
		const enc = encode(dec.channelData, dec.sampleRate, "24-bit Int");
		const view = new DataView(enc.buffer, enc.byteOffset, enc.byteLength);
		assert(view.getUint16(BYTE_OFFSETS.FORMAT, true) === 1);
		assert(view.getUint16(BYTE_OFFSETS.CHANNELS, true) === 1);
		assert(view.getUint32(BYTE_OFFSETS.SAMPLE_RATE, true) === 44100);
		assert(view.getUint16(BYTE_OFFSETS.BYTES_PER_BLOCK, true) === 3);
		assert(view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, true) === 24);
		assert(view.byteLength - 8 === view.getUint32(BYTE_OFFSETS.FILE_SIZE, true));
	}
});

Deno.test({
	name: "Encode Mono 32",
	fn: () => {
		const dec = decode(Deno.readFileSync("test/input/mono32.wav"));
		const enc = encode(dec.channelData, dec.sampleRate, "32-bit Int");
		const view = new DataView(enc.buffer, enc.byteOffset, enc.byteLength);
		assert(view.getUint16(BYTE_OFFSETS.FORMAT, true) === 1);
		assert(view.getUint16(BYTE_OFFSETS.CHANNELS, true) === 1);
		assert(view.getUint32(BYTE_OFFSETS.SAMPLE_RATE, true) === 44100);
		assert(view.getUint16(BYTE_OFFSETS.BYTES_PER_BLOCK, true) === 4);
		assert(view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, true) === 32);
		assert(view.byteLength - 8 === view.getUint32(BYTE_OFFSETS.FILE_SIZE, true));
	}
});

Deno.test({
	name: "Encode Mono 32f",
	fn: () => {
		const dec = decode(Deno.readFileSync("test/input/mono32.wav"));
		const enc = encode(dec.channelData, dec.sampleRate, "32-bit Float");
		const view = new DataView(enc.buffer, enc.byteOffset, enc.byteLength);
		assert(view.getUint16(BYTE_OFFSETS.FORMAT, true) === 3);
		assert(view.getUint16(BYTE_OFFSETS.CHANNELS, true) === 1);
		assert(view.getUint32(BYTE_OFFSETS.SAMPLE_RATE, true) === 44100);
		assert(view.getUint16(BYTE_OFFSETS.BYTES_PER_BLOCK, true) === 4);
		assert(view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, true) === 32);
		assert(view.byteLength - 8 === view.getUint32(BYTE_OFFSETS.FILE_SIZE, true));
	}
});

Deno.test({
	name: "Encode Stereo 8",
	fn: () => {
		const dec = decode(Deno.readFileSync("test/input/stereo32.wav"));
		const enc = encode(dec.channelData, dec.sampleRate, "8-bit Int");
		const view = new DataView(enc.buffer, enc.byteOffset, enc.byteLength);
		assert(view.getUint16(BYTE_OFFSETS.FORMAT, true) === 1);
		assert(view.getUint16(BYTE_OFFSETS.CHANNELS, true) === 2);
		assert(view.getUint32(BYTE_OFFSETS.SAMPLE_RATE, true) === 44100);
		assert(view.getUint16(BYTE_OFFSETS.BYTES_PER_BLOCK, true) === 2);
		assert(view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, true) === 8);
		assert(view.byteLength - 8 === view.getUint32(BYTE_OFFSETS.FILE_SIZE, true));
	}
});

Deno.test({
	name: "Encode Stereo 16",
	fn: () => {
		const dec = decode(Deno.readFileSync("test/input/stereo32.wav"));
		const enc = encode(dec.channelData, dec.sampleRate, "16-bit Int");
		const view = new DataView(enc.buffer, enc.byteOffset, enc.byteLength);
		assert(view.getUint16(BYTE_OFFSETS.FORMAT, true) === 1);
		assert(view.getUint16(BYTE_OFFSETS.CHANNELS, true) === 2);
		assert(view.getUint32(BYTE_OFFSETS.SAMPLE_RATE, true) === 44100);
		assert(view.getUint16(BYTE_OFFSETS.BYTES_PER_BLOCK, true) === 4);
		assert(view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, true) === 16);
		assert(view.byteLength - 8 === view.getUint32(BYTE_OFFSETS.FILE_SIZE, true));
	}
});

Deno.test({
	name: "Encode Stereo 24",
	fn: () => {
		const dec = decode(Deno.readFileSync("test/input/stereo32.wav"));
		const enc = encode(dec.channelData, dec.sampleRate, "24-bit Int");
		const view = new DataView(enc.buffer, enc.byteOffset, enc.byteLength);
		assert(view.getUint16(BYTE_OFFSETS.FORMAT, true) === 1);
		assert(view.getUint16(BYTE_OFFSETS.CHANNELS, true) === 2);
		assert(view.getUint32(BYTE_OFFSETS.SAMPLE_RATE, true) === 44100);
		assert(view.getUint16(BYTE_OFFSETS.BYTES_PER_BLOCK, true) === 6);
		assert(view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, true) === 24);
		assert(view.byteLength - 8 === view.getUint32(BYTE_OFFSETS.FILE_SIZE, true));
	}
});

Deno.test({
	name: "Encode Stereo 32",
	fn: () => {
		const dec = decode(Deno.readFileSync("test/input/stereo32.wav"));
		const enc = encode(dec.channelData, dec.sampleRate, "32-bit Int");
		const view = new DataView(enc.buffer, enc.byteOffset, enc.byteLength);
		assert(view.getUint16(BYTE_OFFSETS.FORMAT, true) === 1);
		assert(view.getUint16(BYTE_OFFSETS.CHANNELS, true) === 2);
		assert(view.getUint32(BYTE_OFFSETS.SAMPLE_RATE, true) === 44100);
		assert(view.getUint16(BYTE_OFFSETS.BYTES_PER_BLOCK, true) === 8);
		assert(view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, true) === 32);
		assert(view.byteLength - 8 === view.getUint32(BYTE_OFFSETS.FILE_SIZE, true));
	}
});

Deno.test({
	name: "Encode Stereo 32f",
	fn: () => {
		const dec = decode(Deno.readFileSync("test/input/stereo32.wav"));
		const enc = encode(dec.channelData, dec.sampleRate, "32-bit Float");
		const view = new DataView(enc.buffer, enc.byteOffset, enc.byteLength);
		assert(view.getUint16(BYTE_OFFSETS.FORMAT, true) === 3);
		assert(view.getUint16(BYTE_OFFSETS.CHANNELS, true) === 2);
		assert(view.getUint32(BYTE_OFFSETS.SAMPLE_RATE, true) === 44100);
		assert(view.getUint16(BYTE_OFFSETS.BYTES_PER_BLOCK, true) === 8);
		assert(view.getUint16(BYTE_OFFSETS.BITS_PER_SAMPLE, true) === 32);
		assert(view.byteLength - 8 === view.getUint32(BYTE_OFFSETS.FILE_SIZE, true));
	}
});
