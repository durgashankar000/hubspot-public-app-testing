const express = require("express");
const axios = require("axios");
const router = express.Router();

const { tokenStore, refreshAccessToken } = require("./oauthRouter");

// ── Helper: Token lo account ke liye ──
const getToken = (accountId) => {
	const tokens = tokenStore[accountId];
	if (!tokens) throw new Error(`Account ${accountId} ka token nahi mila`);
	return tokens.access_token;
};

// ── GET /contacts — Contacts list karo ──
router.get("/", async (req, res) => {
	const accountId = req.query.accountId || req.session?.accountId;

	if (!accountId) {
		return res.status(401).json({ error: "accountId chahiye" });
	}

	try {
		let token = getToken(accountId);

		const response = await axios.get(
			"https://api.hubapi.com/crm/v3/objects/contacts",
			{
				headers: { Authorization: `Bearer ${token}` },
				params: {
					limit: 10,
					properties: "firstname,lastname,email,phone",
				},
			},
		);

		const contacts = response.data.results.map((c) => ({
			id: c.id,
			name: `${c.properties.firstname || ""} ${c.properties.lastname || ""}`.trim(),
			email: c.properties.email || "",
			phone: c.properties.phone || "",
		}));

		res.json({ contacts });
	} catch (error) {
		// Token expire hua? Refresh karo
		if (error.response?.status === 401) {
			try {
				await refreshAccessToken(accountId);
				return res.json({ message: "Token refresh hua, dobara try karo" });
			} catch (refreshError) {
				return res.status(401).json({ error: "Re-authenticate karo" });
			}
		}
		console.error("❌ Contacts error:", error.response?.data || error.message);
		res.status(500).json({ error: "Contacts fetch nahi hue" });
	}
});

// ── POST /contacts — Naya contact banao ──
router.post("/", async (req, res) => {
	const { accountId, firstname, lastname, email, phone } = req.body;

	if (!accountId) {
		return res.status(401).json({ error: "accountId chahiye" });
	}

	try {
		const token = getToken(accountId);

		const response = await axios.post(
			"https://api.hubapi.com/crm/v3/objects/contacts",
			{
				properties: { firstname, lastname, email, phone },
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			},
		);

		res.json({ success: true, contact: response.data });
	} catch (error) {
		console.error(
			"❌ Create contact error:",
			error.response?.data || error.message,
		);
		res.status(500).json({ error: "Contact create nahi hua" });
	}
});

module.exports = router;
