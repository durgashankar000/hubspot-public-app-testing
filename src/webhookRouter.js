const express = require("express");
const router = express.Router();
const axios = require("axios");
const { sendDealNotification } = require("./slackNotifier");
const { getToken } = require("./oauthRouter");

router.post("/deals", async (req, res) => {
	try {
		const events = req.body;
		console.log("📩 Webhook aaya:", JSON.stringify(events, null, 2));

		for (const event of events) {
			if (event.subscriptionType === "object.creation") {
				const portalId = event.portalId;
				const objectId = event.objectId;

				// DB se token lo
				const access_token = await getToken(portalId);

				// Deal details fetch karo
				const dealResponse = await axios.get(
					`https://api.hubapi.com/crm/v3/objects/deals/${objectId}`,
					{
						headers: { Authorization: `Bearer ${access_token}` },
						params: { properties: "dealname,amount,dealstage" },
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
