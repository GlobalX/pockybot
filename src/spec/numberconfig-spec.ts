import Numberconfig from '../lib/response-triggers/numberconfig';
import constants from '../constants';
import Config from '../lib/config';
import { MessageObject } from 'ciscospark/env';
import { Role } from '../models/database';

const config = new Config(null);

function createMessage(htmlMessage : string, person : string) : MessageObject {
	return {
		html: htmlMessage,
		personId: person
	}
}

function createPrivateMessage(message : string, person : string) : MessageObject {
	return {
		text: message,
		personId: person
	}
}

beforeAll(() => {
	spyOn(config, 'getAllConfig').and.callFake(() => {
		return [{
			name: 'test',
			value: 1
		}];
	});

	spyOn(config, 'setConfig').and.callFake(() => {
		return;
	});

	spyOn(config, 'updateConfig').and.callFake(() => {
		return;
	});

	spyOn(config, 'deleteConfig').and.callFake(() => {
		return;
	});

	spyOn(config, 'checkRole').and.callFake((userid : string, value : Role) => {
		if (userid === 'mockAdminID' && value === Role.Admin) {
			return true;
		}
		else {
			return false;
		}
	});
})

describe('configuration message parsing', () => {
	const configuration = new Numberconfig(config);

	it('should create the get message', async (done : DoneFn) => {
		const helpMessage = { text: 'numberconfig get'};
		let response = await configuration.createMessage(helpMessage);
		expect(response.markdown).toContain(
`Here is the current config:
Name | Value
test | 1
`
		);
		done();
	});

	it('should create the set message', async (done : DoneFn) => {
		const helpMessage = { text: 'numberconfig set test 1'};
		let response = await configuration.createMessage(helpMessage);
		expect(response.markdown).toBe("Config has been set");
		done();
	});

	it('should fail to create with a string paramater', async (done : DoneFn) => {
		const helpMessage = { text: 'numberconfig set test test'};
		let response = await configuration.createMessage(helpMessage);
		expect(response.markdown).toBe("Config must be set to a number");
		done();
	});

	it('should fail to create with mixed input', async (done : DoneFn) => {
		const helpMessage = { text: 'numberconfig set test test123'};
		let response = await configuration.createMessage(helpMessage);
		expect(response.markdown).toBe("Config must be set to a number");
		done();
	});

	it('should create the refresh message', async (done : DoneFn) => {
		const helpMessage = { text: 'numberconfig refresh'};
		let response = await configuration.createMessage(helpMessage);
		expect(response.markdown).toBe("Config has been updated");
		done();
	});

	it('should create the delete message', async (done : DoneFn) => {
		const helpMessage = { text: 'numberconfig delete test'};
		let response = await configuration.createMessage(helpMessage);
		expect(response.markdown).toBe("Config has been deleted");
		done();
	});

	it('should fail to create the delete message with no config specified', async (done : DoneFn) => {
		const helpMessage = { text: 'numberconfig delete'};
		let response = await configuration.createMessage(helpMessage);
		expect(response.markdown).toBe("You must specify a config to be deleted");
		done();
	});
});

describe('testing configuration triggers', () => {
	const configuration = new Numberconfig(config);

	it('should accept trigger', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> numberconfig`,
			'mockAdminID');
		let results = configuration.isToTriggerOn(message)
		expect(results).toBe(true);
	});

	it('should reject wrong command', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> asdfnumberconfig`,
			'mockAdminID');
		let results = configuration.isToTriggerOn(message)
		expect(results).toBe(false);
	});

	it('should reject wrong id', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="wrongId">${constants.botName}</spark-mention> numberconfig`,
			'mockAdminID');
		let results = configuration.isToTriggerOn(message)
		expect(results).toBe(false);
	});

	it('should accept no space', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention>numberconfig`,
			'mockAdminID');
		let results = configuration.isToTriggerOn(message)
		expect(results).toBe(true);
	});

	it('should accept trailing space', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> numberconfig `,
			'mockAdminID');
		let results = configuration.isToTriggerOn(message)
		expect(results).toBe(true);
	});

	it('should fail for non admin', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> numberconfig`,
			'mockID');
		let results = configuration.isToTriggerOn(message)
		expect(results).toBe(false);
	});

	it('should accept an additional parameter', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> numberconfig get`,
			'mockAdminID');
		let results = configuration.isToTriggerOn(message)
		expect(results).toBe(true);
	});

	it('should fail with only config', () => {
		let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> config`,
			'mockAdminID');
		let results = configuration.isToTriggerOn(message)
		expect(results).toBe(false);
	});
});

describe('testing configuration PM triggers', () => {
	const configuration = new Numberconfig(config);

	it('should accept trigger', () => {
		let message = createPrivateMessage('numberconfig', "mockAdminID");
		let results = configuration.isToTriggerOnPM(message)
		expect(results).toBe(true);
	});

	it('should reject wrong command', () => {
		let message = createPrivateMessage('helooo', "mockAdminID");
		let results = configuration.isToTriggerOnPM(message)
		expect(results).toBe(false);
	});

	it('should accept whitespace around', () => {
		let message = createPrivateMessage(' numberconfig ', "mockAdminID");
		let results = configuration.isToTriggerOnPM(message)
		expect(results).toBe(true);
	});

	it('should accept capitalised command', () => {
		let message = createPrivateMessage('numberconfig', "mockAdminID");
		let results = configuration.isToTriggerOnPM(message)
		expect(results).toBe(true);
	});

	it('should fail for non admin PM', () => {
		let message = createPrivateMessage('numberconfig', "mockID");
		let results = configuration.isToTriggerOnPM(message)
		expect(results).toBe(false);
	});

	it('should accept an additional parameter', () => {
		let message = createPrivateMessage('numberconfig get', "mockAdminID");
		let results = configuration.isToTriggerOnPM(message)
		expect(results).toBe(true);
	});

	it('should fail with only config', () => {
		let message = createPrivateMessage('Config', "mockAdminID");
		let results = configuration.isToTriggerOnPM(message)
		expect(results).toBe(false);
	});
});