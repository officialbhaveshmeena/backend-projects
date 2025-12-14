let express = require("express");
let app = express();
let axios = require("axios");
let args = process.argv.slice(2);
const NodeCache = require("node-cache");
const fs = require("fs");
const myCache = new NodeCache({ stdTTL: 10, checkperiod: 120 }); //

let cacheFile = "cacheKeys.txt";
let port;
let origin;
let clearCache = 0;
args.forEach((arg, index, arr) => {
 arg = arg.trim()
 arg = arg.replace(/--/g,'')
  if (arg == "port") {
    port = arr[index + 1];
  } else if (arg == "origin") {
    origin = arr[index + 1];
  } 
  else if(arg == "clear-cache"){
    clearCache=1
  }
});


if (clearCache == 1) {
  try {
    const keys = fs.readFileSync(cacheFile, "utf8");
    // console.log(keys); // The file content as a string
    keys
      .split("\n")
      .filter(
        (text, index, arr) =>
          text.trim().length > 0 && arr.indexOf(text) == index
      )
      .forEach((key) => {
        myCache.del(key);
      });
  } catch (err) {
    console.error(err);
  }
}

function writeCacheKeys(key) {
  fs.appendFile(cacheFile, "\n" + key, (err) => {
    if (err) {
      console.error(err);
      return;
    }
  });
}
async function processRequest(path) {
  let urlPath = origin + "/" + path;
  const res = await axios.get(urlPath);
  return res.data;
}

async function processCache(key, func) {
  let data = "";
  let isCached = false;
  if (myCache.has(key)) {
    isCached = true;
    data = myCache.get(key);
    data = JSON.parse(data);
  } else {
    data = await func(key);
    myCache.set(key, JSON.stringify(data));
    writeCacheKeys(key);
  }

  return [data, !isCached];
}
app.get("/:path", async (req, res) => {
  let path = req.params.path;
  let [data, cacheHitStatus] = await processCache(path, processRequest);
  res.setHeader("X-Cache", cacheHitStatus ? "HIT" : "MISS");
  res.json({
    data: data,
  });
});
app.listen(port, async () => {
  console.log("proxy server is listening on port : " + port);
});
