const { SlashCommandBuilder } = require('@discordjs/builders');
const { addVoiceConnection, moveVoiceConnection } = require('../scripts/voiceConnection');
const { VoiceChannels, checkVoice } = require('../scripts/helper');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Makes the bot join your voicechannel'),
	async execute(interaction) {
		/*------------- *
		*  CHECK VOICE  *
		* -------------*/
		if (!await checkVoice(interaction, 2)) {
			return;
		}

		/*------------ *
		*  JOIN VOICE  *
		* ------------*/
		const ConnectionId = interaction.guildId;
		if (!VoiceChannels.has(ConnectionId)) {
			await addVoiceConnection(interaction);
			await interaction.editReply('Joined you voiceChannel');
			console.log(`Joined: ${interaction.member.voice.channel} in: ${interaction.guildId}`);
		} else if (VoiceChannels.get(ConnectionId).get('id') == interaction.member.voice.channel) {
			await interaction.editReply(`I am alreaddy in your voicechannel`);
		} else {
			moveVoiceConnection(interaction, ConnectionId);
			await interaction.editReply('Moving to your voicechannel');
		}
	},
};