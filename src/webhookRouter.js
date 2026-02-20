const express = require("express");
const router = express.Router();

const { sendDealNotification } = require("./slackNotifier");

router.post("/deals", async (req, res) => {
	try {
		const events = req.body;

		console.log("📩 Webhook event aaya:", events);

		for (const event of events) {
			if (event.subscriptionType === "deal.creation") {
				const deal = {
					id: event.objectId,
					name: event.propertyValue || "Naya Deal",
					amount: event.properties?.amount || "N/A",
					stage: event.properties?.dealstage || "N/A",
					accountId: event.portalId,
				};
				sendDealNotification(deal);
			}
		}
		res.status(200).json({ received: true });
	} catch (error) {
		console.error("❌ Webhook error:", error.message);
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;