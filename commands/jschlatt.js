const { SlashCommandBuilder } = require('@discordjs/builders');
const { readFile } = require('fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('jschlatt')
		.setDescription('Gives you random names of the youtuber jschlatt')
		.addIntegerOption(option => 
			option
				.setName('amount')
				.setDescription('The amount of names you want')
				.setRequired(true)),
	async execute(interaction) {
		const filename = "assets/message.txt";

		readFile(filename, 'utf8', async function (err, data) {
			if (err) throw err;
			const amount = interaction.options.getInteger('amount');
			const namearray = data.split(',');
			var newslat = "";

			if (amount <= 0) {
				await interaction.editReply(`amount option must be positive`);
				return;
			}

			for (let i = 0; i < amount; i++) {
				var randomNumber = Math.floor(Math.random() * namearray.length);
				const element = namearray[randomNumber];
				newslat += element + "\n";
			}

			await interaction.editReply({content: newslat});
		});
	}
};