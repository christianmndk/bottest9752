const { SlashCommandBuilder } = require('@discordjs/builders');
const { removeVoiceConnection } = require('../scripts/voiceConnection')
const { checkVoice } = require('../scripts/helper');
const { VoiceChannels } = require('../NR');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Makes the bot leave your voicechannel'),
	async execute(interaction) {
		/*--------------*
		*  CHECK VOICE  *
		*--------------*/
		if (!await checkVoice(interaction, 4)) {
			return;
		}
		const ConnectionId = interaction.guildId;

		const soundChannel = VoiceChannels.get(ConnectionId)

		/*--------------*
		*  LEAVE VOICE  *
		*--------------*/
		await interaction.editReply('Left your voicechannel')
		const player = soundChannel.get('audioPlayer');
		player.stop();
		removeVoiceConnection(ConnectionId);
		console.log(`removed voice channel: ${ConnectionId}`);
		
	},
};