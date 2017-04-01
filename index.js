#!/usr/bin/env node
const readline = require('readline'),
      fs = require('fs'),
      Emoji = require('node-emoji'),
      titleCase = require('title-case'),
      Twitter = require('twitter');

const DEBUG = process.env.DEBUG;

var twitter = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
});

var lines = [];

const rl = readline.createInterface({
  input: fs.createReadStream('input.txt')
});

rl.on('line', (line) => {
  lines.push(line);
});

rl.on('close', () => {
  // Warn if there aren't many input lines left
  if (lines.length <= 20) {
    console.log('WARNING: Only ' + lines.length + ' nouns left!');
  }

  // Choose a random noun from the input file
  var line = getRandomInt(0, lines.length);
  var noun = lines[line];

  // Tweet text
  var tweet = titleCase(noun) + '-Driven Development';

  // Opportunistic emoji
  // FIXME: if we don't find anything,
  // - split words, try each word?
  // - find word roots, search for them?
  var emoji = Emoji.search(noun);
  if (emoji.length > 0) {
    // Sort returned emoji by length of string name, e.g.
    // man < mans_shoe < man_in_business_suit_levitating
    emoji.sort((a, b) => {
      return a.key.length - b.key.length;
    });
    tweet += ' ' + emoji[0].emoji;
  }

  // Toot!
  twitter.post('statuses/update', { status: tweet }, (err, json, res) => {
    if (err) {
      console.log('Tweet: "' + tweet + '" ✘');
      console.log(err);
      process.exit(1);
    }

    lines.splice(line, 1);
    fs.writeFileSync('input.txt', lines.join('\n'));
    fs.appendFileSync('used.txt', noun + '\n');

    if (DEBUG) console.log('Tweet: "' + tweet + '" ✔');
  });
});

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}
