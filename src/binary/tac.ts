import { clog, concatTypedArray } from "@aurellis/helpers";
import type { DecodeResult, TacDictEntry } from "../types.ts";
import type { WAV } from "../wav.ts";

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
	sampleCount: Uint32 <- single channel
	channelCount: Uint16
	nameLength: Uint8
	name: Uint8Array up to 255 length

The end of each sample's section in the datachunk will be calculated as indexStart + sampleCount * channelCount.

Each dictionary entry takes 15 + nameLength bytes.

datachunk: Float32Array
*/
export class TAC {
	/**
	 * Base length of a dict entry with a 0-length name.
	 */
	private static DICT_ENTRY_BASE_LENGTH = 15;
	/**
	 * Maximum name length supported by the dict.
	 */
	private static DICT_NAME_MAX_LENGTH = 256;
	/**
	 * Get the length of an entry in the datachunk.
	 */
	private static entryDataLength(entry: TacDictEntry): number {
		return entry.sampleCount * entry.channelCount;
	}

	/**
	 * Decode a binary TAC file.
	 * @param raw The raw TAC binary.
	 * @returns Decoded TAC data.
	 */
	static from(raw: Uint8Array): TAC {
		const view = new DataView(raw.buffer);
		const dictLength = raw.length >= 4 ? view.getUint32(0) : 0;
		const dataChunk = new Float32Array(raw.buffer, raw.byteOffset + dictLength + 4, (raw.length - dictLength - 4) / 4);
		const output = new TAC(dictLength, new Map(), dataChunk);

		try {
			for (let cursor = 4; cursor < dictLength + 4; ) {
				const thisEntry: Partial<TacDictEntry> = {};
				thisEntry.indexOffset = view.getUint32(cursor);
				cursor += 4;
				thisEntry.sampleRate = view.getUint32(cursor);
				cursor += 4;
				thisEntry.sampleCount = view.getUint32(cursor);
				cursor += 4;
				thisEntry.channelCount = view.getUint16(cursor);
				cursor += 2;
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
	 * An interface to TAC cache files. Never construct this class by itself. Use the {@link WAV.cache} member on WAV.
	 */
	constructor(public dictLength = 0, public dict: Map<string, TacDictEntry> = new Map(), public dataChunk: Float32Array = new Float32Array()) {}
	/**
	 * Validates TAC dictionary values, and makes corrections when needed and possible.
	 *
	 * **Checked Properties:**
	 *
	 * - All encoded names have a length <= 256
	 * - All name length values match encoded name length.
	 * - Dict length is correct.
	 * - Byte offset values are within the limits of the datachunk
	 * - Audio data doesn't extend the length of the datachunk
	 */
	validate(alreadyValidated = false) {
		let dictLength = 0;
		const invalidEntries: string[] = [];
		this.dict.forEach(entry => {
			let valid = true;
			// Base entry length
			dictLength += TAC.DICT_ENTRY_BASE_LENGTH;

			// Validate name length
			const encodedName = new TextEncoder().encode(entry.name);
			entry.nameLength = encodedName.length;
			if (entry.nameLength > TAC.DICT_NAME_MAX_LENGTH) {
				clog(`The audio name ${entry.name} exceeds the maximum length (${TAC.DICT_NAME_MAX_LENGTH}), it will be shortened...`, "Warning", "TAC");
				entry.name = new TextDecoder().decode(encodedName.slice(0, TAC.DICT_NAME_MAX_LENGTH));
				clog(`The audio has been renamed to ${entry.name}...`, "Log", "TAC");
				entry.nameLength = TAC.DICT_NAME_MAX_LENGTH;
			}
			dictLength += entry.nameLength;

			const dataLength = TAC.entryDataLength(entry);
			if (entry.indexOffset >= this.dataChunk.length) {
				clog(`Cached audio ${entry.name} has an invalid index offset, it will be removed form the cache...`, "Warning", "TAC");
				valid = false;
			}
			if (entry.indexOffset + dataLength > this.dataChunk.length) {
				clog(`Cached audio ${entry.name} has invalid data length, it will be removed from the cache...`, "Warning", "TAC");
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
			this.dictLength -= TAC.DICT_ENTRY_BASE_LENGTH + nameLength;
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
	 * @param wav The audio to add.
	 */
	writeEntry(entryName: string, wav: WAV) {
		if (!wav.hasValidSampleCount) {
			clog(`The audio ${entryName} does not have a valid sample count, it will not be written to the cache...`, "Warning", "TAC");
			return;
		}
		if (this.dict.has(entryName)) {
			this.dict.delete(entryName);
		}
		const thisEntry: TacDictEntry = {
			sampleCount: (wav.raw[0] ?? new Float32Array()).length,
			channelCount: wav.raw.length,
			sampleRate: wav.sampleRate,
			indexOffset: this.dataChunk.length,
			nameLength: new TextEncoder().encode(entryName).length,
			name: entryName
		};
		this.dictLength += TAC.DICT_ENTRY_BASE_LENGTH + thisEntry.nameLength;
		this.dict.set(entryName, thisEntry);
		this.dataChunk = concatTypedArray(this.dataChunk, ...wav.raw);
	}

	/**
	 * Read and decode a TAC entry.
	 * @param entryName The name of the entry in the TAC.
	 */
	readEntry(entryName = ""): DecodeResult {
		if (!this.dict.has(entryName)) {
			return { sampleRate: 44100, channelData: [] };
		}
		const entry = this.dict.get(entryName)!;
		const dec: DecodeResult = {
			sampleRate: entry.sampleRate,
			channelData: new Array(entry.channelCount).fill(new Float32Array()).map((_, i) => this.dataChunk.subarray(entry.indexOffset + i * entry.sampleCount, entry.indexOffset + (i + 1) * entry.sampleCount))
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
		const buffer = new ArrayBuffer(this.dictLength + this.dataChunk.byteLength + 4);
		const view = new DataView(buffer);

		// Encode dict entries.
		view.setUint32(0, this.dictLength);
		let cursor = 4;
		this.dict.forEach(x => {
			view.setUint32(cursor, x.indexOffset);
			cursor += 4;
			view.setUint32(cursor, x.sampleRate);
			cursor += 4;
			view.setUint32(cursor, x.sampleCount);
			cursor += 4;
			view.setUint16(cursor, x.channelCount);
			cursor += 2;
			view.setUint8(cursor, x.nameLength);
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
