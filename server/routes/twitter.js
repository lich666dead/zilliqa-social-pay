const router = require('express').Router();
const Twitter = require('twitter');
const request = require('request');
const passport = require('passport');
const models = require('../models');

const API_URL = 'https://api.twitter.com';
const User = models.sequelize.models.User;

const userSign = (req, res) => {
  if (!req.user) {
    return res.status(401).send('User Not Authenticated');
  }

  req
    .user
    .sign()
    .then(({ token }) => req.token = token)
    .then(() => res.json({
      username: req.user.username,
      screenName: req.user.screenName,
      profileImageUrl: req.user.profileImageUrl,
      zilAddress: req.user.zilAddress,
      jwtToken: req.token
    }))
    .catch((err) => res.status(400).json({ message: err.message }));
}

router.post('/auth/twitter', (req, res, next) => {
  request.post({
    url: `${API_URL}/oauth/access_token?oauth_verifier`,
    oauth: {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      token: req.query.oauth_token
    },
    form: { oauth_verifier: req.query.oauth_verifier }
  }, (err, r, body) => {
    let parsedBody = null;

    if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      parsedBody = JSON.parse(body);

      if (parsedBody.errors) {
        return res
          .status(400)
          .json({ messages: parsedBody.errors });
      }
    } catch (err) {
      //
    }

    try {
      const bodyString = '{ "' + body.replace(/&/g, '", "').replace(/=/g, '": "') + '"}';

      parsedBody = JSON.parse(bodyString);

      req.body['oauth_token'] = parsedBody.oauth_token;
      req.body['oauth_token_secret'] = parsedBody.oauth_token_secret;
      req.body['user_id'] = parsedBody.user_id;
      req.body['screen_name'] = parsedBody.screen_name;
    } catch (err) {
      return res
        .status(400)
        .json({ messages: body });
    }

    next();
  });
}, passport.authenticate('twitter-token'), userSign);

router.post('/auth/twitter/reverse', (req, res) => {
  request.post({
    url: `${API_URL}/oauth/request_token`,
    oauth: {
      oauth_callback: "http%3A%2F%2Flocalhost%3A3001%2Ftwitter-callback",
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET
    }
  }, (err, r, body) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      const parsedBody = JSON.parse(body);

      if (parsedBody.errors) {
        return res.status(400).json({ messages: parsedBody.errors });
      }
    } catch (err) {
      const jsonStr = '{ "' + body.replace(/&/g, '", "').replace(/=/g, '": "') + '"}';

      res.send(JSON.parse(jsonStr));
    }
  });
});

router.post('/auth/twitter/callback', (req, res) => {
  return res.status(200).send('');
});

router.get('/get/tweets', async (req, res) => {
  if (!req.session || !req.session.passport || !req.session.passport.user) {
    return res.status(400).json({
      message: 'Unauthorized'
    });
  }

  try {
    const url = `${API_URL}/1.1/search/tweets.json`;
    const user = await User.findByPk(req.session.passport.user.id);
    const client = new Twitter({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token_key: user.token,
      access_token_secret: user.tokenSecret
    });
    const params = {
      q: `@zilliqa`,
      count: 10
    };

    client.get(url, params, (error, tweets) => {
      if (error) {
        return res.status(401).json({ message: error.message });
      }

      return res.json(tweets);
    });

  } catch (err) {
    return res.status(401).json({
      message: err.message
    });
  }
});

module.exports = router;
