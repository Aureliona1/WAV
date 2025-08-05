import { arrFromFunction, type Easing, lerp, type Vec2, waveform } from "@aurellis/helpers";
import { note } from "./note.ts";
import type { WAV } from "./wav.ts";

export class WAVAdd {
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
		// Add samples
		const samples = new Float32Array(end - start);
		this.src.setSamples(samples, start / this.src.sampleRate, channels);
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
		this.src.setSamples(samples, time[0], channels, factor);
		return this.src;
	}
	/**
	 * Add another sound on top of your wav.
	 * @param sound The other wav to add on top.
	 * @param offset The offset in seconds.
	 * @param factor The volume factor (0-1) for interpolating over the existing audio.
	 * @param attackLength The amount of time to gradually bring in the new sample. This prevents pops at the beginning of new samples. (Default - 0.001).
	 */
	sample(sound: WAV, offset = 0, factor = 0.5, attackLength = 0.001): WAV {
		// Resample new audio to src sampleRate
		sound.resample(this.src.sampleRate);
		for (let i = 0; i < Math.max(sound.raw.length, this.src.raw.length); i++) {
			this.src.setSamples(sound.raw[i] ?? new Float32Array(), offset, i, factor, attackLength);
		}
		return this.src;
	}
}
