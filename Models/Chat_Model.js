const mongoose = require("mongoose");

const Chat_Schema = new mongoose.Schema({
	roomId: String,
	senderId: String,
	receiverId: String,
	message: String,
	Timestamp: { type: Date, default: Date.now },
});
const Chat_Room_Schema = new mongoose.Schema(
	{
		roomId: { type: String, unique: true, required: true },
		id: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Agent" },
			{ type: mongoose.Schema.Types.ObjectId, ref: "Agent" },
		],
		lastmessage: { type: String },
		currentUser: {
			type: Map,
			of: Date, // Each key will be a `userid`, and the value will be the timestamp
		},
		leftUser:{
			type: Map,
			of: Date, // Each key will be a `userid`, and the value will be the timestamp
		}
	},
	{ timestamps: true }
);

const Chat_Room = mongoose.model("chat_Room", Chat_Room_Schema);
const Chat = mongoose.model("chat", Chat_Schema);
module.exports = { Chat, Chat_Room };
