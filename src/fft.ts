import { closestFactors, deepCopy } from "@aurellis/helpers";
import type { DFTResult } from "./types.ts";

function isPrime(n: number): boolean {
	if (n < 2 || !Number.isInteger(n)) return false;
	if (n === 2) return true;
	if (n % 2 === 0) return false;

	for (let i = 3; i * i <= n; i += 2) {
		if (n % i === 0) return false;
	}

	return true;
}

function nextPowerOfTwo(n: number): number {
	if (n <= 1) return 1;

	let pow = 1;
	while (pow < n) {
		pow *= 2;
	}

	return pow;
}

export class FFT {
	static transform(signal: Float64Array): DFTResult {
		const im = new Float64Array(signal.length);
		// fft mutates signal for memory usage, so we copy it on first call.
		return this.fft(deepCopy(signal), im);
	}
	static inverse(spectrum: DFTResult): Float64Array {
		return this.inverseComplex(spectrum).real;
	}

	private static inverseComplex(spectrum: DFTResult, mutate = false): DFTResult {
		const len = spectrum.real.length;

		const real = mutate ? spectrum.real : deepCopy(spectrum.real);

		const imaginary = new Float64Array(len);

		for (let i = 0; i < len; i++) imaginary[i] = -spectrum.imaginary[i];

		const result = this.fft(real, imaginary);

		for (let i = 0; i < len; i++) {
			result.real[i] /= len;
			result.imaginary[i] /= len;
		}

		return result;
	}
	private static fft(real: Float64Array, imaginary: Float64Array): DFTResult {
		const len = real.length;

		if (len <= 16) return this.directDFTComplex(real, imaginary);

		if (isPrime(len)) return this.bluestein(real, imaginary);

		const [n, m] = closestFactors(len);

		return this.cooleyTukey(real, imaginary, n, m);
	}

	private static directDFTComplex(real: Float64Array, imaginary: Float64Array): DFTResult {
		const len = real.length;

		const out: DFTResult = {
			real: new Float64Array(len),
			imaginary: new Float64Array(len)
		};

		for (let k = 0; k < len; k++) {
			let re = 0;
			let im = 0;

			for (let j = 0; j < len; j++) {
				const angle = (2 * Math.PI * k * j) / len;

				const cos = Math.cos(angle);
				const sin = Math.sin(angle);

				re += real[j] * cos + imaginary[j] * sin;
				im += imaginary[j] * cos - real[j] * sin;
			}

			out.real[k] = re;
			out.imaginary[k] = im;
		}

		return out;
	}

	private static cooleyTukey(real: Float64Array, imaginary: Float64Array, n: number, m: number): DFTResult {
		const len = real.length;

		if (len !== n * m) throw new Error("Invalid Cooley-Tukey factorisation");

		const subReal = new Float64Array(m);
		const subImaginary = new Float64Array(m);

		for (let r = 0; r < n; r++) {
			for (let q = 0; q < m; q++) {
				const index = r + n * q;

				subReal[q] = real[index];
				subImaginary[q] = imaginary[index];
			}

			const result = this.fft(subReal, subImaginary);

			for (let s = 0; s < m; s++) {
				const index = r * m + s;

				real[index] = result.real[s];
				imaginary[index] = result.imaginary[s];
			}
		}

		const columnReal = subReal;
		const columnImaginary = subImaginary;

		const outputReal = new Float64Array(len);
		const outputImaginary = new Float64Array(len);

		for (let s = 0; s < m; s++) {
			for (let r = 0; r < n; r++) {
				const index = r * m + s;

				const angle = (-2 * Math.PI * r * s) / len;

				const cos = Math.cos(angle);
				const sin = Math.sin(angle);

				const a = real[index];
				const b = imaginary[index];

				columnReal[r] = a * cos - b * sin;
				columnImaginary[r] = a * sin + b * cos;
			}

			const result = this.fft(columnReal, columnImaginary);

			for (let t = 0; t < n; t++) {
				const index = s + m * t;

				outputReal[index] = result.real[t];
				outputImaginary[index] = result.imaginary[t];
			}
		}

		return { real: outputReal, imaginary: outputImaginary };
	}

	private static bluestein(real: Float64Array, imaginary: Float64Array): DFTResult {
		const n = real.length;

		/*
		 * Bluestein converts the N-point DFT into a convolution.
		 *
		 * Choose M >= 2N - 1.
		 *
		 * Using the next power of two is convenient, but M does not
		 * actually need to be a power of two because fft() supports
		 * arbitrary lengths.
		 */
		const m = nextPowerOfTwo(2 * n - 1);

		/*
		 * We need:
		 *
		 *   a[j] = x[j] * exp(-i*pi*j^2/N)
		 *
		 * and
		 *
		 *   b[k] = exp(i*pi*k^2/N)
		 *
		 * for k = -(N-1) ... (N-1).
		 *
		 * Then:
		 *
		 *   X[k] = exp(-i*pi*k^2/N) * (a * b)[k]
		 *
		 * where the convolution is evaluated at index k + N - 1.
		 */

		const aReal = new Float64Array(m);
		const aImaginary = new Float64Array(m);

		const bReal = new Float64Array(m);
		const bImaginary = new Float64Array(m);

		for (let j = 0; j < n; j++) {
			const angle = (Math.PI * j * j) / n;

			const cos = Math.cos(angle);
			const sin = Math.sin(angle);

			const xReal = real[j];
			const xImaginary = imaginary[j];

			aReal[j] = xReal * cos + xImaginary * sin;

			aImaginary[j] = xImaginary * cos - xReal * sin;

			bReal[j] = cos;
			bImaginary[j] = sin;

			if (j !== 0) {
				bReal[m - j] = cos;
				bImaginary[m - j] = sin;
			}
		}

		const aFFT = this.fft(aReal, aImaginary);
		const bFFT = this.fft(bReal, bImaginary);

		for (let i = 0; i < m; i++) {
			const ar = aFFT.real[i];
			const ai = aFFT.imaginary[i];

			const br = bFFT.real[i];
			const bi = bFFT.imaginary[i];

			aFFT.real[i] = ar * br - ai * bi;
			aFFT.imaginary[i] = ar * bi + ai * br;
		}

		const convolution = this.inverseComplex(aFFT, true);

		const outputReal = new Float64Array(n);
		const outputImaginary = new Float64Array(n);

		for (let k = 0; k < n; k++) {
			const angle = (Math.PI * k * k) / n;

			const cos = Math.cos(angle);
			const sin = Math.sin(angle);

			const index = k + n - 1;

			const cr = convolution.real[index];
			const ci = convolution.imaginary[index];

			// convolution[k + n - 1] * exp(-i * angle)
			outputReal[k] = cr * cos + ci * sin;
			outputImaginary[k] = ci * cos - cr * sin;
		}

		return {
			real: outputReal,
			imaginary: outputImaginary
		};
	}
}
