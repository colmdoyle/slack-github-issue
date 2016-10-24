var request = require('request');
var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var WebClient = require('@slack/client').WebClient;

// Create a new bot at https://YOURSLACK.slack.com/services/new/bot
var BOT_TOKEN  = process.env.SLACK_BOT_TOKEN,
    REPO_OWNER = process.env.ORGANISATION,
    REPO_NAME  = process.env.REPOSITORY,
    GITHUB_TOKEN = process.env.GITHUB_TOKEN;

var slack = new RtmClient(BOT_TOKEN, { logLevel: 'debug' });
var web = new WebClient(BOT_TOKEN);

slack.on(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, function () {
    var channels = Object.keys(slack.channels)
        .map(function (k) { return slack.channels[k]; })
        .filter(function (c) { return c.is_member; })
        .map(function (c) { return c.name; });

    var groups = Object.keys(slack.groups)
        .map(function (k) { return slack.groups[k]; })
        .filter(function (g) { return g.is_open && !g.is_archived; })
        .map(function (g) { return g.name; });

    console.log('Welcome to Slack. You are ' + slack.self.name + ' of ' + slack.team.name);

    if (channels.length > 0) {
        console.log('You are in: ' + channels.join(', '));
    }
    else {
        console.log('You are not in any channels.');
    }

    if (groups.length > 0) {
       console.log('As well as: ' + groups.join(', '));
    }
});

// when someone posts to the channel
slack.on(RTM_EVENTS.MESSAGE, function(message) {
    var channel = message.channel;

    // if we find a #...
    if (message.type === 'message' && message.hasOwnProperty('text') && message.text.indexOf('#') > -1) {
      var issueNum = message.text.substr(message.text.indexOf('#')).split(' ')[0];
      if (/^#\d+$/.test(issueNum)) {
        var issueDescription,
            options = {
              url: 'https://api.github.com/repos/' + REPO_OWNER +'/' + REPO_NAME + '/issues/' + issueNum.substr(1),
              method: 'GET',
              headers: {
                'User-Agent':   'Super Agent/0.0.1',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'token ' + GITHUB_TOKEN
              }
            };

        //Github API requires User Agent
        request(options, function (error, response, body) {
          var json = JSON.parse(body);
          if (!error && response.statusCode == 200) {
            var pretext = '<'+ json.html_url+'|Issue #'+ json.number +'>'
            var title = json.title;
            var text = json.body;
            var mrkdwn_in = ["text"];
            var attachment = {"pretext" : pretext, "title": title, "text": text, "mrkdwn_in": mrkdwn_in};
            var data = {
              attachments: [
                attachment
              ],
              username: "Issues Bot",
              icon_emoji: ":whale:"
            }
            web.chat.postMessage(channel, '', data, function () {});
          }
        });
      }
    }
});

slack.login();
