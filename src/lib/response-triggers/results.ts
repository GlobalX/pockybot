import Trigger from '../../models/trigger';
import constants from '../../constants';
import Config from '../config-interface';
import { Logger } from '../logger';
import { MessageObject } from 'webex/env';
import { Role } from '../../models/database';
import { ResultsService } from '../services/results-service';
import { Command } from '../../models/command';
import xmlMessageParser from '../parsers/xmlMessageParser';

export default class Results extends Trigger {
	private readonly cannotDisplayResults : string = 'Error encountered; cannot display results.';
	config : Config;
	resultsService: ResultsService;

	constructor(resultsService: ResultsService, config : Config) {
		super();

		this.resultsService = resultsService;
		this.config = config;
	}

	isToTriggerOn(message : MessageObject) : boolean {
		if (!(this.config.checkRole(message.personId, Role.Admin) || this.config.checkRole(message.personId, Role.Results))) {
			return false;
		}

		let parsedMessage = xmlMessageParser.parseNonPegMessage(message);
		return parsedMessage.botId === constants.botId && parsedMessage.command.toLowerCase() === Command.Results;
	}

	async createMessage() : Promise<MessageObject> {
		try {
			let response = await this.resultsService.returnResultsMarkdown();

			return {
				markdown: response
			};
		} catch (error) {
			Logger.error(`[Results.createMessage] Error obtaining results: ${error.message}`);
			throw new Error(this.cannotDisplayResults);
		}
	}
}
