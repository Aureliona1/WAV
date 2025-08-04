export type DecodeResult = {
	sampleRate: number;
	channelData: Float32Array[];
};

export type MonoType = "Left only" | "Right Only" | "Average LR";

export type WAVBitDepth = 8 | 16 | 24 | 32;

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
	SAMPLE_LENGTH: 40,
	SAMPLE_START: 44
};

export type TacDictEntry = {
	indexOffset: number;
	sampleCount: number;
	sampleRate: number;
	channelCount: number;
	nameLength: number;
	name: string;
};
