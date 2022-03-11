const fsprom = require('fs/promises');
const https = require('https');
const fs = require('fs')
const { Collection } = require('discord.js');
const { VoiceChannels } = require('../NR');

let filename = "assets/DefaultSearch.txt";

module.exports = {
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
					console.log(`unexpected error when checking for file:\n${err}\nTrying to delete anyways`);
					return true;
				}
				else if (err.code == 'ENOENT') {
					//console.log(`${filename} is already deleted`);
					return false;
				}
			});
		if (exists) {
			fsprom.rm(filename, { force: true, maxRetries: 1000, recursive: true })
				.catch(err => {
					console.log(`unexpected error when deleting file:\n${err}`);
				})
				.then(() => {
					//console.log(`Succesfully deleted ${filename}`);
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
		// Text in guild = 1
		if (!interaction.guild && (level >= 1)) {
			await interaction.editReply('You can only use this command in a guild');
			return false;
		// You in a voice channel = 2
		} else if (!interaction.member.voice.channel && (level >= 2)) {
			await interaction.editReply('You must be in a voicechannel to use that command');
			return false;
		// Bot is in a voice channel = 3
		} else if (!VoiceChannels.has(ConnectionId ) && (level >= 3)) {
			await interaction.editReply('The bot must be in a voicechannel to use that command');
			return false;
		}
		// Is in same voice channel = 4
		if (level <= 3) { return true; }
		const soundChannel = VoiceChannels.get(ConnectionId)
		if (!soundChannel.get('id') == interaction.member.voice.channel.id && (level >= 4)) {
			await interaction.editReply('You must be in the same voicechannel as the bot to use that command');
			return false;
		}
		// Is playing = 5
		//if (level <= 4) { return true; }
		else if (!soundChannel.get('audioPlayer') && (level >= 5)) {
			await interaction.editReply('The bot is not playing anything right now');
			return false;
		}
		// Is paused = 6
		//if (level <= 5) { return true; }
		else if (soundChannel.get('pauseStarted') && (level >= 6)) {
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
	},
	titleFromVideoPage: async function (URL) {
		const title = new Promise(function (resolve, reject) {
		const request = https.get(URL, (res) => {
			let data = "";
			res.on('data', (newData) => {
				data += newData;
			});

			res.on('end', () => {
				// Create regex patterns
				const reTitle = /<title>.*?<\/title>/;

				let tmptitle = reTitle[Symbol.match](data)
				if (!tmptitle) { // REMEMBER TO NEGATE
					reject('No <title> found; probably not a real URL');
					return;
				}
				tmptitle = tmptitle[0];

				if (!tmptitle.endsWith(' - YouTube</title>')) {
					reject("title does not end with - Youtube; not a youtube link");
					return;
				}
				console.log("FOUND TITLE")
				tmptitle = tmptitle.substring(7, tmptitle.length-18)
				resolve(tmptitle);
			});
		});
		
		request.end();

		});

		return title;
	},
	ConvertSecondsToTimestamp: function (videoLength, time) {
		let timestr = '';
		let timestrtmp = '';
		let tmp;
		// hours
		if (videoLength >= 3600) {
			tmp = Math.floor(time / 3600);
			timestr += _TimestampFormat(tmp) + ':';
			time -= 3600 * tmp;

			tmp = Math.floor(videoLength / 3600);
			timestrtmp += _TimestampFormat(tmp) + ':';
			videoLength -= 3600 * tmp;
		}

		// minutes
		tmp = Math.floor(time / 60);
		timestr += _TimestampFormat(tmp) + ':';
		time -= 60 * tmp;

		tmp = Math.floor(videoLength / 60);
		timestrtmp += _TimestampFormat(tmp) + ':';
		videoLength -= 60 * tmp;

		//seconds
		timestr += _TimestampFormat(Math.floor(time));
		timestrtmp += _TimestampFormat(Math.floor(videoLength));

		timestr += ' / ' + timestrtmp;
		return timestr;
	},
}

function _TimestampFormat(time) {
	let timestr = ''
	if (time < 10) {
		timestr += '0' + time
	} else {
		timestr += time
	}
	return timestr;
}

// Used to call this files exported functions in other of the exported functions
const self = module.exports