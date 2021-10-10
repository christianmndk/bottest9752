/*
Things that can be improved:
Implement log file
More clarity in log messages and errors
different log levels

Make convert function look for latest picture or video based on which format it is trying to convert to
Make conver function argument to look further back than the latest attachemt eg. the second to last attachment
...
*/

// used so the bot can download things
const https = require('https');
const fs = require('fs');
const fsprom = require('fs/promises');

const stupidcommands = require("./scripts/stupidcommands");

/*
How to download
// Find the file type and download it
filename = "file." + attachment.url.split('.')[attachment.url.split('.').length-1]
const file = fs.createWriteStream(filename);
const request = https.get(attachment.url, function(response) {
	response.pipe(file);
});
*/

// Extract the required classes from the required modules
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, MessageAttachment, MessageEmbed, Collection, Intents } = require('discord.js');
const { getTime, VoiceChannels } = require('./scripts/helper')
const EventEmitter = require('events');

// setup event emitter clas
class MyEmitter extends EventEmitter { };

// Create an instance of a Discord client with intents
const botIntents = new Intents([Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]);
const client = new Client({ intents: botIntents });

// Create some constants
IDS = require('./devIds.json')
const DEV_CLIENT_ID = IDS.devClientId;
const DEV_IDS = IDS.devIds;
const DEV_GUILD_IDS = IDS.devGuildIds
console.log(DEV_CLIENT_ID + '---' + DEV_IDS + '---' + DEV_GUILD_IDS)

// Log at initiation
console.log(getTime());

// Log our bot in using the token from https://discordapp.com/developers/applications/me
const auth = require('./auth.json');
client.login(auth.token);

/*---------------------- *
* REGISTRERING COMMANDS  *
* ----------------------*/

// A list of all available functions
client.commands = new Collection();

async function updateGuildCommands(guildIds, clientId, refresh = true) {
	// Clear all commands not all will exist anymore
	client.commands = new Collection();

	const commands = []
	const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

	console.log(`All files added as commands: ${commandFiles.join(' ')}`)
	for (const file of commandFiles) {
		// If a module is cached delete it:
		delete require.cache[require.resolve(`./commands/${file}`)]

		const command = require(`./commands/${file}`);
		// Add it to the list of commands
		client.commands.set(command.data.name, command)
		// Reregistre all commands
		if (refresh) {
			commands.push(command.data.toJSON());
		}
	}

	// If we only want to update the command list dont run code after this
	if (!refresh) { return; }

	const rest = new REST({ version: 9 }).setToken(auth.token);

	try {
		console.log(`Refresing guild slash commands in ${guildIds.join(' and ')}`);
		const rests = [];
		guildIds.forEach(guildId => {
			rests.push(
				rest.put(
					Routes.applicationGuildCommands(clientId, guildId),
					{ body: commands }
				)
			)
		});
		// wait for all guild commands to be loaded
		await Promise.all(rests);
		console.log(`Succesfully reloaded guild slash commadns in ${guildIds.join(' and ')}`)

	} catch (err) {
		console.error(`Error when reloading guild commands in ${guildIds.join(' and ')}`)
		console.error(err)
	}
}

/*-------------------- *
*  EXECUTING COMMANDS  *
* --------------------*/

// Everytime we start the bot refreshes the command list
updateGuildCommands(null, null, false);

client.on('interactionCreate', async interaction => {
	console.log('Got interaction');
	//console.log(interaction);
	if (!interaction.isCommand()) { return; }
	console.log('interaction is command')
	//console.log(interaction)

	const cmd = client.commands.get(interaction.commandName);
	console.log(cmd.data.name)

	if (!cmd) {
		console.log(`${cmd.data.name} is not a registered command`)
		return;
	}

	// Execute our command if everything passed
	try {
		await interaction.deferReply();
		await cmd.execute(interaction)
	} catch (err) {
		console.error(`error while running: ${cmd.data.name} in: ${interaction.guildId}`)
		console.error(err)
		await interaction.followUp({ content: `${cmd.data.name} failed when executing`, ephemeral: true }) 
	}

});

// notify us when the bot is ready
client.on('ready', () => {
	console.log('I am ready!');
	fs.mkdir(__dirname + '\\songs', { recursive: false }, (err) => {
		if (err) {
			console.log('Retrying to empty song folder');
			fs.rmSync(__dirname + '\\songs', { maxRetries: 10, recursive: true, retryDelay: 10 }, err => { console.log(err) });
			fs.mkdir(__dirname + '\\songs', { recursive: false }, (err) => {
				if (err) { console.log('Failed to create empty song folder: continuing anyway: ' + err) }
				else { console.log('Song folder emptied') }
			});
		} else { console.log('Song folder emptied') }
	});
});

// is run when node js is stopped using CTRL-c
process.on('SIGINT', async function () {
	console.log('Caught interrupt signal');

	VoiceChannels.forEach(async (soundChannel) => {
		await removeVoiceConnection(soundChannel.get('guild'));
	});

	// add stuff here

	//doesn't work implement other function
	//fs.rmSync( __dirname + '\\songs', {maxRetries: 10, recursive: true, retryDelay: 10});

	// This should always run last
	// Make sure everything before this is done executing or it might not finish
	process.exit();
});

 /*------------ *
 * DEV COMMANDS *
 * ------------*/
client.on('messageCreate', async message => {
	// If the message is starts with testbot and author is not a bot
	if (message.content == 'updateDevCommands' && DEV_IDS.includes(message.author.id)) {
		message.reply('will do!');
		updateGuildCommands(DEV_GUILD_IDS, DEV_CLIENT_ID);
	}
	else if (message.content == 'refreshDevCommands' && DEV_IDS.includes(message.author.id)) {
		message.reply('will do!');
		updateGuildCommands(null, null, false);
	}
	else if (message.content == 'test' && DEV_IDS.includes(message.author.id)) {
		message.reply('You are a dev');
	}

	// Voice channel commands
	// If the message is starts with soundbot and author is not a bot
	else if (message.content.substring(0, 9) == 'soundbot ' && !message.author.bot) {
		return;
		console.log('recieved voice command');
		// Test to see if the user is in a voicechannel
		if (message.guild) {
			if (!message.member.voice.channel) {
				message.reply({ content: 'you must be in a voice channel to use that command' });
				return;
			}
		} else {
			message.reply({ content: `you can only use this command in a guild` });
			return;
		}
		let ConnectionId = message.guild.id;
		var args = message.content.substring(9).split(' ');
		var cmd = args[0];
		args = args.splice(1);
		switch (cmd) {

			//soundbot seek
			case 'seek': {
				message.reply({ content: 'Seek does not work at the moment' })
				return;
				let start = 0;
				if (!isNaN(args[0])) {
					start = +args[0];
				} else {
					message.reply({ content: 'you must suply a number after seek' });
					break;
				}

				if (VoiceChannels.has(ConnectionId)) {
					const soundChannel = VoiceChannels.get(ConnectionId);
					if (soundChannel.get('id') == message.member.voice.channel.id) {
						const playing = soundChannel.get('playing');
						if (playing) {

							const fileName = playing;
							setupSound(soundChannel, fileName, args[0], message.channel);

						} else { message.reply({ content: 'the bot is not playing anything right now' }); }
					} else { message.reply({ content: 'you must be in the same channel as the bot to use that command' }); }
				} else { message.reply({ content: 'the bot must be running for you to use that command' }); }
				break;
			}
		}
	}
});

