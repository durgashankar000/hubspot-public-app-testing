const { IncomingWebhook } = require("@slack/webhook");

const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

const sendDealNotification = async (deal) => {
	try {
		await webhook.send({
			blocks: [
				{
					type: "header",
					text: {
						type: "plain_text",
						text: "🎉 Naya Deal Create Hua!",
					},
				},
				{
					type: "section",
					fields: [
						{
							type: "mrkdwn",
							text: `*Deal Name:*\n${deal.name}`,
						},
						{
							type: "mrkdwn",
							text: `*Amount:*\n$${deal.amount}`,
						},
						{
							type: "mrkdwn",
							text: `*Stage:*\n${deal.stage}`,
						},
						{
							type: "mrkdwn",
							text: `*Portal ID:*\n${deal.portalId}`, // ← portalId
						},
					],
				},
			],
		});

		console.log("✅ Slack notification send hui!");
	} catch (error) {
		console.error("❌ Slack error:", error.message);
	}
};

const sendDealDeleteNotification = async (deal) => {

	try {
		await webhook.send({
			blocks:[
				{
					type: "header",
					text:{
						type: "plain_text",
						text: `⚠️ ${deal.name} Deal Delete Hua! `
					}
				}
			]
		})
		console.log("✅ Slack delete notification send hui!");
	} catch (error) {
		console.error("❌ Slack delete error:", error.message);	
	}	

}

module.exports = { sendDealNotification, sendDealDeleteNotification };
