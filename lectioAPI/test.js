/*
TODO
1. Upload fake document just before end of assignment (VERY HARD)
2. Show homework
3. Send message
4. Show grades 
5. Show names (eg 'mads' -> shows all people named 'mads EXTRA EXTRA')
test
*/
let LOGINNAME = ''
let LOGINPASSWORD = ''
let LOGINSCHOOLID = '557'

const https = require('https');
const querystring = require('querystring');
const fs = require('fs')

// retuns session options with the cookie for later use
async function login(name, password, schoolID) {
	return new Promise(function(resolve) {
	const loginData = querystring.stringify({
		__EVENTTARGET: 'm$Content$submitbtn2',
		__EVENTARGUMENT: '',
		__SCROLLPOSITION: '',
		__EVENTVALIDATION: 'ZMadGQodjMiCmDCUb/KAcvAMVURSHLdQokVCEd5S7eABPSe0mY4evC21iWUOOgtR+U0L1MmaAGOTH+INut8eZHLSE6TMoxCHQP4H0TSn5ZsnNREK7vSGgH4Wti5vys4So1nWJj4flwZH2C5dzvKDSkWSdaKW8yviZi7S6Fo/sbmdejgw49+VN3DeIXFJM+O/4NUOH3Hh5sgQCqgEkPTwIOe36dyZiv2KSUNp8tv2u4U=',
		m$Content$username: name,
		m$Content$password: password,
	});

	const loginOptions = {
		hostname: 'www.lectio.dk',
		port: 443,
		path: '/lectio/' + schoolID + '/login.aspx',
		method: 'POST',
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0',
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(loginData),
			'Upgrade-Insecure-Requests': '1',
			'Pragma': 'no-cache',
			'Cache-Control': 'no-cache',
		}
	};

	let SessionOptions = {
		hostname: 'www.lectio.dk',
		port: 443,
		// This should be used changed when a new part of lectio is requested eg 
		// '/lectio/381/SkemaNy.aspx?type=elev&elevid=43875192536' (random numbers)
		path: '/lectio/' + schoolID + '/forside.aspx',  
		method: 'GET',
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'DNT': '1',
			'Connection': 'keep-alive',
			'Cookie': '', //set the cookie when we login
			'Upgrade-Insecure-Requests': '1',
			'Pragma': 'no-cache',
			'Cache-Control': 'no-cache',
			'Upgrade-Insecure-Requests': '1'
		}
	};

	const user = {
		username: name,
		password: password,
		school: schoolID,
		studentID: false,
	} 

	const loginSite = https.request(loginOptions, (res) => {

		console.log(`STATUS: ${res.statusCode} LoginSite request`);
		//console.log(res.headers);

		// We take the our login cookie and store it 
		SessionOptions.headers.Cookie = res.headers["set-cookie"];
		
		res.setEncoding('utf8');
		
		res.on('data', (chunk) => {
			//console.log(`BODY: ${chunk}`);
		});
		res.on('end', () => {
			console.log('logged in');
			
			// FRONTPAGE LOAD

			const frontPage = https.request(SessionOptions, (res) => {
		
				console.log(`STATUS: ${res.statusCode} frontpage request`);
				//console.log(res.headers);

				res.setEncoding('utf8');

				let data = '';
				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					// getting the students id from the page
					reStudentID = /;elevid=[0-9]*/;
					user.studentID = reStudentID[Symbol.match](data)[0].slice(8)
					console.log(user.studentID)

					resolve({
						student: user,
						options: SessionOptions
					});

					console.log('Student ID collected');
				});
			});
		
			frontPage.on('error', (e) => {
				console.error(`problem with frontPage request: ${e.message}`);
			});
		  
			// Write data to request body
			//frontPage.write(loginData);
			frontPage.end();
		});
	});

	loginSite.on('error', (e) => {
		console.error(`problem with loginSite request: ${e.message}`);
	});
  
	// Write data to request body
	loginSite.write(loginData);
	loginSite.end();
	});
};

function getClassPictures(className, info) {

	//console.log(options)
	info.options.path = '/lectio/' + info.student.school + '/FindSkema.aspx?type=stamklasse'
	const ClassSelector = https.request(info.options, (res) => {

		console.log(`STATUS: ${res.statusCode} ClassSelector`);
		res.setEncoding('utf8');

		let data = '';
		res.on('data', (chunk) => {
			data += chunk;

		});
		res.on('end', () => {
			let reclassID = new RegExp("=[0-9]{10,12}'>" + className);
			let classID;
			try {
				classID = reclassID[Symbol.match](data)[0].slice(1);
			}
			catch (error) {
				if (error instanceof TypeError) {
					console.log('The class \'' + className + '\' does not exist. SKIPPING');
					return;
				}
				else {
					throw error;
				}
			}
			classID = classID.slice(0,classID.length-2-className.length) ;
			//console.log(data)
			let classLinkPath = '/lectio/' + info.student.school + '/subnav/members.aspx?klasseid=' + classID + '&showstudents=1';
			info.options.path = classLinkPath;

			const PictureSelector = https.request(info.options, (res) => {

				console.log(`STATUS: ${res.statusCode} PictureSelector request`);
				res.setEncoding('utf8');
		
				let data = '';
				res.on('data', (chunk) => {
					data += chunk;
				});
				res.on('end', () => {

					let rePictureID = /\?pictureid=[0-9]*/g;
					let PictureIDs = rePictureID[Symbol.match](data)

					let PictureID = ''
					let PictureLink = ''

					console.log('Downloading ' + PictureIDs.length + ' pictures of: ' + className)

					for (i=0; i < PictureIDs.length; i++) {
						PictureID = PictureIDs[i].slice(11)
						PictureLink = 'https://www.lectio.dk/lectio/' + info.student.school + '/GetImage.aspx?pictureid=' + PictureID + '&fullsize=1'

						const file = fs.createWriteStream(PictureID + '.jpeg');
						info.options.path = '/lectio/' + info.student.school + '/GetImage.aspx?pictureid=' + PictureID + '&fullsize=1'
						const picture = https.request(info.options, (res) => {
							res.pipe(file);
						});

						picture.on('error', (e) => {
							console.error(`problem with PictureSelector request: ${e.message}`);
						});

						picture.end()
					}
					console.log('')
				});
			});

			PictureSelector.on('error', (e) => {
				console.error(`problem with request: ${e.message}`);
			});
		  
			PictureSelector.end();
		});
	});

	ClassSelector.on('error', (e) => {
		console.error(`problem with ClassSelector request: ${e.message}`);
	});
  
	ClassSelector.end();
}

function logMessage(message) {
	console.log('-----------Message BEG-----------')
	console.log('From:\t' + message.from)
	console.log('Latest:\t' + message.latest)
	console.log('To:\t' + message.to)
	console.log('Sent:\t' + message.time)
	console.log('Title:\t' + message.title)
	console.log(message.message)
	console.log('-----------Message END-----------\n')
}

function getMessage(startFrom, info, messageAmount = 1) {

	info.options.path = '/lectio/' + info.student.school + '/beskeder2.aspx?type=&elevid=' + info.student.studentID
	const MessageSelector = https.request(info.options, (res) => {

		console.log(`STATUS: ${res.statusCode} MessageSelector request`);
		res.setEncoding('utf8');

		let data = '';
		res.on('data', (chunk) => {
			data += chunk;

		});
		res.on('end', async function() {

			//const reMessageInfo = /;"><span title=[\n\D0-9]+?<\/td><td a/gm;
			const reMessageInfo = /;"><span title=[\n\D0-9]+?[0-9]<\/td>/gm
			let MessageInfo = reMessageInfo[Symbol.match](data)

			const reMessageIndicators = /\$LB2\$_MC_\$_[0-9]+/g
			let MessageIndicators = reMessageIndicators[Symbol.match](data)
			//console.log(MessageIndicators)

			const reTitles = /_ch">[^<]+/g
			let Titles = reTitles[Symbol.match](data)
			for (i=0; i<Titles.length; i++) {
				Titles[i] = Titles[i].slice(5)
			}

			// if we try to fetch a message that is not in the most recent just grab the oldest
			if (startFrom > MessageInfo.length) { 
				startFrom = MessageInfo.length;
				console.log(`Tried to fetch ${messageAmount} message(s) out of range\nGrabbing the oldest`);
				messageAmount = 1;
			}
			// if we try to get too many messages take as many messages after startFrom value
			else if (startFrom + messageAmount > MessageInfo.length) {
				console.log(`Tried to fetch ${messageAmount - MessageInfo.length} too many messages\nFetching as many as possible`);
				messageAmount = MessageInfo.length - startFrom
			}

			// get information about message
			// then fetch message from lectio
			// combine information and text
			 
			const rePeople = /<span title=".+?"/g
			const reTime = /xtright">.*?[0-9]<\/td>/g
			const pathString = '/lectio/' + info.student.school + '/beskeder2.aspx?type=showthread&elevid=' + info.student.studentID + '&selectedfolderid=-70&id='

			let messages = []
			for (i = 0; i < messageAmount; i++) {messages.push({})}

			for (i = startFrom; i < startFrom + messageAmount; i++) {
				messages[i - startFrom] = new Promise(function(resolveMessage) {
					let message = {
						from: '',
						latest: '',
						to: '',
						time: '',
						title: Titles[i],
						message: ''
					};	

					// gather the people information (latest responder(0), first sender (1), recipient(s) (2) )
					let people = rePeople[Symbol.match](MessageInfo[i].replace(/[\n\r]+/g, ','));
					message.from = people[1].slice(13, people[1].length-1);
					message.latest = people[0].slice(13, people[0].length-1);
					message.to = people[2].slice(13, people[2].length-1);

					let time = reTime[Symbol.match](MessageInfo[i])[0].slice(9);
					//time = time.slice(0, time.length-10);
					time = time.slice(0, time.length-5);
					message.time = time;
					//console.log(message);
					let path = pathString + MessageIndicators[i].slice(11);
					info.options.path = path;

					resolveMessage(extractMessage(info.options, path, message));
				})
			}
			console.log('Showing: ' + messageAmount + ' messages starting from: ' + startFrom);
			for (i = 0; i < messageAmount; i++) {
				messages[i].then(logMessage(await messages[i]));
				//console.log(messages[i])
			}
		});
	});

	MessageSelector.on('error', (e) => {
		console.error(`problem with MessageSelector request: ${e.message}`);
	});
  
	MessageSelector.end();
}

function getLatestMessage(info) {
	getMessage(0, info)
}

// MUCH WORSE NEW FUNCTIONING CODE
function extractMessage(options, path, message) {
	options.path = path
	return new Promise(function(resolve) {
		const MessageGetter = https.request(options, (res) => {
			res.setEncoding('utf8');

			let data = '';
			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				data = data.replace(/[\n\r]+/g, ' ');
				const reMessage = /yle='b.*?<\/d/;
				let tempMessage = reMessage[Symbol.match](data);
				if (tempMessage == null) {
					console.log ('Error in HTTPS request for message, retrying');
					resolve (extractMessage(options, path, message) );
				} 
				else {
					// general formatting				  linebreak to newlines----- strip formatting information----------------------- Fixing ampersands
					tempMessage = tempMessage[0].slice(63).replace(/<br \/> /g, '\n').replace(/<span.*?>/g, '').replace(/<\/span>/g, '').replace(/\&amp/g, '&');
					// links
					tempMessage = tempMessage.replace(/<a href='/g, '[link] ').replace(/target='_blank'>/g, '[text] ').replace(/<\/a>/g, ' [/link]');
					// final trimming
					tempMessage = tempMessage.slice(0, tempMessage.length-4);
					message.message = tempMessage;

					resolve(message);
				}
			});
		});

		MessageGetter.on('error', (e) => {
			console.error(`problem with MessageGetter request: ${e.message}`);
		});

		MessageGetter.end();
	});
}

async function sendMessage(recievers, topic, message, info) {

	let grupperPath = new Promise(function(resolve) {
		info.options.path = 'https://www.lectio.dk/lectio/' + info.student.school + '/default.aspx';
		const gruppePathGetter = https.request(options, (res) => {
			res.setEncoding('utf8');

			let data = '';
			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				const reGrupperPathID = /\&amp;fag=[0-9]+">Gruppe/;
				let tempGrupperPath = reGrupperPathID[Symbol.match](data);
				tempGrupperPath.slice(9).splice(0, tempGrupperPath.length - 8);

				let grupperPath = '/lectio/' + info.student.school + '/FindSkema.aspx?type=hold&fag=' + tempGrupperPath;
				console.log('Found path to \'grupper\' for search');
				resolve(grupperPath)
			});
		});

		gruppePathGetter.on('error', (e) => {
			console.error(`promblem with gruppePathGetter request: ${e.message}`);
		});

		gruppePathGetter.end();

	});

	for (i = 0; i < recievers.length; i++) {
		// WRITE SEARCH FUNCTION FOR STUDENTS, TEACHERS, TEAMS, AND GROUPS
	}
}

async function searchRecieverInfo(searchTerm, sessionInfo) {

}

function main() {
	sessionInfo = await login(LOGINNAME, LOGINPASSWORD, LOGINSCHOOLID);
	//console.log(sessionInfo)
	//getClassPictures('3x', sessionInfo)
	getMessage(0, sessionInfo, 100000000);
	//getLatestMessage(sessionInfo)

}

main();