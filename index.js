require('dotenv').config();
const dotenv = require('dotenv');
dotenv.config({ path: 'sample.env' });
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');

const { Schema } = mongoose;

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))


mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});



const UserSchema = new Schema({
  username: String,
});

const User = mongoose.model("User", UserSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
})

const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.get("/api/users", async (req, res) => {
  console.log(req.body);
  const users = await User.find({}).select("_id username");

  //handle the edge cases
  if(!users) return res.send("No Users");
  res.json(users);

})

app.post("/api/users", async (req, res) => {
  console.log(req.body);
  const userObj = new User({
    username: req.body.username
  })
  //save the user in the DB
  try {
    const user = await userObj.save();
    console.log(user);
    res.json(user)
  } catch (err) {
    console.log(err)
  }

})



app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) return res.send("Could not find user");

    const exerciseObj = new Exercise({
      user_id: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });

    const exercise = await exerciseObj.save();

    user.exercises = user.exercises || [];
    user.exercises.push(exercise);

    await user.save();

   
    return res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
      _id: user._id
    });

  } catch (err) {
    console.error(err);
    res.send("There was an error saving the user data");
  }
});


 // app.get("/api/users/:_id/logs",async(req,res)=>{
 //   const { from, to, limit} = req.query;

 //   const id = req.params._id;
 //   const user = await User.findById(id);

 //   //handle edge cases 

 //   if(!user) return res.send("Could not find id");

 //   let dataObj = {}
 //   if(from) return 
   
 // })   
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);

  // Handle edge cases
  if (!user) return res.send("Could not find id");

  try {
    let query = { user_id: id };
    if (from && to) {
      query.date = { $gte: new Date(from), $lte: new Date(to) };
    }

    let logQuery = Exercise.find(query).select("-user_id -_id");

    if (limit) {
      logQuery = logQuery.limit(parseInt(limit));
    }

    const logs = await logQuery.exec();

    const logArray = logs.map(log => ({
      description: log.description,
      duration: log.duration,
      date: log.date.toDateString()
    }));

    return res.json({
      _id: user._id,
      username: user.username,
      count: logArray.length,
      log: logArray
    });

  } catch (err) {
    console.error(err);
    return res.send("Error retrieving exercise logs");
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


