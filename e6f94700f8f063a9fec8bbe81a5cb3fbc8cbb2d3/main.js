function groupByName(json) {
  var output = []
    for (var i = 0; i < json.length; i++){
        var obj = json[i];
        var found = output.find(element => element.name == obj.name);
        if (found){
            found.releases.push(obj)
        }
        else{
            output.push({ 
                "name": obj.name,
                "releases":[obj]
            });
        }
    }
  return output
  // return []
}

var app = new Vue({
  el: '#app',
  data: {
    config: {},
    releases: [],
    mobileApps: [],
    thisApp: undefined
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
    app.mobileApps = groupByName(data)
  }
});
