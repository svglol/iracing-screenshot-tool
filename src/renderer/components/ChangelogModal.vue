<template>
  <div class="modal-card" style="width: 60vw; height:80vh; background: rgb(37,37,37)!important;">
    <header class="modal-card-head" style="background-color: rgba(0, 0, 0, 0.2);border-bottom: 0;">
      <p class="modal-card-title" style="color:white;font-weight:700;  margin-bottom: 0rem;">Changelog</p>
      <button
      type="button"
      class="delete"
      @click="$emit('close')"/>
    </header>
    <section class="modal-card-body" style="background-color: transparent;">
      <vue-markdown-plus :source="changelog"></vue-markdown-plus>
    </section>
  </div>
</template>

<script>
const { shell,remote } = require('electron');
const app = remote.app;
const fs = require('fs');
const fetch = require('fetch');
const changelogFile = app.getPath('userData')+'\\releases'+'.json';
import { version } from '../../../package.json';

export default {
  data() {
    return {
      changelog: '',
    }
  },
  mounted(){
    var ctx = this;
    if(this.changelog == ''){
      fetch.fetchUrl("https://api.github.com/repos/svglol/iracing-screenshot-tool/releases", function(error, meta, body){
        var releases = JSON.parse(body.toString());
        if(Array.isArray(releases)){
          fs.writeFileSync(changelogFile, body);
          ctx.parseChangelog(releases);
        }else{
          //error/api rate limit
          fs.readFile(changelogFile, (err, data) => {
            var releases = JSON.parse(data.toString());
            ctx.parseChangelog(releases);
          });
        }
      });
    }
  },
  methods:{
    parseChangelog(releases){
      if(Array.isArray(releases)){
        releases.forEach((release, i) => {
          let compare = compareVer(version,release.name);
          if(compare == 0 || compare == 1){
            this.changelog += "## " + release.name + " \n ";
            this.changelog += release.body + "\n \n ___ \n";
          }
        });
      }
    }
  }
}

function compareVer(a, b)
{
  //treat non-numerical characters as lower version
  //replacing them with a negative number based on charcode of each character
  function fix(s)
  {
    return "." + (s.toLowerCase().charCodeAt(0) - 2147483647) + ".";
  }
  a = ("" + a).replace(/[^0-9.]/g, fix).split('.');
  b = ("" + b).replace(/[^0-9.]/g, fix).split('.');
  var c = Math.max(a.length, b.length);
  for (var i = 0; i < c; i++)
  {
    //convert to integer the most efficient way
    a[i] = ~~a[i];
    b[i] = ~~b[i];
    if (a[i] > b[i])
    return 1;
    else if (a[i] < b[i])
    return -1;
  }
  return 0;
}
</script>

<style scoped>

.heading{
  font-size: .75rem;
  font-weight: 700;
}


button {
  background-color: transparent;
  border: 0px;
  color:white;
  font-size: 2rem;
  padding: 0px;
  margin: 0px;
  text-align: left;
  height: 30px;
  max-height: 30px;
  max-width: 30px;
  width: 30px;
}

h2{
  color:red!important;
}


</style>
