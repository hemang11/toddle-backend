const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// authenticating the routes
module.exports =  function authenticateToken(req,res,next){
    const header = req.headers['authorization']
    const token = header && header.split(' ')[1]; // Bearer token
    if(token == null)return res.json({status:'ACCESS DENIED'}); // No token not authorized
    jwt.verify(token,process.env.SECRET_KEY,(err,user)=>{
        if(err)return res.json({status:"ACCESS DENIED"});  // Token not matching
        req.user = user
        next();
    })
}
