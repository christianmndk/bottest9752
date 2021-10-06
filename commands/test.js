const { SlashCommandBuilder } = require('@discordjs/builders');
const { VoiceChannels } = require('../scripts/helper');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('test')
		.setDescription('runs test'),
	async execute(interaction) {
		await interaction.editReply('test3');
	},
};