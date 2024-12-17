const get_chat_user=require("../Controllers/Chat_Controller")
const express = require("express");
const router = express.Router();

router.get("/user/:userid",get_chat_user)
module.exports=router