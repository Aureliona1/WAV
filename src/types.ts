/**
 * The result of decoding a WAV from either a file or a cache.
 */
export type DecodeResult = {
	sampleRate: number;
	channelData: Float32Array[];
};

/**
 * A valid method for converting stereo (or multi-channel audio) to mono.
 */
export type MonoType = "Left only" | "Right Only" | "Average LR";

/**
 * Supported bit-depth for WAV files.
 */
export type WAVBitDepth = 8 | 16 | 24 | 32;

/**
 * Supported byte encoding format for WAV files.
 */
export type WAVFormat = `${WAVBitDepth}-bit Int` | "32-bit Float";

/**
 * A collection of the absolute byte offsets of data values in WAV files.
 */
export const BYTE_OFFSETS = {
	FILE_SIZE: 4,
	FORMAT: 20,
	CHANNELS: 22,
	SAMPLE_RATE: 24,
	BYTES_PER_SEC: 28,
	BYTES_PER_BLOCK: 32,
	BITS_PER_SAMPLE: 34,
	DATA_CHUNK: 36,
	DATA_LENGTH: 40,
	DATA_START: 44
};

/**
 * The format of a TAC dictionary entry.
 */
export type TacDictEntry = {
	indexOffset: number;
	sampleCount: number;
	sampleRate: number;
	channelCount: number;
	nameLength: number;
	name: string;
};
