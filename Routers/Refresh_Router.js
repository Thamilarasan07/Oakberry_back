const express=require("express")
const {createaccesstoken}=require("../Controllers/Authentication")
const router=express.Router();

router.post("/refresh",createaccesstoken)

module.exports=router;