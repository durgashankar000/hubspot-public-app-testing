const express = require("express");
const router = express.Router();
const axios = require("axios");
const { sendDealNotification, sendDealDeleteNotification } = require("./slackNotifier");
const { getToken } = require("./oauthRouter");

router.post("/deals", async (req, res) => {
	try {
		const events = req.body;
		console.log("📩 Webhook aaya:", JSON.stringify(events, null, 2));

		for (const event of events) {

			// ── Deal Create ──
			if (event.subscriptionType === "object.creation") {
				const portalId = event.portalId;
				const objectId = event.objectId;

				const access_token = await getToken(portalId);

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

				console.log("✅ Deal create details:", deal);
				await sendDealNotification(deal);
			}

			// ── Deal Delete ──
			if (event.subscriptionType === "object.deletion") {
				const portalId = event.portalId;
				const objectId = event.objectId;

				// ✅ Delete ke baad API call nahi kar sakte
				const deal = {
					name: `Deal #${objectId}`,
					portalId: portalId,
				};

				console.log("🗑️ Deal delete hua:", deal);
				await sendDealDeleteNotification(deal);
			}
		}

		res.status(200).json({ received: true });

	} catch (error) {
		console.error("❌ Webhook error:", error.message);
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;