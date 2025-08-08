import { arrFromFunction, type Easing, lerp, type Vec2, waveform } from "@aurellis/helpers";
import { note } from "./note.ts";
import type { WAV } from "./wav.ts";

/**
 * A utility class with many functions that add samples or sounds to a WAV. Do not construct this class by itself, use {@link WAV.add}.
 */
export class WAVAdd {
	/**
	 * A utility class with many functions that add samples or sounds to a WAV. Do not construct this class by itself, use {@link WAV.add}.
	 */
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
	 * @param time The [start, end] of the waveform in seconds. (Default - full audio length)
	 * @param frequencies The frequencies of the waveform, with optional easing. (Default - {@link note.C C5})
	 * @param wave The function of the waveform, this must be a function that has a period and amplitude of 1. (Default - {@link waveform.sine sine})
	 * @param channels The channels to add the wave to. (Default - All channels)
	 * @param normalise Whether to normalise the resulting audio. (Default - false)
	 */
	waveform(time: Vec2 = [0, this.src.length], frequencies: [number, number, Easing?] = [note.C(5), note.C(5)], wave: (x: number) => number = waveform.sine, channels: ArrayLike<number> | number = arrFromFunction(this.src.raw.length, x => x), normalise = false): WAV {
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
		this.src.setSamples(samples, time[0], channels, normalise);
		return this.src;
	}
	/**
	 * Add another sound on top of your wav.
	 * @param sound The other wav to add on top.
	 * @param offset The offset in seconds.
	 * @param volume The volume to adjust the new audio by.
	 * @param normalise Whether to normalise the resulting audio.
	 * @param attackLength The amount of time to gradually bring in the new sample. This prevents pops at the beginning of new samples. (Default - 0.001).
	 */
	sample(sound: WAV, offset = 0, volume = 1, normalise = false, attackLength = 0.001): WAV {
		// Resample new audio to src sampleRate
		sound.resample(this.src.sampleRate);
		sound.filter.gain(volume);
		for (let i = 0; i < Math.max(sound.raw.length, this.src.raw.length); i++) {
			this.src.setSamples(sound.raw[i] ?? new Float32Array(), offset, i, normalise, attackLength);
		}
		return this.src;
	}
}
