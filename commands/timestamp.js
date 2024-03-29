const { SlashCommandBuilder } = require('@discordjs/builders');
const { timestampEmbed } = require('../scripts/embeds')
const { VoiceChannels } = require('../NR');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('timestamp')
		.setDescription('Shows the timestamp of the currently playing song'),
	async execute(interaction) {

		// checkVoice cant be used here because you dont have to be in a voice channel
		// to use this command
		const ConnectionId = interaction.guildId;
		if (!interaction.guild) {
			await interaction.editReply('you can only use this command in a guild');
			return;
		} else if (!VoiceChannels.has(ConnectionId)) {
			await interaction.editReply('The bot must be in a voicechannel to use that command');
			return;
		}
		const soundChannel = VoiceChannels.get(ConnectionId);
		if (!soundChannel.get('playing')) {
			await interaction.editReply('The bot is not playing anything right now');
			return;
		}
		embed = timestampEmbed(soundChannel);
		await interaction.editReply({ embeds: [embed] });
	},
};