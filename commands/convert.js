const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageAttachment } = require('discord.js');
const { spawn } = require('child_process');
const { unlink } = require('fs');

// ALLOWED FORMATS
const ffmpegVideoFormats = ['avi', 'flac', 'flv', 'gif', 'm4v', 'mjpeg', 'mov', 'mp2', 'mp3', 'mp4', 'mpeg', 'nut', 'oga', 'ogg', 'ogv', 'opus', 'rm', 'tta', 'v64', 'wav', 'webm', 'wv'];
const ffmpegPictureFormats = ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp'];
// Only for raw image files that can be converted to something else
const ffmpegRawImageFormats = ['cr2', 'nef', 'orf', 'raw', 'sr2'];

const MESSAGE_AMOUNT = 50

module.exports = {
	data: new SlashCommandBuilder()
		.setName('convert')
		.setDescription('Converts the latest file into a new format')
		.addSubcommand(subcommand =>
			subcommand
				.setName('video')
				.setDescription('Convert video or audio files')
				.addStringOption(option =>
					option
						.setName('format')
						.setDescription('The video or audio format to convert to')
						.setRequired(true))
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('The name of the file in the new format')
						.setRequired(false)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('image')
				.setDescription('Convert image files')
				.addStringOption(option =>
					option
						.setName('format')
						.setDescription('The image format to convert to')
						.setRequired(true))
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('The name of the file in the new format')
						.setRequired(false))),

	async execute(interaction) {
		subcommand = interaction.options.getSubcommand();
		console.log(`executing: convert ${subcommand} in ${interaction.guildId}`)
		let isVideo;
		if (subcommand === 'video') { isVideo = true; }
		else if (subcommand === 'image') { isVideo = false; }

		if (interaction.option.getString('test')) {
			console.log(interaction.option.getString('test'));
			return;
		}
		let newFormat = interaction.options.getString('format');
		if (!(ffmpegRawImageFormats.includes(newFormat) || ffmpegPictureFormats.includes(newFormat) || ffmpegVideoFormats.includes(newFormat))) {
			await interaction.editReply('The requested format is not supported');
			return;
		} else if (isVideo && !ffmpegVideoFormats.includes(newFormat)) {
			await interaction.editReply('Cannot convert a video or audio file into the requested filetype');
			return;
		} else if (!isVideo && !(ffmpegPictureFormats.includes(newFormat) || ffmpegRawImageFormats.includes(newFormat))) {
			await interaction.editReply('Cannot convert an image file into the requested filetype');
			return;
		}

		// check if user made a new name otherwise give it the old name
		let filename = interaction.options.getString('name');
		if (filename) {
			filename += `.${newFormat}`;
		}
		console.log('GOT HERE LOL')
		// get the latest file
		interaction.channel.messages.fetch({ limit: MESSAGE_AMOUNT })
			.then(messages => {
				return messages.filter((m) => {
					if (!m.attachments.first()) { return false; }
					if (isVideo) { return ffmpegVideoFormats.includes(m.attachments.first().name.split('.').at(-1)) && !m.author.bot; }
					else { return ffmpegPictureFormats.includes(m.attachments.first().name.split('.').at(-1)) && !m.author.bot; }
				});
			})
			.then(messages => {
				if (!messages.first()) {
					interaction.editReply({ content: `found no files with a supported filetype ${MESSAGE_AMOUNT} messages back, aborting` });
					return;
				}
				messages.first().attachments.each(attachment => {
					// check for new filename
					if (!filename) { filename = attachment.name.split('.').slice(0, attachment.name.split('.').length - 1).join('.') + '.' + newFormat; }
					// convert the file
					let file = `./${filename}`;
					let ffmpeg = spawn('ffmpeg', ['-i', attachment.url, '-c:a:v', 'copy', filename]);

					ffmpeg.on('close', code => {
						if (code == 0) {
							console.log(attachment.url);
							console.log('Sending converted');
							Converted = new MessageAttachment(file, filename);
							interaction.editReply({ files: [Converted] }).then(unlink(file, er => { if (er) { console.error('An error occurred:\n', er) } })).catch(er => console.error('An error occurred and was caught:\n', er));
						}
						else {
							console.log('ffmpeg failed during conversion');
							interaction.editReply({ content: attachment.name + ' could not be converted because an error happened during conversion' });
							unlink(file, er => { if (er) { console.error('An error occurred:\n', er) } });
						}
					});
				});
			});
	},
};