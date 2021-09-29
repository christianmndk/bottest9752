const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping4')
		.setDescription('Pings the bot'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};