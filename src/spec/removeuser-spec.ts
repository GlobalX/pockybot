import RemoveUser from '../lib/response-triggers/removeuser';
import constants from '../constants';
import Config from '../lib/config';
import { Role, UserRow } from '../models/database';
import DbUsers from '../lib/database/db-users';
import DbLocation from '../lib/database/db-location';
import MockQueryHandler from './mocks/mock-query-handler';
import { Command } from '../models/command';
import { PockyDB } from '../lib/database/db-interfaces';
import MockPockyDb from './mocks/mock-pockydb';
import { MessageObject } from 'webex/env';

function createMessage(htmlMessage : string, person : string) : MessageObject {
	return {
		html: htmlMessage,
		personId: person
	}
}

describe('remove trigger', () => {
	const config = new Config(null);
	let dbUsers : DbUsers;
	let dbLocation : DbLocation;
	let pockyDb : PockyDB;
	let removeUser : RemoveUser;

	beforeAll(() => {
		spyOn(config, 'checkRole').and.callFake((userid : string, value : Role) => {
			return userid === 'mockAdminID' && value === Role.Admin;
		});
	});

	beforeEach(() => {
		dbUsers = new DbUsers(null, new MockQueryHandler(null));
		dbLocation = new DbLocation(new MockQueryHandler(null));
		pockyDb = new MockPockyDb(false, 0, false, 0);
		removeUser = new RemoveUser(config, dbUsers, dbLocation, pockyDb);
	});

	describe('message parsing', () => {
		it('should create the message with no name or mention', async (done : DoneFn) => {
			const message = { html: `<spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} ` };

			let response = await removeUser.createMessage(message);
			expect(response.markdown).toBe('Please mention or provide the name of the person you want to remove');
			done();
		});

		it('should create the message with group mention', async (done : DoneFn) => {
			const message = { html: `<spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} <spark-mention data-object-type="groupMention" data-group-type="all">All</spark-mention>` };

			let response = await removeUser.createMessage(message);
			expect(response.markdown).toBe('Please mention or provide the name of the person you want to remove');
			done();
		});

		it('should create the message with a mention', async (done : DoneFn) => {
			const username = 'TestUser';
			const userId = '12345';
			const message = { html: `<spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} <spark-mention data-object-type="person" data-object-id="${userId}">${username}</spark-mention>` };

			spyOn(pockyDb, 'countPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPenaltyPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPegsReceived').and.returnValue(Promise.resolve(0));
			const locationSpy = spyOn(dbLocation, 'deleteUserLocation').and.stub();
			const userSpy = spyOn(dbUsers,'deleteUser').and.stub();

			let response = await removeUser.createMessage(message);
			expect(response.markdown).toBe(`User '${username}' has been removed`);
			expect(locationSpy).toHaveBeenCalledWith(userId);
			expect(userSpy).toHaveBeenCalledWith(userId);
			done();
		});

		it('should create the message with a valid name', async (done : DoneFn) => {
			const username = 'Test User';
			const userId = '12345';

			const users : UserRow[] = [
				{
					userid: '22222',
					username: 'NotMe'
				},
				{
					userid: userId,
					username
				},
				{
					userid: '33333',
					username: 'NotMeEither'
				}
			];

			const message = { html: `<spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} ${username}` };

			spyOn(dbUsers, 'getUsers').and.returnValue(Promise.resolve(users));
			spyOn(pockyDb, 'countPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPenaltyPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPegsReceived').and.returnValue(Promise.resolve(0));
			const locationSpy = spyOn(dbLocation, 'deleteUserLocation').and.stub();
			const userSpy = spyOn(dbUsers,'deleteUser').and.stub();

			let response = await removeUser.createMessage(message);
			expect(response.markdown).toBe(`User '${username}' has been removed`);
			expect(locationSpy).toHaveBeenCalledWith(userId);
			expect(userSpy).toHaveBeenCalledWith(userId);
			done();
		});

		it('should create the message without a valid name', async (done : DoneFn) => {
			const username = 'Test User';

			const users : UserRow[] = [
				{
					userid: '22222',
					username: 'NotMe'
				},
				{
					userid: '33333',
					username: 'NotMeEither'
				}
			];

			const message = { html: `<spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} ${username}` };

			spyOn(dbUsers, 'getUsers').and.returnValue(Promise.resolve(users));
			const locationSpy = spyOn(dbLocation, 'deleteUserLocation').and.stub();
			const userSpy = spyOn(dbUsers,'deleteUser').and.stub();

			let response = await removeUser.createMessage(message);
			expect(response.markdown).toBe(`Could not find user with display name '${username}'`);
			expect(locationSpy).not.toHaveBeenCalled();
			expect(userSpy).not.toHaveBeenCalled();
			done();
		});

		it('should create the message when getUsers fails', async (done : DoneFn) => {
			const username = 'Test User';
			const message = { html: `<spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} ${username}` };

			spyOn(dbUsers, 'getUsers').and.returnValue(Promise.reject('Failed to get users'));
			const locationSpy = spyOn(dbLocation, 'deleteUserLocation').and.stub();
			const userSpy = spyOn(dbUsers,'deleteUser').and.stub();

			let response = await removeUser.createMessage(message);
			expect(response.markdown).toBe(`Error getting users`);
			expect(locationSpy).not.toHaveBeenCalled();
			expect(userSpy).not.toHaveBeenCalled();
			done();
		});

		it('should create the message when removing the user location fails', async (done : DoneFn) => {
			const username = 'TestUser';
			const userId = '12345';
			const message = { html: `<spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} <spark-mention data-object-type="person" data-object-id="${userId}">${username}</spark-mention>` };

			spyOn(pockyDb, 'countPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPenaltyPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPegsReceived').and.returnValue(Promise.resolve(0));
			const locationSpy = spyOn(dbLocation, 'deleteUserLocation').and.returnValue(Promise.reject('Failed deleting user location'));
			const userSpy = spyOn(dbUsers,'deleteUser').and.stub();

			let response = await removeUser.createMessage(message);
			expect(response.markdown).toBe(`Error removing user '${username}'`);
			expect(locationSpy).toHaveBeenCalledWith(userId);
			expect(userSpy).not.toHaveBeenCalled();
			done();
		});

		it('should create the message when removing the user fails', async (done : DoneFn) => {
			const username = 'TestUser';
			const userId = '12345';
			const message = { html: `<spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} <spark-mention data-object-type="person" data-object-id="${userId}">${username}</spark-mention>` };

			spyOn(pockyDb, 'countPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPenaltyPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPegsReceived').and.returnValue(Promise.resolve(0));
			const locationSpy = spyOn(dbLocation, 'deleteUserLocation').and.stub();
			const userSpy = spyOn(dbUsers,'deleteUser').and.returnValue(Promise.reject('Failed to delete user'));

			let response = await removeUser.createMessage(message);
			expect(response.markdown).toBe(`Error removing user '${username}'`);
			expect(locationSpy).toHaveBeenCalledWith(userId);
			expect(userSpy).toHaveBeenCalledWith(userId);
			done();
		});

		it('should create the message when the user has outstanding pegs', async (done : DoneFn) => {
			const username = 'TestUser';
			const userId = '12345';
			const message = { html: `<spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} <spark-mention data-object-type="person" data-object-id="${userId}">${username}</spark-mention>` };

			spyOn(pockyDb, 'countPegsGiven').and.returnValue(Promise.resolve(4));
			spyOn(pockyDb, 'countPenaltyPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPegsReceived').and.returnValue(Promise.resolve(0));
			const locationSpy = spyOn(dbLocation, 'deleteUserLocation').and.stub();
			const userSpy = spyOn(dbUsers,'deleteUser').and.stub();

			let response = await removeUser.createMessage(message);
			expect(response.markdown).toBe(`Cannot remove user '${username}', they still have outstanding pegs`);
			expect(locationSpy).not.toHaveBeenCalled();
			expect(userSpy).not.toHaveBeenCalled();
			done();
		});

		it('should create the message when the user has outstanding penalty pegs', async (done : DoneFn) => {
			const username = 'TestUser';
			const userId = '12345';
			const message = { html: `<spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} <spark-mention data-object-type="person" data-object-id="${userId}">${username}</spark-mention>` };

			spyOn(pockyDb, 'countPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPenaltyPegsGiven').and.returnValue(Promise.resolve(2));
			spyOn(pockyDb, 'countPegsReceived').and.returnValue(Promise.resolve(0));
			const locationSpy = spyOn(dbLocation, 'deleteUserLocation').and.stub();
			const userSpy = spyOn(dbUsers,'deleteUser').and.stub();

			let response = await removeUser.createMessage(message);
			expect(response.markdown).toBe(`Cannot remove user '${username}', they still have outstanding pegs`);
			expect(locationSpy).not.toHaveBeenCalled();
			expect(userSpy).not.toHaveBeenCalled();
			done();
		});

		it('should create the message when the user has outstanding pegs received', async (done : DoneFn) => {
			const username = 'TestUser';
			const userId = '12345';
			const message = { html: `<spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} <spark-mention data-object-type="person" data-object-id="${userId}">${username}</spark-mention>` };

			spyOn(pockyDb, 'countPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPenaltyPegsGiven').and.returnValue(Promise.resolve(0));
			spyOn(pockyDb, 'countPegsReceived').and.returnValue(Promise.resolve(2));
			const locationSpy = spyOn(dbLocation, 'deleteUserLocation').and.stub();
			const userSpy = spyOn(dbUsers,'deleteUser').and.stub();

			let response = await removeUser.createMessage(message);
			expect(response.markdown).toBe(`Cannot remove user '${username}', they still have outstanding pegs`);
			expect(locationSpy).not.toHaveBeenCalled();
			expect(userSpy).not.toHaveBeenCalled();
			done();
		});
	});

	describe('triggers', () => {
		it('should accept trigger', () => {
			let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser}`,
				'mockAdminID');
			let results = removeUser.isToTriggerOn(message);
			expect(results).toBe(true);
		});

		it('should reject wrong command', () => {
			let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> asdf${Command.RemoveUser}`,
				'mockAdminID');
			let results = removeUser.isToTriggerOn(message);
			expect(results).toBe(false);
		});

		it('should reject wrong id', () => {
			let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="wrongId">${constants.botName}</spark-mention> ${Command.RemoveUser}`,
				'mockAdminID');
			let results = removeUser.isToTriggerOn(message);
			expect(results).toBe(false);
		});

		it('should reject non admin', () => {
			let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser}`,
				'mockID');
			let results = removeUser.isToTriggerOn(message);
			expect(results).toBe(false);
		});

		it('should accept no space', () => {
			let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention>${Command.RemoveUser}`,
				'mockAdminID');
			let results = removeUser.isToTriggerOn(message);
			expect(results).toBe(true);
		});

		it('should accept trailing space', () => {
			let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} `,
				'mockAdminID');
			let results = removeUser.isToTriggerOn(message);
			expect(results).toBe(true);
		});

		it('should accept an additional parameter', () => {
			let message = createMessage(`<p><spark-mention data-object-type="person" data-object-id="${constants.botId}">${constants.botName}</spark-mention> ${Command.RemoveUser} get`,
				'mockAdminID');
			let results = removeUser.isToTriggerOn(message);
			expect(results).toBe(true);
		});


		it('should reject group mention', () => {
			let message = createMessage(`<p><spark-mention data-object-type="groupMention" data-group-type="all">All</spark-mention> stringconfig`, 'mockAdminID');
			let results = removeUser.isToTriggerOn(message)
			expect(results).toBe(false);
		});
	});
});
