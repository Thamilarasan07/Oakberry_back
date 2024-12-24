const { Chat, Chat_Room } = require("../Models/Chat_Model");
const Agent = require("../Models/Agent_Model");

let onlineUsers = {};
let offlineUsers = {};
let count = 0;
exports.oakberry_chat = (io) => {
	io.on("connection", (Socket) => {
		count = count + 1;
		console.log(count);
		const { userid, receiverId } = Socket.handshake.query;
		if (userid) {
			onlineUsers[userid] = { socketId: Socket.id, online: true };
			console.log(onlineUsers);
			io.emit("userOnline", onlineUsers);
		}
		if (userid) {
			// Define an asynchronous function
			const fetchUserRooms = async () => {
				try {
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
							onlineStatus: onlineUsers[otherUser._id] ? true : false,
							lastMessage: room.lastmessage, // Last message in the chat room
							updatedAt: room.updatedAt,
						};
					});
					// Emit the existing contacts to the client
					Socket.emit("existcontact", user);
				} catch (error) {
					console.error("Error fetching user rooms:", error);
				}
			};
			// Call the function
			fetchUserRooms();
		}

		// Handle joining a room
		Socket.on("joinRoom", async (receiverid) => {
			console.log(receiverid);
			receiverid ?? receiverId;
			if (!userid || !receiverid) {
				console.error("Invalid user or receiver ID");
				return;
			}

			if (userid === receiverid) {
				console.error("User cannot chat with themselves.");
				return;
			}

			const roomId =
				userid < receiverid
					? `${userid}_${receiverid}`
					: `${receiverid}_${userid}`;

			console.log("Room ID:", roomId);

			try {
				const roomExist = await Chat_Room.exists({ roomId });
				Socket.join(roomId); // Join the room

				if (roomExist) {
					// Update the userActivity field for the given roomId
					const room = await Chat_Room.findOneAndUpdate(
						{ roomId },
						{
							$set: {
								[`CurrentUser.${userid}`]: new Date(), // Set the current time for the `userid`
							},
							$unset: {
								[`leftUser.${userid}`]: 1, // Delete the useractivity entry for the current user
							},
						},
						{ new: true }
					);

					// Emit updated userActivity to the room after removal of user
					io.to(roomId).emit("userActivityUpdated", room.userActivity);
					useractivity = await Chat_Room.findOne({ roomId });
					const messages = await Chat.find({ roomId }).sort({ Timestamp: 1 });
					const leftUser = useractivity?.leftUser || {};
					const currentUser = useractivity?.currentUser || {};
					const activeChat = leftUser[roomId]; // You can adapt the condition to your needs

					// Add status to each message
					const messagesWithStatus = messages.map((message) => {
						let status = "delivered"; // Default status

						if (activeChat && message.timestamp < activeChat) {
							status = "seen"; // Message is seen if the timestamp is before the activeChat time
						}

						if (
							currentUser &&
							message.timestamp < currentUser[message.senderId]
						) {
							status = "seen"; // Same for currentUser's activity
						}

						// Add the status to the message object
						return {
							...message.toObject(),
							status: status,
						};
					});
					Socket.emit("loadMessages",{messages:messagesWithStatus}); // Load existing messages
				} else {
					const newRoom = new Chat_Room({
						roomId,
						id: [userid, receiverid],
					});
					await newRoom.save(); // Create a new room
				}

				console.log(`${Socket.id} joined room: ${roomId}`);
			} catch (error) {
				console.error("Error handling joinRoom:", error);
			}
		});

		// Handle sending a message
		Socket.on("message", async (data) => {
			let receiverid = data.activeChat;
			console.log(userid, receiverid);
			if (!userid || !receiverid) {
				console.error("Invalid message payload");
				return;
			}

			const roomId =
				userid < receiverid
					? `${userid}_${receiverid}`
					: `${receiverid}_${userid}`;

			console.log(`Message from ${userid} to room ${roomId}:`, data.message);

			try {
				// Update last message in room
				await Chat_Room.findOneAndUpdate(
					{ roomId },
					{ lastmessage: data.message, updatedAt: new Date() }
				);

				// Save the message in the database
				const chatMessage = new Chat({
					roomId,
					senderId: userid,
					receiverId: receiverid,
					message: data.message,
					Timestamp: new Date(),
				});
				await chatMessage.save();
				useractivity = await Chat_Room.findOne({ roomId });
				console.log(useractivity);
				// Broadcast the message to the room
				console.log(
					io.to(roomId).emit("newMessage", {
						// currentUser: useractivity.currentUser,
						// leftUser: useractivity.leftUser,
						senderId: userid,
						message: data.message,
						timestamp: new Date(),
					})
				);
			} catch (error) {
				console.error("Error handling message event:", error);
			}
		});

		// Handle leaving a room
		Socket.on("leaveRoom", async (receiverid) => {
			if (!receiverid) {
				console.error("Invalid receiver ID");
				return;
			}

			const roomId =
				userid < receiverid
					? `${userid}_${receiverid}`
					: `${receiverid}_${userid}`;

			Socket.leave(roomId);
			console.log(`${Socket.id} left room: ${roomId}`);
			const room = await Chat_Room.findOneAndUpdate(
				{ roomId },
				{
					$unset: {
						[`CurrentUser.${userid}`]: 1, // Delete the useractivity entry for the current user
					},
					$set: {
						[`leftUser.${userid}`]: new Date(),
					},
				},
				{ new: true }
			);
		});

		// Handle user disconnect
		Socket.on("disconnect", () => {
			if (userid) {
				// Remove the user from the online users list
				delete onlineUsers[userid];
				console.log(`${userid} disconnected`);
				console.log(onlineUsers);
				io.emit("userOnline", {
					userid: { socketId: Socket.id, online: false },
				});
			}
			console.log("User disconnected:", Socket.id);
		});
	});
};
