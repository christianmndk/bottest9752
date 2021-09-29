const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping8')
		.setDescription('Pings the bot'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};