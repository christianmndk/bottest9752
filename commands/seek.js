const { SlashCommandBuilder } = require('@discordjs/builders');
const { checkVoice, getTimestamp, ConvertSecondsToTimestamp } = require('../scripts/helper');
const { seek } = require('../scripts/sound');
const { VoiceChannels } = require('../NR');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('seek')
		.setDescription('Seek in the currently playing song')
		.addIntegerOption(option =>
			option
				.setName('time')
				.setDescription('Where in the song to skip to in seconds')
				.setRequired(true)),
	async execute(interaction) {
		/*--------------*
		*  CHECK VOICE  *
		*--------------*/
		// Make sure the bot is playing something
		if (!await checkVoice(interaction, 5)) {
			return;
		}
		const ConnectionId = interaction.guildId;
		const soundChannel = VoiceChannels.get(ConnectionId)

		/*-------*
		*  SEEK  *
		*-------*/
		soundChannel.set('textChannel', interaction.channel)
		const start = interaction.options.getInteger('time');

		let info = soundChannel.get('currentVideoInfo').get('info');
		let videoLength = info.length;
		//let time = Math.floor(getTimestamp(soundChannel) / 1000);
		let timestr = ConvertSecondsToTimestamp(videoLength, start);

		if (await seek(ConnectionId, soundChannel, start) === false) {
			await interaction.editReply({ content: `Can't seek right now. The song is still being downloaded to our servers`});
		} else 
			await interaction.editReply({ content: `Seeking to: ${timestr}`});
		
	},
};