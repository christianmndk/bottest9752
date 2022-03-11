const { SlashCommandBuilder } = require('@discordjs/builders');
const { checkVoice } = require('../scripts/helper');
const { VoiceChannels } = require('../NR');
const { skip } = require('../scripts/sound')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skipts the currently playing song'),
	async execute(interaction) {
		/*------------- *
		*  CHECK VOICE  *
		* -------------*/
		if (!await checkVoice(interaction, 5)) {
			return;
		}
		const ConnectionId = interaction.guildId;
		const soundChannel = VoiceChannels.get(ConnectionId)
		//const player = soundChannel.get('audioPlayer');

		/*----------- *
		*  SKIP SONG  *
		* -----------*/
		skip(soundChannel);
		/*
		soundChannel.get('eventHandler').emit('killffmpeg');
		if (soundChannel.get('queue').length > 0) {
			soundChannel.set('playing', false);
			soundChannel.get('eventHandler').emit('SongOver', interaction.channel);
		} else {
			player.stop()
			soundChannel.set('playing', false);
			soundChannel.set('ended', true);
		}*/
		clearTimeout(soundChannel.get('songTimeout')); // Clear any timeouts we have
		await interaction.editReply('Skipping...');
	},
};