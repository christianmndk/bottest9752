const https = require('https');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

const { Client, MessageEmbed} = require('discord.js');

// Create organiser for voicechannels
let VoiceChannels = new Map();

// Adding a voice connection
async function addVoiceConnection(message) {
	const connection = await message.member.voice.channel.join();
	var info = new Map();
	info.set('playing', '');
	info.set('queue', '');
	info.set('ended', true)
	info.set('id', message.member.voice.channel.id);
	info.set('guild', message.guild.id);
	info.set('channel', message.member.voice.channel);
	info.set('connection', connection);
	
	ConnectionID = message.guild.id;
	console.log(ConnectionID);
	VoiceChannels.set(ConnectionID, info);

	connection.on('speaking', async speaking => {
		if (!speaking) {return;}
		if (speaking.bot) {
			console.log('-----------------------------------------');
			console.log(speaking);
			console.log(this.connection.paused);
			console.log(this.connection.player.voiceConnection.channel);
			console.log(this.connection.player.voiceConnection.channel.guild);
			console.log('-----------------------------------------');
		}
	});
}

// removing a voice connection
function removeVoiceConnection(ConnectionID) {
	VoiceChannels.delete(ConnectionID)
}
var globalqueue = [];

module.exports = {
	play: async(message, args) =>{
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
			message.reply('you must give at least one word as an argument to search for a video');
			return 0;
		}
		args = args.join(' ').split('@')
		const searchQuery = args[0];
		var start = 0;
		if (!isNaN(args[1])){
			start = +args[1];
		} 
		else if (args[1]) {
			message.reply('the time argument after @ must be in seconds and contain no spaces (\'@38\')');
		}
		const [url, info] = await getVideoLink(searchQuery);
		if (ytdl.validateURL(url)) {
			console.log(`Now playing "${url}" in ${ConnectionID}`);
			const stream = ytdl(url, { quality: "highestaudio", filter: format => format.container === 'mp4'});
			const audio = connection.play(
				stream, 
				{seek: start, volume: false, StreamType: 'converted', bitrate: 120} 
			);
			VoiceChannels.get(ConnectionID).set('playing', audio);
			VoiceChannels.get(ConnectionID).set('ended', false);
			embed = youtubeEmbed(url, info);
			message.reply(embed);

			stream.on('end', async function () {
				VoiceChannels.get(ConnectionID).set('ended', true)
			});

			audio.on('speaking', async speaking => {
				if (!speaking && VoiceChannels.get(ConnectionID).get('ended')) {
					message.reply('the song is now over')
					VoiceChannels.get(ConnectionID).set('playing', false);
					return 1;
				}
			});

		} else {
			console.error('id and url did not yield a valid url');
			message.reply('that video not available');
		}
	},
	addtoqueue: (message, args) =>{	
	}
};

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
		.addField('Video name:', videoInfo.title)
		.addField('Duration: ', videoInfo.duration)
		.addField('link:', url, true);
	return embed;
}