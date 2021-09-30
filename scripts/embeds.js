const { MessageEmbed } = require('discord.js');
const { getTimestamp } = require('./scripts/sound')

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
    	let info = soundChannel.get('currentVideoInfo');
    	let videoLength = info.length;
    	let time = Math.floor(getTimestamp(soundChannel) / 1000);
    	let timestr = '';
    	let timestrtmp = '';
    	let tmp;
    	// hours
    	if (videoLength >= 3600) {
    		tmp = Math.floor(time / 3600);
    		timestr += _TimestampFormat(tmp) + ':';
    		time -= 3600 * tmp;

    		tmp = Math.floor(videoLength / 3600);
    		timestrtmp += _TimestampFormat(tmp) + ':';
    		videoLength -= 3600 * tmp;
    	}

    	// minutes
    	tmp = Math.floor(time / 60);
    	timestr += _TimestampFormat(tmp) + ':';
    	time -= 60 * tmp;

    	tmp = Math.floor(videoLength / 60);
    	timestrtmp += _TimestampFormat(tmp) + ':';
    	videoLength -= 60 * tmp;

    	//seconds
    	timestr += _TimestampFormat(Math.floor(time));
    	timestrtmp += _TimestampFormat(Math.floor(videoLength));

    	timestr += ' / ' + timestrtmp;

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

function _TimestampFormat (time) {
    let timestr = ''
    if (time < 10) {
        timestr += '0' + time
    } else {
        timestr += time
    }
    return timestr;
}