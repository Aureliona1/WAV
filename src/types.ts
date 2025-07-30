export type DecodeResult = {
	sampleRate: number;
	channelData: Float32Array[];
};

/**
 * Audio sample data in either stereo or mono.
 */
export type ChannelData =
	| {
			left: Float32Array;
			right: Float32Array;
	  }
	| Float32Array;

export type StereoType = "Stereo" | "Left only" | "Right Only" | "Average LR";
