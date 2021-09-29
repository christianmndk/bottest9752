const { SlashCommandBuilder } = require('@discordjs/builders');
const { addVoiceConnection } = require('voiceConnection')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Makes the bot join your voicelobby'),
	async execute(interaction) {
		 /*------------- *
		 *  CHECK VOICE  *
		 * -------------*/
		if (!interaction.guild) {
			interaction.editReply('you can only use this command in a guild');
			return;
		} else if (interaction.member.voice.channel) {
			interaction.editReply('you must be in a voice channel to use that command');
			return;
		} else if (false) {return;}
	},
};