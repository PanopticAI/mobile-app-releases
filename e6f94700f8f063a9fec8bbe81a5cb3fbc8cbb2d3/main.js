var app = new Vue({
  el: '#app',
  data: {
    config: {},
    releases: []
  }
});

$.ajax({
  dataType: "json",
  url: "config.json",
  mimeType: "application/json",
  success: function(data) {
    app.config = data
  }

})

$.ajax({
  dataType: "json",
  url: "releases.json",
  mimeType: "application/json",
  success: function(data) {
    app.releases = data;
  }
});
