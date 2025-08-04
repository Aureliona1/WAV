import { arrFromFunction, type Easing, lerp, type Vec2, waveform } from "@aurellis/helpers";
import { note } from "./note.ts";
import type { WAV } from "./wav.ts";

export class WAVAdd {
	/**
	 * Add samples to a sample array.
	 * @param oldSamples The original samples to add to.
	 * @param newSamples The new samples to add.
	 * @param offset The offset to begin adding samples at.
	 * @param factor The lerp factor of the new samples over the old ones.
	 */
	private static addSamples(oldSamples: Float32Array, newSamples: Float32Array, offset = 0, factor = 1): Float32Array {
		offset = Math.round(offset);
		// Make the new length array
		const temp = new Float32Array(Math.max(oldSamples.length, newSamples.length + offset));
		// First fill as many old samples as there are.
		temp.set(oldSamples);
		// Then overwrite the samples (or add new ones).
		if (factor === 1) {
			temp.set(newSamples, offset);
		} else if (factor !== 0) {
			for (let i = offset; i < newSamples.length + offset; i++) {
				temp[i] = lerp(temp[i] ?? newSamples[i - offset], newSamples[i - offset], factor);
			}
		}
		return temp;
	}

	constructor(private src: WAV) {}
	/**
	 * Add silence to the WAV, will also extend the length of the audio if end is beyond the end of any existing audio.
	 * @param start The start of the silence (seconds).
	 * @param end The end of the silence (seconds).
	 * @param channels The channel indices to addd the silence to, channels will be created if they are specified here.
	 */
	silence(start: number, end: number, channels: ArrayLike<number> | number = arrFromFunction(this.src.raw.length, x => x)): WAV {
		// Get sample points
		start *= this.src.sampleRate;
		end *= this.src.sampleRate;
		if (typeof channels === "number") {
			channels = [channels];
		}
		const samples = new Float32Array(end - start);
		for (let i = 0; i < channels.length; i++) {
			this.src.raw[i] = WAVAdd.addSamples(this.src.raw[i] ?? new Float32Array(), samples, start);
		}

		return this.src;
	}

	/**
	 * Add a waveform to the WAV.
	 * @param time The [start, end] of the waveform in seconds.
	 * @param frequencies The frequencies of the waveform, with optional easing.
	 * @param wave The function of the waveform, this must be a function that has a period and amplitude of 1.
	 * @param channels The channels to add the wave to.
	 * @param factor The factor to interpolate the existing audio with the waveform.
	 */
	waveform(time: Vec2 = [0, this.src.length], frequencies: [number, number, Easing?] = [note.C(5), note.C(5)], wave: (x: number) => number = waveform.sine, channels: ArrayLike<number> | number = arrFromFunction(this.src.raw.length, x => x), factor = 1): WAV {
		const sampleRate = this.src.sampleRate;
		let phase = 0;
		const samples = new Float32Array(
			Array(Math.round((time[1] - time[0]) * sampleRate))
				.fill(0)
				.map((_, i, a) => {
					const sample = wave(phase);
					phase += lerp(frequencies[0], frequencies[1], i / a.length, frequencies[2]) / sampleRate;
					phase = phase % 1;
					return sample;
				})
		);
		if (typeof channels === "number") {
			channels = [channels];
		}
		for (let i = 0; i < channels.length; i++) {
			this.src.raw[i] = WAVAdd.addSamples(this.src.raw[i] ?? new Float32Array(), samples, time[0] * sampleRate, factor);
		}
		return this.src;
	}
	/**
	 * Add another sound on top of your wav.
	 * @param sound The other wav to add on top.
	 * @param offset The offset in seconds.
	 * @param factor The volume factor (0-1) for interpolating over the existing audio.
	 */
	sample(sound: WAV, offset = 0, factor = 1) {
		// Resample new audio to src sampleRate
		sound.resample(this.src.sampleRate);
		const audioSampleLength = sound.length * this.src.sampleRate;
		const silence = new Float32Array(audioSampleLength);
		for (let i = 0; i < Math.max(sound.raw.length, this.src.raw.length); i++) {
			this.src.raw[i] = WAVAdd.addSamples(this.src.raw[i] ?? new Float32Array(), sound.raw[i] ?? silence, offset * this.src.sampleRate, factor);
		}
		return this.src;
	}
}
