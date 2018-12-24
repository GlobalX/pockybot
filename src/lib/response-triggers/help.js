const constants = require(__base + `constants`);

module.exports = class help {
	constructor(config) {
		this.config = config;

		this.commandText = 'help';
		this.helpCommand = `(?: )*${this.commandText}(?: )*`;
	}

	isToTriggerOn(message) {
		var pattern = new RegExp('^' + constants.optionalMarkdownOpening + constants.mentionMe + this.helpCommand, 'ui');
		return pattern.test(message.html);
	}

	isToTriggerOnPM(message) {
		return message.text.toLowerCase().trim() === this.commandText;
	}

	async createMessage() {
		let keywordsRequired = this.config.getConfig('requireValues');
		let message = `## What I can do

* Give a peg 🎁!
	1. To give someone a peg type: \`@${constants.botName} peg @bob {comment}\`.\n`;

		if (keywordsRequired) {
			message += "		* Note that your comment MUST include a keyword.\n"
		}

		message += `* Check your status 📈!
	1. To get a PM type: \`@${constants.botName} status\` OR direct message me with \`status\`.
	1. I will PM you number of pegs you have left and who you gave it to.
* Check the available keywords 🔑!
	1. To get a list of the available keywords, type: \`@${constants.botName} keywords\` OR direct message me with \`keywords\`.
	1. I will respond in the room you messaged me in with a list of keywords.
* Ping me 🏓!
	1. To check whether I'm alive, type: \`@${constants.botName} ping\` OR direct message me with \`ping\`.
	1. I will respond in the room you messaged me in if I am alive.
* Welcome someone 👐!
	1. To get a welcome message from me, type \`@${constants.botName} welcome\` OR direct message me with \`welcome\`.
	1. I will respond in the room you messaged me in.

I am still being worked on, so [more features to come : )] (${constants.todoUrl})`;

		return {
				markdown: message
		}
	}
}
