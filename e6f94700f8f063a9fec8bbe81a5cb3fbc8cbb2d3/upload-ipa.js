/* jslint esversion: 6, node: true */
'use strict';
var fs = require('fs');
var path = require('path');
var uploader = require('github-ipa-uploader');
var opn = require('opn');
const program = require('commander');

function updateReleasesJson(version, build, plist) {

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
             release.buildNumber == build;
    });

    if (existingRelease) {
      console.info('Not updating releases.json. Release info already exists');
      return;
    }

    var latestRelease = releases[0];

    var newRelease = {
      version: version,
      buildNumber: build,
      plist: plist,
      changes: latestRelease ? latestRelease.changes : []
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
        githubClient: 'ae455981dc2aa41e2b3e',
        githubSecret: '24a6c88a02c0b17e14bf953c9eef3ea8016d2bc2',
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
  ipaName = 'ChineseDailyBreadDev.ipa';
} else if (program.mode === 'adhoc') {
  ipaName = 'ChineseDailyBreadAdhoc.ipa';
} else {
  program.help();
  process.exit(-1);
}


githubOauth().then( token => {

  var options = {
    token: token,
    owner: 'eddy-lau',
    repo: 'cdb-ota',
    binaries: [{
      path: path.join(__dirname,'..','ChineseDailyBread', ipaName),
      iconURL: 'https://eddy-lau.github.io/cdb-ota/AppIcon-120x120.png'
    }],
    tagPrefix: 'cdb'
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
