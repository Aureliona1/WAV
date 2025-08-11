import { clamp } from "@aurellis/helpers";
import type { Waveform } from "./types.ts";

/**
 * A collection of functions that return the frequency of standard musical notes.
 */
export class note {
	/**
	 * Generate a note function from a base frequency and octave.
	 */
	private static noteFunc(oct: number, base: number): number {
		oct = Math.floor(clamp(oct, [0, 8]));
		return base * Math.pow(2, oct);
	}
	/**
	 * A note frequency.
	 */
	static A: Waveform = (oct: number) => this.noteFunc(oct, 27.5);
	/**
	 * A-sharp note frequency.
	 */
	static As: Waveform = (oct: number) => this.noteFunc(oct, 29.1352);
	/**
	 * B note frequency.
	 */
	static B: Waveform = (oct: number) => this.noteFunc(oct, 30.8677);
	/**
	 * C note frequency.
	 */
	static C: Waveform = (oct: number) => this.noteFunc(oct, 32.7032);
	/**
	 * C-sharp note frequency.
	 */
	static Cs: Waveform = (oct: number) => this.noteFunc(oct, 34.6478);
	/**
	 * D note frequency.
	 */
	static D: Waveform = (oct: number) => this.noteFunc(oct, 36.7081);
	/**
	 * D-sharp note frequency.
	 */
	static Ds: Waveform = (oct: number) => this.noteFunc(oct, 38.8909);
	/**
	 * E note frequency.
	 */
	static E: Waveform = (oct: number) => this.noteFunc(oct, 41.2034);
	/**
	 * F note frequency.
	 */
	static F: Waveform = (oct: number) => this.noteFunc(oct, 43.6535);
	/**
	 * F-sharp note frequency.
	 */
	static Fs: Waveform = (oct: number) => this.noteFunc(oct, 46.2493);
	/**
	 * G note frequency.
	 */
	static G: Waveform = (oct: number) => this.noteFunc(oct, 48.9994);
	/**
	 * G-sharp note frequency.
	 */
	static Gs: Waveform = (oct: number) => this.noteFunc(oct, 51.9131);
	/**
	 * A-flat note frequency.
	 */
	static Af: Waveform = this.Gs;
	/**
	 * B-flat note frequency.
	 */
	static Bf: Waveform = this.As;
	/**
	 * D-flat note frequency.
	 */
	static Df: Waveform = this.Cs;
	/**
	 * E-flat note frequency.
	 */
	static Ef: Waveform = this.Ds;
	/**
	 * G-flat note frequency.
	 */
	static Gf: Waveform = this.Fs;
}
