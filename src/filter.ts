import { arrFromFunction, clamp, concatTypedArrays, type Easing, lerp, mapRange, type Vec2 } from "@aurellis/helpers";
import type { WAV } from "./wav.ts";

/**
 * A utility class that provides a number of filters to operate on a WAV. Do not construct this by itself, use {@link WAV.filter}.
 */
export class WAVFilter {
	/**
	 * A utility class that provides a number of filters to operate on a WAV. Do not construct this by itself, use {@link WAV.filter}.
	 */
	constructor(private src: WAV) {}
	/**
	 * Scale the waveform amplitude by a factor (0-1).
	 * @param factor The factor (0-1) to adjust the audio, can be either a number, or [val1, val2] for transition.
	 * @param time The start and time of the gain adjustment, leave blank for the start and end of the audio.
	 * @param easing Optional easing for the transition.
	 */
	gain(factor: Vec2 | number, time: Vec2 = [0, this.src.length], easing?: Easing): this {
		time[0] *= this.src.sampleRate;
		time[1] *= this.src.sampleRate;
		if (typeof factor === "object") {
			this.src.raw = this.src.raw.map(x => x.map((y, i) => (i >= time[0] && i < time[1] ? lerp(y * factor[0], y * factor[1], mapRange(i, time, [0, 1], 10), easing) : y)));
		} else {
			this.src.raw = this.src.raw.map(x => x.map((y, i) => (i >= time[0] && i < time[1] ? y * factor : y)));
		}
		return this;
	}
	/**
	 * Clamp waveform by a factor.
	 * @param factor The factor (0-1) to limit to, can be either a number, can be either a number, or [val1, val2] for transition.
	 * @param time The start and time of the limiter, leave blank for the start and end of the audio.
	 * @param easing Optional easing for the transition.
	 */
	limiter(factor: number | Vec2, time: Vec2 = [0, this.src.length], easing?: Easing): this {
		time[0] *= this.src.sampleRate;
		time[1] *= this.src.sampleRate;
		if (typeof factor === "object") {
			this.src.raw = this.src.raw.map(x => x.map((y, i) => (i >= time[0] && i < time[1] ? clamp(y, [lerp(-factor[0], -factor[1], mapRange(i, time, [0, 1], 10), easing), lerp(factor[0], factor[1], mapRange(i, time, [0, 1], 10), easing)]) : y)));
		} else {
			this.src.raw = this.src.raw.map(x => x.map((y, i) => (i >= time[0] && i < time[1] ? clamp(y, [-factor, factor]) : y)));
		}
		return this;
	}
	/**
	 * Bitcrush effect, quantises the waveform.
	 * @param factor The number of bits to crush to (max 32, this can be float), can be either a number, or [val1, val2] for transition.
	 * @param time The start and time of the bitcrush, leave blank for the start and end of the audio.
	 * @param easing Optional easing for the transition.
	 */
	bitcrush(factor: number | Vec2, time: Vec2 = [0, this.src.length], easing?: Easing): this {
		factor = typeof factor === "object" ? (factor = factor.map(x => Math.pow(2, x)) as Vec2) : Math.pow(2, factor);
		time[0] *= this.src.sampleRate;
		time[1] *= this.src.sampleRate;
		if (typeof factor === "object") {
			this.src.raw = this.src.raw.map(x => x.map((y, i) => (i >= time[0] && i < time[1] ? Math.round(y * lerp(factor[0], factor[1], mapRange(i, time, [0, 1], 10), easing)) / lerp(factor[0], factor[1], mapRange(i, time, [0, 1], 10), easing) : y)));
		} else {
			this.src.raw = this.src.raw.map(x => x.map((y, i) => (i >= time[0] && i < time[1] ? Math.round(y * factor) / factor : y)));
		}
		return this;
	}
	/**
	 * Add a delay/echo effect on the audio.
	 * @param timeOffset The offset of each echo in the audio (in seconds).
	 * @param decay The factor to multiply each echo by (Default - 0.5).
	 * @param channels The channels to apply the filter to.
	 * @param thresh The minimum volume of a sample to add delay to.
	 */
	delay(timeOffset = 0.1, decay = 0.5, channels: ArrayLike<number> | number = arrFromFunction(this.src.raw.length, x => x), thresh = 0.001): this {
		thresh = clamp(thresh, [0, 1]);
		if (typeof channels === "number") {
			channels = [channels];
		}
		for (let c = 0; c < channels.length; c++) {
			const channel = channels[c];
			let trueChannelLength = this.src.raw[channel].length;
			for (let i = 0; i < this.src.raw[channel].length; i++) {
				if (Math.abs(this.src.raw[channel][i]) > thresh) {
					const addIndex = i + timeOffset * this.src.sampleRate;
					// If out-of-bounds, double the array, and keep a true length counter.
					if (addIndex >= this.src.raw[channel].length) {
						this.src.raw[channel] = concatTypedArrays(this.src.raw[channel], new Float64Array(this.src.raw[channel].length));
						trueChannelLength = addIndex + 1;
					}
					this.src.raw[channel][addIndex] += clamp(this.src.raw[channel][i] * decay, [-1, 1]);
				}
			}
			this.src.raw[channel] = this.src.raw[channel].slice(0, trueChannelLength);
		}
		return this;
	}
	/**
	 * Normalise the audio to a set amplitude.
	 * @param amplitude The absolute maximum value that the waveform will have. (Default - 1 | full dynamic range)
	 */
	normalise(amplitude = 1): this {
		let max = 0;
		for (let c = 0; c < this.src.raw.length; c++) {
			for (let i = 0; i < this.src.raw[c].length; i++) {
				const abs = Math.abs(this.src.raw[c][i]);
				if (abs > max) {
					max = abs;
				}
			}
		}
		this.gain(amplitude / max);
		return this;
	}
	/**
	 * Normalise the audio to a set amplitude only if the maximum sample exceeds this amplitude.
	 * @param amplitude The absolute maximum value that the waveform will have. (Default - 1 | full dynamic range)
	 */
	normaliseDown(amplitude = 1): this {
		let max = 0;
		for (let c = 0; c < this.src.raw.length; c++) {
			for (let i = 0; i < this.src.raw[c].length; i++) {
				const abs = Math.abs(this.src.raw[c][i]);
				if (abs > max) {
					max = abs;
				}
			}
		}
		if (max > amplitude) {
			this.gain(amplitude / max);
		}
		return this;
	}
}
