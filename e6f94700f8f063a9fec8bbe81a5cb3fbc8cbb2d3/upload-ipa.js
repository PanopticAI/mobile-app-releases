/* jslint esversion: 6, node: true */
'use strict';
var fs = require('fs');
var path = require('path');
var uploader = require('github-ipa-uploader');
var opn = require('opn');
const program = require('commander');
const config = require('./config.json');

function updateReleasesJson(version, buildNumber, plist) {

  var releasesFilePath = path.join(__dirname, 'releases.json');

  return new Promise( (resolve, reject) => {

    if (fs.existsSync(releasesFilePath)) {
      fs.readFile(releasesFilePath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } else {
      resolve('[]');
    }

  }).then( data => {

    var releases = JSON.parse(data);
    releases = releases || [];

    var existingRelease = releases.find( release => {
      return release.version == version &&
             release.buildNumber == buildNumber;
    });

    if (existingRelease) {
      console.info('Not updating releases.json. Release info already exists');
      return;
    }

    var latestRelease = releases[0];

    var newRelease = {
      version,
      buildNumber,
      plist,
      changes: latestRelease ? latestRelease.changes : [],
      issues: latestRelease ? latestRelease.issues : []
    };

    releases.splice(0, 0, newRelease);

    return new Promise( (resolve, reject) => {
      fs.writeFile(releasesFilePath, JSON.stringify(releases, null, 2), err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });

    });

  });
}


function githubOauth() {

  return new Promise( (resolve, reject) => {

    const tokenFile = path.join(__dirname, '.github-token');

    if (!fs.existsSync(tokenFile)) {

      var githubOAuth = require('github-oauth')({
        githubClient: config.githubClient,
        githubSecret: config.githubSecret,
        baseURL: 'http://localhost',
        loginURI: '/login',
        callbackURI: '/callback',
        scope: 'repo' // optional, default scope is set to user
      });

      var server = require('http').createServer(function(req, res) {
        if (req.url.match(/login/)) return githubOAuth.login(req, res);
        if (req.url.match(/callback/)) return githubOAuth.callback(req, res);
      });

      server.listen(80);

      opn('http://localhost/login');

      githubOAuth.on('error', function(err) {
        reject(err);
      });

      githubOAuth.on('token', function(token, serverResponse) {

        serverResponse.end('Done');
        server.close();

        fs.writeFile(tokenFile, token.access_token, (err)=> {
          if (err) {
            reject(err);
          } else {
            resolve(token.access_token);
          }
        });

      });


    } else {

      fs.readFile(tokenFile, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });

    }
  });

}


var ipaName;
program
  .option('-m, --mode <build-mode>', 'dev or adhoc');

program.parse(process.argv);
// console.log(program);

if (program.mode === 'dev') {
  ipaName = config.ipa;
} else if (program.mode === 'adhoc') {
  ipaName = config.ipa;
} else {
  program.help();
  process.exit(-1);
}


githubOauth().then( token => {

  var options = {
    token: token,
    owner: config.githubOwner,
    repo: config.githubRepo,
    binaries: [
      {
        path: path.join(__dirname, ipaName),
        iconURL: `https://${config.githubOwner.toLowerCase()}.github.io/${config.githubRepo}/app-icon-120.png`
      },
      {
        path: path.join(__dirname, config.apk)
      }
    ],
    tagPrefix: config.tagPrefix,
    tagDelimiter: config.tagDelimiter
  };

  return uploader.upload(options);
}).then( result => {
  console.log('\n');
  return updateReleasesJson(result.version, result.buildNumber, result.plist);
}).then( () => {
  process.exit();
}).catch( error => {
  console.error(error);
});
