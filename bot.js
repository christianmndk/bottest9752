/*
Things that can be improved:
Implement log file
More clarity in log messages and errors
different log levels

Make conver function argument to look further back than the latest attachemt eg. the second to last attachment
...
*/

// used so the bot can download thing
const fs = require('fs');
const fsprom = require('fs/promises');

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
const { Client, Collection, Intents } = require('discord.js');
const { VoiceChannels } = require('./scripts/helper')
const EventEmitter = require('events');

// setup event emitter clas
class MyEmitter extends EventEmitter { };

// Create an instance of a Discord client with intents
const botIntents = new Intents([Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]);
const client = new Client({ intents: botIntents });

// Create some constants
IDS = require('./devIds.json');

// Log at initiation
(function() {
	let d = new Date();
	console.log(`${d.getDate()}/${d.getMonth()}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`);
})();

// Log our bot in using the token from https://discordapp.com/developers/applications/me
const auth = require('./auth.json');
client.login(auth.token);

/*----------------------*
* REGISTRERING COMMANDS *
* ---------------------*/

// A list of all available functions
client.commands = new Collection();

async function updateGuildCommands(guildIds, clientId, refresh = true, commandFiles = null) {
	// Clear all commands but only if we want to reload all of them
	const commands = [];
	if (commandFiles === null) { 
		client.commands = new Collection();
		commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
		for (let x in commandFiles) {
			commandFiles[x] = `./commands/${commandFiles[x].replace('.js', '')}`;
		}
	}
	
	// Delete the caches
	refreshScripts(commandFiles);

	//console.log(`All files added as commands: ${commandFiles.join(' ')}`)
	for (const file of commandFiles) {
		const command = require(`${file}`);
		// Add it to the list of commands
		console.log(`Refreshed ${command.data.name}`)
		client.commands.set(command.data.name, command);
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

// Everytime we start the bot refreshes the command list
updateGuildCommands(null, null, false);

/*------------------ *
* EXECUTING COMMANDS *
* ------------------*/
client.on('interactionCreate', async interaction => {
	console.log('Got interaction');
	//console.log(interaction);
	if (!interaction.isCommand()) { return; }
	console.log('interaction is command')
	//console.log(interaction)

	const cmd = client.commands.get(interaction.commandName);

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
			fs.rmSync(__dirname + '\\songs', { maxRetries: 10, recursive: true, retryDelay: 1 }, err => { console.log(err) });
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

	// This should always run last
	// Make sure everything before this is done executing or it might not finish
	process.exit();
});

/*------------ *
* DEV COMMANDS *
* ------------*/
client.on('messageCreate', async message => {
	// Dev commands
	if (!IDS.devIds.includes(message.author.id)) { return; }

	if (message.content == 'updateDevCommands') {
		message.reply('will do!');
		updateGuildCommands(IDS.devGuildIds, IDS.devClientId);
	}
	else if (message.content == 'refreshDevCommands') {
		message.reply('will do!');
		updateGuildCommands(null, null, false);
	}
	else if (message.content.split(' ')[0] == 'refresh') {
		message.reply('will do!');
		try {
			updateGuildCommands(null, null, false, ['./commands/' + message.content.split(' ')[1]]);
		} catch (err) {
			console.log(err)
		}
	}
	else if (message.content == 'test') {
		message.reply('You are a dev');
	}
	

	// Voice channel commands
	// If the message is starts with soundbot and author is not a bot
	else if (message.content.substring(0, 9) == 'soundbot ' && !message.author.bot) {
		return;
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

function refreshScripts (commandPaths, dependencies=null, cleared=[]) {
	// Get maybe updated dependencies map
	if (dependencies === null) {
		cleared = [];
		delete require.cache[require.resolve(`./dependencies`)];
		({ dependencies } = require("./dependencies"))
		console.log(commandPaths)
	}
	if (!(commandPaths instanceof Array)) { 
		console.error('Remember to update ./dependencies.js') 
	}
	for (const commandPath of commandPaths) {
		// If we have cleared the cache already dont go deeper 
		if (cleared.includes(commandPath)) { continue }
		cleared.push(commandPath)
		console.log(`removing cache for ${commandPath}`)
		delete require.cache[require.resolve(`${commandPath}`)];
		// If we reached the bottom of the dependency tree stop
		const nextCommandPaths = dependencies.get(commandPath);
		if (nextCommandPaths == []) { continue }
		// If not go deeper
		refreshScripts( nextCommandPaths, dependencies, cleared);
	}
	return cleared
}
