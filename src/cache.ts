import { clog, pathCanBeAccessed } from "@aurellis/helpers";
import { TAC } from "./binary/tac.ts";
import type { DecodeResult } from "./types.ts";
import type { WAV } from "./wav.ts";

/**
 * Abstract wrapper for TAC cache files, this class should only be constructed for a single unique TAC file.
 */
export class WAVCache {
	private readFile() {
		if (pathCanBeAccessed(this.fileName)) {
			try {
				this.tac = TAC.from(Deno.readFileSync(this.fileName));
			} catch (_) {
				clog("Error reading TAC cache file, check your read permissions...", "Warning", "WAV Cache");
				clog("Loaded audio cache is not synced with the disk...", "Warning", "WAV Cache");
			}
		}
	}
	private tac!: TAC;
	/**
	 * Abstract wrapper for TAC cache files.
	 * @param fileName The name of the TAC cache.
	 */
	constructor(public readonly fileName = "cache.tac") {
		if (pathCanBeAccessed(fileName)) {
			this.readFile();
		} else {
			this.tac = new TAC();
		}
	}

	/**
	 * Read an entry from the cache.
	 * @param entryName The name of the entry in the cache.
	 * @returns The specified entry, or a blank WAV if the name is invalid.
	 */
	read(entryName = ""): DecodeResult {
		this.readFile();
		return this.tac.readEntry(entryName);
	}

	/**
	 * Update or add an entry to the cache.
	 * @param entryName The name of the entry, this must be 256 characters or less in ASCII.
	 * @param wav The audio to add, leave blank to remove the audio with the specified name from the cache.
	 */
	write(entryName = "", wav?: WAV) {
		if (!wav) {
			this.tac.removeEntry(entryName);
		} else {
			this.tac.writeEntry(entryName, wav);
		}
		try {
			Deno.writeFileSync(this.fileName, this.tac.encode());
		} catch (_) {
			clog("Error writing cache file, cache is still updated in memory but not on disk...", "Warning", "WAV Cache");
			clog("Check your write permisions...", "Warning", "WAV Cache");
		}
	}

	/**
	 * Readonly list of addressable entries in the cache.
	 */
	get entries(): string[] {
		this.readFile();
		return Array.from(this.tac.dict.keys());
	}

	/**
	 * Delete the cache file, and clear its contents if deletion fails.
	 */
	clear() {
		try {
			Deno.removeSync(this.fileName);
		} catch (_) {
			clog("Couldn't delete cache file, cache will be cleared in memory but file may still exist on disk...", "Warning", "WAV Cache");
		} finally {
			this.tac.dict.clear();
			this.tac.dataChunk = new Float32Array();
			this.tac.dictLength = 0;
		}
	}
}
