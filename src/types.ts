export type DecodeResult = {
	sampleRate: number;
	channelData: Float32Array[];
};

export type StereoType = "Stereo" | "Left only" | "Right Only" | "Average LR";
