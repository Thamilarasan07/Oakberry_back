const {Chat,Chat_Room} = require("../Models/Chat_Model");

exports.oakberry_chat = (io) => {
	io.on("connection", (Socket) => {
		// Extract user and receiver IDs from the query string
		const { userid, receiverid } = Socket.handshake.query;
		// console.log("Connected with socket ID:", Socket.id);

		// When the user joins a room
		Socket.on("joinRoom", async () => {
			try {
				if (!userid || !receiverid) {
					console.error("Invalid user or receiver ID");
					return;
				}
		
				const roomId = userid < receiverid
					? `${userid}_${receiverid}`
					: `${receiverid}_${userid}`;
		
				console.log("Room ID:", roomId);
		
				const roomExist = await Chat_Room.exists({ roomId });
				Socket.join(roomId);
		
				if (roomExist) {
					const messages = await Chat.find({ roomId }).sort({ Timestamp: 1 });
					Socket.emit("loadMessages", messages);
				} else {
					const Rooms = new Chat_Room({
						roomId,
						id: [userid, receiverid],
					});
					await Rooms.save();
				}
		
				console.log(`${Socket.id} joined room: ${roomId}`);
			} catch (error) {
				console.error("Error handling joinRoom:", error);
			}
		});

		// When a user sends a new message
		Socket.on("message", async (data) => {
			const roomId =
				userid < receiverid
					? `${userid}_${receiverid}`
					: `${receiverid}_${userid}`; // Ensure correct room ID is used
				console.log(data,userid)
			const lastmessage=await Chat_Room.findOne({roomId}).updateOne({lastmessage:data})
			console.log(lastmessage)
			// Save the message in the database
			const chatMessage = new Chat({
				roomId,
				senderId: userid,
				receiverId: receiverid,
				message: data,
				Timestamp: new Date(), // Add the timestamp for the message
			});
			await chatMessage.save(); // Save the new message to the database

			// Broadcast the new message to the room
			io.to(roomId).emit("newMessage", {
				senderId: userid,
				message: data,
				timestamp: new Date(), // Send the timestamp to the client
			});
		});

		// Handle user disconnecting
		Socket.on("disconnect", () => {
			console.log("User disconnected:", Socket.id);
		});
	});
};
