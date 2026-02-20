require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const https = require("https");

const oauthRouter = require("./oauthRouter");
const contactRounter = require("./contactsRouter");
const webhookRouter = require("./webhookRouter");
const { connectDB } = require('./db');

// connectDB();
const app = express();

app.use(express.json());

app.use(
	cors({
		origin: "*",
		credentials: true,
	}),
);
app.use("/oauth", oauthRouter);
app.use("/contacts", contactRounter);
app.use("/webhook", webhookRouter);


app.get("/", (req, res) => {
	res.json({ status: "ok", message: "Home response ok" });
});

app.get("/health", (req, res) => {
	res.json({ status: "ok", message: "Backend working fine" });
});

app.post('/test', (req, res) => {
  res.json({ received: true, body: req.body });
});



const keepAlive = () => {
	https
		.get(`https://hubspot-public-app-testing.onrender.com/`, (res) =>
			console.log(`✅ Keep alive: ${res.statusCode}`),
		)
		.on("error", (err) => console.log("Keep alive error:", err));
};

// Har 10 dakike me ping karo
setInterval(keepAlive, 10 * 60 * 1000);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log("Backend working fine");
});
