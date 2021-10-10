const { SlashCommandBuilder } = require('@discordjs/builders');
const { VoiceChannels, removeDuplicates, checkVoice } = require('../scripts/helper');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Removes items from the queue')
		.addSubcommand( subcommand => 
			subcommand
				.setName('single')
				.setDescription('Remove a single item from the queue')
				.addIntegerOption(option =>
					option
						.setName('index')
						.setDescription('The index of the item to remove')
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('range')
				.setDescription('Remove items from the queue in a range')
				.addIntegerOption(option =>
					option
						.setName('start')
						.setDescription('The index of the first item of the range (inclusive)')
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('end')
						.setDescription('The index of the last item of the range (exclusive)')
						.setRequired(true)))
		.addSubcommand(subcommand => 
			subcommand
				.setName('bulk')
				.setDescription('Remove items at the specified indexes (space separated)')
				.addStringOption(option =>
					option
						.setName('indexes')
						.setDescription('The indexes from which to remove items (space separated)')
						.setRequired(true))),
	async execute(interaction) {
		/*------------- *
		*  CHECK VOICE  *
		* -------------*/
		if (!await checkVoice(interaction, 4)) {
			return;
		}
		const ConnectionId = interaction.guildId;
		const soundChannel = VoiceChannels.get(ConnectionId)
		
		/*----------- *
		*  SKIP SONG  *
		* -----------*/
		const queue = soundChannel.get('queue')
		if (queue.length == 0) { 
			interaction.editReply('The queue is empty');
			return;
		}
			
		// Remove 1 item
		const index = interaction.options.getInteger('index')
		const start = interaction.options.getInteger('start')
		const end = interaction.options.getInteger('end')
		if (index) {
			if (queue.length >= index) {
				queue.splice(index - 1, 1); // the first item is not at the first index
			} else { interaction.editReply('The queue does not have a song at that position'); }

		// two arguments
		} else if (start && end) {
			if (start > end) {
				let tmp = start;
				start = end;
				end = tmp;
			}
			if (queue.length >= start) {
				if (queue.length < end) {
					interaction.editReply({ content: `Removing all songs after ${start}` });
				} else { 
					interaction.editReply({ content: `Removing all songs between ${start} and ${end}` }); 
				}
				queue.splice(start - 1, end - start);
			} else { interaction.editReply({ content: 'The queue does not contain any songs in that range' }); }
			// more than two arguments
		} else {
			const indexes = interaction.options.getString('indexes').split(' ');
			for (let i = 0; i < indexes.length; i++) {
				console.log(!isNaN(indexes[i]))
				console.log((indexes[i] > 0))
				if ( (isNaN(indexes[i])) || (indexes[i] <= 0)) {
					interaction.editReply('"indexes" option must be space separated positive numbers')
					return;
				} else {
					indexes[i] == +indexes[i];
				}
			}
			removeDuplicates(indexes);
			let removed = 0;
			let notRemoved = [];
			for (let i = 0; i < indexes.length; i++) {
				if (queue.length >= +indexes[i] - removed) {
					queue.splice(+indexes[i] - 1 - removed, 1);
					removed += 1;
				} else {
					notRemoved.push(indexes[i]);
				}
			}
			if (notRemoved == '') {
				interaction.editReply({ content: `removed songs at positions: ${indexes.join(', ')}` });
			} else {
				interaction.editReply({ content: `tried to remove songs at positions: ${indexes.join(', ')} but the queue did not contain songs at positions: ${notRemoved.join(', ')}` });
			}
		}
	},
};