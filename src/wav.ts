import { WAVAdd } from "./adder.ts";
import { WAVCache } from "./cache.ts";
import { WAVFilter } from "./filter.ts";
import type { StereoType } from "./types.ts";

export class WAV {
	static async fromFile(path: string): Promise<WAV> {}
	static fromCache(entryName: string): WAV {}
	static get cache(): WAVCache {
		return WAV._cache;
	}
	private static _cache = new WAVCache();
	get filter(): WAVFilter {
		return new WAVFilter(this);
	}
	get add(): WAVAdd {
		return new WAVAdd(this);
	}
	constructor(public raw: Float32Array[] = [], public sampleRate = 44100) {}
	get length() {
		return this.raw[0].length / this.sampleRate;
	}
	chop(start = 0, end = this.length): WAV {}
	async writeFile(path: string, stereoType: StereoType): Promise<WAV> {}
	writeCache(entryName: string): WAV {}
}
