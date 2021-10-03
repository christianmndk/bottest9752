const { SlashCommandBuilder } = require('@discordjs/builders');
const { VoiceChannels, addVoiceConnection } = require('../scripts/voiceConnection');
const { playMusic, queue, getVideoLink } = require('../scripts/sound');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play audio from videos on youtube')
		.addStringOption(option =>
			option
				.setName('search')
				.setDescription('The string to search for on youtube')
				.setRequired(true))
		// SHOULD BE addNumberOption BUT IS NOT AVAILABLE
		// UPDATE discord js builder
		.addIntegerOption(option =>
			option
				.setName('seek')
				// CHANGE DESCRIPTION WHEN IMPLEMENTED
				.setDescription('NOT IMPLEMENTED, PLACEHOLDER')
				.setRequired(false)),
	async execute(interaction) {
		/*--------------*
		*  CHECK VOICE  *
		*--------------*/
		let ConnectionId = interaction.guildId;
		if (!interaction.guild) {
			await interaction.editReply('you can only use this command in a guild');
			return;
		} else if (!interaction.member.voice.channel) {
			await interaction.editReply('you must be in a voice channel to use that command');
			return;
		} else if (!VoiceChannels.has(ConnectionId)) {
			await addVoiceConnection(interaction);
			console.log('added voice channel:\n' + ConnectionId);
		}
		soundChannel = VoiceChannels.get(ConnectionId)
		if (!soundChannel.get('id') == interaction.member.voice.channel.id) {
			await interaction.editReply('You must be in the same voicechannel as the bot to use that command')
			return;
		}
		/*-------------*
		*  PLAY VOICE  *
		*-------------*/
		const searchQuery = interaction.options.getString('search');
		const start = interaction.options.getInteger('seek');
		if (soundChannel.get('playing') || soundChannel.get('settingUpSong')) {
			const videoInfo = await getVideoLink(searchQuery); // must be run in both or else we risk playing two song simultaneously 
			queue(ConnectionId, videoInfo.url, videoInfo, start, interaction.channel);
			console.log(`Queued "${videoInfo.url}" in ${ConnectionId}`);
			await interaction.editReply({ content: 'your song is now queued' });
			return;
		} else {
			soundChannel.set('settingUpSong', true);
			const videoInfo = await getVideoLink(searchQuery);
			playMusic(ConnectionId, videoInfo.url, videoInfo, start, interaction.channel);
			await interaction.editReply({ content: 'your song will start shortly' });
		}
	},
};