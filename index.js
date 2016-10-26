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
    res.end('Hello');
}).listen(process.env.PORT || 5000);

// Create a new bot at https://YOURSLACK.slack.com/services/new/bot
var BOT_TOKEN = process.env.SLACK_BOT_TOKEN,
    REPO_OWNER = process.env.ORGANISATION,
    REPO_NAME = process.env.REPOSITORY,
    GITHUB_TOKEN = process.env.GITHUB_TOKEN;

var slack = new RtmClient(BOT_TOKEN, {logLevel: 'info'}); // , {logLevel: 'debug'} <- Use for debugging
var web = new WebClient(BOT_TOKEN);

slack.on(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, function() {
    // Get the user's name
    var user = slack.dataStore.getUserById(rtm.activeUserId);

    // Get the team's name
    var team = slack.dataStore.getTeamById(rtm.activeTeamId);

    // Log the slack team name and the bot's name
    console.info('Connected to ' + team.name + ' as ' + user.name);
});

// when someone posts to the channel
slack.on(RTM_EVENTS.MESSAGE, function(message) {
    var channel = message.channel;

    // if we find a #...
    if (message.type === 'message' && message.hasOwnProperty('text')) {
        if (message.text.indexOf('#') > -1) {
            var issueNum = message.text.substr(message.text.indexOf('#')).split(' ')[0];
        } else if (message.text.indexOf('<') > -1) {
          var issueNumWithExtraChar = message.text.substr(message.text.indexOf('<')).split('/')[6];
          // TODO - Remove KitmanLabs hardcoding.
          if (/^(<https:\/\/github.com\/KitmanLabs\/projects\/issues\/[0-9]+>)$/.test(message.text.substr(message.text.indexOf('<')).split(' ')[0])) {
            var issueNum = '#' + issueNumWithExtraChar.substr(0, issueNumWithExtraChar.indexOf('>'))
          }
        }
        if (issueNum && (/^#\d+$/.test(issueNum))) {
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
                    var pretext = '<' + json.html_url + '|Click here to open #' + json.number + ' in GitHub>'
                    var title = json.title;
                    var text = json.body;
                    var mrkdwn_in = ["text"];
                    var fields = []
                    // Labels
                    if (json.labels.length > 0) {
                      var label_titles = [];
                      json.labels.forEach( function(label) {
                        label_titles.push(label.name);
                      });
                      var labels_field = {
                        "title": "Labels",
                        "value": label_titles.join(', '),
                        "short": false
                      }
                      fields.push(labels_field)
                    }

                    // Assignees
                    var assignees_names = [];
                    if (json.assignees.length > 0) {
                      json.assignees.forEach( function(assignee) {
                        assignees_names.push(assignee.login);
                      });
                    } else {
                      assignees_names.push("Unassigned")
                    }
                    var assignees_field = {
                      "title": "Assigned to",
                      "value": assignees_names.join(', '),
                      "short": false
                    }
                    fields.push(assignees_field)

                    // Milestone
                    if (json.milestone != null) {
                      fields.push({
                        "title": "Milestone",
                        "value": json.milestone.title,
                        "short": true
                      });
                    }

                    var attachment = {
                        "pretext": pretext,
                        "title": title,
                        "text": text,
                        "mrkdwn_in": mrkdwn_in,
                        "fields": fields
                    };
                    var data = {
                        attachments: [
                            attachment
                        ],
                        username: "Issues Bot",
                        icon_emoji: ":whale:"
                    }
                    console.info(attachment);
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
