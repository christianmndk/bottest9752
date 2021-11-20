const https = require('https');
const fs = require('fs');
const path = require('path');
const { getDiffieHellman } = require('crypto');

const publicFolder = './sitePages'
const Server;

module.exports = {
	initServer: function(ports, host = 'localhost') {
		const server = https.createServer((req, res) => {
			console.log('Request for ' + req.url + ' by method ' + req.method);
		
			switch (req.method) {
				case 'GET':
					Server.emit('GET', req);
					break;

				case 'POST':
					Server.emit('POST', req);
					break;

				case 'PUT':
					Server.emit('PUT', req);
					break;

				case 'REST':
					Server.emit('REST', req);
					break;
			
				default:
					console.log(`Unknow method recieved: ${req.method}`);
					Server.emit('ERR', req, '405');
					break;
			}
		});

		if (!(ports instanceof Array)) {
			listen(server, ports, host);
		}
		else {
			for (port of ports) {
				listen(server, port, host);
			}
		}
		
		Server = server;
	}
}

function listen(server) {
	server.listen(port, host, () => {
		console.log(`Server is listening at https://${host}:${port}/`);
	});
}

/*--------------- *
*  GET FUNCTIONS  *
* ---------------*/

Server.on('GET', (req) => {
	var fileUrl = req.url;
	if (fileUrl == '/') fileUrl = '/index.html';

	var filePath = path.resolve(`${publicFolder}${fileurl}`);
	const fileExt = path.extname(filePath);
	if (fileExt == '.html') {
		fs.access(filePath, (err) => {
			if (err) {
				Server.emit('404', req);
				return;
			}
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/html');
			fs.createReadStream(filePath).pipe(res);
		});
	}
	else if (fileExt == '.css') {
		res.statusCode = 200;
		res.setHeader('Content-Type', 'text/css');
		fs.createReadStream(filePath).pipe(res);
	}
	else {
		Server.emit('404', req);
	}
});

/*------------------- *
*  GENERAL FUNCTIONS  *
* -------------------*/

function getPublicFilePath(fileUrl, ext='html') {
	return path.resolve(`${publicFolder}${fileUrl}.${ext}`);
}

function getFilePath(fileurl, ext='html') {
	return path.resolve(`./${fileUrl}.${ext}`);
}

/*--------------- *
*  PUT FUNCTIONS  *
* ---------------*/

Server.on('PUT', (req) => {
	Server.emit('ERR', req, '501');
});

/*---------------- *
*  POST FUNCTIONS  *
* ----------------*/

Server.on('POST', (req) => {
	Server.emit('ERR', req, '501');
});

/*---------------- *
*  REST FUNCTIONS  *
* ----------------*/

Server.on('REST', (req) => {
	Server.emit('ERR', req, '501');
});

/*--------------- *
*  404 FUNCTIONS  *
* ---------------*/

Server.on('ERR', (req, error) => {
	if (!error) error = '404';
	filePath = path.resolve(`./${publicFolder}/${error}.html`);
	fs.access(filePath, (err) => {
		if (err) {
			console.error(`Error: ${error} sent, but no corosponding HTML file could be found`)
		}
	});
	res.statusCode = error;
	res.setHeader('Content-Type', 'text/html');
	fs.createReadStream(filePath).pipe(res);
});