const mongoose = require("mongoose");

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGODB_URI);
		console.log("✅ MongoDB connected!");
	} catch (error) {
		console.error("❌ MongoDB error:", error.message);
	}
};

// Token Schema
const tokenSchema = new mongoose.Schema({
	portalId: { type: Number, required: true, unique: true },
	access_token: { type: String, required: true },
	refresh_token: { type: String, required: true },
	updatedAt: { type: Date, default: Date.now },
});

const Token = mongoose.model("Token", tokenSchema);

module.exports = { connectDB, Token };
