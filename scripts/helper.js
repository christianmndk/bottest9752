const fsprom = require('fs/promises');
const fs = require('fs')

let filename = "assets/DefaultSearch.txt";

module.exports = {
     VoiceChannels: new Map(),
     getTime: function() { return parseInt(new Date().getTime()); },
     createSongTimeout: function (soundChannel) {
          // We increase the expected remaining time by 1 second incase something funky happens
          let timeoutLength = soundChannel.get('videoLength') - soundChannel.get('seeked') - soundChannel.get('pausedTime') + 1000
          let timeout = setTimeout(() => { soundChannel.get('eventHandler').emit('killSong'); }, timeoutLength);
          console.log(`created timeout in: ${soundChannel.get('guild')} with length: ${timeoutLength}`)
          return timeout;
     },
     getDefaultSearchQuery: async function () {
          defaultSearchQuery = new Promise(function (resolve) {
               fs.readFile(filename, 'utf8', function (err, data) {
                    if (err) throw err;
                    const defaultSearchArray = data.split(',');
                    resolve(defaultSearchArray[Math.floor(Math.random() * defaultSearchArray.length)])
               });
          });
          return defaultSearchQuery
     },
     deleteFile: async function (filename) {
          let exists = await fsprom.access(filename)
               .then(() => { return true; })
               .catch(err => {
                    if (err.code !== 'ENOENT') {
                         console.log(`unexpected error when checking for song file:\n${err}\nTrying to delete anyways`);
                         return true;
                    }
                    else if (err.code == 'ENOENT') {
                         console.log(`${filename} is already deleted`);
                         return false;
                    }
               });
          if (exists) {
               fsprom.rm(filename, { force: true, maxRetries: 1000, recursive: true })
                    .catch(err => {
                         console.log(`unexpected error when deleting for song file:\n${err}`);
                    })
                    .then(() => {
                         console.log(`Succesfully deleted ${filename}`);
                    });
          }
     },
     getTimestamp: function (soundChannel) {
		let timestamp = self.getTime() - soundChannel.get('timeStarted') - soundChannel.get('pausedTime') + soundChannel.get('seeked');
		if (soundChannel.get('audio')) {
			if (soundChannel.get('pauseStarted')) {
				timestamp -= (self.getTime() - soundChannel.get('pauseStarted'));
			}
		}
		return parseInt(timestamp);
	},
     removeDuplicates: function (array) {
          for (let t = 0; t < array.length; t++) {
               for (let h = t+1; h < array.length; h++) {
                    if (array[t] == array[h]) {
                         array.splice(h, 1);
                         h--
                    }
               }
          }
          return array;
     }
}

// Used to call this files exported functions in other of the exported functions
const self = module.exports