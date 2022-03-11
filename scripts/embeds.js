const { MessageEmbed } = require('discord.js');
const { getTimestamp, ConvertSecondsToTimestamp } = require('../scripts/helper');

module.exports = {
	youtubeEmbed: function (url, videoInfo) {
		const embed = new MessageEmbed()
			.setColor('#FF0000')
			.setTitle('Youtube playing:')
			.setThumbnail(videoInfo.thumbnail)
			.addField('Video name', videoInfo.title)
			.addField('link:', url, true);
		return embed;
	},
	timestampEmbed: function (soundChannel) {
		let info = soundChannel.get('currentVideoInfo').get('info');
		let videoLength = info.length;
		let time = Math.floor(getTimestamp(soundChannel) / 1000);
		let timestr = ConvertSecondsToTimestamp(videoLength, time);
		const embed = new MessageEmbed()
			.setColor('#FF0000')
			.setTitle('Youtube playing:')
			.setThumbnail(info.thumbnail)
			.addField('Video name', info.title)
			.addField('link:', info.url, true)
			.setDescription(timestr);
		return embed;
	},
}

function _TimestampFormat(time) {
	let timestr = ''
	if (time < 10) {
		timestr += '0' + time
	} else {
		timestr += time
	}
	return timestr;
}