const { SlashCommandBuilder } = require('@discordjs/builders');
const { getTime, checkVoice } = require('../scripts/helper');
const { VoiceChannels } = require('../NR');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('loop')
		.setDescription('Enable and disable looping of the queue'),
	async execute(interaction) {
		/*------------- *
		*  CHECK VOICE  *
		* -------------*/
		if (!await checkVoice(interaction, 4)) {
			return;
		}
		const ConnectionId = interaction.guildId;
		const soundChannel = VoiceChannels.get(ConnectionId)

		/*-------------- *
		*  ENABLE QUEUE  *
		* --------------*/
		if (soundChannel.get('looping')) {
			await interaction.editReply('Disabeling loop...');
			soundChannel.set('looping', false);
		} else {
			await interaction.editReply('Enabling loop...');
			soundChannel.set('looping', true);
			soundChannel.get('queue').push(soundChannel.get('currentVideoInfo'))
		}
	},
};