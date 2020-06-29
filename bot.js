var auth = require('./auth.json');

// used so the bot can download things
const https = require('https');
const fs = require('fs');
const ytdl = require('ytdl-core');
var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;

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
const { Client, MessageAttachment, MessageEmbed } = require('discord.js');
const { spawn } = require('child_process');

// Create an instance of a Discord client
const client = new Client();

// Create some constants
const ffmpegFormats = ['avi','flac','flv','gif','m4v','mjpeg','mov','mp2','mp3','mp4','mpeg','nut','oga','ogg','ogv','opus','rawvideo','rm','tta','v64','wav','webm','webp','wv']

// Create organiser for voicechannels
let VoiceChannels = new Map();

// Adding a voice connection
async function addVoiceConnection(message) {
	const connection = await message.member.voice.channel.join();
	var info = new Map();
	info.set('playing', '');
	info.set('queue', '');
	info.set('id', message.member.voice.channel.id);
	info.set('guild', message.guild.id);
	info.set('channel', message.member.voice.channel);
	info.set('connection', connection);
	ConnectionID = message.guild.id;
	console.log(ConnectionID);
	VoiceChannels.set(ConnectionID, info);
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
				if (args.length == 0) { message.channel.send(`${message.author}, you need to provide a new file type for the file`); return; }
				else if (!ffmpegFormats.includes(args[0])) {message.channel.send(`${message.author}, the first argument must be a valid file extension like mp4`); return;}
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
				const filename = "assets/message.txt";

				fs.readFile(filename, 'utf8', function(err, data) {
					if (err) throw err;
					const namearray = data.split(',');
					var newslat = "";

					if(args >=1){
						for (let i = 0; i < args[0]; i++) {
							var randomNumber = Math.floor(Math.random()*namearray.length);
							const element = namearray[randomNumber];
							newslat += element + "\n";
						}
						console.log(newslat);
						message.reply(newslat);
					}
					else
						message.reply("the first argument must be an integer larger than or equal to 1");
				});
				break;
			}
			// testbot spotify
			case 'spotify' : {
				const spotify = message.author.presence.activities[0];
				if(spotify.name == 'Spotify') // sikker på det er spotify vi få fat i
				{
					const sangnavn = spotify.details;
					const Kunstner = spotify.state;
					const albumnavn = message.author.presence.activities[0].assets.largeText;

					const spotifybesked = new MessageEmbed()
						.setColor('#1DB954')
						.setTitle('Spotify')
						.attachFiles(['assets/chr.jpg'])
						.setThumbnail('attachment://chr.jpg')
						//.setThumbnail('https://i.imgur.com/wSTFkRM.png') // https://x19-christian.it.slotshaven.dk/chr.jpg
						.addFields(
							{ name: 'Song name', value: sangnavn},
							//{ name: '\u200B', value: '\u200B' },//Unicode Character 'ZERO WIDTH SPACE' 
							{ name: 'Artist', value: Kunstner},
							{ name: 'Album', value: albumnavn},
						)
						//.setImage(spotify.assets.largeImage) // virker ikke helt endnu
						.addField('\u200B', '\u200B', true)
						.setTimestamp(); // ----  slut for  spotifybesked Embed besked
					//console.log(message.author.presence.activities[0]); // god for debuging
					message.reply(spotifybesked); 
				}
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
		}
		else {
			message.reply('you must be in a voice channel to use that command');
			return;
		}
		var args = message.content.substring(9).split(' ');
		var cmd = args[0];
		args = args.splice(1);

		switch(cmd) {
			// soundbot rip
			case 'rip': {
				// Create the attachment using MessageAttaSchment
				attachment = new MessageAttachment('https://i.imgur.com/w3duR07.png');
				// Send the attachment in the message channel with a content
				message.channel.send(`${message.author},`, attachment);
				break;
			}
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

				}
				else {
					if ((VoiceChannels.get(ConnectionID).get('id') == message.member.voice.channel.id)) {
						message.reply('I am already playing in that channel');
					}
					else {
						message.reply(`I am playing in ${VoiceChannels.get(ConnectionID).get('channel')} right now`);
					}
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
				if (args.length == 0) {
					message.reply('you must give at least one word as argument');
					break;
				}
				args = args.join(' ').split('@')
				const searchQuery = args[0]
				var start = 0;
				if (!isNaN(args[1])){
					start = +args[1]
				} else if (args[1]) {
					message.reply('the time argument after @ must be in seconds and contain no spaces (\'@38\')')
				}
				console.log(start)
				const id = await getVideoId(searchQuery)
				const url = `https://www.youtube.com/watch?v=${id}`
				if (ytdl.validateURL(url)) {
					console.log(`Now playing "${url}" in ${ConnectionID}`)
					connection.play(ytdl(url, { quality: "highestaudio", filter: format => format.container === 'mp4'}), {seek: start, volume: false, StreamType: 'converted', bitrate: 120} );
					//console.log(await ytdl.getInfo(url, {quality: "highestaudio" }))
				} else {
					console.error('id and url dis not yield a valid url')
					message.reply('that video not available')
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
						console.log('removed voice channel:\n' + ConnectionID);;
					}
					else { message.reply('you must be in the same '); }
				}
				else { message.reply('the bot must be running for you to use that command'); }
				break;
			}
			// soundbot test
			case 'test' : {
				break;
			}
			// Just add any case commands if you want to..
		}
	}
});

// Log our bot in using the token from https://discordapp.com/developers/applications/me
client.login(auth.token);

// Define common functions

async function getVideoId(searchQuery) {
	console.log(searchQuery)
	if (typeof searchQuery !== 'string') {
		console.log('search query was not a string: aborting search')
		return; 
	}
	var service = google.youtube('v3');
	var response = await service.search.list({
		auth: GetAuth(),
		part: 'snippet',
		maxResults: 1,
		type: 'video',
		q: searchQuery
	})
		.then(response =>  {
			const video = response.data.items;
			if (video.length == 0) {
				console.log('No video found.');
				return;
			} else {
				console.log(video)
				console.log('returning id:\n' + video[0].id.videoId)
				return video[0].id.videoId; 
			}
		});
	return response;
}