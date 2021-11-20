const { SlashCommandBuilder } = require('@discordjs/builders');
const { addVoiceConnection } = require('../scripts/voiceConnection');
const { playMusic, queue, getVideoLink } = require('../scripts/sound');
const { checkVoice } = require('../scripts/helper');
const { youtubeEmbed } = require('../scripts/embeds');
const { VoiceChannels } = require('../NR');


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
		if (!await checkVoice(interaction, 2)) {
			return;
		}
		const ConnectionId = interaction.guildId;

		if (!VoiceChannels.has(ConnectionId)) {
			await addVoiceConnection(interaction);
			console.log('added voice channel:\n' + ConnectionId);
		}
		const soundChannel = VoiceChannels.get(ConnectionId)
		if (!soundChannel.get('id') == interaction.member.voice.channel.id) {
			await interaction.editReply('You must be in the same voicechannel as the bot to use that command')
			return;
		}
		/*-------------*
		*  PLAY VOICE  *
		*-------------*/
		soundChannel.set('textChannel', interaction.channel)
		//console.log(interaction.channel)
		const searchQuery = interaction.options.getString('search');
		const start = interaction.options.getInteger('seek');
		if (soundChannel.get('playing') || soundChannel.get('settingUpSong')) {
			// must be run in both or else we risk playing two song simultaneously
			const videoInfo = await getVideoLink(searchQuery).catch( (err) => {
				console.log(`No match for ${searchQuery} with reject ${err}`);
				return null;
			});
			if (videoInfo === null) {
				await interaction.editReply('Found no video that mached with that search');
				return;
			}
			queue(ConnectionId, videoInfo.url, videoInfo, start, interaction.channel);
			console.log(`Queued "${videoInfo.url}" in ${ConnectionId}`);
			await interaction.editReply({ content: 'your song is now queued' });
			return;
		} else {
			soundChannel.set('settingUpSong', true);
			const videoInfo = await getVideoLink(searchQuery).catch( (err) => {
				console.log(`No match for ${searchQuery} with reject ${err}`);
				return null;
			});
			if (videoInfo === null) {
				await interaction.editReply('Found no video that mached with that search');
				return;
			}
			playMusic(ConnectionId, videoInfo.url, videoInfo, start, interaction.channel);
			// Send embed
			embed = youtubeEmbed(videoInfo.url, videoInfo);
			await interaction.editReply({ content: 'your song will start shortly', embeds: [embed] });
		}
	},
};