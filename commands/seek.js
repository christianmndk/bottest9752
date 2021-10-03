const { SlashCommandBuilder } = require('@discordjs/builders');
const { VoiceChannels } = require('../scripts/voiceConnection')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping10')
		.setDescription('Pings the bot'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};