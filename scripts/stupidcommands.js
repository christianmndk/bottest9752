const fs = require('fs');
const { Client, MessageAttachment, MessageEmbed } = require('discord.js');


module.exports = {
	Jschlatt: function (message, args, reply = true) {//just send random names from a list in /assest/message.txt
		const filename = "assets/message.txt";

		fs.readFile(filename, 'utf8', function (err, data) {
			if (err) throw err;
			const namearray = data.split(',');
			var newslat = "";

			if (args[0] >= 1) {
				for (let i = 0; i < args[0]; i++) {
					var randomNumber = Math.floor(Math.random() * namearray.length);
					const element = namearray[randomNumber];
					newslat += element + "\n";
				}
				console.log(newslat);
				if (reply == true)
					message.reply({content: newslat});
				else
					return newslat;
			}
			else
				if (reply == true)
					message.reply({ content: "the first argument must be an integer larger than or equal to 1"});
		});
	},
	spotify: function (message) {
		const spotify = message.author.presence.activities[0];
		if (!spotify) { message.reply('You are not listening to spotify'); return; }
		if (spotify.name == 'Spotify') // sikker på det er spotify vi få fat i
		{
			const sangnavn = spotify.details;
			const Kunstner = spotify.state;
			const albumnavn = message.author.presence.activities[0].assets.largeText;

			const spotifybesked = new MessageEmbed()
				.setColor('#1DB954')
				.setTitle('Spotify')
				.attachFiles(['assets/chr.jpg'])
				.setThumbnail('attachment://chr.jpg')
				//.setThumbnail('https://i.imgur.com/wSTFkRM.png') // https://x19-christian.it.slotshaven.dk/chr.jpg
				.addFields(
					{ name: 'Song name', value: sangnavn },
					//{ name: '\u200B', value: '\u200B' },//Unicode Character 'ZERO WIDTH SPACE' 
					{ name: 'Artist', value: Kunstner },
					{ name: 'Album', value: albumnavn },
				)
				//.setImage(spotify.assets.largeImage) // virker ikke helt endnu
				.addField('\u200B', '\u200B', true)
				.setTimestamp(); // ----  slut for  spotifybesked Embed besked
			//console.log(message.author.presence.activities[0]); // god for debuging
			message.reply({ embeds: [spotifybesked] });
		} else { message.reply('You are not listening to spotify'); }
	}
	/* 
	// if you want to call this func: stupidcommands.test(message);
	// much better code
	test: function (message) { 
		
	}
	*/
};

function getUserFromMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return client.users.cache.get(mention);
	}
}
