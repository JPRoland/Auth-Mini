const bodyParser = require('body-parser');
const express = require('express');

const Post = require('./post.js');

const STATUS_USER_ERROR = 422;

const server = express();
// to enable parsing of json bodies for post requests
server.use(bodyParser.json());

const sendUserError = (err, res) => {
  res.status(STATUS_USER_ERROR);
  if (typeof err === 'string') {
    res.json({ error: err });
  } else {
    res.json(err);
  }
};

const queryAndThen = (query, res, cb) => {
  query.exec((err, result) => {
    if (err) {
      sendUserError(err, res);
    } else {
      cb(result);
    }
  });
};

const findPostBySoID = async (req, res, next) => {
  try {
    req.post = await Post.findOne({ soID: req.params.soID });
    next();
  } catch (error) {
    return sendUserError('Post not found', res);
  }
};

server.get('/accepted-answer/:soID', findPostBySoID, async (req, res) => {
  try {
    const answer = await Post.findOne({ soID: req.post.acceptedAnswerID });
    if (!answer) throw new Error('No accepted answer');
    return res.json(answer);
  } catch (error) {
    return sendUserError(error, res);
  }
});

server.get('/top-answer/:soID', findPostBySoID, async (req, res) => {
  try {
    const answer = await Post.findOne({
      soID: { $ne: req.post.acceptedAnswerID },
      parentID: req.post.soID,
    }).sort({ score: 'desc' });
    if (!answer) throw new Error('No top answer');
    return res.json(answer);
  } catch (error) {
    return sendUserError(error, res);
  }
});

server.get('/popular-jquery-questions', (req, res) => {
  const query = Post.find({
    parentID: null,
    tags: 'jquery',
    $or: [{ score: { $gt: 5000 } }, { 'user.reputation': { $gt: 200000 } }],
  });

  queryAndThen(query, res, posts => res.json(posts));
});

server.get('/npm-answers', (req, res) => {
  const query = Post.find({
    parentID: null,
    tags: 'npm',
  });

  queryAndThen(query, res, (posts) => {
    const answerQuery = Post.find({
      parentID: { $in: posts.map(p => p.soID) },
    });
    queryAndThen(answerQuery, res, answers => res.json(answers));
  });
});

module.exports = { server };
