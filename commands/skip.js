const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping11')
		.setDescription('Pings the bot'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};