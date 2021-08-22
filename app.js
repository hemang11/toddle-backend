/*
Author -  Hemang Shrimali
College - DAIICT
ID - 201801025
VIRTUAL CLASSROOM
*/

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// database connection
mongoose.connect(process.env.DB_Url,{useNewUrlParser: true, useUnifiedTopology: true,useCreateIndex:true})
    .then(()=>{
        console.log('Connected to DB');
    })   
    .catch(e =>{
        console.log(`Database cannot be connected error : ${e}`);
})

//Middleware
app.use(express.json());
app.use(express.urlencoded({extended:false}));
// Routes
const authRoute = require('./routes/authRoute');
app.use('/api',authRoute);

// PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{
    console.log(`Server Started on Port ${PORT}`);
});