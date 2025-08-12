import { arrFromFunction, clamp, clog, concatTypedArrays, lerp } from "@aurellis/helpers";
import { WAVAdd } from "./adder.ts";
import { decode } from "./binary/decode.ts";
import { encode } from "./binary/encode.ts";
import { WAVCache } from "./cache.ts";
import { WAVFilter } from "./filter.ts";
import type { MonoType, WAVFormat } from "./types.ts";

/**
 * A utility class for manipulating WAV audio files.
 */
export class WAV {
	/**
	 * Read and decode a WAV file.
	 * @param path The path to the WAV file, ".wav" is optional and will be added if absent.
	 */
	static async fromFile(path: string): Promise<WAV> {
		path = /.*\.wav$/.test(path) ? path : path + ".wav";
		const bytes = await Deno.readFile(path);
		const dec = decode(bytes);
		return new WAV(dec.channelData, dec.sampleRate);
	}
	/**
	 * Read and decode a WAV from the WAV cache.
	 * @param entryName The name of the WAV in the cache.
	 */
	static fromCache(entryName: string): WAV {
		const dec = WAV.cache.read(entryName);
		return new WAV(dec.channelData, dec.sampleRate);
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
	constructor(public raw: Float64Array[] = [], public sampleRate = 44100) {}
	/**
	 * Get the length of the audio in seconds.
	 */
	get length(): number {
		return this.raw[0].length / this.sampleRate;
	}
	/**
	 * Check if all channels have the same number of samples.
	 */
	get hasValidSampleCount(): boolean {
		return this.raw.every((c, _, a) => c.length === a[0].length);
	}
	/**
	 * Check if all channels have valid sample ranges (-1 to 1 inclusive).
	 */
	get hasValidSampleRange(): boolean {
		return this.raw.every(c => c.every(x => x >= -1 && x <= 1));
	}
	/**
	 * Crop the audio from a start and end point.
	 * @param start The start of the new audio in seconds.
	 * @param end The end of the new audio in seconds.
	 */
	crop(start = 0, end = this.length): this {
		if (!this.hasValidSampleCount) {
			clog("Channels do not have a valid sample count, audio will not be cropped...", "Warning", "WAV");
			return this;
		}
		const startIndex = start * this.sampleRate;
		const endIndex = end * this.sampleRate;
		this.raw = this.raw.map(x => x.subarray(startIndex, endIndex));
		return this;
	}
	/**
	 * Resample the audio to a new sample rate.
	 * @param rate The new sample rate of the audio.
	 */
	resample(rate: number): this {
		const ratio = rate / this.sampleRate;
		this.raw = this.raw.map((x, i) => new Float64Array(Math.floor(x.length * ratio)).map((_, j) => this.raw[i][Math.floor(j / ratio)]));
		this.sampleRate = rate;
		return this;
	}
	/**
	 * Add samples to the audio in the form of sample arrays (Float32Array).
	 * @param samples The samples to add.
	 * @param offset The offset (in seconds) to start the samples from.
	 * @param channels The channel/s to add the samples to.
	 * @param normalise Whether to normalise the resulting samples. Sample values may extend the valid range if this is set to false. (Default - false)
	 * @param attackLength The amount of time (in seconds) to bring in the new samples to the factor.
	 */
	setSamples(samples: Float64Array, offset = 0, channels: ArrayLike<number> | number = arrFromFunction(this.raw.length, x => x), normalise = false, attackLength = 0): this {
		offset = Math.round(offset * this.sampleRate);
		if (typeof channels === "number") {
			channels = [channels];
		}
		for (let i = 0; i < channels.length; i++) {
			const channel = channels[i];
			this.raw[channel] ??= new Float64Array();
			const newSamples = new Float64Array(Math.max(this.raw[channel].length, samples.length + offset));
			newSamples.set(this.raw[channel]);
			for (let j = offset; j < samples.length + offset; j++) {
				let factor = 1;
				if (attackLength && this.sampleRate) {
					factor = clamp((j - offset) / (attackLength * this.sampleRate), [0, 1]);
				}
				newSamples[j] += samples[j - offset] * factor;
			}
			this.raw[channel] = newSamples;
		}
		if (normalise) {
			this.filter.normalise();
		}
		return this;
	}
	/**
	 * Write the audio to a WAV file.
	 * @param path The path of the WAV file. ".wav" is optional.
	 * @param sampleFormat The bit depth and number format that the samples should be translated to for encoding. Lower values will reduce audio quality and file size. (Defualt - 16-bit Int)
	 * @param monoType How the audio shold be transformed to mono, leave blank for stereo audio. If the audio has only 1 channel, it will be mono.
	 */
	async writeFile(path: string = "wav", sampleFormat: WAVFormat = "16-bit Int", monoType?: MonoType): Promise<this> {
		path = /.*\.wav$/.test(path) ? path : path + ".wav";
		let outputChannels = this.raw;
		if (!this.hasValidSampleCount) {
			const padTo = Math.max(...this.raw.map(x => x.length));
			for (let i = 0; i < this.raw.length; i++) {
				this.raw[i] = concatTypedArrays(this.raw[i], new Float64Array(padTo - this.raw[i].length));
			}
		}
		if (monoType && outputChannels.length > 1) {
			switch (monoType) {
				case "Left only":
					outputChannels = [outputChannels[0]];
					break;
				case "Right Only":
					outputChannels = [outputChannels[1]];
					break;
				case "Average LR":
					const newChannel = new Float64Array(outputChannels[0].length);
					for (let i = 0; i < newChannel.length; i++) {
						newChannel[i] = lerp(outputChannels[0][i], outputChannels[1][i], 0.5);
					}
					outputChannels = [newChannel];
					break;
			}
		}
		this.filter.normaliseDown();
		await Deno.writeFile(path, encode(outputChannels, this.sampleRate, sampleFormat));
		return this;
	}
	/**
	 * Write the audio to the WAV cache.
	 * @param entryName The name of the audio in the cache.
	 */
	writeCache(entryName: string): this {
		WAV.cache.write(entryName, this);
		return this;
	}
}
