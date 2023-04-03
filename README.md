# Mobile App Releases Web Site

This repository contains the [web app](https://panopticai.github.io/mobile-app-releases/) for releasing the mobile apps for internal testing.


## Deploying Mobile Apps

1. Go to the root folder of the site:
   ```bash
   cd e6f94700f8f063a9fec8bbe81a5cb3fbc8cbb2d3
   ```
1. Setup the project:
   ```bash
   yarn
   ```
1. Copy the iOS IPA file and the Android APK file to the current folder:
   ``` bash
   cp /the/path/of/IPA/file ./Vitals.Mobile.ipa
   cp /the/path/of/APK/file /Vitals.Mobile.apk
   ```
1. Upload the files:
   ```bash
   yarn upload-vitals-mobile
   ```
1. Edit `releases.json` for the changes and the release notes.
1. Publish the changes:
   ```bash
   git add releases.json
   git commit -m "your comment here"
   git push
   ```
1. Your release will be published to the following URL:
   ```
   https://panopticai.github.io/mobile-app-releases/
   ```
