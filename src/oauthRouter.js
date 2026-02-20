require("dotenv").config();
const express = require("express");
const axios = require("axios");
const router = express.Router();

const { HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, HUBSPOT_REDIRECT_URI } =
	process.env;

const tokenStore = {};

router.get("/install", (req, res) => {
	const scops = [
		"oauth",
		"crm.objects.contacts.read",
		"crm.objects.contacts.write",
	].join(" ");

	const authUrl =
		`https://app.hubspot.com/oauth/authorize` +
		`?client_id=${HUBSPOT_CLIENT_ID}` +
		`&redirect_uri=${encodeURIComponent(HUBSPOT_REDIRECT_URI)}` +
		`&scope=${encodeURIComponent(scopes)}`;

	console.log("🔗 Redirect ho raha hai:", authUrl);
	res.redirect(authUrl);
});

router.get("/callback", async (req, res) => {
	const { code } = req.query;

	if (!code) {
		return res.status(400).json({ error: "Code nahi mila" });
	}

	try {
		const tokenResponse = await axios.post(
			"https://api.hubapi.com/oauth/v1/token",
			new URLSearchParams({
				grant_type: "authorization_code",
				client_id: process.env.HUBSPOT_CLIENT_ID,
				client_secret: process.env.HUBSPOT_CLIENT_SECRET,
				redirect_uri: process.env.HUBSPOT_REDIRECT_URI,
				code: code,
			}),
			{
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
			},
		);

		const { access_token, refresh_token } = tokenResponse.data;

		// Session check karo pehle
		if (req.session) {
			req.session.accessToken = access_token;
			req.session.refreshToken = refresh_token;
		}

		// Account info lo
		const accountInfo = await axios.get(
			`https://api.hubapi.com/oauth/v1/access-tokens/${access_token}`,
		);
		const accountId = accountInfo.data.hub_id;

		// Token store me save karo
		tokenStore[accountId] = { access_token, refresh_token };

		console.log(`✅ Account ${accountId} connected!`);

		res.send(`
      <h2>✅ HubSpot Connected!</h2>
      <p>Account ID: ${accountId}</p>
      <p>Ab tum HubSpot me wapas ja sakte ho</p>
    `);
	} catch (error) {
		console.error("❌ Token error:", error.response?.data || error.message);
		res.status(500).json({ error: "Token exchange fail hua" });
	}
});
const refreshAccessToken = async (accountId) => {
	const tokens = tokenStore[accountId];

	if (tokens) throw new Error("Account not found");

	const response = await axios.post(
		"https://api.hubapi.com/oauth/v1/token",
		new URLSearchParams({
			grant_type: "authorization_code",
			client_id: HUBSPOT_CLIENT_ID,
			client_secret: HUBSPOT_CLIENT_SECRET,
			redirect_uri: HUBSPOT_REDIRECT_URI,
			code: code,
		}),
		{
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
		},
	);

	tokenStore[accountId].access_token = response.data.access_token;

	return response.data.access_token;
};

module.exports = router;
module.exports.tokenStore = tokenStore;
module.exports.refreshAccessToken = refreshAccessToken;
