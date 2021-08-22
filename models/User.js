const mongoose=require('mongoose');
const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    isTutor : {type:Boolean,default:false} // Checks Whether User is Tutor or not
});

const User=mongoose.model("User",userSchema);
module.exports=User;