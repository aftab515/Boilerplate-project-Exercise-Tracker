const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { response } = require('express');
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI,{useNewUrlParser: true});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

const User = mongoose.model('User',userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: Date.now}
});

const Exercise = mongoose.model('Exercise',exerciseSchema);

setInterval(() => {
  app.get('/awake', (req, res) => {
    res.send("Awake");
  });
}, 25 * 60 * 1000);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.get('/api/users', async (req,res) => {
  try {
    const users = await User.find().select({username: 1,_id: 1});
    res.json(users);
  } catch (error) {
    res.send('error');
  }
});

app.post('/api/users', async (req,res) => {
  if(req.body.username){
    const user = new User({username: req.body.username});
    try {
      const result = await user.save();
      res.json({username: result.username,_id: result._id});
    } catch (error) {
      res.send('Error');
    }
  }else res.send('Error');
});


app.post('/api/users/:_id/exercises', async (req,res) => {
  const exercise = new Exercise({
    userId: req.params._id,
    description: req.body.description,
    duration: req.body.duration,
    date: (req.body.date) ? new Date(req.body.date) : new Date()
  })
  try {
    const result = await exercise.save();
    const user = await User.findById(result.userId);
    res.json({username: user.username,description: result.description,duration: result.duration,date: result.date.toDateString(),_id: result.userId});
  } catch (error) {
    res.send('Error');
  }
});

app.get('/api/users/:_id/logs', async (req,res) => {
  try {
    const user = await User.findById(req.params._id);
    let search = {userId: req.params._id};
    if(req.query.from || req.query.to){
      search.date = {};
      if(req.query.from) search.date["$gt"] = new Date(req.query.from);
      if(req.query.to) search.date["$lt"] = new Date(req.query.to);
    }

    let exercises;
    if(req.query.limit){
      exercises = await Exercise.find(search).limit(parseInt(req.query.limit));
    }else{
      exercises = await Exercise.find(search);
    }

    let log = exercises.map(exercise => {
      return {
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      };
    });

    res.json({
      username: user.username,
      count: log.length,
      _id: req.params._id,
      log: log
    });

  } catch (error) {
    res.send('error');
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
