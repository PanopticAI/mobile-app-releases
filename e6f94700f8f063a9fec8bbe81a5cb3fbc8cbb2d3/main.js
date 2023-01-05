var app = new Vue({
  el: '#app',
  data: {
    appName: 'Vitals™ Mobile App',
    githubRepo: 'PanopticAI/mobile-app-releases',
    releases: []
  }
});

$.ajax({
  dataType: "json",
  url: "releases.json",
  mimeType: "application/json",
  success: function(data) {
    app.releases = data;
  }
});
