const { SlashCommandBuilder } = require('@discordjs/builders');
const { getTime, checkVoice } = require('../scripts/helper');
const { VoiceChannels } = require('../NR');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pause')
		.setDescription('Pauses the bot'),
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

		/*------------- *
		*  PAUSE VOICE  *
		* -------------*/
		//clearTimeout(soundChannel.get('songTimeout')); // Stop any timeouts
		player.pause();
		soundChannel.set('pauseStarted', getTime());
		console.log('paused voice channel: ' + ConnectionId);
		await interaction.editReply('Pausing...');
	},
};