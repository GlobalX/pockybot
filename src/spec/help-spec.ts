import Help from '../lib/response-triggers/help';
import constants from '../constants';
import Config from '../lib/config';
import { MessageObject } from 'webex/env';

const config = new Config(null);

function createMessage(htmlMessage : string) : MessageObject {
	return {
		html: htmlMessage
	}
}

function createPrivateMessage(message : string) : MessageObject {
	return {
		text: message
	}
}

beforeAll(() => {
	spyOn(config, 'getConfig').and.callFake((config : string) => {
		if (config == 'requireValues') {
			return 1;
		}

		throw new Error('bad config');
	});
})

function createInputMessage(text: string) {
	return { personId: 'person', text: text };
}

describe('help message', () => {
	const help = new Help(config);

	it('should create the message', async (done : DoneFn) => {
		var message = createInputMessage('help');
		let response = await help.createMessage(message);
		expect(response.markdown).toBeDefined();
		expect(response.markdown).toContain('## What I can do (List of Commands)');
		done();
	});

	it('should create the message for a specific command', async (done : DoneFn) => {
		var message = createInputMessage('help status');
		let response = await help.createMessage(message);
		expect(response.markdown).toBeDefined();
		expect(response.markdown).toContain('### How to check your status 📈!');
		done();
	});

	it('should create the message for an invalid command', async (done: DoneFn) => {
		var message = createInputMessage('help invalid1232433');
		let response = await help.createMessage(message);
		expect(response.markdown).toBe(`Command not found. To see a full list of commands type ` +
			`\`@${constants.botName} help\` or direct message me with \`help\`.`);
		done();
	});
});

describe('testing help triggers', () => {
	const help = new Help(config);

	it('should accept trigger', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> help`);
		let results = help.isToTriggerOn(message)
		expect(results).toBe(true);
	});

	it('should accept help for specific command', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> help status`);
		let results = help.isToTriggerOn(message)
		expect(results).toBe(true);
	});

	it('should reject wrong command', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> asdfhelp`);
		let results = help.isToTriggerOn(message)
		expect(results).toBe(false);
	});

	it('should reject wrong id', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="wrongId">${constants.botName}</spark-mention> help`);
		let results = help.isToTriggerOn(message)
		expect(results).toBe(false);
	});

	it('should accept no space', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention>help`);
		let results = help.isToTriggerOn(message)
		expect(results).toBe(true);
	});

	it('should accept trailing space', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> help `);
		let results = help.isToTriggerOn(message)
		expect(results).toBe(true);
	});

	it('should reject group mention', () => {
		let message = createMessage(`<p><spark-mention data-object-type="groupMention" data-group-type="all">All</spark-mention> help`);
		let results = help.isToTriggerOn(message)
		expect(results).toBe(false);
	});
});

describe('testing help PM triggers', () => {
	const help = new Help(config);

	it('should accept trigger', () => {
		let message = createPrivateMessage('help');
		let results = help.isToTriggerOnPM(message)
		expect(results).toBe(true);
	});

	it('should accept help for specific command', () => {
		let message = createPrivateMessage('help commandtest');
		let results = help.isToTriggerOnPM(message)
		expect(results).toBe(true);
	});

	it('should reject wrong command', () => {
		let message = createPrivateMessage('helooo');
		let results = help.isToTriggerOnPM(message)
		expect(results).toBe(false);
	});

	it('should accept whitespace around', () => {
		let message = createPrivateMessage(' help ');
		let results = help.isToTriggerOnPM(message)
		expect(results).toBe(true);
	});

	it('should accept capitalised command', () => {
		let message = createPrivateMessage('Help');
		let results = help.isToTriggerOnPM(message)
		expect(results).toBe(true);
	});
});
