import { clog, concatTypedArray } from "@aurellis/helpers";
import type { DecodeResult, TacDictEntry } from "../types.ts";
import { WAV } from "../wav.ts";

/**
Terrible Audio Cache

This format begins with a dictionary which references the metadata of all contained audio.
Then it has the datachunk which contains all audio values.

This cache format allows multiple audio samples to be stored and accessed very quickly, but results in a larger file size.

TAC format:
dict length: Uint32
dict entry[]

dict entry:
	indexStart: Uint32
	sampleRate: Uint32
	length: Uint32
	channelCount: Uint16
	nameLength: Uint8
	name: Uint8Array up to 255 length

The end of each sample's section in the datachunk will be calculated as indexStart + length * sampleRate * channelCount.

Each dictionary entry takes 15 + nameLength bytes.

datachunk: Float32Array
*/
export class TAC {
	/**
	 * Get the length of an entry in the datachunk.
	 */
	private static entryDataLength(entry: TacDictEntry) {
		return entry.length * entry.sampleRate * entry.channels;
	}

	/**
	 * Decode a binary TAC file.
	 * @param raw The raw TAC binary.
	 * @returns Decoded tac data.
	 */
	static from(raw: Uint8Array): TAC {
		const view = new DataView(raw.buffer);
		const dictLength = raw.length >= 4 ? view.getUint32(0) : 0;
		const output = new TAC(dictLength, new Map(), raw.subarray(dictLength + 4));

		try {
			for (let cursor = 4; cursor < dictLength + 4; ) {
				const thisEntry: Partial<TacDictEntry> = {};
				thisEntry.indexOffset = view.getUint32(cursor);
				cursor += 4;
				thisEntry.width = view.getUint32(cursor);
				cursor += 4;
				thisEntry.height = view.getUint32(cursor);
				cursor += 4;
				thisEntry.colorFormat = tacColorFormats.revGet(((view.getUint8(cursor) >> 6) + 1) as 1 | 2 | 3 | 4);
				thisEntry.bitDepth = (1 << ((view.getUint8(cursor++) >> 4) & 3)) as BitDepth;
				thisEntry.nameLength = view.getUint8(cursor++);
				thisEntry.name = new TextDecoder().decode(raw.subarray(cursor, cursor + thisEntry.nameLength));
				cursor += thisEntry.nameLength;
				output.dict.set(thisEntry.name, thisEntry as TacDictEntry);
			}
		} catch (_) {
			clog("Input TAC file either has an invalid dict length, or is missing bytes, resulting TAC may be corrupted...", "Warning", "TIC");
		}
		return output;
	}

	/**
	 * An interface to TAC cache files. Never construct this class by itself. Use the {@link PNG.cache} member on PNG.
	 */
	constructor(public dictLength = 0, public dict: Map<string, TacDictEntry> = new Map(), public dataChunk: Uint8Array = new Uint8Array()) {}
	/**
	 * Validates TAC dictionary values, and makes corrections when needed and possible.
	 *
	 * **Checked Properties:**
	 *
	 * - All encoded names have a length <= 256
	 * - All name length values match encoded name length.
	 * - Dict length is correct.
	 * - Byte offset values are within the limits of the datachunk
	 * - Image data doesn't extend the length of the datachunk
	 */
	validate(alreadyValidated = false) {
		let dictLength = 0;
		// [name, size in dict, size in datachunk]
		const invalidEntries: string[] = [];
		this.dict.forEach(entry => {
			let valid = true;
			// Base entry length
			dictLength += 14;

			// Validate name length
			const encodedName = new TextEncoder().encode(entry.name);
			entry.nameLength = encodedName.length;
			if (entry.nameLength > 256) {
				clog(`The image name ${entry.name} exceeds the maximum length (256), it will be shortened...`, "Warning", "TIC");
				entry.name = new TextDecoder().decode(encodedName.slice(0, 256));
				clog(`The image has been renamed to ${entry.name}...`, "Log", "TIC");
				entry.nameLength = 256;
			}
			dictLength += entry.nameLength;

			const dataLength = TAC.entryDataLength(entry);
			if (entry.indexOffset >= this.dataChunk.length) {
				clog(`Cached image ${entry.name} has an invalid byte offset, it will be removed form the cache...`, "Warning", "TIC");
				valid = false;
			}
			if (entry.indexOffset + dataLength > this.dataChunk.length) {
				clog(`Cached image ${entry.name} has invalid data length, it will be removed from the cache...`, "Warning", "TIC");
				valid = false;
			}
			if (!valid) {
				invalidEntries.push(entry.name);
			}
		});
		if (invalidEntries.length) {
			invalidEntries.forEach(e => {
				this.removeEntry(e);
			});
			if (!alreadyValidated) {
				this.validate(true);
			}
		}
	}
	/**
	 * Remove a named entry from the TAC.
	 * @param entryName The name of the entry.
	 */
	removeEntry(entryName: string) {
		if (this.dict.has(entryName)) {
			const entry = this.dict.get(entryName)!;
			const nameLength = new TextEncoder().encode(entry.name).length;
			this.dictLength -= 14 + nameLength;
			const dataLength = TAC.entryDataLength(entry);
			this.dataChunk = concatTypedArray(this.dataChunk.subarray(0, entry.indexOffset), this.dataChunk.subarray(entry.indexOffset + dataLength));
			this.dict.forEach(e => {
				if (e.indexOffset > entry.indexOffset) {
					e.indexOffset -= dataLength;
				}
			});
			this.dict.delete(entryName);
		} else {
			clog(`${entryName} could not be found in the dictionary, it may not exist...`, "Warning", "TIC");
		}
	}
	/**
	 * Add an entry to the TAC. Or overwrite an existing entry.
	 * @param entryName The name of the entry, this must be 255 characters or less in ASCII.
	 * @param wav The image to add.
	 * @param bitDepth The desired bit depth of the image, lower values reduce quality and file size.
	 */
	writeEntry(entryName: string, wav: WAV) {
		if (this.dict.has(entryName)) {
			this.dict.delete(entryName);
		}
		const formatter = new PNGFormatterTo(wav);
		if (!formatter.canBeRGBA()) clog(`The image to be cached as ${entryName} is not valid RGBA. Expected raw length of ${wav.width * wav.height * 4}, got ${wav.raw.length}...`, "Warning", "TIC");
		let colorFormat: TicColorFormat = "GrayScale";
		let encodedRaw: Uint8Array = wav.raw;
		if (formatter.canBeGrayScale()) {
			encodedRaw = formatter.toGrayScale();
		} else if (formatter.canBeGrayScaleAlpha()) {
			encodedRaw = formatter.toGrayScaleAlpha();
			colorFormat = "GrayScaleAlpha";
		} else if (formatter.canBeRGB()) {
			encodedRaw = formatter.toRGB();
			colorFormat = "RGB";
		} else {
			colorFormat = "RGBA";
		}
		encodedRaw = packBits(encodedRaw, wav.width, bitDepth);
		const thisEntry: TacDictEntry = {
			indexOffset: this.dataChunk.length,
			width: wav.width,
			height: wav.height,
			colorFormat: colorFormat,
			bitDepth: bitDepth,
			nameLength: new TextEncoder().encode(entryName).length,
			name: entryName
		};
		this.dictLength += 14 + thisEntry.nameLength;
		this.dict.set(entryName, thisEntry);
		this.dataChunk = concatTypedArray(this.dataChunk, encodedRaw);
	}

	/**
	 * Read and decode a TAC entry.
	 * @param entryName The name of the entry in the TAC.
	 */
	readEntry(entryName = ""): DecodeResult {
		if (!this.dict.has(entryName)) {
			return { raw: new Uint8Array(), width: 0, height: 0, colorFormat: "RGBA", bitDepth: 8 };
		}
		const entry = this.dict.get(entryName)!;
		const dec: DecodeResult = {
			raw: this.dataChunk.subarray(entry.indexOffset, entry.indexOffset + TAC.entryDataLength(entry)),
			width: entry.width,
			height: entry.height,
			colorFormat: entry.colorFormat,
			bitDepth: entry.bitDepth
		};

		return dec;
	}

	/**
	 * Encode the TAC to binary.
	 */
	encode(): Uint8Array {
		// Validate dict entries and chunk length.
		this.validate();

		// Create output buffers.
		const buffer = new ArrayBuffer(this.dictLength + this.dataChunk.length + 4);
		const view = new DataView(buffer);

		// Encode dict entries.
		view.setUint32(0, this.dictLength);
		let cursor = 4;
		this.dict.forEach(x => {
			view.setUint32(cursor, x.indexOffset);
			cursor += 4;
			view.setUint32(cursor, x.width);
			cursor += 4;
			view.setUint32(cursor, x.height);
			cursor += 4;
			view.setUint8(cursor++, ((ticColorFormats.get(x.colorFormat) - 1) << 6) + (Math.log2(x.bitDepth) << 4));
			view.setUint8(cursor++, x.nameLength);
			const encodedString = new TextEncoder().encode(x.name);
			for (let i = 0; i < encodedString.length; i++) {
				view.setUint8(cursor++, encodedString[i]);
			}
		});

		// Convert to byteArray and add dataChunk.
		const output = new Uint8Array(buffer);
		output.set(this.dataChunk, this.dictLength + 4);
		return output;
	}
}
