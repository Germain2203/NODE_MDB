const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const express = require('express')
const cors = require('cors');
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Express setup
const app = express()
const server = require('http').createServer(app);

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  express.static('public')
  next()
});
app.use(cors({ origin: '*' }))
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

LOCAL = false


app.get('/', function (req, res) {
  //res.set({"Access-Control-Allow-Origin": "*"})
  if (LOCAL) {
    authorizeAndGetData((data) => {
      return res.json(data)
    })
  } else {
    authorizeAndGetData((data) => {
      return res.json(data)
    })
  }
});


app.post('/', function (req, res) {
  var data = []
  var obj = JSON.parse(req.body.objStr)
  data.push(obj.auteur)
  data.push(obj.societe)
  data.push(obj.nom)
  data.push(obj.prenom)

  console.log(req)
  console.log(data)
  authorizeAndPostData(data);
  
})


/* ---------------------------- */
/* SERVEUR OU EXPORT LAMBDA     */
/* ---------------------------- */
if (LOCAL) {
  server.listen(process.env.PORT || 3000, function () {
    console.log('app running');
  });
} else {
  module.exports = app
}

function authorizeAndPostData(callback) {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), postDataToGgsheet, callback);
  });
}

// Load client secrets from a local file.
function authorizeAndGetData(callback) {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), getDataFromGoogleSheet, callback);
  });
}


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, callback2) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, callback2);
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function getDataFromGoogleSheet(auth, callback) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    //spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    //spreadsheetId: '1KBWJ50UsZjtS_LK5NSSiUsnJ6vFQvDpAD_rcytZCrUM', // dev
    //spreadsheetId: '18o02aE31jr_tUaNnlgO5qs2YG15HSnd3zO2e7vuiJaM', // prod

    spreadsheetId: '1sKgRq8x1HcasN68JAXapTww-hnTJF5ZQ4uBbjJiiGCM', // mur des bons

    range: 'Feuille 1',
  }, (err, res) => {
    console.log(err)
    console.log(res)
    if (err) return console.log('The API returned an error: ' + err);

    const rows = res.data.values;
    if (rows.length) {

      var keys = rows[1]

      rows.shift()
      rows.shift()

      var googleSheetData = []

      for (row of rows) {
        projectJson = {}
        for (let i = 0; i < keys.length; i++) {
          projectJson[keys[i]] = row[i]
        }
        googleSheetData.push(projectJson)
      }

      //console.log(googleSheetData)
      callback(googleSheetData)

    } else {
      console.log('No data found.');
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}
/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function postDataToGgsheet(auth, nouvelleLigne) {
  const sheets = google.sheets({ version: 'v4', auth });
  var request = {
    // The ID of the spreadsheet to update.
    spreadsheetId: '1WWwdmw3HzLwWPsYIPOLyaLJdNQQALXLAu_U2BESH1PM',  // TODO: Update placeholder value.
    // The A1 notation of a range to search for a logical table of data.
    // Values will be appended after the last row of the table.
    range: 'Feuille 1',  // TODO: Update placeholder value.
    // How the input data should be interpreted.
    valueInputOption: 'RAW',  // TODO: Update placeholder value.

    resource: {
      // TODO: Add desired properties to the request body.
      majorDimension: "ROWS",
      values: [

        nouvelleLigne

      ]
    },
  }

  sheets.spreadsheets.values.append(request, function (err, response) {
    if (err) {
      console.error(err);
      return;
    } else {

      //res.sendStatus(200);
      // TODO: Change code below to process the `response` object:
      //console.log(JSON.stringify(response, null, 2));
    }
  })

}

