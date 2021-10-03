const { SlashCommandBuilder } = require('@discordjs/builders');
const { VoiceChannels, removeVoiceConnection } = require('../scripts/voiceConnection')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Makes the bot leave your voicechannel'),
	async execute(interaction) {
		/*--------------*
		*  CHECK VOICE  *
		*--------------*/
		let ConnectionId = interaction.guildId;
		if (!interaction.guild) {
			await interaction.editReply('you can only use this command in a guild');
			return;
		} else if (interaction.member.voice.channel) {
			await interaction.editReply('you must be in a voice channel to use that command');
			return;
		} else if (!VoiceChannels.has(ConnectionId)) {
			await interaction.editReply('The bot must in a voicechannel to use that command')
			return;
		}
		soundChannel = VoiceChannels.get(ConnectionId)
		if (!soundChannel.get('id') == interaction.member.voice.channel.id) {
			await interaction.editReply('You must be in the same voicechannel as the bot to use that command')
			return;
		}
		/*--------------*
		*  LEAVE VOICE  *
		*--------------*/	
		let player = soundChannel.get('audioPlayer');
		player.stop();
		removeVoiceConnection(ConnectionId);
		console.log(`removed voice channel: ${ConnectionId}`);
	},
};