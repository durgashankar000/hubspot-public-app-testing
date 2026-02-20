const express = require("express");
const router = express.Router();
const axios = require("axios");
const { sendDealNotification } = require("./slackNotifier");
const { tokenStore } = require("./oauthRouter");

router.post("/deals", async (req, res) => {
	try {
		const events = req.body;
		console.log("📩 Webhook aaya:", JSON.stringify(events, null, 2));

		for (const event of events) {
			if (event.subscriptionType === "object.creation") {
				const portalId = event.portalId;
				const objectId = event.objectId;

				// TokenStore se token lo
				const tokens = tokenStore[portalId];
				if (!tokens) {
					console.log(`❌ Token nahi mila portal ${portalId} ke liye`);
					continue;
				}

				// HubSpot API se deal details fetch karo
				const dealResponse = await axios.get(
					`https://api.hubapi.com/crm/v3/objects/deals/${objectId}`,
					{
						headers: {
							Authorization: `Bearer ${tokens.access_token}`,
						},
						params: {
							properties: "dealname,amount,dealstage",
						},
					},
				);

				const props = dealResponse.data.properties;

				const deal = {
					id: objectId,
					name: props.dealname || "Naya Deal",
					amount: props.amount || "N/A",
					stage: props.dealstage || "N/A",
					portalId: portalId,
				};

				console.log("✅ Deal details:", deal);

				// Slack me bhejo
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
