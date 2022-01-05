const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
	key: fs.readFileSync('./Certificates/prime.key'),
	cert: fs.readFileSync('./Certificates/prime.crt')
};

const publicFolder = './sitePages';
const errorFolder = './sitePages/Errors';
var Server;

module.exports = {
	initServer: function(ports, host = 'localhost') {
		const server = https.createServer(options, (req, res) => {
			console.log('Request for ' + req.url + ' by method ' + req.method);
		
			switch (req.method) {
				case 'GET':
					Server.emit('GET', req, res);
					break;

				case 'POST':
					Server.emit('POST', req, res);
					break;

				case 'PUT':
					Server.emit('PUT', req, res);
					break;

				case 'REST':
					Server.emit('REST', req, res);
					break;
			
				default:
					console.log(`Unknow method recieved: ${req.method}`);
					Server.emit('ERR', '405', req, res);
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

		/*--------------- *
		*  GET FUNCTIONS  *
		* ---------------*/

		Server.on('GET', (req, res) => {
			console.log(req)
			var fileUrl = req.url;
			if (fileUrl == '/' || fileurl === undefined) fileUrl = '/index.html';
			console.log(fileUrl)
		
			var filePath = path.resolve(`${publicFolder}${fileUrl}`);
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

		/*--------------- *
		*  PUT FUNCTIONS  *
		* ---------------*/

		Server.on('PUT', (req, res) => {
			Server.emit('ERR', '501', req, res);
		});

		/*---------------- *
		*  POST FUNCTIONS  *
		* ----------------*/

		Server.on('POST', (req, res) => {
			Server.emit('ERR', '501', req, res);
		});

		/*---------------- *
		*  REST FUNCTIONS  *
		* ----------------*/

		Server.on('REST', (req, res) => {
			Server.emit('ERR', '501', req, res);
		});

		/*--------------- *
		*  404 FUNCTIONS  *
		* ---------------*/

		Server.on('ERR', (error, req, res) => {
			if (!error) error = '404';
			filePath = path.resolve(`./${errorFolder}/${error}.html`);
			fs.access(filePath, (err) => {
				if (err) { // If an unkown error uccurs 
					console.error(`Error: ${error} sent, but no corosponding HTML file could be found`);
					Server.emit('ERR', req, '500')
				}
			});
			res.statusCode = error;
			res.setHeader('Content-Type', 'text/html');
			fs.createReadStream(filePath).pipe(res);
		});

		return Server;
	}
}

/*------------------- *
*  GENERAL FUNCTIONS  *
* -------------------*/

function listen(server, port, host) {
	server.listen(port);
	console.log(`Server is listening at https://${host}:${port}/`);
}

function getPublicFilePath(fileUrl, ext='html') {
	return path.resolve(`${publicFolder}${fileUrl}.${ext}`);
}

function getFilePath(fileurl, ext='html') {
	return path.resolve(`./${fileUrl}.${ext}`);
}

const self = module.exports;

Server = self.initServer(8080);