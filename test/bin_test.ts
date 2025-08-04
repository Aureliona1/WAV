import { clog, compare } from "@aurellis/helpers";
import { decode } from "../src/binary/decode.ts";
import { assert } from "../src/vendor/assert.ts";

Deno.test({
	name: "Decode Mono 16",
	fn: () => {
		const bin = Deno.readFileSync("test/input/mono16.wav");
		const dec = decode(bin);
		clog(dec.sampleRate);
		clog(dec.channelData);
	}
});
