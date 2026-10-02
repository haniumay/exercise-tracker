require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('Connection error:', err.message));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

// create a user
app.post('/api/users', async (req, res) => {
  try {
    const user = await new User({ username: req.body.username }).save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// list all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.json({ error: 'User not found' });

    const { description, duration, date } = req.body;

    let exerciseDate = date ? new Date(date) : new Date();
    if (isNaN(exerciseDate.getTime())) exerciseDate = new Date();

    const exercise = await new Exercise({
      userId: user._id.toString(),
      description: description,
      duration: Number(duration),
      date: exerciseDate
    }).save();

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// get the exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.json({ error: 'User not found' });

    const { from, to, limit } = req.query;
    const filter = { userId: user._id.toString() };

    if (from || to) {
      filter.date = {};
      if (from && !isNaN(new Date(from).getTime())) filter.date.$gte = new Date(from);
      if (to && !isNaN(new Date(to).getTime())) filter.date.$lte = new Date(to);
      if (Object.keys(filter.date).length === 0) delete filter.date;
    }

    let query = Exercise.find(filter).sort({ date: 1 });
    if (limit && !isNaN(parseInt(limit, 10))) {
      query = query.limit(parseInt(limit, 10));
    }
    const exercises = await query;

    const log = exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: log
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
