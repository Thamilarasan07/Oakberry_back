const jwt = require("jsonwebtoken");
const {JWT_SECRET,JWT_REFRESH_KEY}=require("../config/index")

async function createaccesstoken(req,res){
    const {token}=req.body;
    if(!token){
        return res.status(401).send("Token not provided")
    }
    jwt.verify(token,JWT_REFRESH_KEY,(err,user)=>{
        if(err){
            return res.status(403).send("Token is not valid")
        }
        const accesstoken=jwt.sign({id:user.id},JWT_SECRET,{
            expiresIn:"5h",
        })
        
        return res.json({token:accesstoken})
    })
};
module.exports={createaccesstoken}