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
  });

// is run when node js is stopped using CTRL-c
process.on('SIGINT', function() {
	console.log('Caught interrupt signal');
	
	// add stuff here
	// makes the bot leave from all channels
	// does not work
	/*
	console.log(VoiceChannels)
	for (let soundChannel of VoiceChannels.values()) {
		soundChannel.get('eventHandler').emit('Shutdown');
	}
	*/
	// exit when we are done
	process.exit();
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
				var name;
				// check for new file type
				if (args.length == 0) { 
					message.channel.send(`${message.author}, you need to provide a new file type for the file`); 
					return; 
				} else if (!ffmpegVideoFormats.includes(args[0])) 
					{message.channel.send(`${message.author}, the first argument must be a valid file extension like mp4`); 
					return;
				}
				// check if user made a new name otherwise give it the old name
				if (args.length > 1 && typeof args[1] === 'string') {
					if (args[1].includes('.')) {message.reply('the second argument must be a name which does NOT include a \'.\'. Continuing with standart name')}
					else { name = args[1] + '.' + args[0] }
				}
				// get the latest file
				message.channel.messages.fetch({ limit: 10 })
					.then(messages => {return messages.filter(m => m.attachments.first() && !m.author.bot);})
					.then(messages => {
						//if (typeof messages.first() === 'undefined') {message.reply('found no pictures 10 messages back, aborting');}
						if (!messages.first()) {message.reply('found no pictures 10 messages back, aborting');}
						else {
							messages.first().attachments.each(attachment => {
								// check for name
								if (!name) {name = attachment.name.split('.').slice(0, attachment.name.split('.').length-1).join() + '.' + args[0]}
								// convert the file
								var ffmpeg = spawn('ffmpeg', ['-y', '-i', attachment.url, '-c:a:v', 'copy', 'file.' + args[0]])
								console.log(name)
								ffmpeg.on('close', code => {
									if (code == 0) {
										console.log(attachment.url);
										console.log('Sending converted');
										Converted = new MessageAttachment('./file.' + args[0], name);
										message.reply(Converted).then(fs.unlink('./file.' + args[0], er => { if (er) {console.error('An error occurred:\n', er)} })).catch(er => console.error('An error occurred and was caught:\n', er));
									}
									else {
										console.log('ffmpeg failed during conversion');
										message.reply(attachment.name + 'could not be converted because an error happened during conversion');
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
					if (VoiceChannels.get(ConnectionID).get('id') == message.member.voice.channel.id) {
						let audio = VoiceChannels.get(ConnectionID).get('playing');
						if (audio) {
							if(VoiceChannels.get(ConnectionID).get('queue').length > 0){
								let nextsong = soundChannel.get('queue').shift();
								playMusic(ConnectionID, nextsong.get('url'), nextsong.get('info'), nextsong.get('start'), nextsong.get('channel'))
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

	let soundChannel = VoiceChannels.get(ConnectionID);
	connection = soundChannel.get('connection');
	
	console.log(`Now playing "${url}" in ${ConnectionID}`);
	const stream = ytdl(url, { quality: "highestaudio", highWaterMark: 12});
	const audio = connection.play(
		stream, 
		{seek: start, volume: false, StreamType: 'converted', highWaterMark: 12} 
	);
	soundChannel.set('playing', audio);
	soundChannel.set('ended', false);
	embed = youtubeEmbed(url, info);
	channel.send(embed);
	
	stream.on('end', async function () {
		soundChannel.set('ended', true);
		console.log('Consumed file');
	});

	audio.on('speaking', async speaking => {
		if (!speaking && soundChannel.get('ended')) {
			console.log('Song stopped playing');
			soundChannel.set('playing', false);
			let nextSongInfo = soundChannel.get('queue').shift();
			if (nextSongInfo) {
				soundChannel.get('eventHandler').emit('SongOver', nextSongInfo);
			} else (channel.send('The music queue is now empty'))
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