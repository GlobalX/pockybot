import Status from '../lib/response-triggers/status';
import constants from '../constants';
import Config from '../lib/config';
import PockyDB from '../lib/PockyDB';
import { Client } from 'pg';
import MockCiscoSpark from './mocks/mock-spark';
import { MessageObject } from 'ciscospark/env';

const config = new Config(null);
const spark = new MockCiscoSpark();

beforeAll(() => {
	spyOn(config, 'checkRole').and.callFake((userid : string, value : string) => {
		if (userid == 'mockunlimitedID' && value == 'unmetered') {
			return true;
		} else {
			return false;
		}
	});

	spyOn(config, 'getConfig').and.callFake((config : string) => {
		if (config == 'limit') {
			return 10;
		} else if (config == 'minimum') {
			return 5;
		} else if (config == 'winners') {
			return 3;
		} else if (config == 'commentsRequired') {
			return 1;
		} else if (config == 'pegWithoutKeyword') {
			return 0;
		}

		throw new Error("bad config");
	});

	spyOn(spark.people, 'get').and.callFake((name : string) => {
		return new Promise((resolve, reject) => {
			resolve({
				displayName: name + 'display'
			});
		})
	});
});

function createMessage(htmlMessage : string, person : string) : MessageObject {
	return {
		html: htmlMessage,
		personId: person
	}
}

function createPrivateMessage(message : string) : MessageObject {
	return {
		text: message
	}
}

function createDatabase(statusSuccess : boolean, statusResponse) : PockyDB {
	let client = new Client();
	spyOn(client, 'connect').and.returnValue(new Promise(resolve => resolve()));
	let db = new PockyDB(client, null);

	if (statusSuccess) {
		spyOn(db, 'getPegsGiven').and.returnValue(new Promise((resolve, reject) => resolve(statusResponse)));
	} else {
		spyOn(db, 'getPegsGiven').and.returnValue(new Promise((resolve, reject) => reject()));
	}

	return db;
}

describe("creating Message", function() {
    it("should show the remaining pegs", function (done) {
        const expectedCount = config.getConfig('limit') - 3;
		let database = createDatabase(true,
			[
				{receiver: 'test', comment: 'trsioetnsrio'},
				{receiver: 'test3', comment: 'trsioetnsrio'},
				{receiver: 'test2', comment: 'trsioetnsrio'}
			]);
        let status = new Status(spark, database, config);
        let sentMessage = createMessage('<p><spark-mention data-object-type="person" data-object-id="' + constants.botId + '">' + constants.botName + '</spark-mention> status',
            'person!');
        status.createMessage(sentMessage)
        .then((message) => {
            expect(message.markdown).toContain(`You have ${expectedCount} pegs left to give.`);
            done();
        });
    });

    it("should show the remaining pegs", function (done) {
        const expectedCount = config.getConfig('limit') - 3;
		let database = createDatabase(true,
			[
				{receiver: 'test', comment: 'trsioetnsrio'},
				{receiver: 'test3', comment: 'trsioetnsrio'},
				{receiver: 'test2', comment: 'trsioetnsrio'}
			]);
        let status = new Status(spark, database, config);
        let sentMessage = createMessage('<p><spark-mention data-object-type="person" data-object-id="' + constants.botId + '">' + constants.botName + '</spark-mention> status',
            'mockunlimitedID');
        status.createMessage(sentMessage)
        .then((message) => {
            expect(message.markdown).toContain(`You have unlimited pegs left to give.`);
            done();
        });
    });

	it("should send the message to the the sender", function (done) {
        const expectedCount = config.getConfig('limit') - 3;
		let database = createDatabase(true,
			[
				{receiver: 'test', comment: 'trsioetnsrio'},
				{receiver: 'test3', comment: 'trsioetnsrio'},
				{receiver: 'test2', comment: 'trsioetnsrio'}
			]);
        let status = new Status(spark, database, config);
        let sentMessage = createMessage('<p><spark-mention data-object-type="person" data-object-id="' + constants.botId + '">' + constants.botName + '</spark-mention> status',
            'person!');
        status.createMessage(sentMessage)
        .then((message) => {
            expect(message.toPersonId).toBe('person!');
            done();
        });
    });

	it("should have the items in the message", function (done) {
		const expectedCount = config.getConfig('limit') - 3;
		let database = createDatabase(true,
			[
				{receiver: 'test', comment: 'trsioetnsrio'},
				{receiver: 'test3', comment: 'dtsdsrtdrsdpf'},
				{receiver: 'test2', comment: 'trsioetnsrio'}
			]);
		let status = new Status(spark, database, config);
		let sentMessage = createMessage('<p><spark-mention data-object-type="person" data-object-id="' + constants.botId + '">' + constants.botName + '</spark-mention> status',
			'person!');
		status.createMessage(sentMessage)
		.then((message) => {
			expect(message.markdown).toContain('* **test3display** — "_dtsdsrtdrsdpf_"');
			done();
		});
	});
});

describe("testing triggers", function() {
	const status = new Status(spark, null, config);

	const TriggerTestCases = [
		{ text: `${constants.mentionMe} status`, expectedTriggered: true },
		{ text: `${constants.mentionMe}status`, expectedTriggered: true },
		{ text: `${constants.mentionMe} status `, expectedTriggered: true },
		{ text: `<p><spark-mention data-object-type="person" data-object-id="` + constants.botId + `">` + constants.botName + `</spark-mention> status</p>`, expectedTriggered: true },
		{ text: `${constants.mentionMe} status me`, expectedTriggered: false }];
	TriggerTestCases.forEach(spec => {
		it(`should${spec.expectedTriggered ? '':' not'} trigger when ${spec.text}`, () => {
			const result = status.isToTriggerOn(createMessage(spec.text, 'person'));
			expect(result).toEqual(spec.expectedTriggered);
		});
	});
});

describe("testing PM triggers", function() {
	const status = new Status(spark, null, config);
	it("should accept trigger", function () {
		let message = createPrivateMessage('status');
		let results = status.isToTriggerOnPM(message)
		expect(results).toBe(true);
	});

	it("should reject wrong command", function () {
		let message = createPrivateMessage('sssting');
		let results = status.isToTriggerOnPM(message)
		expect(results).toBe(false);
	});

	it("should accept whitespace around", function () {
		let message = createPrivateMessage(' status ');
		let results = status.isToTriggerOnPM(message)
		expect(results).toBe(true);
	});

	it("should accept capitalised command", function () {
		let message = createPrivateMessage('Status');
		let results = status.isToTriggerOnPM(message)
		expect(results).toBe(true);
	});
});
