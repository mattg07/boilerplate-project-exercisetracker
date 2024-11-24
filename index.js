const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const { Schema } = mongoose;
require("dotenv").config();

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new Schema({
  username: String,
});

const User = mongoose.model("User", userSchema);

const exerciseSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, required: true },
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}).select("_id username");
    res.json(users);
  } catch (error) {
    res.status(500).send("Error fetching users");
  }
});

app.post("/api/users", async (req, res) => {
  const userObj = new User({ username: req.body.username });
  try {
    const user = await userObj.save();
    res.json({ username: user.username, _id: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating user");
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send("Could not find user");
    }

    const exerciseObj = new Exercise({
      user_id: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    const exercise = await exerciseObj.save();
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("There was an error creating exercise");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send("User not found");
    }

    let dateFilter = {};
    if (from) dateFilter["$gte"] = new Date(from);
    if (to) dateFilter["$lte"] = new Date(to);

    let filter = { user_id: id };
    if (from || to) filter.date = dateFilter;

    const exercises = await Exercise.find(filter).limit(Number(limit) || 200);
    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching logs");
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
