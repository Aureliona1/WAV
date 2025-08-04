import { clamp, type Easing, lerp, mapRange, type Vec2 } from "@aurellis/helpers";
import type { WAV } from "./wav.ts";

export class WAVFilter {
	constructor(private src: WAV) {}
	/**
	 * Scale the waveform amplitude by a factor (0-1).
	 * @param factor The factor (0-1) to adjust the audio, can be either a number, or [val1, val2] for transition.
	 * @param time The start and time of the gain adjustment, leave blank for the start and end of the audio.
	 * @param easing Optional easing for the transition.
	 */
	gain(factor: Vec2 | number, time: Vec2 = [0, this.src.length], easing?: Easing) {
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
	limiter(factor: number | Vec2, time: Vec2 = [0, this.src.length], easing?: Easing) {
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
	bitcrush(factor: number | Vec2, time: Vec2 = [0, this.src.length], easing?: Easing) {
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
}
