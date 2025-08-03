import { WAVAdd } from "./adder.ts";
import { decode } from "./binary/decode.ts";
import { WAVCache } from "./cache.ts";
import { WAVFilter } from "./filter.ts";
import type { MonoType } from "./types.ts";

export class WAV {
	/**
	 * Read and decode a WAV file.
	 * @param path The path to the WAV file, ".wav" is optional and will be added if absent.
	 */
	static async fromFile(path: string): Promise<WAV> {
		path = /.wav$/.test(path) ? path : path + ".wav";
		const bytes = await Deno.readFile(path);
		const dec = decode(bytes);
		return new WAV(dec.channelData, dec.sampleRate);
	}
	/**
	 * Read and decode a WAV from the WAV cache.
	 * @param entryName The name of the WAV in the cache.
	 */
	static fromCache(entryName: string): WAV {
		return new WAV();
	}
	/**
	 * Global WAV cache.
	 */
	static get cache(): WAVCache {
		return WAV._cache;
	}
	private static _cache = new WAVCache();
	/**
	 * Add filters and effects to the audio.
	 */
	get filter(): WAVFilter {
		return new WAVFilter(this);
	}
	/**
	 * Add new sounds and samples to the audio.
	 */
	get add(): WAVAdd {
		return new WAVAdd(this);
	}
	/**
	 * A utility class for manipulating audio WAV files.
	 * @param raw The raw channel samples, all channels must have the same number of samples.
	 * @param sampleRate The sample rate of the audio.
	 */
	constructor(public raw: Float32Array[] = [], public sampleRate = 44100) {}
	/**
	 * Get the length of the audio in seconds.
	 */
	get length(): number {
		return this.raw[0].length / this.sampleRate;
	}
	/**
	 * Check if the samples are valid. This means:
	 * - All channels have the same number of samples.
	 * - All samples are in the valid range (-1 to 1 inclusive).
	 */
	get hasValidSampleCount(): boolean {
		return this.raw.every((c, _, a) => c.length === a[0].length && c.every(x => x >= 1 && x <= 1));
	}
	/**
	 * Crop the audio from a start and end point.
	 * @param start The start of the new audio in seconds.
	 * @param end The end of the new audio in seconds.
	 */
	crop(start = 0, end = this.length): this {
		return this;
	}
	/**
	 * Write the audio to a WAV file.
	 * @param path The path of the WAV file. ".wav" is optional.
	 * @param monoType How the audio shold be transformed to mono, leave blank for stereo audio. If the audio has only 1 channel, it will be mono.
	 */
	async writeFile(path: string, monoType?: MonoType): Promise<this> {
		return this;
	}
	/**
	 * Write the audio to the WAV cache.
	 * @param entryName The name of the audio in the cache.
	 */
	writeCache(entryName: string): this {
		return this;
	}
}
