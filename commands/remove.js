const { SlashCommandBuilder } = require('@discordjs/builders');
const { VoiceChannels } = require('../scripts/helper');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping8')
		.setDescription('Pings the bot'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};