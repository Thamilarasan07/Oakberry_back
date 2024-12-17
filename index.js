const express = require("express");
const cors = require("cors");
const { ConnectDB, PORT } = require("./config/index");
const UserRouter = require("./Routers/Agent_Router");
const PropertyRouter = require("./Routers/Property_Router");
const RefreshRouter = require("./Routers/Refresh_Router");
const ChatRouter=require("./Routers/Chat_Router")
const path = require("path");
const http=require("http")
const {Server}=require("socket.io");
const {oakberry_chat}=require("./Socket/Socket")

const app = express();
const server=http.createServer(app)
const io= new Server(server,{
	cors:{
		origin:"*",
		methods:["GET","POST"]
	}
})
oakberry_chat(io)
// Middleware to parse JSON data
app.use(express.json());

// Middleware for CORS to allow cross-origin requests
app.use(cors());

// Middleware to serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "Uploads")));

// Routes
app.use("/api/auth", UserRouter); // User-related routes
app.use("/api", PropertyRouter); // Property-related routes
app.use("/api/token", RefreshRouter);
app.use("/api/chat",ChatRouter);

// Connect to the Database
ConnectDB();

// Start the server
server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
	console.log("Server timezone offset (in minutes):", new Date().getTimezoneOffset());
})