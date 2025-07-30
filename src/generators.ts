import { type Easing, lerp, type Vec2, waveform } from "@aurellis/helpers";
import type { WAV } from "./wav.ts";
import { note } from "./note.ts";

export class GenerateWAV {
	private addSamples(oldSamples: Float32Array, newSamples: Float32Array, offset = 0, factor = 1) {
		offset = Math.round(offset);
		// Make the new length array
		const temp = new Float32Array(Math.max(oldSamples.length, newSamples.length + offset)).fill(0);
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
	 * @param end  The end of the silence (seconds).
	 * @param lr Whether to add silence to the left (L), right (R), or both (LR).
	 */
	silence(start: number, end: number, lr: "L" | "R" | "LR") {
		// Get sample points
		start *= this.src.sampleRate;
		end *= this.src.sampleRate;

		if (/L/.test(lr)) {
			// Add an empty left
			if (!this.src.raw[0]) {
				this.src.raw.push(this.addSamples(new Float32Array(end).fill(0), new Float32Array(0)));
			} else {
				// Overwrite existing left
				this.src.raw[0] = this.addSamples(this.src.raw[0], new Float32Array(end - start).fill(0), start);
			}
		}
		if (/R/.test(lr)) {
			// Just make sure we have a left
			if (!this.src.raw[0]) {
				this.src.raw.push(this.addSamples(new Float32Array(end).fill(0), new Float32Array(0)));
			}
			// Add empty right
			if (!this.src.raw[1]) {
				this.src.raw.push(this.addSamples(new Float32Array(end).fill(0), new Float32Array(0)));
			} else {
				// Overwrite existing right
				this.src.raw[1] = this.addSamples(this.src.raw[1], new Float32Array(end - start).fill(0), start);
			}
		}
		return this.src;
	}

	soundWave(time: Vec2 = [0, this.src.raw[0].length / this.src.sampleRate], frequencies: [number, number, Easing?] = [note.C(5), note.C(5)], wave: (x: number) => number = waveform.sine, lr: "L" | "R" | "LR" = "LR") {
		const sampleRate = this.src.sampleRate;
		let phase = 0;
		const sampleData = new Float32Array(
			Array(Math.round((time[1] - time[0]) * sampleRate))
				.fill(0)
				.map((_, i, a) => {
					const sample = wave(phase);
					phase += lerp(frequencies[0], frequencies[1], i / a.length, frequencies[2]) / sampleRate;
					phase = phase % 1;
					return sample;
				})
		);
		if (/L/.test(lr)) {
			// Add left if it doesn't exist
			if (!this.src.raw[0]) {
				this.src.raw.push(this.addSamples(new Float32Array(time[1] * sampleRate).fill(0), sampleData, time[0] * sampleRate));
			} else {
				// Overwrite existing left
				this.src.raw[0] = this.addSamples(this.src.raw[0], sampleData, time[0] * sampleRate);
			}
		}
		if (/R/.test(lr)) {
			// Just make sure we have a left
			if (!this.src.raw[0]) {
				this.src.raw.push(this.addSamples(new Float32Array(time[1] * sampleRate).fill(0), sampleData, time[0] * sampleRate));
			}
			// Add right if it doesn't exist
			if (!this.src.raw[1]) {
				this.src.raw.push(this.addSamples(new Float32Array(time[1] * sampleRate).fill(0), sampleData, time[0] * sampleRate));
			} else {
				// Overwrite existing right
				this.src.raw[1] = this.addSamples(this.src.raw[1], sampleData, time[0] * sampleRate);
			}
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
		// Scale the new sound sample rate to existing one.
		const sampleRatio = sound.sampleRate / this.src.sampleRate;

		// We are just going to do nearest scaling.
		const newSoundSamples: Float32Array[] = [new Float32Array(sound.raw[0].length / sampleRatio)];
		for (let i = 0; i < newSoundSamples[0].length; i++) {
			newSoundSamples[0][i] = sound.raw[0][Math.round(i * sampleRatio)];
		}
		if (sound.raw[1]) {
			newSoundSamples.push(new Float32Array(sound.raw[1].length / sampleRatio));
			for (let i = 0; i < newSoundSamples[1].length; i++) {
				newSoundSamples[1][i] = sound.raw[1][Math.round(i * sampleRatio)];
			}
		}
		sound.raw = newSoundSamples;

		// Add the scaled samples
		const startSample = offset * this.src.sampleRate;
		this.src.raw = this.src.raw.map((x, i) => this.addSamples(x, sound.raw[i] ?? sound.raw[0], startSample, factor));

		return this.src;
	}
}
