import Trigger from '../../models/trigger';
import Config from '../config-interface';
import { DbUsers, DbLocation, PockyDB } from '../database/db-interfaces';
import { MessageObject } from 'webex/env';
import { Role, UserRow } from '../../models/database';
import { Command } from '../../models/command';
import constants from '../../constants';
import xmlMessageParser from '../parsers/xmlMessageParser';
import { Logger } from '../logger';

export default class RemoveUser extends Trigger {
	private config : Config;
	private dbUsers : DbUsers;
	private dbLocation : DbLocation;
	private pockyDb : PockyDB;

	constructor(config : Config, dbUsers : DbUsers, dbLocation : DbLocation, pockyDb: PockyDB) {
		super();

		this.config = config;
		this.dbUsers = dbUsers;
		this.dbLocation = dbLocation;
		this.pockyDb = pockyDb;
	}

	isToTriggerOn(message : MessageObject) : boolean {
		if (!(this.config.checkRole(message.personId, Role.Admin) || this.config.checkRole(message.personId, Role.RemoveUser))) {
			return false;
		}

		let parsedMessage = xmlMessageParser.parseNonPegMessage(message);
		return parsedMessage.botId === constants.botId && parsedMessage.command.toLowerCase().startsWith(Command.RemoveUser);
	}

	async createMessage(message : MessageObject) : Promise<MessageObject> {
		let parsedMessage = xmlMessageParser.parseXmlMessage(message);
		if (parsedMessage.length === 3) {
			if (parsedMessage[1].text().trim().toLowerCase() !== Command.RemoveUser
				|| parsedMessage[2].name() !== 'spark-mention' || parsedMessage[2].attr('data-object-type').value() !== 'person') {
				return {
					markdown: 'Please mention or provide the name of the person you want to remove'
				};
			}

			let personId = xmlMessageParser.getPersonId(parsedMessage[2].attr('data-object-id').value());
			const response = await this.removeUser(personId, parsedMessage[2].text());
			return { markdown: response };
		}

		if (parsedMessage.length < 2) {
			return { markdown: 'Please mention or provide the name of the person you want to remove' };
		}

		const pattern = new RegExp(`^${Command.RemoveUser}`, 'ui');
		const name = parsedMessage[1].text().trim().replace(pattern, '').trim();

		if (name === '') {
			return { markdown: 'Please mention or provide the name of the person you want to remove' };
		}

		let users : UserRow[];
		try {
			users = await this.dbUsers.getUsers();
		} catch(error) {
			Logger.error(`[Remove.createMessage] Error getting users: ${error.message}`);
			return { markdown: 'Error getting users' };
		}

		const user = users.find(x => x.username.toLowerCase() === name.toLowerCase());

		if (!user) {
			return { markdown: `Could not find user with display name '${name}'` };
		}

		const response = await this.removeUser(user.userid, name);
		return { markdown: response };
	}

	private async removeUser(userId : string, username : string) : Promise<string> {
		const keywords = this.config.getStringConfig('keyword');
		const penaltyKeywords = this.config.getStringConfig('penaltyKeyword');

		const pegsGiven = await this.pockyDb.countPegsGiven(userId, keywords, penaltyKeywords);
		const penaltyPegsGiven = await this.pockyDb.countPenaltyPegsGiven(userId, keywords, penaltyKeywords);
		const pegsReceived = await this.pockyDb.countPegsReceived(userId);

		if (pegsGiven > 0 || penaltyPegsGiven > 0 || pegsReceived > 0) {
			return `Cannot remove user '${username}', they still have outstanding pegs`
		}

		try {
			await this.dbLocation.deleteUserLocation(userId);
			await this.dbUsers.deleteUser(userId);

			return `User '${username}' has been removed`;
		} catch(error) {
			Logger.error(`[Remove.removeUser] Error deleting user ${username}: ${error.message}`);
			return `Error removing user '${username}'`;
		}
	}
}
