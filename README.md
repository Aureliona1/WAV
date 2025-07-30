# WAV

This package contains several utilities for reading, writing, and modifying WAV audio files.

To install the package, follow the respective guide for importing packages from JSR with your environment of choice.

This package conatins many helpful items, so it is encouraged to explore the source to get a full understanding of some of the options available.

WAV is made to work with [Deno](deno.com), and has not been tested on other runtimes.
To import WAV into your project, use the JSR import:

```ts
import { WAV } from "jsr:@aurellis/wav";

const song = new WAV();
```

Alternatively, you can import the current commit using the GitHub URL (not recommended).

```ts
import { WAV } from "https://raw.githubusercontent.com/Aureliona1/wav/refs/heads/main/mod.ts";

const song = new WAV();
```
