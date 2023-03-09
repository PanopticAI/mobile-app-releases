import * as fs from 'fs';
import * as path from 'path';
import * as http from "http";
var uploader = require('github-ipa-uploader');
import open from 'open';
const program = require('commander');
const config = require('./config.json');

async function updateReleasesJson(version:string, buildNumber:string, plist:string, name:string, tagPrefix:string, tagDelimiter:string, apk?:string):Promise<void> {

  var releasesFilePath = path.join(__dirname, 'releases.json');

  let data = await new Promise<string>( (resolve, reject) => {

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

  });
  
  var releases:[any] = JSON.parse(data);
  releases = releases || [];

  var existingRelease = releases.find( release => {
    return release.version == version &&
            release.buildNumber == buildNumber &&
            release.name == name
  });

  if (existingRelease) {
    console.info('Not updating releases.json. Release info already exists');
    return;
  }

  var latestRelease = releases[0];

  var newRelease = {
    name,
    version,
    buildNumber,
    tagPrefix,
    tagDelimiter,
    plist,
    apk,
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

      let server = http.createServer((req, res) => {
        if (req.url?.match(/login/)) return githubOAuth.login(req, res);
        if (req.url?.match(/callback/)) return githubOAuth.callback(req, res);
      })
      server.listen(80);

      open('http://localhost/login');

      githubOAuth.on('error', function(err:any) {
        reject(err);
      });

      githubOAuth.on('token', function(token:any, serverResponse:any) {

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

async function main() {

  program
    .option('-i, --ipa <ipa-file>', 'The iOS binary file')
    .option('-a, --apk [apk-file]', 'The Android binary file')
    .option('-n, --name <app-name>', 'The name of the app')
    .option('-t, --tag <tag-prefix>', 'The prefix of git TAG')
    .option('-d, --delimiter <tag-delimiter>', 'Optional. The delimiter of the tag, default is "_".')

  program.parse(process.argv);

  var ipaName = program.ipa;
  var apkName = program.apk;
  var appName = program.name;
  var tagPrefix = program.tag;
  var tagDelimiter = program.delimiter || '_';

  if (!ipaName || !appName || !tagPrefix) {
    program.help();
    process.exit(-1);
  }

  let token = await githubOauth();

  let binaries:[{path:string, iconURL?:string}] = [
    {
      path: path.join(__dirname, ipaName),
      iconURL: `https://${config.githubOwner.toLowerCase()}.github.io/${config.githubRepo}/app-icon-120.png`
    },
  ];

  if (apkName) {
    binaries.push({
      path: path.join(__dirname, apkName)
    })
  }

  var options = {
    token: token,
    owner: config.githubOwner,
    repo: config.githubRepo,
    binaries,
    tagPrefix,
    tagDelimiter
  };

  let result = await uploader.upload(options);
  console.log('\n');
  await updateReleasesJson(result.version, result.buildNumber, result.plist, appName, tagPrefix, tagDelimiter, apkName);
}

main()