/*
Things that can be improved:
play function should download the currently playing song, but strean it until its done, when its done downloading all commands should be used on
	the downloaded song for faster reaction eg. seek

Make convert function look for latest picture or video based on which format it is trying to convert to
Make conver function argument to look further back than the latest attachemt eg. the second to last attachment
...
*/

var auth = require('./auth.json');

// used so the bot can download things
const https = require('https');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

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

// Variables and functions used to search for things on youtube
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
	process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'youtube-nodejs-quickstart.json';

function GetAuth() {
	content = fs.readFileSync('client_secret.json');
	var auth = authorize(JSON.parse(content));
	return auth;
}

function authorize(credentials) {
	var clientSecret = credentials.installed.client_secret;
	var clientId = credentials.installed.client_id;
	var redirectUrl = credentials.installed.redirect_uris[0];
	var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

	oauth2Client.credentials = JSON.parse(fs.readFileSync(TOKEN_PATH))
	return oauth2Client;
}

	// call this function when you need to execute other youtube commands
	// or use it to create simpler functions (credential is SecretContent)

// Extract the required classes from the required modules
const { Client, MessageAttachment, MessageEmbed, Collection} = require('discord.js');
const { spawn } = require('child_process');
const EventEmitter = require('events');
var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;

// Create an instance of a Discord client
const client = new Client();

// Create some constants
const ffmpegVideoFormats = ['avi','flac','flv','gif','m4v','mjpeg','mov','mp2','mp3','mp4','mpeg','nut','oga','ogg','ogv','opus','rawvideo','rm','tta','v64','wav','webm','webp','wv']
const ffmpegPictureFormats = ['bmp','gif','jpg','jpeg','png','tif','tiff','webp']
// Only for raw image files that can be converted to something else
const ffmpegRawImageFormats = ['cr2', 'nef', 'orf', 'raw', 'sr2']

// Create organiser for voicechannels
let VoiceChannels = new Map();

// Adding a voice connection
async function addVoiceConnection(message) {
	const connection = await message.member.voice.channel.join();
	var info = new Map();
	info.set('playing', '');
	info.set('queue', new Array());
	info.set('ended', true);
	info.set('id', message.member.voice.channel.id);
	info.set('guild', message.guild.id);
	info.set('channel', message.member.voice.channel);
	info.set('connection', connection);
	info.set('eventHandler', new EventEmitter());

	ConnectionID = message.guild.id;
	console.log(ConnectionID);
	VoiceChannels.set(ConnectionID, info);

	info.get('eventHandler').on('SongOver', function PlayNextSong(nextSongInfo) { 
		playMusic(ConnectionID, nextSongInfo.get('url'), nextSongInfo.get('info'), nextSongInfo.get('start'), nextSongInfo.get('channel'))
	})
	info.get('eventHandler').on('Shutdown', function disconnectShutdown() { 
		info.get('connection').disconnect();
		removeVoiceConnection(info.get('guild'));
		console.log('removed voice channel: ' + info.get('guild'));
	});

	//connection.on('speaking', async speaking => {});
}

// removing a voice connection
function removeVoiceConnection(ConnectionID) {
	VoiceChannels.delete(ConnectionID)
}

// notify us when the bot is ready
client.on('ready', () => {
	console.log('I am ready!');
	fs.mkdir(__dirname + '\\songs', {recursive: false} ,(err) =>  { 
		if (err) { console.log('error when creating song folder: ' + err) };
	});
});

// is run when node js is stopped using CTRL-c
process.on('SIGINT', function() {
	console.log('Caught interrupt signal');
	
	// add stuff here
	let deleteSongs = spawn('powershell', ['-c', 'Remove-Item -Recurse -Force ' + __dirname + '\\songs']);
	deleteSongs.on('close', code => {
		console.log(code);
		process.exit();
	})
	
});

client.on('message', async message => {
	// If the message is starts with testbot and author is not a bot
	if (message.content.substring(0, 8) == 'testbot ' && !message.author.bot ) {
		console.log('recieved command');
		var args = message.content.substring(8).split(' ');
		var cmd = args[0];
		args = args.splice(1);

		switch(cmd) {
			// testbot rip
			case 'rip': {
				// Create the attachment using MessageAttaSchment
				attachment = new MessageAttachment('https://i.imgur.com/w3duR07.png');
				// Send the attachment in the message channel with a content
				message.reply(attachment);
				break;
			}
			// testbot ping
			case 'ping': {
				message.reply('pong!');
				console.log(message);
				break;
			}
			// testbot reply
			case 'webm': {
				if (message.attachments.first()) {
					message.reply('the command \'webm\' requires a webm attachment sent with the message');
					break;
				}
				// Go through each attachment
				message.attachments.each(attachment => {
					// Create an identical attachment as the one in the message and send it back
					name = attachment.name.split('.').slice(0, attachment.name.split('.').length-1).join() + ".mp4";
					if (!attachment.name.toLowerCase().endsWith('webm')) {
						message.reply(attachment.name + ' was not converted because it is not a webm');
					}
					else {
						var ffmpeg = spawn('ffmpeg', ['-y', '-i', attachment.url, '-c:a:v', 'copy' ,'file.mp4']);
						ffmpeg.on('close', code => {
							if (code == 0) {
								console.log(attachment);
								console.log('Sending converted');
								Converted = new MessageAttachment('./file.mp4', name);
								message.reply(Converted).then(fs.unlink('./file.mp4', er => { if (er) {console.error('An error occurred:\n', er)} })).catch(er => console.error(er));
							}
							else {
								console.log('ffmpeg failed during conversion');
								message.reply(attachment.name + ' could not be converted because an error happened during conversion');
							}
						});
					}
				});
				break;
			}
			// testbot convert
			case 'convert' : {
				let name;
				let isVideo;
				// check for new file type
				if (args.length == 0) { 
					message.reply('you need to provide a new file type for the file'); 
					return; 
				} else if (ffmpegVideoFormats.includes(args[0])) { isVideo = true;
				} else if (ffmpegPictureFormats.includes(args[0])) { isVideo = false;
				} else { 
					message.reply('the first argument must be a valid file extension like mp4 or jpg'); 
					return;
				}
				// check if user made a new name otherwise give it the old name
				if (args.length > 1 && typeof args[1] === 'string') {
					name = args[1] + '.' + args[0];
				}
				// get the latest file
				message.channel.messages.fetch({ limit: 10 })
					.then(messages => {return messages.filter(m => m.attachments.first() && !m.author.bot);})
					.then(messages => { 
						if (!messages.first()) {message.reply('found no pictures or images 10 messages back, aborting');}
						else {
							messages.first().attachments.each(attachment => {
								// Check for matching file type
								let originalFileExtension = attachment.name.split('.')[attachment.name.split('.').length-1].toLowerCase()
								if ((ffmpegRawImageFormats.includes(originalFileExtension) || ffmpegPictureFormats.includes(originalFileExtension)) && isVideo) {
									message.reply('the latest attachment was a picture and you tried to convert it into a video, aborting');
									return;
								} else if (ffmpegVideoFormats.includes(originalFileExtension) && !isVideo ) {
									message.reply('the latest attachment was a video and you tried to convert it into a picture, aborting');
									return;
								} else if (!(ffmpegRawImageFormats.includes(originalFileExtension) || ffmpegPictureFormats.includes(originalFileExtension) || ffmpegVideoFormats.includes(originalFileExtension))) {
									message.reply('uploaded filetype is not supported');
								}
								// check for name
								if (!name) {name = attachment.name.split('.').slice(0, attachment.name.split('.').length-1).join('.') + args[0];}
								// convert the file
								let file = `./${name}`
								let ffmpeg = spawn('ffmpeg', ['-y', '-i', attachment.url, '-c:a:v', 'copy', name])
								
								ffmpeg.on('close', code => {
									if (code == 0) {
										console.log(attachment.url);
										console.log('Sending converted');
										Converted = new MessageAttachment(file, name);
										message.reply(Converted).then(fs.unlink(file, er => { if (er) {console.error('An error occurred:\n', er)} })).catch(er => console.error('An error occurred and was caught:\n', er));
									}
									else {
										console.log('ffmpeg failed during conversion');
										message.reply(attachment.name + 'could not be converted because an error happened during conversion');
										fs.unlink(file, er => { if (er) {console.error('An error occurred:\n', er)} }).catch(er => console.error('An error occurred and was caught:\n', er));
									}
								});
							});
						}
					});
				break;
			}
			//testbot jslat
			case 'jslat' : {
				stupidcommands.Jslat(message, args);
				break;
			}
			// testbot spotify
			case 'spotify' : {
				stupidcommands.spotify(message);
				break;
			}
			// testbot test
			case 'test' : {
				/* https.get('https://www.youtube.com/watch?v=HyeIaosplcw', (test) => {
					console.log(test)
				}); */
				let fileName = __dirname + '\\' + message.guild.id;
				// .%(ext)s is necessary so youtube-dl does not complain about downloading and extracting audio to the same place
				let ytdl = spawn('youtube-dl', ['https://www.youtube.com/watch?v=HyeIaosplcw', '-x', '-o', fileName + '.%(ext)s']);
				ytdl.on('close', code => {
					if (code == 0) {
						console.log('all good');
						connection = VoiceChannels.get(message.guild.id).get('connection');
						console.log(fileName)
						const stream = fileName + '.opus'
						const audio = connection.play(
							stream, 
							{volume: false, StreamType: 'converted', highWaterMark: 12} 
						);
					} else {
						console.log('ytdl exited with error code: ' + code)
						fs.unlink('fileName', err => { if (err) {console.error('An error occurred:\n', err)} })
					}
				});
				break;
			}
			// Just add any case commands if you want to..
		}
	}

	// Voice channel commands
	// If the message is starts with soundbot and author is not a bot
	else if (message.content.substring(0, 9) == 'soundbot ' && !message.author.bot ) {
		console.log('recieved voice command');
		// Test to see if the user is in a voicechannel
		if (message.guild) {
			if (!message.member.voice.channel) {
				message.reply('you must be in a voice channel to use that command');
				return;
			}
		} else {
			message.reply('you must be in a voice channel to use that command');
			return;
		}
		var args = message.content.substring(9).split(' ');
		var cmd = args[0];
		args = args.splice(1);

		switch(cmd) {
			// soundbot ping
			case 'ping': {
				message.channel.send(`${message.author}, pong!`);
				break;
			}
			// soundbot join
			case 'join' : {
				let ConnectionID = message.guild.id;
				// check if we are already in a voice channel in that guild
				if (!VoiceChannels.has(ConnectionID)){
					await addVoiceConnection(message);
					console.log(VoiceChannels);
				} else {
					if ((VoiceChannels.get(ConnectionID).get('id') == message.member.voice.channel.id)) {
						message.reply('I am already playing in that channel');
					} else { message.reply(`I am playing in ${VoiceChannels.get(ConnectionID).get('channel')} right now`); }
				console.log(VoiceChannels);
				}
				break;
			}
			// soundbot play
			case 'play' : {
				let ConnectionID = message.guild.id;
				if (VoiceChannels.has(ConnectionID)){
					if (!(VoiceChannels.get(ConnectionID).get('id') == message.member.voice.channel.id)) {
						message.reply('You must be in the same voice channel as the bot to use this command');
						return;
					}
				} else {
					await addVoiceConnection(message);
					console.log('added voice channel:\n' + ConnectionID);
				}
				connection = VoiceChannels.get(ConnectionID).get('connection');
				let soundChannel = VoiceChannels.get(ConnectionID)
				if (args.length == 0) {
					message.reply('you must give at least one word as an argument to search for a video');
					break;
				}
				args = args.join(' ').split('@')
				const searchQuery = args[0];
				let start = 0;
				if (!isNaN(args[1])){
					start = +args[1];
				} else if (args[1]) {
					message.reply('the time argument after @ must be in seconds and contain no spaces (\'@38\')');
				}
				const [url, info] = await getVideoLink(searchQuery);
				if (ytdl.validateURL(url)) {
					if (soundChannel.get('playing')) {
						queue(ConnectionID, url, info, start, message.channel);
						console.log(`Queued "${url}" in ${ConnectionID}`);
						message.reply('your song is now queued');
						return;
					} else {
					playMusic(ConnectionID, url, info, start, message.channel)
					}
				} else {
					console.error('id and url did not yield a valid url');
					message.reply('that video not available');
				}
				break;
			}
			// soundbot leave
			case 'leave' : {
				let ConnectionID = message.guild.id;
				if (VoiceChannels.has(ConnectionID)) {
					if (VoiceChannels.get(ConnectionID).get('id') == message.member.voice.channel.id) {
						connection = VoiceChannels.get(ConnectionID).get('connection');
						connection.disconnect();
						removeVoiceConnection(ConnectionID);
						console.log('removed voice channel: ' + ConnectionID);
					} else { message.reply('you must be in the same channel as the bot to use that command'); }
				} else { message.reply('the bot must be running for you to use that command'); }
				break;
			}
			// soundbot pause
			case 'pause' : {
				let ConnectionID = message.guild.id;
				if (VoiceChannels.has(ConnectionID)) {
					if (VoiceChannels.get(ConnectionID).get('id') == message.member.voice.channel.id) {
						let audio = VoiceChannels.get(ConnectionID).get('playing');
						if (audio) {
							if (!audio.paused) {
								console.log(audio);
								audio.pause();
								console.log('paused voice channel: ' + ConnectionID);
							} else { message.reply('the bot is already paused'); }
						} else { message.reply('the bot is not playing anything right now'); }
					} else { message.reply('you must be in the same channel as the bot to use that command'); }
				} else { message.reply('the bot must be running for you to use that command'); }
				break;
			}
			// soundbot resume
			case 'resume' : {
				let ConnectionID = message.guild.id;
				if (VoiceChannels.has(ConnectionID)) {
					if (VoiceChannels.get(ConnectionID).get('id') == message.member.voice.channel.id) {
						let audio = VoiceChannels.get(ConnectionID).get('playing');
						if (audio) {
							if (audio.paused) {
								audio.resume();
								console.log('resumed voice channel: ' + ConnectionID);
							} else { message.reply('the bot is already playing'); }
						} else { message.reply('the bot is not playing anything right now'); }
					} else { message.reply('you must be in the same channel as the bot to use that command'); }
				} else { message.reply('the bot must be running for you to use that command'); }
				break;
			}
			// soundbot skip
			case 'skip' : {
				let ConnectionID = message.guild.id;
				let soundChannel = VoiceChannels.get(ConnectionID);
				if (VoiceChannels.has(ConnectionID)) {
					if (soundChannel.get('id') == message.member.voice.channel.id) {
						let audio = soundChannel.get('playing');
						if (audio) {
							if(soundChannel.get('queue').length > 0){
								soundChannel.set('playing', false);
								let nextSongInfo = soundChannel.get('queue').shift();
								soundChannel.get('eventHandler').emit('SongOver', nextSongInfo);

							} else { 
								connection = soundChannel.get('connection')
								connection.play('');
								soundChannel.set('playing', false);
								soundChannel.set('ended', true);
							 }
						} else { message.reply('nothing is playing right now') ;}
					} else { message.reply('you must be in the same channel as the bot to use that command'); }
				} else { message.reply('the bot must be running for you to use that command'); }
				break;
			}
			// soundbot queue
			case 'queue' : {
				let ConnectionID = message.guild.id;
				let soundChannel = VoiceChannels.get(ConnectionID);
				if (soundChannel.get('queue').length > 0) {
					let embed = new MessageEmbed()
						.setColor('#FF0000')
						.setTitle('Queue:');
					soundChannel.get('queue').forEach(song => {
						embed.addField(song.get('info').title, song.get('url'));
					});
					message.channel.send(embed);
				} else ( message.reply('the queue is empty'))
				break;
			}
			case 'seek' : {

				if (!isNaN(args[0])){
					start = +args[0];
				} else {
					message.reply('you must suply a number after seek');
					break;
				}

				const ConnectionID = message.guild.id;
				if (VoiceChannels.has(ConnectionID)) {
					const soundChannel = VoiceChannels.get(ConnectionID);
					if (soundChannel.get('id') == message.member.voice.channel.id) {
						const playing = soundChannel.get('playing');
						if (playing) {

							const fileName = playing
							setupSound(soundChannel, fileName, args[0], message.channel)

						} else { message.reply('the bot is not playing anything right now'); }
					} else { message.reply('you must be in the same channel as the bot to use that command'); }
				} else { message.reply('the bot must be running for you to use that command'); }
				break;
			}
			// soundbot test
			case 'test' : {
				let ConnectionID = message.guild.id;
				let soundChannel = VoiceChannels.get(ConnectionID);
				message.reply(test);
				break;
			}
			// Just add any case commands if you want to..
		}
	}
});

// Log our bot in using the token from https://discordapp.com/developers/applications/me
client.login(auth.token);

// Define common functions

function queue(ConnectionID, url, info, start, channel) {
	let soundChannel = VoiceChannels.get(ConnectionID);
	let queueItem = new Collection();
	queueItem.set('url', url);
	queueItem.set('info', info);
	queueItem.set('start', start);
	queueItem.set('channel', channel);

	soundChannel.get('queue').push(queueItem);
}

function playMusic(ConnectionID, url, info, start, channel) {

	const soundChannel = VoiceChannels.get(ConnectionID);
	
	console.log(`Now playing "${url}" in ${ConnectionID}`);

	const fileName = __dirname + '\\songs\\' + soundChannel.get('guild');
	// .%(ext)s is necessary so youtube-dl does not complain about downloading and extracting audio to the same place
	let ytdl = spawn('youtube-dl', [url, '-x', '-o', fileName + '.%(ext)s']);
	ytdl.on('close', code => {
		if (code == 0) {
			setupSound(soundChannel, fileName, start, channel)
		} else {
			console.log('ytdl exited with error code: ' + code)
		}
	});

	soundChannel.set('playing', fileName);
	soundChannel.set('ended', false);
	embed = youtubeEmbed(url, info);
	channel.send(embed);

}

function setupSound(soundChannel, fileName, start, channel) {
	
	fileName = fileName + '.opus'
	connection = soundChannel.get('connection')

	const stream = fs.createReadStream(fileName)
	const audio = connection.play(
		stream, 
		{seek: start, StreamType: 'opus', highWaterMark: 16384} 
	);

	stream.on('end', function () {
		soundChannel.set('ended', true);
		console.log('Consumed file');
	});

	audio.on('speaking', speaking => {
		if (!speaking && soundChannel.get('ended')) {
			console.log(fileName)
			console.log('Song stopped playing');
			soundChannel.set('playing', false);
			let nextSongInfo = soundChannel.get('queue').shift();
			if (nextSongInfo) {
				soundChannel.get('eventHandler').emit('SongOver', nextSongInfo);
			} else {
				channel.send('The music queue is now empty')
				fs.unlink(fileName, err => { if (err) {console.error('An error occurred:\n', err)} })
			}
		}
	});
}

async function getVideoLink(searchQuery) {
	if (typeof searchQuery !== 'string') {
		console.log('search query was not a string: aborting search');
		return; }

	let filter;
	let filters;

	filters = await ytsr.getFilters(searchQuery)
	filter = filters.get('Type').find(o => o.name === 'Video'); // extracts a youtube link that can be used to search for only videos
	const options = {
		limit: 1,
		nextpageRef: filter.ref
	}
	var response = await ytsr(null, options)
		.then((searchResults) => {
		if (!searchResults.items[0]) {
			console.log('No video found.');
			return;
		} else {
			console.log(searchResults.items[0]);
			console.log('returning url:\n' + searchResults.items[0].link);
			return [searchResults.items[0].link, searchResults.items[0]];
		}
		});
	return response;
}

async function getVideoId(searchQuery) {
	console.log(searchQuery);
	
	var service = google.youtube('v3');
	var response = await service.search.list({
		auth: GetAuth(),
		part: 'snippet',
		maxResults: 1,
		type: 'video',
		q: searchQuery})
		.then(response =>  {
			const video = response.data.items;
			if (video.length == 0) {
				console.log('No video found.');
				return;
			} else {
				console.log(video);
				console.log('returning id:\n' + video[0].id.videoId);
				return [video[0].id.videoId, video[0].snippet.title];
			}
		});
	return response;
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