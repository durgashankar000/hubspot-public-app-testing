require("dotenv").config();
const express = require("express");
const axios = require("axios");
const router = express.Router();
const { Token } = require("./db");

const { HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, HUBSPOT_REDIRECT_URI } =
	process.env;

// ── Memory cache bhi rakho (fast access ke liye) ──
const tokenStore = {};

// ── Step 1: Install route ──
router.get("/install", (req, res) => {
	const scopes = [
		"oauth",
		"crm.objects.contacts.read",
		"crm.objects.contacts.write",
		"crm.objects.deals.read",
	].join(" ");

	const authUrl =
		`https://app.hubspot.com/oauth/authorize` +
		`?client_id=${HUBSPOT_CLIENT_ID}` +
		`&redirect_uri=${encodeURIComponent(HUBSPOT_REDIRECT_URI)}` +
		`&scope=${encodeURIComponent(scopes)}`;

	res.redirect(authUrl);
});

// ── Step 2: Callback ──
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
				client_id: HUBSPOT_CLIENT_ID,
				client_secret: HUBSPOT_CLIENT_SECRET,
				redirect_uri: HUBSPOT_REDIRECT_URI,
				code: code,
			}),
			{ headers: { "Content-Type": "application/x-www-form-urlencoded" } },
		);

		const { access_token, refresh_token } = tokenResponse.data;

		// Account info lo
		const accountInfo = await axios.get(
			`https://api.hubapi.com/oauth/v1/access-tokens/${access_token}`,
		);
		const portalId = accountInfo.data.hub_id;

		// MongoDB me save karo
		await Token.findOneAndUpdate(
			{ portalId },
			{ access_token, refresh_token, updatedAt: Date.now() },
			{ upsert: true, new: true },
		);

		// Memory cache me bhi save karo
		tokenStore[portalId] = { access_token, refresh_token };

		console.log(`✅ Account ${portalId} connected!`);

		res.send(`
      <h2>✅ HubSpot Connected!</h2>
      <p>Portal ID: ${portalId}</p>
      <p>Ab tum HubSpot me wapas ja sakte ho</p>
    `);
	} catch (error) {
		console.error("❌ Token error:", error.response?.data || error.message);
		res.status(500).json({ error: "Token exchange fail hua" });
	}
});

// ── Token lo (DB se) ──
const getToken = async (portalId) => {
	// Pehle memory cache check karo
	if (tokenStore[portalId]) {
		return tokenStore[portalId].access_token;
	}

	// DB se lo
	const token = await Token.findOne({ portalId });
	if (!token) throw new Error(`Portal ${portalId} ka token nahi mila`);

	// Cache me bhi save karo
	tokenStore[portalId] = {
		access_token: token.access_token,
		refresh_token: token.refresh_token,
	};

	return token.access_token;
};

// ── Token refresh ──
const refreshAccessToken = async (portalId) => {
	const token = await Token.findOne({ portalId });
	if (!token) throw new Error("Portal not found");

	const response = await axios.post(
		"https://api.hubapi.com/oauth/v1/token",
		new URLSearchParams({
			grant_type: "refresh_token",
			client_id: HUBSPOT_CLIENT_ID,
			client_secret: HUBSPOT_CLIENT_SECRET,
			refresh_token: token.refresh_token,
		}),
		{ headers: { "Content-Type": "application/x-www-form-urlencoded" } },
	);

	// DB update karo
	await Token.findOneAndUpdate(
		{ portalId },
		{ access_token: response.data.access_token, updatedAt: Date.now() },
	);

	// Cache update karo
	tokenStore[portalId].access_token = response.data.access_token;

	return response.data.access_token;
};

module.exports = router;
module.exports.tokenStore = tokenStore;
module.exports.getToken = getToken;
module.exports.refreshAccessToken = refreshAccessToken;
