const { SlashCommandBuilder } = require('@discordjs/builders');
const { VoiceChannels, getTime } = require('../scripts/helper');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pause')
		.setDescription('Pauses the bot'),
	async execute(interaction) {
		/*------------- *
		*  CHECK VOICE  *
		* -------------*/
		const ConnectionId = interaction.guildId;
		if (!interaction.guild) {
			await interaction.editReply('You can only use this command in a guild');
			return;
		} else if (!interaction.member.voice.channel) {
			await interaction.editReply('You must be in a voice channel to use that command');
			return;
		} else if (!VoiceChannels.has(ConnectionId)) {
			await interaction.editReply('The bot must be in a voicechannel to use that command');
			return;
		}
		const soundChannel = VoiceChannels.get(ConnectionId)
		if (!soundChannel.get('id') == interaction.member.voice.channel.id) {
			await interaction.editReply('You must be in the same voicechannel as the bot to use that command');
			return;
		}
		const player = soundChannel.get('audioPlayer');
		if (!player) {
			await interaction.editReply('The bot is not playing anything right now');
			return;
		}
		/*------------- *
		*  PAUSE VOICE  *
		* -------------*/
		clearTimeout(soundChannel.get('songTimeout')); // Stop any timeouts
		player.pause();
		soundChannel.set('pauseStarted', getTime());
		console.log('paused voice channel: ' + ConnectionId);
		await interaction.editReply('Pausing...');
	},
};