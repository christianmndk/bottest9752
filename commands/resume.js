const { SlashCommandBuilder } = require('@discordjs/builders');
const { getTime } = require('./scripts/helper')
const { getTimestamp } = require('./scripts/sound')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('resume')
		.setDescription('Resumes the bot'),
	async execute(interaction) {
		/*------------- *
		*  CHECK VOICE  *
		* -------------*/
		if (!interaction.guild) {
			await interaction.editReply('you can only use this command in a guild');
			return;
		} else if (interaction.member.voice.channel) {
			await interaction.editReply('you must be in a voice channel to use that command');
			return;
		} else if (!VoiceChannels.has(ConnectionId)) {
			await interaction.editReply('The bot must be in a voicechannel to use that command');
			return;
		}
		let soundChannel = VoiceChannels.get(ConnectionId)
		if (!soundChannel.get('id') == interaction.member.voice.channel.id) {
			await interaction.editReply('You must be in the same voicechannel as the bot to use that command');
			return;
		}
		let player = soundChannel.get('audioPlayer');
		if (!player) {
			await interaction.editReply('The bot is not playing anything right now');
			return;
		}
		/*-------------- *
		*  RESUME VOICE  *
		* --------------*/
		player.unpause();
		soundChannel.set('pausedTime', soundChannel.get('pausedTime') + (getTime() - soundChannel.get('pauseStarted')));
		soundChannel.set('pauseStarted', 0); // Reset just to be sure

		clearTimeout(soundChannel.get('songTimeout')); // Clear previous timeouts just to be sure
		soundChannel.set('songTimeout', createSongTimeout(soundChannel)); // Create new timeout

		console.log(getTimestamp(soundChannel));
		console.log('resumed voice channel: ' + ConnectionId);
	},
};