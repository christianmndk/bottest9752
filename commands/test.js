const { SlashCommandBuilder } = require('@discordjs/builders');
const https = require('https');
const fs = require('fs');



/* How to download
// Find the file type and download it
filename = "file." + attachment.url.split('.')[attachment.url.split('.').length-1]
const file = fs.createWriteStream(filename);
const request = https.get(attachment.url, function(response) {
	response.pipe(file);
}); */

module.exports = {
	data: new SlashCommandBuilder()
		.setName('test')
		.setDescription('runs test'),
	async execute(interaction) {
		await interaction.editReply('Running test');
	},
};