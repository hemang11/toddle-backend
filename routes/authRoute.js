const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const authenticateToken = require('../middleware/index');
const dotenv = require('dotenv');
dotenv.config();

// THESE ARE THE TUTORS ( HARDCODED )
const tutors = ["Hemang","Karan"];


/* Which user is Logged in */
router.get('/',authenticateToken,(req,res)=>{
    res.json(`Welcome to Virtual Classroom : ${req.user.username}`);
})

// 1. User Registration
router.post('/register',async (req,res)=>{
    // username should be unique
    const {username,password} = req.body;
    // check if user with the given username exists
    const userExists = await User.findOne({username:username},(err,user)=>{
        if(err)res.status(400);
    });
    if(userExists) return res.status(400).send('Username already exists');
    try{
        const hash = await bcrypt.hash(password,10);
        const newUser = new User({username:username,password:hash});
        isTutor = false;
        // if the given user is tutor or not
        tutors.find(tutor => {
            if(tutor === username){
                isTutor = true;
                return;
            }
        })
        newUser.isTutor = isTutor;
        const savedUser = await newUser.save();
        res.json(savedUser);

    }catch{
        return res.json({status:'error'});
    }
})

// 2. User Login
router.post('/login',async(req,res)=>{
    const {username,password} = req.body;
    // username is already unique
    const userExists = await User.findOne({username:username},(err,user)=>{
        if(err)res.status(400);
    });

    if(!userExists) return res.status(401).send('No User Found');
    else if(await bcrypt.compare(password,userExists.password)){
        // the token is public so cannot use hashed password
        const token = jwt.sign({
            username : username,
            isTutor : userExists.isTutor
            },process.env.SECRET_KEY
        )
        res.json({token : token});
    }
    else res.status(401).send('Incorrect Username or Password');
});

// 3. Create Assignment ( Only For Tutors )
router.post('/assign',authenticateToken,async(req,res)=>{
    // req.user contains the information about the user logged in
    // check if the given logged in User is Tutor or not by req.user.isTutor
    if(req.user.isTutor === false)
        return res.status(403).send('ACCESS DENIED');

    const {title,description,students,published,deadline} = req.body;
    const newAssign = {title:title,createdBy:req.user.username,description:description,students:students,published:published,deadline:deadline}

    Assignment.create(newAssign,(err,assign)=>{
        if(err){
            res.status(400).send(`error: ${err}`);
        }else{
            console.log('Assingment Added');
            res.status(200).send(assign)
        }
    })
})

// 4. Update Assignment ( Only For Tutors )
router.put('/assign/:id',authenticateToken,async(req,res)=>{

    // check if given tutor has access to the assignment or not
    if(req.user.isTutor === true){
        const check = await Assignment.findOne({_id:req.params.id},(err,user)=>{
            if(err)return res.status(400).send(err);
        })
        // if the author has created the assignment then update it
        if(!check)return res.status(400).send('Error');
        else if(check.createdBy !== req.user.username){
            return res.status(403).send('ACCESS DENIED');
        }
        else {
            const {title,description,students,published,deadline} = req.body;
            const obj = {title:title,createdBy:req.user.username,description:description,students:students,
            published:published,deadline:deadline}    
            const updated = check && await Assignment.findByIdAndUpdate(req.params.id,obj,(err,updated)=>{
                if(err)return res.status(400).send(err);
                return res.json(obj);
            })
        }
    }
})


// 5. Delete Assignment (Only For Tutors)
router.delete('/assign/:id',authenticateToken,async(req,res)=>{
    if(req.user.isTutor === false)return res.status(403).send('ACCESS DENIED');
    else{
        const check = await Assignment.findOne({_id:req.params.id},(err,user)=>{
            if(err)return res.status(400).send(err);
        })
        if(check.createdBy !== req.user.username)return res.status(403).send('ACCEDD DENIED');
        else{
            const assign = await Assignment.findOneAndDelete(req.params.id,err =>{
                if(err)res.status(400).send(err);
                res.json('Deleted the Assignment');
            })
        }
    }
})

// 6. Adding Submission for an Assignment (For student)
router.post('/assign/submit/:id',authenticateToken,async(req,res)=>{
    if(req.user.isTutor === true)return res.status(403).send('ACCESS DENIED');
    else{
        let isUser = false;
        const submitAssign = await Assignment.findById(req.params.id,(err,assign)=>{
            assign.students.forEach(async elem => {
                if(elem.username === req.user.username){
                    isUser = true;
                    if(elem.status === 'SUBMITTED')return res.status(200).send('Assignment already submitted');
                    else{
                        elem.status = 'SUBMITTED';
                        if(Date.parse(assign.deadline)<Date.now())elem.remark = 'Assignment was Submitted late';
                        else elem.remark = 'Submitted for Grading';
                        const update = await Assignment.findByIdAndUpdate(req.params.id,assign,(err,update)=>{
                            if(err)return res.status(400).send(err);
                            return res.json(assign);
                        });
                    }
                }
            })
            if(!isUser)
                res.status(403).send('ACCESS DENIED');
        }); 
    }

});

// 7. Get Details of Assignment (Both Tutor and Student )
router.get('/assign',authenticateToken,async (req,res)=>{
    if(req.user.isTutor===true){
        let assignment = [];
        const Assign = await Assignment.find({},(err,assign)=>{
            if(err)res.status(400).send(err);
            for(let i=0;i<assign.length;i++){
                if(assign[i].createdBy === req.user.username){
                    let students = [];
                    let count = 0;
                    // Adding only those students those who have Submitted the assignment
                    for(let v = 0;v<assign[i].students.length;v++){
                        if(assign[i].students[v].status === 'SUBMITTED'){
                            count++;
                            students.push(assign[i].students[v]);
                        }
                    }
                    assign[i].students = [];
                    students.forEach(elem => assign[i].students.push(elem));
                    if(count!=0)
                        assignment.push(assign[i]);
                }
            }
        })
        res.json(assignment);
    }else{
        let assignment = [];
        const Assign = await Assignment.find({},(err,assign)=>{
            if(err)res.status(400).send(err);
            for(let i=0;i<assign.length;i++){
                let students= [];
                let count = 0;
                for(let j=0;j<assign[i].students.length;j++){
                    if(assign[i].students[j].username === req.user.username && assign[i].students[j].status==='SUBMITTED'){
                        count++;
                        students.push(assign[i].students[j]);
                    }
                }
                assign[i].students = [];
                students.forEach(elem => assign[i].students.push(elem));
                if(count!=0)assignment.push(assign[i]);
            }
        });
        res.json(assignment);        
    }
})

// 8. Assignment FEED ( Both Tutor and Student )
router.get('/assign/feed',authenticateToken,async(req,res)=>{
    if(req.user.isTutor === true){
        let publishedAt = req.query.publishedat;
        let scheduled = [];
        let ongoing = [];
        const assign = await Assignment.find({},(err,assign)=>{
            if(err)res.status(400).send('Error request');
        })
        assign.forEach(date => {
            if(date.createdBy === req.user.username && Date.parse(date.published) < Date.now() && Date.parse(date.deadline) > Date.now()){
                ongoing.push(date);
            }else if(date.createdBy === req.user.username && Date.parse(date.published) > Date.now()){
                scheduled.push(date);
            }
        });
        if(publishedAt==='scheduled'){
            return res.json(scheduled);
        }else if(publishedAt === 'ongoing'){
            return res.json(ongoing);
        }
        else res.status(400).send('error request');
    }else{
        let assignment = [];
        const assign = await Assignment.find({},(err,assign)=>{
            if(err)return res.status(400).send('error');
            for(let i=0;i<assign.length;i++){
                for(let j=0;j<assign[i].students.length;j++){
                    if(assign[i].students[j].username === req.user.username){
                        assignment.push(assign[i]);
                        break;
                    }
                }
            }
        })
        let schedule = [],ongoing=[],pending=[],overdue=[],submitted=[];

        assignment.forEach(assign => {
            if(Date.parse(assign.published) < Date.now() && Date.parse(assign.deadline) > Date.now()){
                ongoing.push(assign);
            }else if(Date.parse(assign.published) > Date.now()){
                schedule.push(assign);
            }

            assign.students.forEach(student => {
                if(student.username === req.user.username && student.status === 'SUBMITTED')submitted.push(assign);
                else if(student.username === req.user.username &&student.status === 'PENDING')pending.push(assign);
                if(student.username === req.user.username && student.status === 'PENDING' && Date.parse(assign.deadline) < Date.now())overdue.push(assign);
                
            })
        })

        if(req.query.publishedat && req.query.publishedat === 'scheduled'){
            return res.json(schedule);
        }
        else if(req.query.publishedat && req.query.publishedat === 'ongoing'){
            return res.json(ongoing);
        }
        else if(req.query.status && req.query.status === 'overdue'){
            return res.json(overdue);
        }
        else if(req.query.status && req.query.status === 'submitted'){
            return res.json(submitted);
        }
        else if(req.query.status && req.query.status === 'pending'){
            return res.json(pending);
        }
        else return res.json(assignment);
    }
})

module.exports = router;