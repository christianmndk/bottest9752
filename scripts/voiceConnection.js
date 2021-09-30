const { joinVoiceChannel, createAudioPlayer } = require('@discordjs/voice');
const EventEmitter = require('events');

module.exports = {
	VoiceChannels: new Map(),
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

		//console.log(info.get('guild'));
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
	},
	moveVoiceConnection: async function(interaction, guildId) {
		
		const connection = joinVoiceChannel({
			channelId: interaction.member.voice.channel.id,
			guildId: guildId,
			adapterCreator: interaction.guild.voiceAdapterCreator
		});
		info = this.VoiceChannels.get(guildId);
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