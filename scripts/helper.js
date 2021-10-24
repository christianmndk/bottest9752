const fsprom = require('fs/promises');
const fs = require('fs')
const { Collection } = require('discord.js');

let filename = "assets/DefaultSearch.txt";

module.exports = {
	VoiceChannels: new Map(),
	getTime: function() { return parseInt(new Date().getTime()); },
	/* createSongTimeout: function (soundChannel) {
		// We increase the expected remaining time by 1 second incase something funky happens
		let timeoutLength = soundChannel.get('videoLength') - soundChannel.get('seeked') - soundChannel.get('pausedTime') + 1000
		let timeout = setTimeout(() => { soundChannel.get('eventHandler').emit('killSong'); }, timeoutLength);
		console.log(`created timeout in: ${soundChannel.get('guild')} with length: ${timeoutLength}`)
		return timeout;
	}, */
	getDefaultSearchQuery: async function () {
		defaultSearchQuery = new Promise(function (resolve) {
			fs.readFile(filename, 'utf8', function (err, data) {
				if (err) throw err;
				const defaultSearchArray = data.split(',');
				resolve(defaultSearchArray[Math.floor(Math.random() * defaultSearchArray.length)])
			});
		});
		return defaultSearchQuery
	},
	deleteFile: async function (filename) {
		let exists = await fsprom.access(filename)
			.then(() => { return true; })
			.catch(err => {
				if (err.code !== 'ENOENT') {
					console.log(`unexpected error when checking for song file:\n${err}\nTrying to delete anyways`);
					return true;
				}
				else if (err.code == 'ENOENT') {
					console.log(`${filename} is already deleted`);
					return false;
				}
			});
		if (exists) {
			fsprom.rm(filename, { force: true, maxRetries: 1000, recursive: true })
				.catch(err => {
					console.log(`unexpected error when deleting for song file:\n${err}`);
				})
				.then(() => {
					console.log(`Succesfully deleted ${filename}`);
				});
		}
	},
	getTimestamp: function (soundChannel) {
		let timestamp = self.getTime() - soundChannel.get('timeStarted') - soundChannel.get('pausedTime') + soundChannel.get('seeked');
		if (soundChannel.get('pauseStarted')) {
			timestamp -= (self.getTime() - soundChannel.get('pauseStarted'));
		}
		return parseInt(timestamp);
	},
	removeDuplicates: function (array) {
		for (let t = 0; t < array.length; t++) {
			for (let h = t+1; h < array.length; h++) {
				if (array[t] == array[h]) {
					array.splice(h, 1);
					h--
				}
			}
		}
		return array;
	},
	checkVoice: async function (interaction, level) {
		// Level indicates the amount of layers to check with 0 being no layers

		const ConnectionId = interaction.guildId;
		if (!interaction.guild && (level >= 1)) {
			await interaction.editReply('You can only use this command in a guild');
			return false;
		} else if (!interaction.member.voice.channel && (level >= 2)) {
			await interaction.editReply('You must be in a voicechannel to use that command');
			return false;
		} else if (!self.VoiceChannels.has(ConnectionId ) && (level >= 3)) {
			await interaction.editReply('The bot must be in a voicechannel to use that command');
			return false;
		}
		if (level <= 3) { return true; }
		const soundChannel = self.VoiceChannels.get(ConnectionId)
		if (!soundChannel.get('id') == interaction.member.voice.channel.id && (level >= 4)) {
			await interaction.editReply('You must be in the same voicechannel as the bot to use that command');
			return false;
		}
		if (level <= 4) { return true; }
		if (!soundChannel.get('audioPlayer') && (level >= 5)) {
			await interaction.editReply('The bot is not playing anything right now');
			return false;
		}
		if (level <= 5) { return true; }
		if (soundChannel.get('pauseStarted') && (level >= 6)) {
			await interaction.editReply('The bot is not paused');
			return false;
		}
		return true;
	},
	createQueueItem: function (url, info, start, channel) {
		const queueItem = new Collection();
		queueItem.set('url', url);
		queueItem.set('info', info);
		queueItem.set('start', start);
		queueItem.set('channel', channel);
		return queueItem;
	}
}

// Used to call this files exported functions in other of the exported functions
const self = module.exports