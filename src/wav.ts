import { encodeWav } from "./binary/encode.ts";
import { FilterWAV } from "./filters.ts";
import { GenerateWAV } from "./generators.ts";
import type { DecodeResult } from "./types.ts";
import { decode } from "./vendor/node-wav-decode.ts";

function closestFactors(num: number): [number, number] {
	const closestPair: [number, number] = [1, num];

	const sqrt = Math.floor(Math.sqrt(num));

	for (let i = sqrt; i > 0; i--) {
		if (num % i === 0) {
			const factorPair: [number, number] = [i, num / i];
			return factorPair;
		}
	}

	return closestPair;
}

export class WAV {
	constructor(public sampleRate = 44100) {}
	/**
	 * The raw channel data of the WAV.
	 */
	raw: Float32Array[] = [];
	/**
	 * Add filters to the WAV.
	 */
	get filter() {
		return new FilterWAV(this);
	}
	/**
	 * Add filters to the WAV.
	 */
	set filter(_x) {
		this.filter = new FilterWAV(this);
	}
	/**
	 * Generate sounds on the WAV.
	 */
	get generate() {
		return new GenerateWAV(this);
	}
	/**
	 * Generate sounds on the WAV.
	 */
	set generate(_x) {
		this.generate = new GenerateWAV(this);
	}
	/**
	 * Check if the wav is currently stereo.
	 */
	get isStereo() {
		return this.raw[1] !== undefined;
	}
	/**
	 * Read from a WAV file and import its data.
	 * @param name The name (or relative filepath) of the WAV file.
	 */
	read(name: string) {
		name = /.*\.wav$/.test(name) ? name : name + ".wav";

		let input: DecodeResult = { sampleRate: 44100, channelData: [] };
		try {
			const file = Deno.readFileSync(name);
			input = decode(file);
		} catch (_) {
			console.log("Failed to read wav file, your wav will be empty!");
		}
		this.sampleRate = input.sampleRate;
		if (input.channelData[1]) {
			this.raw = [input.channelData[0], input.channelData[1]];
		} else {
			this.raw[0] = input.channelData[0];
		}
		return this;
	}
	/**
	 * Write WAV data to a WAV file.
	 * @param name The name (or raltive filepath) of the WAV file.
	 */
	write(name: string) {
		name = /.*\.wav$/.test(name) ? name : name + ".wav";
		Deno.writeFileSync(name, encodeWav(this.raw, this.sampleRate));
		return this;
	}
	/**
	 * Cut the audio by seconds.
	 * @param start Start of the chopped section (seconds), leave blank for start of audio.
	 * @param end End of the chopped section (seconds), leave blank for end of audio.
	 */
	chop(start = 0, end?: number) {
		this.raw = this.raw.map(x => x.slice(this.sampleRate * start, end ? this.sampleRate * end : undefined));
		return this;
	}
}
