const { Chat, Chat_Room } = require("../Models/Chat_Model");
const Agent = require("../Models/Agent_Model");

let onlineUsers = {};
let offlineUsers = {};
let count = 0;
exports.oakberry_chat = (io) => {
	io.on("connection", (Socket) => {
		let lastjoinedRoom = null;
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
			let status = "Delivered";
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
			lastjoinedRoom = roomId;

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
								[`currentUser.${userid}`]: new Date(), // Set the current time for the `userid`
							},
							$unset: {
								[`leftUser.${userid}`]: 1, // Delete the useractivity entry for the current user
							},
						},
						{ new: true }
					);

					// Emit updated userActivity to the room after removal of user
					const useractivity = await Chat_Room.findOne({ roomId });
					const messages = await Chat.find({ roomId }).sort({ Timestamp: 1 });

					// Extract user activity data
					const leftUser = useractivity?.leftUser || {};
					const currentUser = useractivity?.currentUser || {};

					// Add status to each message
					const messagesWithStatus = messages.map((message) => {
						// console.log(
						// 	currentUser[message.receiverId],
						// 	leftUser[message.receiverId],
						// 	message.Timestamp
						// );
						// If the receiver is in `currentUser` and the message timestamp is less than or equal to their activity time
						if (
							(currentUser[message.receiverId] &&
								message.Timestamp <= currentUser[message.receiverId]) ||
							(leftUser[message.receiverId] &&
								message.Timestamp <= leftUser[message.receiverId])
						) {
							status = "Seen";
						}
						else{
							status = "Delivered";
						}

						// Return the message with the status added
						return {
							...message.toObject(), // Convert Mongoose document to plain object
							status: status,
						};
					});
					io.to(roomId).emit("loadMessages", { messages: messagesWithStatus }); // Load existing messages
					console.log(io.to(roomId).emit("userActivityUpdated",{useractivity}))
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
			let status = "Delivered";
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
				let Timestamp = new Date();
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
					Timestamp,
				});
				await chatMessage.save();
				useractivity = await Chat_Room.findOne({ roomId });
				console.log(useractivity);
				const leftUser = useractivity?.leftUser || {};
				const currentUser = useractivity?.currentUser || {};
				console.log(currentUser[receiverid], leftUser[receiverid], Timestamp);
				if (
					(currentUser[receiverid] && Timestamp >= currentUser[receiverid]) ||
					(leftUser[receiverid] && Timestamp <= leftUser[receiverid])
				) {
					status = "Seen";
				}
				// Broadcast the message to the room
				io.to(roomId).emit("newMessage", {
					status,
					senderId: userid,
					message: data.message,
					Timestamp,
				});
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

			Socket.leave(lastjoinedRoom);
			console.log(`${Socket.id} left room: ${lastjoinedRoom}`);
			const room = await Chat_Room.findOneAndUpdate(
				{ roomId: lastjoinedRoom },
				{
					$unset: {
						[`currentUser.${userid}`]: 1, // Delete the useractivity entry for the current user
					},
					$set: {
						[`leftUser.${userid}`]: new Date(),
					},
				},
				{ new: true }
			);
		});

		// Handle user disconnect
		Socket.on("disconnect", async () => {
			if (userid) {
				// Remove the user from the online users list
				delete onlineUsers[userid];
				console.log(`${userid} disconnected`);
				console.log(onlineUsers);
				const room = await Chat_Room.findOneAndUpdate(
					{ roomId: lastjoinedRoom },
					{
						$unset: {
							[`currentUser.${userid}`]: 1, // Delete the useractivity entry for the current user
						},
						$set: {
							[`leftUser.${userid}`]: new Date(),
						},
					},
					{ new: true }
				);
				io.emit("userOnline", {
					userid: { socketId: Socket.id, online: false },
				});
			}
			console.log("User disconnected:", Socket.id);
		});
	});
};
