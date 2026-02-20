const express = require("express");
const router = express.Router();
const { sendDealNotification } = require("./slackNotifier");

router.post("/deals", async (req, res) => {
	try {
		const events = req.body;
		console.log("📩 Webhook aaya:", JSON.stringify(events, null, 2));

		for (const event of events) {
			if (event.subscriptionType === "object.creation") {
				const deal = {
					id: event.objectId,
					name: event.properties?.dealname || "Naya Deal",
					amount: event.properties?.amount || "N/A",
					stage: event.properties?.dealstage || "N/A",
					portalId: event.portalId, // ← portalId hai accountId nahi
				};

				await sendDealNotification(deal);
			}
		}

		res.status(200).json({ received: true });
	} catch (error) {
		console.error("❌ Webhook error:", error.message);
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;
