# slack-github-issue
Code for Slack bot to auto comment the issue information for a specific repository when a user types the issue number or links to the issue.

Makes use of [node-slack-sdk](https://github.com/slackhq/node-slack-sdk).

## How to run
1. Clone repo into your local machine (`https://github.com/augbog/slack-github-issue.git`)
2. Navigate to folder (`cd slack-github-issue`)
3. Run `npm install`
4. Go to `index.js` and update `SLACK_BOT_TOKEN`, `GITHUB_TOKEN`, `ORGANISATION`, and `REPOSITORY`
5. Run `node index.js`
