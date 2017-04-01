#!/usr/bin/env node
const readline = require('readline'),
      fs = require('fs'),
      Emoji = require('emojilib'),
      titleCase = require('titlecase'),
      Twitter = require('twitter');

if (process.argv.length != 4) {
  console.log('Usage: drivendevel <input> <used>');
  process.exit(1);
}

const DEBUG = process.env.DEBUG;
const INPUT = process.argv[2];
const USED = process.argv[3];

var twitter = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
});

var lines = [];

const rl = readline.createInterface({
  input: fs.createReadStream(INPUT)
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

  // Exact match
  var emoji = Emoji.lib[noun];

  // Opportunistic emoji
  if (!emoji) {
    var candidates = [];

    // Match parts_of_emoji_names
    Object.keys(Emoji.lib).forEach(key => {
      var parts = key.split('_');
      if (parts.includes(noun)) {
        var candidate = Emoji.lib[key];
        candidate.name = key;
        candidates.push(candidate);
      }
    });

    // Match keywords
    Object.keys(Emoji.lib).forEach(key => {
      var emoji = Emoji.lib[key];
      if (emoji.keywords.includes(noun)) {
        var candidate = emoji;
        candidate.name = key;
        candidates.push(candidate);
      }
    });

    // Exclude various things like awful categories
    candidates.filter(e => {
      if (['flags', '_custom'].includes(e.category)) {
        if (DEBUG) console.log(e.name + ' from excluded category, ' + e.category);
        return false;
      }
      return true;
    });

    // Sort candidates
    // FIXME:
    // - should randomly order man_/woman_ and men_/women_ if opposite exists
    candidates.sort((a, b) => {
      // Favour nouns in emoji names, e.g. stop_sign < no_entry
      if (a.name.split('_').includes(noun)) {
        return -1;
      }
      // Favour shorter emoji names
      return a.name.length - b.name.length;
    });
  }

  if (candidates && candidates.length > 0) {
    if (DEBUG) console.log('candidates: ' + JSON.stringify(candidates, null, 2));
    emoji = candidates[0];
  }
  if (emoji && emoji !== null) {
    tweet += ' ' + emoji.char;
  }

  if (DEBUG) {
    console.log('Tweet: "' + tweet + '"');
    process.exit(0);
  }

  // Toot!
  twitter.post('statuses/update', { status: tweet }, (err, json, res) => {
    if (err) {
      console.log('Tweet: "' + tweet + '" ✘');
      console.log(err);
      process.exit(1);
    }

    lines.splice(line, 1);
    fs.writeFileSync(INPUT, lines.join('\n'));
    fs.appendFileSync(USED, noun + '\n');

    if (DEBUG) console.log('Tweet: "' + tweet + '" ✔');
  });
});

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}
