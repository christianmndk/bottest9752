/*
Things that can be improved:
Implement log file
More clarity in log messages and errors
different log levels

Make convert function look for latest picture or video based on which format it is trying to convert to
Make conver function argument to look further back than the latest attachemt eg. the second to last attachment
...
*/

// used so the bot can download things
const https = require('https');
const fs = require('fs');
const fsprom = require('fs/promises');

const stupidcommands = require("./scripts/stupidcommands");

/*
How to download
// Find the file type and download it
filename = "file." + attachment.url.split('.')[attachment.url.split('.').length-1]
const file = fs.createWriteStream(filename);
const request = https.get(attachment.url, function(response) {
	response.pipe(file);
});
*/

// Extract the required classes from the required modules
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, MessageAttachment, MessageEmbed, Collection, Intents } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioResource, createAudioPlayer, StreamType, AudioPlayerStatus } = require('@discordjs/voice');
const { spawn } = require('child_process');
const { getTime } = require('./scripts/helper')
const EventEmitter = require('events');

// setup event emitter clas
class MyEmitter extends EventEmitter { };

// Create an instance of a Discord client with intents
const botIntents = new Intents([Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]);
const client = new Client({ intents: botIntents });

// Create some constants
const DEV_CLIENT_ID = '724737960871723048';
const minimumWritten = 30; // create a little buffer before we start streaming
const ffmpegVideoFormats = ['avi', 'flac', 'flv', 'gif', 'm4v', 'mjpeg', 'mov', 'mp2', 'mp3', 'mp4', 'mpeg', 'nut', 'oga', 'ogg', 'ogv', 'opus', 'rm', 'tta', 'v64', 'wav', 'webm', 'wv'];
const ffmpegPictureFormats = ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp'];
// Only for raw image files that can be converted to something else
const ffmpegRawImageFormats = ['cr2', 'nef', 'orf', 'raw', 'sr2'];

// Create organiser for voicechannels
let VoiceChannels = new Map();

// Log at initiation
console.log(getTime());

// Log our bot in using the token from https://discordapp.com/developers/applications/me
var auth = require('./auth.json');
client.login(auth.token);

/*---------------------- *
* REGISTRERING COMMANDS  *
* ----------------------*/

// A list of all available functions
client.commands = new Collection();

async function updateGuildCommands(guildId, clientId, refresh = true) {
	// Clear all commands not all will exist anymore
	client.commands = new Collection();

	const commands = []
	const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

	console.log(`All files added as commands: ${commandFiles.join(' ')}`)
	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);
		// Add it to the list of commands
		client.commands.set(command.data.name, command)
		// Reregistre all commands
		if (refresh) {
			commands.push(command.data.toJSON());
		}
	}

	// If we only want to update the command list dont run code after this
	if (!refresh) { return; }

	const rest = new REST({ version: 9 }).setToken(auth.token);

	try {
		console.log(`Refresing guild slash commands in ${guildId}`);
		await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands }
		);
		console.log(`Succesfully reloaded guild slash commadns in ${guildId}`)

	} catch (err) {
		console.error(`Error when reloading guild commands in ${guildId}`)
		console.error(err)
	}
}

/*-------------------- *
*  EXECUTING COMMANDS  *
* --------------------*/

// Everytime we start the bot refreshes the command list
updateGuildCommands(null, null, false);

client.on('interactionCreate', async interaction => {
	console.log('Got interaction');
	//console.log(interaction);
	if (!interaction.isCommand()) { return; }
	console.log('interaction is command')
	//console.log(interaction)

	const cmd = client.commands.get(interaction.commandName);
	console.log(cmd.data.name)

	if (!cmd) {
		console.log(`${cmd.data.name} is not a registered command`)
		return;
	}

	// Execute our command if everything passed
	try {
		await interaction.deferReply();
		await cmd.execute(interaction)
	} catch (err) {
		console.error(`error while running: ${cmd.data.name} in: ${interaction.guildId}`)
		console.error(err)
		await interaction.followUp({ content: `${cmd.data.name} failed when executing`, ephemeral: true }) 
	}

});

/* 
// Adding a voice
async function addVoiceConnection(message) {
	const connection = joinVoiceChannel({
		channelId: message.member.voice.channel.id,
		guildId: message.guildId,
		adapterCreator: message.guild.voiceAdapterCreator
	});
	var info = new Map();
	info.set('playing', false);
	info.set('queue', new Array());
	info.set('ended', true);
	info.set('id', message.member.voice.channel.id);
	info.set('guild', message.guild.id);
	info.set('channel', message.member.voice.channel);
	info.set('connection', connection);
	info.set('audioPlayer', createAudioPlayer());
	info.set('songTimeout') // backup incase the audio does not emit a 'finish' event
	info.set('fileNumber', 0);
	info.set('eventHandler', new EventEmitter());
	info.set('currentVideoInfo');
	info.set('settingUpSong', false);
	// all in milliseconds
	info.set('timeStarted', 0);
	info.set('pauseStarted', 0);
	info.set('videoLength', 0);
	info.set('pausedTime', 0);
	info.set('seeked', 0)

	console.log(info.get('guild'));
	connection.subscribe(info.get('audioPlayer')); // Connect the audio connection to the audioplayer
	VoiceChannels.set(info.get('guild'), info); // The guild id is used to uniquely identify each server

	info.get('eventHandler').on('SongOver', async function PlayNextSong(soundChannel, filename, channel) {
		console.log(`${filename}: is done playing playing in: ${info.get('guild')}`);
		soundChannel.set('playing', false);
		clearTimeout(soundChannel.get('songTimeout')); // Clear next song back up to be sure
		let nextSongInfo = soundChannel.get('queue').shift();
		if (nextSongInfo) {
			playMusic(info.get('guild'), nextSongInfo.get('url'), nextSongInfo.get('info'), nextSongInfo.get('start'), nextSongInfo.get('channel'))
		} else {
			channel.send({ content: 'The music queue is now empty' });
			//await info.get('audioPlayer').play('');
		}

	});
	info.get('eventHandler').on('Shutdown', async function disconnectShutdown() {
		await removeVoiceConnection(info.get('guild'));
		console.log('removed voice channel: ' + info.get('guild'));
	});
} */
/* 
// removing a voice connection
async function removeVoiceConnection(ConnectionId) {
	return new Promise(async resolve => {
		let soundChannel = VoiceChannels.get(ConnectionId);
		await soundChannel.get('connection').destroy();
		await soundChannel.get('audioPlayer').stop()
		soundChannel.get('eventHandler').emit('killffmpeg');
		VoiceChannels.delete(ConnectionId);
		resolve(true); // Signal that we are done
	}); // promise ends
} */

// notify us when the bot is ready
client.on('ready', () => {
	console.log('I am ready!');
	fs.mkdir(__dirname + '\\songs', { recursive: false }, (err) => {
		if (err) {
			console.log('Retrying to empty song folder');
			fs.rmSync(__dirname + '\\songs', { maxRetries: 10, recursive: true, retryDelay: 10 }, err => { console.log(err) });
			fs.mkdir(__dirname + '\\songs', { recursive: false }, (err) => {
				if (err) { console.log('Failed to create empty song folder: continuing anyway: ' + err) }
				else { console.log('Song folder emptied') }
			});
		} else { console.log('Song folder emptied') }
	});
});

// is run when node js is stopped using CTRL-c
process.on('SIGINT', async function () {
	console.log('Caught interrupt signal');

	VoiceChannels.forEach(async (soundChannel) => {
		await removeVoiceConnection(soundChannel.get('guild'));
	});

	// add stuff here

	//doesn't work implement other function
	//fs.rmSync( __dirname + '\\songs', {maxRetries: 10, recursive: true, retryDelay: 10});

	// This should always run last
	// Make sure everything before this is done executing or it might not finish
	process.exit();
});

client.on('messageCreate', async message => {
	// If the message is starts with testbot and author is not a bot
	if (message.content == 'updateDevCommands' && message.author.id == '253543726696235008') {
		message.reply('will do!');
		updateGuildCommands(message.guildId, DEV_CLIENT_ID);
	}
	if (message.content == 'refreshDevCommands' && message.author.id == '253543726696235008') {
		message.reply('will do!');
		updateGuildCommands(null, null, false);
	}

	// Voice channel commands
	// If the message is starts with soundbot and author is not a bot
	else if (message.content.substring(0, 9) == 'soundbot ' && !message.author.bot) {
		return;
		console.log('recieved voice command');
		// Test to see if the user is in a voicechannel
		if (message.guild) {
			if (!message.member.voice.channel) {
				message.reply({ content: 'you must be in a voice channel to use that command' });
				return;
			}
		} else {
			message.reply({ content: `you can only use this command in a guild` });
			return;
		}
		let ConnectionId = message.guild.id;
		var args = message.content.substring(9).split(' ');
		var cmd = args[0];
		args = args.splice(1);
		switch (cmd) {
			// soundbot ping
			case 'ping': {
				message.channel.send({ content: 'pong!' });
				break;
			}

			// soundbot join
			case 'join': {
				// check if we are already in a voice channel in that guild
				if (!VoiceChannels.has(ConnectionId)) {
					await addVoiceConnection(message);
					console.log(VoiceChannels);
				} else {
					if ((VoiceChannels.get(ConnectionId).get('id') == message.member.voice.channel.id)) {
						message.reply({ content: 'I am already playing in that channel' });
					} else { message.reply({ content: `I am playing in ${VoiceChannels.get(ConnectionId).get('channel')} right now` }); }
					console.log(VoiceChannels);
				}
				break;
			}

			// soundbot play
			case 'play': {
				if (VoiceChannels.has(ConnectionId)) {
					if (!(VoiceChannels.get(ConnectionId).get('id') == message.member.voice.channel.id)) {
						message.reply({ content: 'You must be in the same voice channel as the bot to use this command' });
						return;
					}
				} else {
					await addVoiceConnection(message);
					console.log('added voice channel:\n' + ConnectionId);
				}
				let soundChannel = VoiceChannels.get(ConnectionId);

				if (args.length == 0) {
					message.reply({ content: 'you must give at least one word as an argument to search for a video' });
					break;
				}
				args = args.join(' ').split('@');
				const searchQuery = args[0];
				let start = 0;
				if (!isNaN(args[1])) {
					start = +args[1];
				} else if (args[1]) {
					message.reply({ content: 'the time argument after @ must be in seconds and contain no spaces (\'@38\')' });
				}
				if (soundChannel.get('playing') || soundChannel.get('settingUpSong')) {
					const videoInfo = await getVideoLink(searchQuery); // must be run in both or else we risk playing two song simultaneously 
					queue(ConnectionId, videoInfo.url, videoInfo, start, message.channel);
					console.log(`Queued "${videoInfo.url}" in ${ConnectionId}`);
					message.reply({ content: 'your song is now queued' });
					return;
				} else {
					soundChannel.set('settingUpSong', true);
					const videoInfo = await getVideoLink(searchQuery);
					playMusic(ConnectionId, videoInfo.url, videoInfo, start, message.channel);
				}
				break;
			}

			// soundbot leave
			case 'leave': {
				if (VoiceChannels.has(ConnectionId)) {
					if (VoiceChannels.get(ConnectionId).get('id') == message.member.voice.channel.id) {
						player = VoiceChannels.get(ConnectionId).get('audioPlayer');
						player.stop();
						removeVoiceConnection(ConnectionId);
						console.log('removed voice channel: ' + ConnectionId);
					} else { message.reply({ content: 'you must be in the same channel as the bot to use that command' }); }
				} else { message.reply({ content: 'the bot must be running for you to use that command' }); }
				break;
			}

			// soundbot pause
			case 'pause': {
				if (VoiceChannels.has(ConnectionId)) {
					if (VoiceChannels.get(ConnectionId).get('id') == message.member.voice.channel.id) {
						let soundChannel = VoiceChannels.get(ConnectionId);
						let player = soundChannel.get('audioPlayer');
						if (player) {
							clearTimeout(soundChannel.get('songTimeout')); // Stop any timeouts
							player.pause();
							soundChannel.set('pauseStarted', getTime());
							console.log('paused voice channel: ' + ConnectionId);
						} else { message.reply({ content: 'the bot is not playing anything right now' }); }
					} else { message.reply({ content: 'you must be in the same channel as the bot to use that command' }); }
				} else { message.reply({ content: 'the bot must be running for you to use that command' }); }
				break;
			}

			// soundbot resume
			case 'resume': {
				if (VoiceChannels.has(ConnectionId)) {
					if (VoiceChannels.get(ConnectionId).get('id') == message.member.voice.channel.id) {
						let soundChannel = VoiceChannels.get(ConnectionId);
						let player = soundChannel.get('audioPlayer');
						if (player) {
							// THIS SHOULD WORK BUT DOESNT NEEDS THE NEXT BIT OF CODE
							player.unpause();

							soundChannel.set('pausedTime', soundChannel.get('pausedTime') + (getTime() - soundChannel.get('pauseStarted')));
							soundChannel.set('pauseStarted', 0); // Reset just to be sure
							clearTimeout(soundChannel.get('songTimeout')); // Clear previous timeouts just to be sure
							soundChannel.set('songTimeout', createSongTimeout(soundChannel)); // Create new timeout

							console.log(getTimestamp(soundChannel));
							console.log('resumed voice channel: ' + ConnectionId);

						} else { message.reply({ content: 'the bot is not playing anything right now' }); }
					} else { message.reply({ content: 'you must be in the same channel as the bot to use that command' }); }
				} else { message.reply({ content: 'the bot must be running for you to use that command' }); }
				break;
			}

			// soundbot skip
			case 'skip': {
				let soundChannel = VoiceChannels.get(ConnectionId);
				if (VoiceChannels.has(ConnectionId)) {
					if (soundChannel.get('id') == message.member.voice.channel.id) {
						let playing = soundChannel.get('playing');
						if (playing) {
							soundChannel.get('eventHandler').emit('killffmpeg');
							if (soundChannel.get('queue').length > 0) {
								filename = soundChannel.get('playing');
								soundChannel.set('playing', false);
								soundChannel.get('eventHandler').emit('SongOver', soundChannel, filename, message.channel);
							} else {
								let player = soundChannel.get('audioPlayer');
								player.stop()
								soundChannel.set('playing', false);
								soundChannel.set('ended', true);
							}
							clearTimeout(soundChannel.get('songTimeout')); // Clear any timeouts we have
						} else { message.reply({ content: 'nothing is playing right now' }); }
					} else { message.reply({ content: 'you must be in the same channel as the bot to use that command' }); }
				} else { message.reply({ content: 'the bot must be running for you to use that command' }); }
				break;
			}

			// soundbot queue
			case 'queue': {

				let soundChannel = VoiceChannels.get(ConnectionId);
				if (soundChannel.get('queue').length > 0) {
					let embed = new MessageEmbed()
						.setColor('#FF0000')
						.setTitle('Queue:');
					soundChannel.get('queue').forEach(song => {
						embed.addField(song.get('info').title, song.get('url'));
					});
					message.channel.send({ embeds: [embed] });
				} else { message.reply({ content: 'the queue is empty' }); }
				break;
			}

			// soundbot remove
			case 'remove': {
				if (args.length == 0) {
					message.reply({ content: 'you must suply atleast one number after remove' });
				}
				for (let i = 0; i < args.length; i++) {
					if (isNaN(args[i])) {
						return;
					}
				}

				let soundChannel = VoiceChannels.get(ConnectionId);
				if (VoiceChannels.has(ConnectionId)) {
					if (soundChannel.get('id') == message.member.voice.channel.id) {
						if (soundChannel.get('queue').length > 0) {
							let queue = soundChannel.get('queue')
							// one argument
							if (args.length == 1) {
								console.log(args.length + ' ' + args[0])
								if (queue.length >= +args[0]) {
									queue.splice(+args[0] - 1, 1); // the first item is not at the first index
								} else { message.reply({ content: 'the queue does not have a song at that position' }); }
								// two arguments
							} else if (args.length == 2) {
								console.log(args.length + ' ' + args[0] + ' ' + args[1])
								if (args[0] > args[1]) {
									let tmp = args[0];
									args[0] = args[1];
									args[1] = tmp;
								}
								if (queue.length >= +args[0]) {
									if (queue.length < +args[1]) {
										message.reply({ content: `removing all songs after ${args[0]}` });
									}
									queue.splice(+args[0] - 1, +args[1] - +args[0]);
								} else { message.reply({ content: 'the queue does not contain any songs in that range' }); }
								// more than two arguments
							} else {
								console.log(args.length + ' ' + args.join(' '));
								let removed = 0;
								let notRemoved = [];
								for (let i = 0; i < args.length; i++) {
									if (queue.length >= +arg[i]) {
										queue.splice(+arg[i] - 1 - removed, 1);
										removed += 1;
									} else {
										notRemoved.push(args[i]);
									}
								}
								if (notRemoved == '') {
									message.reply({ content: `removed songs at positions: ${args.join(', ')}` });
								} else {
									message.reply({ content: `tried to remove songs at positions: ${args.join(', ')} but the queue did not contain songs at positions: ${notRemoved.join(', ')}` });
								}
							}
						} else { message.reply({ content: 'the queue is empty' }); }
					} else { message.reply({ content: 'you must be in the same channel as the bot to use that command' }); }
				} else { message.reply({ content: 'the bot must be running for you to use that command' }); }
				break;
			}

			//soundbot seek
			case 'seek': {
				message.reply({ content: 'Seek does not work at the moment' })
				return;
				let start = 0;
				if (!isNaN(args[0])) {
					start = +args[0];
				} else {
					message.reply({ content: 'you must suply a number after seek' });
					break;
				}

				if (VoiceChannels.has(ConnectionId)) {
					const soundChannel = VoiceChannels.get(ConnectionId);
					if (soundChannel.get('id') == message.member.voice.channel.id) {
						const playing = soundChannel.get('playing');
						if (playing) {

							const fileName = playing;
							setupSound(soundChannel, fileName, args[0], message.channel);

						} else { message.reply({ content: 'the bot is not playing anything right now' }); }
					} else { message.reply({ content: 'you must be in the same channel as the bot to use that command' }); }
				} else { message.reply({ content: 'the bot must be running for you to use that command' }); }
				break;
			}

			// soundbot timestamp
			case 'timestamp': {

				const ConnectionId = message.guild.id;
				if (VoiceChannels.has(ConnectionId)) {
					const soundChannel = VoiceChannels.get(ConnectionId);
					if (soundChannel.get('id') == message.member.voice.channel.id) {
						const playing = soundChannel.get('playing');
						if (playing) {
							embed = timestampEmbed(soundChannel);
							message.channel.send({ embeds: [embed] });
						} else { message.reply({ content: 'the bot is not playing anything right now' }); }
					} else { message.reply({ content: 'you must be in the same channel as the bot to use that command' }); }
				} else { message.reply({ content: 'the bot must be running for you to use that command' }); }
				break;
			}

			// soundbot test
			case 'test': {
				message.reply({ content: "test" });
				let resoruce = createAudioResource('test.webm')
				console.log(resoruce)
				break;
			}

			// Just add any case commands if you want to..

			case 'help': {
				const embed = new MessageEmbed()
					.setColor('#FF0000')

				if (args.length == 0) {
					embed
						.setTitle('soundbot commands')
						.addField('Help', 'Use soundbot help [function] to get more detailed help on the functions')
						.addField('Music', 'join\nplay\nleave\npause\nresume\nskip\nremove\nseek')
						.addField('Information', 'queue\ntimestamp')
						.addField('Test', 'ping\ntest');
				}

				let func = args[0]
				switch (func) {
					case 'ping': {
						embed
							.addField('Execution', 'soundbot ping')
							.addField('Arguments', 'This commands ignores all arguments')
							.addField('Explanation', 'Pings the bot to see if it is running')
						break;
					}
					case 'join': {
						embed
							.addField('Execution', 'soundbot join')
							.addField('Arguments', 'This commands ignores all arguments')
							.addField('explanation', 'Joins your current voicechannel\nthe \'play\' function does not need this command to be run first');
						break;
					}
					case 'play': {
						embed
							.addField('Execution', 'soundbot play (string) @[number]')
							.addField('Arguments', `1 or 2
						string: Space seperated search query to be searched for on youtube
						(optional) number : The amount of seconds to skip of the video prefixed by '@'`)
							.addField('Explanation', `Searches youtube for a video matching the search query
						If a song is already playing the searched for video will be added to the queue
						If seek is included the first [number] of seconds will be skipped`);
						break;
					}
					case 'pause': {
						embed
							.addField('WARNING', 'This commands is not functioning optimally, but still works as intended')
							.addField('Execution', 'soundbot pause')
							.addField('Arguments', 'This commands ignores all arguments')
							.addField('Explanation', 'Pauses the currently playing song')
						break;
					}
					case 'resume': {
						embed
							.addField('WARNING', 'This commands is not functioning optimally, but still works as intended')
							.addField('Execution', 'soundbot resume')
							.addField('Arguments', 'This commands ignores all arguments')
							.addField('Explanation', 'Resumes the currently paused song')
						break;
					}
					case 'skip': {
						embed
							.addField('Execution', 'soundbot skip')
							.addField('Arguments', 'This commands ignores all arguments')
							.addField('Explanation', 'Skips the currently playing song')
						break;
					}
					case 'queue': {
						embed
							.addField('Execution', 'soundbot queue')
							.addField('Arguments', 'This commands ignores all arguments')
							.addField('Explanation', 'Shows all items in the queue')
						break;
					}
					case 'remove': {
						embed
							.addField('Execution', 'soundbot remove (number) [number] [...]')
							.addField('Arguments', '0, 1 or more\nnumber: position in the queue')
							.addField('Explanation', `1 argument: Removes song at position (number)
						(optional) 2 arguments: Removes all song in the queue between (number) and [number], but not [number]
						(optional) more arguments: Removes songs at the specified positions in the queue`)
						break;
					}
					case 'seek': {
						embed
							.addField('Execution', 'soundbot seek (number)')
							.addField('Arguments', '1\nnumber: Seek to this second in the currently playing song')
							.addField('Explanation', 'Seeks to the (number)\'s second of the currently playing song')
						break;
					}
					case 'timestamp': {
						embed
							.addField('Execution', 'soundbot timestamp')
							.addField('Arguments', 'This commands ignores all arguments')
							.addField('Explanation', 'Sends an embed showing the current position in the song')
						break;
					}
					case 'test': {
						embed
							.addField('DEV FUNCTION', 'THIS FUNCTION IS MEANT FOR TESTING PURPOSES AND SHOULD NOT BE EXECUTED AS IT COULD HAVE UNINTENDED CONSEQUENCES')
							.addField('Execution', 'soundbot test')
							.addField('Arguments', 'This commands most likely ignores all arguments')
							.addField('Explanation', 'A commands used by the dev team to test new function\nIt should not do anything, but dont test your luck');
						break;
					}
					case 'help': {
						embed
							.addField('Execution', 'soundbot help [function]')
							.addField('Arguments', '0 or 1\nFunction: The function you want help with')
							.addField('Explanation', `0 arguments: Prints a list of all soundbot commands
						1 argument: Gives detalied help on (function)`)
						break;
					}
					default: {
						if (func || func == '') {
							message.reply({ content: `${func} is not a testbot command` });
							return;
						}
					}
				}

				message.channel.send({ embeds: [embed] });
				break;
			}

			default: {
				message.reply({ content: `${cmd} is not a soundcommand` })
			}
		}
	}
});

// Define common functions

function queue(ConnectionId, url, info, start, channel) {
	let soundChannel = VoiceChannels.get(ConnectionId);
	let queueItem = new Collection();
	queueItem.set('url', url);
	queueItem.set('info', info);
	queueItem.set('start', start);
	queueItem.set('channel', channel);

	soundChannel.get('queue').push(queueItem);
}

// TODO IMPLEMENT SEEK FUNCTION BECAUSE SHIT BROKE
async function playMusic(ConnectionId, url, info, start, channel) {

	const soundChannel = VoiceChannels.get(ConnectionId);

	console.log(`Now playing "${url}" in ${ConnectionId}`);

	//let ratelimited = false;
	let fileName = __dirname + '\\songs\\' + soundChannel.get('fileNumber') + soundChannel.get('guild') + '.opus';

	// Delete previous file if found
	deleteFile(fileName);

	// Increment file number and update file name
	// This should mean that we allways have a clean file for ffmpeg
	soundChannel.set('fileNumber', soundChannel.get('fileNumber') + 1);

	fileName = __dirname + '\\songs\\' + soundChannel.get('fileNumber') + soundChannel.get('guild') + '.opus';

	// Has to contain " or else it will not run on the cmd.exe shell
	let formatString = '"bestaudio/best[abr>96][height<=480]/best[abr<=96][height<=480]/best[height<=720]/best[height<=1080]/best"';
	let ytdl = spawn('youtube-dl', [url, '-f', formatString, '-o', '-'], { shell: 'cmd.exe' });
	let ffmpeg = spawn('ffmpeg', ['-y', '-i', '-', '-c:a:v', 'copy', '-b:a', '128k', fileName], { shell: 'cmd.exe' });

	/* -------YTDL EVENTS------- */
	ytdl.on('error', async error => { console.log('error: ' + error) });
	ytdl.stdout.on('data', async data => { ffmpeg.stdin.write(data); }); // Writes data to ffmpeg
	const reDownSpeed = /Ki(?=B\/s)/; // check if the download speed is not in kilo bytes (ends stream early)
	const reSpeed = /at[ ]*[0-9]*/; // actual speed in kilo bytes
	ytdl.stderr.on('data', async data => { // messages from ytdl
		if (reDownSpeed[Symbol.match](`${data}`)) {
			console.log(`ytdl: stderr: ${data}`);
		}
	});

	ytdl.on('close', (code) => {
		console.log(`ytdl process exited with code ${code}`);
		ffmpeg.stdin.end(); // lets ffmpeg end
	});

	/* ------FFMPEG EVENTS------ */

	// Used to registre when ffmpeg starts filling up the file
	const ffmpegEmitter = soundChannel.get('eventHandler');
	// Find how much we have written to file
	const reWritten = /me=[:\d]*/;
	let written = 0;
	// check when the audio file has some data
	ffmpeg.stderr.on('data', async data => {
		if (`${data}`.startsWith('size=')) {
			written = reWritten[Symbol.match](`${data}`)[0].substring(3);
			written = written.split(':');
			written = parseInt(written[0], 10) * 3600 + parseInt(written[1], 10) * 60 + parseInt(written[2], 10);
			// once we have enough start the song (We must have at least 5)
			if ((written > start && written > minimumWritten) || written >= soundChannel.get('videoLength') / 1000) { ffmpegEmitter.emit('fileReady'); }
			//console.log( `ffmpeg: stderr: ${data}`);
		}
		//console.log( `ffmpeg: stderr: ${data}`);
	});
	ffmpeg.on('close', (code) => { console.log(`ffmpeg process exited with code ${code}`); });

	ffmpegEmitter.once('fileReady', () => {
		console.log('now playing file --------------------------------')
		setupSound(soundChannel, fileName, start, channel);
	});
	// When skipping kill ffmpeg if it is still running to save resources
	ffmpegEmitter.on('killffmpeg', async () => {
		if (ytdl.exitCode == null) { ytdl.kill(); } // doesnt seem to stop downloads
		if (ffmpeg.exitCode == null) {
			ffmpeg.kill();
		}
	});
	/* ------------------------- */

	soundChannel.set('videoLength', info.length * 1000);
	soundChannel.set('currentVideoInfo', info);
	soundChannel.set('playing', filename);
	soundChannel.set('settingUpSong', false);

	embed = youtubeEmbed(url, info);
	channel.send({ embeds: [embed] });
}

function setupSound(soundChannel, filename, start, channel) {

	let player = soundChannel.get('audioPlayer');
	soundChannel.set('timeStarted', getTime());
	soundChannel.set('seeked', start * 1000);
	soundChannel.set('pauseStarted', 0);
	soundChannel.set('pausedTime', 0);
	soundChannel.set('playing', filename);
	soundChannel.set('settingUpSong', false);
	soundChannel.set('ended', false);

	const resource = createAudioResource(
		fs.createReadStream(filename),
		{
			inputType: StreamType.OggOpus,
			inlineVolume: false
		});

	//console.log(player)
	player.play(resource)

	// create backup for the 'finish' event so the bot doesn't stall
	clearTimeout(soundChannel.get('songTimeout')); // We must stop the previous one first
	soundChannel.set('songTimeout', createSongTimeout(soundChannel));

	let songOver = false;

	soundChannel.get('eventHandler').on('killSong', () => {
		if (songOver) { return; }
		console.log(`Song timed out in: ${soundChannel.get('guild')}\nkilling...`)
		songOver = true;
		soundChannel.get('eventHandler').emit('SongOver', soundChannel, filename, channel);
	});

	player.on(AudioPlayerStatus.Idle, function () {
		if (songOver) { return; }
		songOver = true;
		console.log(`Audio finish event triggered in ${soundChannel.get('guild')}`)
		clearTimeout(soundChannel.get('songTimeout')); // cancel backup skipper
		soundChannel.get('eventHandler').emit('SongOver', soundChannel, filename, channel);
	});
}



// gets video link from search query
async function getVideoLink(searchQuery) {
	if (!searchQuery) {
		searchQuery = await getDefaultSearchQuery()
	}
	let videoId = "";
	let video = new Promise(function (resolve) {
		let wholeDocument = new MyEmitter;
		https.get("https://www.youtube.com/results?search_query=" + searchQuery, (res) => {
			let documentBody = "";
			res.on('data', (data) => {
				documentBody += data;

				if (data.slice(data.length - 7) == "</html>") { wholeDocument.emit("got", documentBody) }

			});
		});

		wholeDocument.on("got", async (data) => {

			// Create regex patterns
			const rePlaylist = /","playlistId":"/;
			const reInformation = /"videoId":.*?,"vi/g;
			const reThumbnail = /(?<="thumbnails":\[).*?(?=\])/;
			const reTitle = /(?<="title":\{"runs":\[\{"text":").*?(?="\}\])/;
			const reLength = /(?<=}},"simpleText":")[\d\.]+/;

			// We extract a snippet of the whole document containing the relevant information about the video and loop through them until it is not a playlist
			let result = reInformation[Symbol.match](data)[0];
			let i = 1;
			while (rePlaylist[Symbol.match](result)) {
				result = reInformation[Symbol.match](data)[i];
				i++;
			}

			if (result != null) {
				// extracts the video Id and adds it to the link
				videoId = result.slice(11, 22);
				videoLink = "https://www.youtube.com/watch?v=" + videoId;
				// extracts the title of the video
				videoTitle = reTitle[Symbol.match](result)[0].replace('\\u0026', '&');
				// extracts the thumbnail link of highest quality
				tempThumbnail = reThumbnail[Symbol.match](result)[0].split(',');
				videoThumbnailLink = tempThumbnail[tempThumbnail.length - 3].slice(8).slice(0, -1);
				// extracts the video length

				tempLength = reLength[Symbol.match](result)[0].split('.');
				let time = 0;
				if (tempLength.length == 3) { time = parseInt(tempLength[0], 10) * 3600 + parseInt(tempLength[1], 10) * 60 + parseInt(tempLength[2], 10); }
				else { time = parseInt(tempLength[0], 10) * 60 + parseInt(tempLength[1], 10); }

				// we pack the video info nice and tidy
				let video = {
					url: videoLink,
					title: videoTitle,
					thumbnail: videoThumbnailLink,
					length: time
				};
				resolve(video);
			}
			//process.stdout.write(data);
		});
	});
	return video;
}

function youtubeEmbed(url, videoInfo) {
	const embed = new MessageEmbed()
		.setColor('#FF0000')
		.setTitle('Youtube playing:')
		.setThumbnail(videoInfo.thumbnail)
		.addField('Video name', videoInfo.title)
		.addField('link:', url, true);
	return embed;
}

function timestampEmbed(soundChannel) {
	let info = soundChannel.get('currentVideoInfo');
	let videoLength = info.length;
	let time = Math.floor(getTimestamp(soundChannel) / 1000);
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

	const embed = new MessageEmbed()
		.setColor('#FF0000')
		.setTitle('Youtube playing:')
		.setThumbnail(info.thumbnail)
		.addField('Video name', info.title)
		.addField('link:', info.url, true)
		.setDescription(timestr);
	return embed;
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

function getTimestamp(soundChannel) {
	let timestamp = getTime() - soundChannel.get('timeStarted') - soundChannel.get('pausedTime') + soundChannel.get('seeked');
	if (soundChannel.get('audio')) {
		if (soundChannel.get('pauseStarted')) {
			timestamp -= (getTime() - soundChannel.get('pauseStarted'));
		}
	}
	return parseInt(timestamp);
}

