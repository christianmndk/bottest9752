const { createAudioResource, StreamType } = require('@discordjs/voice');
const { Collection } = require('discord.js');
const { createReadStream } = require('fs');
const { spawn } = require('child_process');
const EventEmitter = require('events');
const https = require('https');

const { getDefaultSearchQuery, getTime, createSongTimeout, deleteFile, VoiceChannels } = require('../scripts/helper.js');

const mainPath = require.main.path;
const minimumWritten = 20; // create a little buffer before we start streaming

module.exports = {
    queue: function (ConnectionId, url, info, start, channel) {
		let soundChannel = VoiceChannels.get(ConnectionId);
		let queueItem = new Collection();
		queueItem.set('url', url);
		queueItem.set('info', info);
		queueItem.set('start', start);
		queueItem.set('channel', channel);

		soundChannel.get('queue').push(queueItem);
	},
	// TODO IMPLEMENT SEEK FUNCTION BECAUSE SHIT BROKE
	playMusic: async function (ConnectionId, url, info, start, channel) {

		const soundChannel = VoiceChannels.get(ConnectionId);

		console.log(`Now playing "${url}" in ${ConnectionId}`);

		//let ratelimited = false;
		let filename = mainPath + '\\songs\\' + soundChannel.get('fileNumber') + soundChannel.get('guild') + '.opus';

		// Delete previous file if found
		deleteFile(filename);

		// Increment file number and update file name
		// This should mean that we allways have a clean file for ffmpeg
		soundChannel.set('fileNumber', soundChannel.get('fileNumber') + 1);

		filename = mainPath + '\\songs\\' + soundChannel.get('fileNumber') + soundChannel.get('guild') + '.opus';
		console.log(filename)
		// Has to contain " or else it will not run on the cmd.exe shell
		let formatString = '"bestaudio/best[abr>96][height<=480]/best[abr<=96][height<=480]/best[height<=720]/best[height<=1080]/best"';
		let ytdl = spawn('youtube-dl', [url, '-f', formatString, '-o', '-'], { shell: 'cmd.exe' });
		let ffmpeg = spawn('ffmpeg', ['-y', '-i', '-', '-c:a:v', 'copy', '-b:a', '128k', filename], { shell: 'cmd.exe' });
		// Save them to the soundchannel for further procesing
		soundChannel.set('ytdl', ytdl)
		soundChannel.set('ffmpeg', ffmpeg)

		/* -------YTDL EVENTS------- */
		ytdl.on('error', async error => { console.log('error: ' + error) });
		ytdl.stdout.on('data', async data => { ffmpeg.stdin.write(data); }); // Writes data to ffmpeg
		const reDownSpeed = /Ki(?=B\/s)/; // check if the download speed is not in kilo bytes (ends stream early)
		//const reSpeed = /at[ ]*[0-9]*/; // actual speed in kilo bytes
		ytdl.stderr.on('data', async data => { // messages from ytdl
			//console.log(`ytdl: stderr: ${data}`);
			if (reDownSpeed[Symbol.match](`${data}`)) {
				console.log(`ytdl: stderr: ${data}`);
			}
		});

		ytdl.on('close', (code) => {
			console.log(`ytdl process exited with code ${code} in ${ConnectionId}`);
			ffmpeg.stdin.end(); // lets ffmpeg end
		});

		/* ------FFMPEG EVENTS------ */

		// Find how much we have written to file
		const reWritten = /me=[:\d]*/;
		let written = 0;
		let emittedFileReady = false;
		// check when the audio file has some data
		ffmpeg.stderr.on('data', async data => {
			if (`${data}`.startsWith('size=')) {
				written = reWritten[Symbol.match](`${data}`)[0].substring(3);
				written = written.split(':');
				written = parseInt(written[0], 10) * 3600 + parseInt(written[1], 10) * 60 + parseInt(written[2], 10);
				console.log( `ffmpeg: stderr: ${data}`);
				// once we have enough start the song (We must have at least "minimumWritten" seconds)
				if ( ((written > start && written > minimumWritten) || written >= soundChannel.get('videoLength') / 1000) && !emittedFileReady ) { 
					soundChannel.get('eventHandler').emit('fileReady', filename, start, channel); 
					emittedFileReady = true;
				}
				//console.log( `ffmpeg: stderr: ${data}`);
			}
			//console.log( `ffmpeg: stderr: ${data}`);
		});
		ffmpeg.on('close', (code) => { console.log(`ffmpeg process exited with code ${code} in ${ConnectionId}`); });

		/* ------------------------- */

		soundChannel.set('videoLength', info.length * 1000);
		soundChannel.set('currentVideoInfo', info);
		soundChannel.set('playing', filename);
		soundChannel.set('settingUpSong', false);
	},
	setupSound: function (soundChannel, filename, start, channel) {

		let player = soundChannel.get('audioPlayer');
		soundChannel.set('timeStarted', getTime());
		soundChannel.set('seeked', start * 1000);
		soundChannel.set('pauseStarted', 0);
		soundChannel.set('pausedTime', 0);
		soundChannel.set('playing', filename);
		soundChannel.set('settingUpSong', false);
		soundChannel.set('ended', false);

		const resource = createAudioResource(
			createReadStream(filename),
			{
				inputType: StreamType.OggOpus,
				inlineVolume: false
			});

		//console.log(player)
		player.play(resource)

		// create backup for the 'finish' event so the bot doesn't stall
		clearTimeout(soundChannel.get('songTimeout')); // We must stop the previous one first
		soundChannel.set('songTimeout', createSongTimeout(soundChannel));

		soundChannel.set('isSongOver', false);

	},
	// Gets video link from search query
	getVideoLink: async function (searchQuery) {
		if (!searchQuery) {
			searchQuery = await getDefaultSearchQuery()
		}
		let videoId = "";
		let video = new Promise(function (resolve, reject) {
			let wholeDocument = new EventEmitter();
			https.get("https://www.youtube.com/results?search_query=" + searchQuery, (res) => {
				let documentBody = "";
				res.on('data', (data) => {
					documentBody += data;
					if (data.slice(data.length - 7) == "</html>") { wholeDocument.emit("got", documentBody); }
				});
			});

			wholeDocument.on("got", async (data) => {

				// Create regex patterns
				const rePlaylist = /","playlistId":"/;
				const reInformation = /"videoId":.*?,"vi/g;
				const reThumbnail = /(?<="thumbnails":\[).*?(?=\])/;
				const reTitle = /(?<="title":\{"runs":\[\{"text":").*?(?="\}\])/;
				const reLength = /(?<=}},"simpleText":")[\d\.]+/;

				// We extract a snippet of the whole document containing the relevant information about the video and loop through them until it is not a playlist
				let result = reInformation[Symbol.match](data)[0];
				let i = 1;
				while (rePlaylist[Symbol.match](result)) {
					result = reInformation[Symbol.match](data)[i];
					i++;
				}

				if (result == null) {
					reject(false)
				}

				// extracts the video Id and adds it to the link
				videoId = result.slice(11, 22);
				videoLink = "https://www.youtube.com/watch?v=" + videoId;
				// extracts the title of the video
				videoTitle = reTitle[Symbol.match](result)[0].replace('\\u0026', '&');
				// extracts the thumbnail link of highest quality
				tempThumbnail = reThumbnail[Symbol.match](result)[0].split(',');
				videoThumbnailLink = tempThumbnail[tempThumbnail.length - 3].slice(8).slice(0, -1);
				// extracts the video length

				tempLength = reLength[Symbol.match](result)[0].split('.');
				let time = 0;
				if (tempLength.length == 3) { time = parseInt(tempLength[0], 10) * 3600 + parseInt(tempLength[1], 10) * 60 + parseInt(tempLength[2], 10); }
				else { time = parseInt(tempLength[0], 10) * 60 + parseInt(tempLength[1], 10); }

				// we pack the video info nice and tidy
				let video = {
					url: videoLink,
					title: videoTitle,
					thumbnail: videoThumbnailLink,
					length: time
				};
				resolve(video);

				//process.stdout.write(data);
			});
		});
		return video;
	}
}

const self = module.exports