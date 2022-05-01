const packager = require('electron-packager')
const path = require('path')




const options = {
  asar: false,
  dir: __dirname,
  overwrite: true,
}

packager(options, (err, appPaths) => {
  if (err) console.log(err)
  console.log(appPaths)
})
