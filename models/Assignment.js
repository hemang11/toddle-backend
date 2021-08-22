const mongoose=require('mongoose');
const AssignmentSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    createdBy:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true,
    },
    students:[
        {
            username:String,
            status:String,
            remark:String
        }
    ],
    published:{
        type:Date
    },
    deadline:{
        type:Date
    }
});

const Assignment=mongoose.model("Assignment",AssignmentSchema);
module.exports=Assignment;