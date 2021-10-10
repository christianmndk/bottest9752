const { joinVoiceChannel, createAudioPlayer } = require('@discordjs/voice');
const { playMusic, setupSound } = require('../scripts/sound')
const { VoiceChannels } = require('../scripts/helper')
const EventEmitter = require('events');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
	addVoiceConnection: async function (interaction) {
		const connection = joinVoiceChannel({
			channelId: interaction.member.voice.channel.id,
			guildId: interaction.guildId,
			adapterCreator: interaction.guild.voiceAdapterCreator
		});
		var info = new Map();
		info.set('playing', false);
		info.set('queue', new Array());
		info.set('ended', true);
		info.set('id', interaction.member.voice.channel.id);
		info.set('guild', interaction.guild.id);
		info.set('channel', interaction.member.voice.channel);
		info.set('textChannel', interaction.channel)
		info.set('connection', connection);
		info.set('audioPlayer', createAudioPlayer());
		info.set('songTimeout') // backup incase the audio does not emit a 'finish' event
		info.set('fileNumber', 0);
		info.set('eventHandler', new EventEmitter());
		info.set('currentVideoInfo');
		info.set('settingUpSong', false);
		info.set('isSongOver', true);
		info.set('ffmpeg');
		info.set('ytdl');
		// all in milliseconds
		info.set('timeStarted', 0);
		info.set('pauseStarted', 0);
		info.set('videoLength', 0);
		info.set('pausedTime', 0);
		info.set('seeked', 0)

		//console.log(info.get('guild'));
		connection.subscribe(info.get('audioPlayer')); // Connect the audio connection to the audioplayer
		console.log(VoiceChannels);
		VoiceChannels.set(info.get('guild'), info); // The guild id is used to uniquely identify each server

		info.get('eventHandler').on('SongOver', async function (channel=info.get('textChannel')) {
			console.log(`${info.get('playing')}: is done playing playing in: ${info.get('guild')}`);
			info.set('playing', false);
			clearTimeout(info.get('songTimeout')); // Clear next song back up to be sure
			let nextSongInfo = info.get('queue').shift();
			if (nextSongInfo) {
				playMusic(info.get('guild'), nextSongInfo.get('url'), nextSongInfo.get('info'), nextSongInfo.get('start'), nextSongInfo.get('channel'))
			} else {
				//console.log(info.get('textChannel'));
				channel.send({ content: 'The music queue is now empty' });
				//await info.get('audioPlayer').play('');
			}
		});

		info.get('eventHandler').on('Shutdown', async function () {
			await self.removeVoiceConnection(info.get('guild'));
			console.log('removed voice channel: ' + info.get('guild'));
		});

		info.get('eventHandler').on('killSong', () => {
			songOver = info.get('isSongOver');
			if (songOver) { return; }
			console.log(`Song timed out in: ${info.get('guild')}\nkilling...`)
			songOver = true;
			info.get('eventHandler').emit('SongOver');
		});

		info.get('audioPlayer').on(AudioPlayerStatus.Idle, () => {
			songOver = info.get('isSongOver');
			if (songOver) { return; }
			songOver = true;
			console.log(`Audio finish event triggered in ${info.get('guild')}`)
			clearTimeout(info.get('songTimeout')); // cancel backup skipper
			info.get('eventHandler').emit('SongOver', info.get('textChannel'));
		});

		info.get('eventHandler').on('fileReady', (filename, start) => {
			console.log('now playing file --------------------------------')
			setupSound(info, filename, start, info.get('textChannel'));
		});

		// When skipping kill ffmpeg if it is still running to save resources
		info.get('eventHandler').on('killffmpeg', async () => {
			ytdl = info.get('ytdl');
			ffmpeg = info.get('ffmpeg');

			// In the case no music has been played,
			// but the bot has joined
			if (!(ffmpeg || ytdl)) {return;} 

			if (ytdl.exitCode == null) { ytdl.kill(); } // doesnt seem to stop downloads
			if (ffmpeg.exitCode == null) { ffmpeg.kill(); }
		});
	},
	moveVoiceConnection: async function(interaction, guildId) {
		
		const connection = joinVoiceChannel({
			channelId: interaction.member.voice.channel.id,
			guildId: guildId,
			adapterCreator: interaction.guild.voiceAdapterCreator
		});
		info = VoiceChannels.get(guildId);
		console.log(`Moving from ${info.get('id')} into ${interaction.member.voice.channel.id} in ${guildId}`)
		info.get('connection').destroy();
		info.set('connection', connection);
		info.set('id', interaction.member.voice.channel.id);
		connection.subscribe(info.get('audioPlayer'));
	},
	// removing a voice connection
	removeVoiceConnection: async function (ConnectionId) {
		return new Promise(async resolve => {
			let soundChannel = VoiceChannels.get(ConnectionId);
			await soundChannel.get('connection').destroy();
			await soundChannel.get('audioPlayer').stop()
			soundChannel.get('eventHandler').emit('killffmpeg');
			VoiceChannels.delete(ConnectionId);
			resolve(true); // Signal that we are done
		}); // promise ends
	}
};

// Used to call this files exported functions in other of the exported functions
const self = module.exports

function _onAudioPlayeUpdate() {
	info.get('audioPlayer').on(AudioPlayerStatus.Idle, function () {
		songOver = info.get('isSongOver');
		if (songOver) { return; }
		songOver = true;
		console.log(`Audio finish event triggered in ${soundChannel.get('guild')}`)
		clearTimeout(soundChannel.get('songTimeout')); // cancel backup skipper
		soundChannel.get('eventHandler').emit('SongOver', soundChannel, filename, channel);
	});
}