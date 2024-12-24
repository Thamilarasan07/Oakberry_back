const { Chat_Room } = require("../Models/Chat_Model");

const get_chat_user = async (req, res) => {
	try {
		const { userid } = req.params;
		const Rooms = await Chat_Room.find({ id: userid }).populate("id");
		const user = Rooms.filter((room) =>
			room.id.some((id) => id.toString() !== userid.toString())
		).map((room) => {
			const otherUser = room.id.find(
				(id) => id._id.toString() !== userid.toString()
			);
			return {
				userId: otherUser._id,
				name: otherUser.name,
				profile: otherUser.picture,
				onlineStatus:false,
				lastMessage: room.lastmessage, // Last message in the chat room
				updatedAt: room.updatedAt,
			};
		});
		res.status(200).json(user);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch users" });
	}
};
module.exports = get_chat_user;
