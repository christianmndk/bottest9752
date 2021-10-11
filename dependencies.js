// All paths must be relative to bot.js

const d = new Map();

d.set("./scripts/embeds", ["./scripts/helper"]);
d.set("./scripts/fourchan.js", []);
d.set("./scripts/helper", []);
d.set("./scripts/sound", ["./scripts/helper"]);
d.set("./scripts/stupidcommands", []);
d.set("./scripts/voiceConnection", ["./scripts/helper", "./scripts/sound"]);
d.set("./commands/convert", []);
d.set("./commands/join", ["./scripts/helper", "./scripts/voiceConnection"]);
d.set("./commands/jschlatt", []);
d.set("./commands/leave", ["./scripts/helper", "./scripts/voiceConnection"]);
d.set("./commands/pause", ["./scripts/helper"]);
d.set("./commands/ping", []);
d.set("./commands/play", ["./scripts/helper", "./scripts/voiceConnection", "./scripts/sound", "./scripts/embeds"]);
d.set("./commands/queue", ["./scripts/helper"]);
d.set("./commands/remove", ["./scripts/helper"]);
d.set("./commands/resume", ["./scripts/helper"]);
d.set("./commands/seek", ["./scripts/helper"]);
d.set("./commands/skip", ["./scripts/helper"]);
d.set("./commands/test", ["./scripts/helper"]);
d.set("./commands/timestamp", ["./scripts/helper", "./scripts/embeds"]);

module.exports = {
	dependencies: d
}