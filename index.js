var request = require('request');
var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var WebClient = require('@slack/client').WebClient;

// Connect to a port to keep connection on Heroku
var http = require('http');
http.createServer(function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    res.send('it is running\n');
}).listen(process.env.PORT || 5000);

// Create a new bot at https://YOURSLACK.slack.com/services/new/bot
var BOT_TOKEN = process.env.SLACK_BOT_TOKEN,
    REPO_OWNER = process.env.ORGANISATION,
    REPO_NAME = process.env.REPOSITORY,
    GITHUB_TOKEN = process.env.GITHUB_TOKEN;

var slack = new RtmClient(BOT_TOKEN);
var web = new WebClient(BOT_TOKEN);

slack.on(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, function() {
    // Get the user's name
    var user = slack.dataStore.getUserById(rtm.activeUserId);

    // Get the team's name
    var team = slack.dataStore.getTeamById(rtm.activeTeamId);

    // Log the slack team name and the bot's name
    console.log('Connected to ' + team.name + ' as ' + user.name);
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
                    url: 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/issues/' + issueNum.substr(1),
                    method: 'GET',
                    headers: {
                        //Github API requires User Agent
                        'User-Agent': 'Super Agent/0.0.1',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': 'token ' + GITHUB_TOKEN
                    }
                };

            request(options, function(error, response, body) {
                var json = JSON.parse(body);
                if (!error && response.statusCode == 200) {
                    var pretext = '<' + json.html_url + '|Issue #' + json.number + '>'
                    var title = json.title;
                    var text = json.body;
                    var mrkdwn_in = ["text"];
                    var attachment = {
                        "pretext": pretext,
                        "title": title,
                        "text": text,
                        "mrkdwn_in": mrkdwn_in
                    };
                    var data = {
                        attachments: [
                            attachment
                        ],
                        username: "Issues Bot",
                        icon_emoji: ":whale:"
                    }
                    web.chat.postMessage(channel, '', data, function() {});
                } else if (json.message == 'Not Found') {
                    var data = {
                        username: "Issues Bot",
                        icon_emoji: ":whale:"
                    }
                    web.chat.postMessage(channel, 'Could not find that issue in ' + REPO_OWNER + '/' + REPO_NAME, data, function() {});
                }
            });
        }
    }
});

slack.login();
