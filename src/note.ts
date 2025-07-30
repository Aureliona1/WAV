import { clamp } from "@aurellis/helpers";

export class note {
	private static noteFunc(oct: number, base: number) {
		oct = Math.floor(clamp(oct, [0, 8]));
		return base * Math.pow(2, oct);
	}
	static A = (oct: number) => this.noteFunc(oct, 27.5);
	static As = (oct: number) => this.noteFunc(oct, 29.1352);
	static B = (oct: number) => this.noteFunc(oct, 30.8677);
	static C = (oct: number) => this.noteFunc(oct, 32.7032);
	static Cs = (oct: number) => this.noteFunc(oct, 34.6478);
	static D = (oct: number) => this.noteFunc(oct, 36.7081);
	static Ds = (oct: number) => this.noteFunc(oct, 38.8909);
	static E = (oct: number) => this.noteFunc(oct, 41.2034);
	static F = (oct: number) => this.noteFunc(oct, 43.6535);
	static Fs = (oct: number) => this.noteFunc(oct, 46.2493);
	static G = (oct: number) => this.noteFunc(oct, 48.9994);
	static Gs = (oct: number) => this.noteFunc(oct, 51.9131);
	static Af = this.Gs;
	static Bf = this.As;
	static Df = this.Cs;
	static Ef = this.Ds;
	static Gf = this.Fs;
}
