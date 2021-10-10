const { SlashCommandBuilder } = require('@discordjs/builders');
const { getTime, VoiceChannels, createSongTimeout, getTimestamp, checkVoice } = require('../scripts/helper');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('resume')
		.setDescription('Resumes the bot'),
	async execute(interaction) {
		/*------------- *
		*  CHECK VOICE  *
		* -------------*/
		if (!await checkVoice(interaction, 5)) {
			return;
		}
		const ConnectionId = interaction.guildId;
		const soundChannel = VoiceChannels.get(ConnectionId)
		const player = soundChannel.get('audioPlayer');

		/*-------------- *
		*  RESUME VOICE  *
		* --------------*/
		player.unpause();
		soundChannel.set('pausedTime', soundChannel.get('pausedTime') + (getTime() - soundChannel.get('pauseStarted')));
		soundChannel.set('pauseStarted', 0); // Reset just to be sure

		clearTimeout(soundChannel.get('songTimeout')); // Clear previous timeouts just to be sure
		soundChannel.set('songTimeout', createSongTimeout(soundChannel)); // Create new timeout

		console.log(getTimestamp(soundChannel));
		console.log('resumed voice channel: ' + ConnectionId);
		await interaction.editReply('Resuming...');
	},
};