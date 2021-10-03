const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { VoiceChannels } = require('../scripts/voiceConnection');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Shows the music queue'),
	async execute(interaction) {
		/*--------------*
		*  CHECK VOICE  *
		*--------------*/
		const ConnectionId = interaction.guildId;
		if (!interaction.guild) {
			await interaction.editReply('you can only use this command in a guild');
			return;
		} else if (!VoiceChannels.has(ConnectionId)) {
			await interaction.editReply('The bot must be in a voicechannel to use that command')
			return;
		}
		/*-------------*
		*  SHOW QUEUE  *
		*-------------*/
		const soundChannel = VoiceChannels.get(ConnectionId)
		if (soundChannel.get('queue').length > 0) {
			let embed = new MessageEmbed()
				.setColor('#FF0000')
				.setTitle('Queue:');
			soundChannel.get('queue').forEach(song => {
				embed.addField(song.get('info').title, song.get('url'));
			});
			await interaction.editReply({ embeds: [embed] });
		} else { message.reply({ content: 'the queue is empty' }); }
	},
};