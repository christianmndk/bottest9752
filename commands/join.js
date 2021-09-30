const { SlashCommandBuilder } = require('@discordjs/builders');
const { addVoiceConnection, VoiceChannels, moveVoiceConnection } = require('./scripts/voiceConnection')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Makes the bot join your voicechannel'),
	async execute(interaction) {
		/*------------- *
		*  CHECK VOICE  *
		* -------------*/
		if (!interaction.guild) {
			await interaction.editReply('you can only use this command in a guild');
			return;
		} else if (interaction.member.voice.channel) {
			await interaction.editReply('you must be in a voice channel to use that command');
			return;
		}

		/*------------ *
		*  JOIN VOICE  *
		* ------------*/
		let ConnectionId = interaction.guildId;
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