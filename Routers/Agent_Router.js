const express = require("express");
const router = express.Router();
const Agent_Controller = require("../Controllers/Agent_Controller");
const AgentController = new Agent_Controller();
const authenticateToken = require("../Middleware/Authenticatetoken");

router.post("/add_user", AgentController.add_user);
router.post("/login", AgentController.Login);
router.post("/checkusername", AgentController.checkusername);
router.get("/getagent", authenticateToken, AgentController.get_agent);
module.exports = router;
