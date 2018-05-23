#!/usr/bin/env node

'use strict';
const fs = require('fs');
const path = require('path');
const program = require('commander');
const mapshaper = require('mapshaper');
const exec = require('child_process').exec;
const commandExists = require('command-exists').sync;
const archiver = require('archiver');
const rimraf = require('rimraf');
const walk = require('walk');
const chalk = require('chalk');
const dependencies = ["mapcutter", "tippecanoe", "ogr2ogr", "mb-util"];

const dirname = __dirname;
// The current path to the temp map files, working directory.
var tempPath = "";
// The bounds of the map currently being created.
var mapBounds = [];
// The name of the map currently being created.
var mapName = "";
// map constants
const shpExtension = ".shp";
const jsonExtension = ".json";
const mbtilesExtension = ".mbtiles";
const zipExtension = ".zip";
const minZoom = 14;
const maxZoom = 16;
const shapefileNames = ["gis_osm_roads_free_1",
  "gis_osm_water_a_free_1",
  "gis_osm_waterways_free_1",
  "gis_osm_natural_a_free_1",
  "gis_osm_landuse_a_free_1",
  "gis_osm_buildings_a_free_1",
  "gis_osm_pois_a_free_1",
  "gis_osm_places_a_free_1"
];

/**
 * Checks if all dependencies are installed and if not installs them.
 */
let checkAndInstall = (callback) => {
  // check if needed programs are installed otherwise install them
  console.log(chalk.blueBright("☞☞☞ Checking dependencies."));
  // check basic dependency on brew
  if (!commandExists("brew")) {
    console.log(chalk.blueBright("☞☞☞ Installing homebrew."));
    var process = exec("/usr/bin/ruby -e '$(curl -fsSL https:\/\/raw.githubusercontent.com/Homebrew/install/master/install)'",
      function() {
        installNPM(callback);
      });
  } else {
    installNPM(callback);
  }
};

/**
 * Installs npm dependency.
 */
let installNPM = (callback) => {
  if (!commandExists("npm")) {
    console.log(chalk.blueBright("☞☞☞ Installing npm."));
    var process = exec("brew install npm",
      function() {
        installMapcutter(callback);
    });
  } else {
    installMapcutter(callback);
  }
}

/**
 * Installs the mapcutter dependency.
 */
let installMapcutter = (callback) => {
  var pathToDependency = path.join(dirname, "..", dependencies[0]);
  var process = exec("npm install -g; npm link", {
    cwd: pathToDependency
  }, function() {
    installTippecanoe(callback)
  });
  process.stderr.on('data', function(data) {
    // console.log(chalk.red.dim("Error:" + data));
  });
}

/**
 * Installs the Tippecanoe dependency.
 */
let installTippecanoe = (callback) => {
  if (!commandExists(dependencies[1])) {
    console.log(chalk.blueBright("☞☞☞ Installing " + dependencies[1] + "."));
    var process = exec("brew install tippecanoe",
      function() {
        installOGR2OGR(callback)
      });
    process.stderr.on('data', function(data) {
      console.log(chalk.red.dim("Error:" + data));
    });
  } else {
    installOGR2OGR(callback)
  }
}

/**
 * Installs the OGR2OGR (GDAL) dependency.
 */
let installOGR2OGR = (callback) => {
  if (!commandExists(dependencies[2])) {
    console.log(chalk.blueBright("☞☞☞ Installing " + dependencies[2] + "."));
    var process = exec("brew install gdal",
      function() {
        installMBUtil(callback);
      });
  } else {
    console.log(chalk.yellow("✓ Dependencies complete."));
    installMBUtil(callback);
  }
}

/**
 * Installs the MBUtil dependency.
 */
let installMBUtil = (callback) => {
  if (!commandExists(dependencies[3])) {
    console.log(chalk.blueBright("☞☞☞ Installing " + dependencies[3] + "."));
    var process = exec("git clone git://github.com/mapbox/mbutil.git; cd mbutil; sudo python setup.py install;",
      function() {
        callback();
      });
  } else {
    callback();
  }
}

/**
 * Starts the mapmaking process, downloading the shapefiles from the given
 * url, clipping them to the given bounds, and saving it under the given name.
 */
let makeMap = (url, bounds, name) => {
  mapBounds = bounds;
  mapName = name;
  // make an extra directory
  if (fs.existsSync(tempPath)) {
    rimraf.sync(tempPath);
  }
  fs.mkdirSync(tempPath);
  // download the file at the given URL
  let unzipFolder = download(url, bounds, name);
};

/**
 * Downloads a file from the given URL. After completion, the shapefiles
 * are cut to bounds.
 */
let download = (url, bounds, name) => {
  if (url === undefined) {
    console.log(chalk.red("Error: URL is undefined."));
    return;
  }
  let zipFile = path.basename(url);
  let unzipFolder = path.dirname(zipFile);
  // check if file already exists
  // if not, download
  console.log(chalk.blueBright("☞☞☞ Downloading from url " + url));
  var process = exec("curl -L -O " + url + ";" +
    "unzip " + zipFile, {
      cwd: tempPath
    },
    function() {
      console.log(chalk.yellow("✓ Download complete."));
      cutMap(unzipFolder, bounds, name);
    }
  );
  process.stderr.on('data', function(data) {
    // console.log(chalk.red.dim("Error:" + data));
  });
  process.stdout.on('data', function(data) {
    // console.log(chalk.yellow.dim(data));
  });
};

/**
 * Cuts the shapefiles at the given folder to the given bounds.
 */
let cutMap = (folder, bounds, name) => {
  console.log(chalk.blueBright("☞☞☞ Cutting map to bounds " + bounds +
    "\n" + "☞☞☞ This might take a few minutes... get a coffee ☕"));
  var process = exec("mapcutter -b= " + bounds, {
    cwd: tempPath
  }, function() {
    console.log(chalk.yellow("✓ Cutting map complete."));
    convertToJSON(name);
  });
  process.stderr.on('data', function(data) {
    console.log(chalk.red.dim("Error:" + data));
  });
  process.stdout.on('data', function(data) {
    console.log(chalk.yellow.dim(data));
  });
};

/**
 * Converts the cut shapefiles to json.
 */
let convertToJSON = (name) => {
  console.log(chalk.blue("☞☞☞ Converting shapefile to JSON."));
  var done = shapefileNames.length - 1;
  for (var i = 0; i < shapefileNames.length; i++) {
    var shapefile = shapefileNames[i];
    let shapefilePath = path.join(shapefile + shpExtension);
    let jsonPath = path.join(shapefile + jsonExtension);
    var process = exec("cd clipped; ogr2ogr -f GeoJSON " + jsonPath + " " + shapefilePath, {
        cwd: tempPath
      },
      function() {
        done--;
        if (done == 0) {
          console.log(chalk.yellow("✓ Conversion 1 of 2 complete."));
          convertToMBTiles(name);
        }
      });
    process.stderr.on('data', function(data) {
      console.log(chalk.red.dim("Error:" + data));
    });
  }
};

/**
 * Converts the json to mbtiles.
 */
let convertToMBTiles = (name) => {
  console.log(chalk.blue("☞☞☞ Converting JSON to MBTiles."));
  let allJsonInputs = " ";
  for (var i = 0; i < shapefileNames.length; i++) {
    var shapefile = shapefileNames[i];
    allJsonInputs = allJsonInputs.concat(path.join("clipped", shapefile + jsonExtension) + " ");
  }
  var process = exec("tippecanoe -z " + maxZoom + " -Z " + minZoom + " -o " + name + mbtilesExtension + " " + allJsonInputs, {
    cwd: tempPath
  }, function() {
    console.log(chalk.yellow("✓ Conversion 2 of 2 complete."));
    convertToPBF(name);
  });
  process.stderr.on('data', function(data) {
    // console.log(chalk.red.dim("Error:" + data));
  });
};

/**
 * Converts the previously creted mbtiles file to a pbf folder stack and zips it.
 */
let convertToPBF = (name) => {
  console.log(chalk.blueBright("☞☞☞ Zipping and saving to desktop."));
  // convert to pbf stack with mbutil
  exec("mb-util --image_format=pbf " + name + mbtilesExtension + " " + name + ";", {
      cwd: tempPath
    },
    function() {
      // decompress pbf files
      var process = exec("gzip -d -r -S .pbf *", {
        cwd: tempPath
      }, function() {
        addSuffix(name)
      })
    }
  );
};

/**
 * Adds the needed .pbf suffix to the decompressed files.
 */
let addSuffix = (name) => {
  // directory walker
  let tempPathName = path.join(tempPath, name);
  var walker = walk.walk(tempPathName, {
    followLinks: true
  });
  walker.on('file', function(root, fileStats, next) {
    // add suffix to file
    let filePath = path.join(root, fileStats.name)
    fs.rename(filePath, filePath + ".pbf", function(err) {
      if (err) {
        console.log(chalk.red(err));
      }
    });
    next()
  });
  walker.on('end', function() {
    zip(name)
  });
}

/**
 * Archives the created files to an archive of the given name and creates a config
 * json of all needed map data.
 */
let zip = (name) => {
  let pathToDestination = path.join(tempPath, name + zipExtension);
  var output = fs.createWriteStream(pathToDestination);
  var archive = archiver("zip");
  // zip this folder
  let pathToSource = path.join(tempPath, name);
  // save map config in a json
  var obj = {
    "maptiles_url": name + zipExtension,
    "min_zoom": minZoom,
    "max_zoom": maxZoom,
    "bounds": mapBounds
  };
  var json = JSON.stringify(obj);
  var pathToJSON = path.join(pathToSource, "config" + jsonExtension);
  fs.writeFile(pathToJSON, json, 'utf8', function(err, data) {
    if (err) {
      console.log(chalk.red("Error: " + err));
    }
  });
  // pipe source folder to output
  archive.pipe(output);
  archive.directory(pathToSource, name);
  archive.on('error', function(err) {
    console.log(chalk.red(err))
  });
  output.on('close', function() {
    console.log(chalk.yellow("✓ Zipping complete."));
    save(name);
  });
  archive.finalize();
}

/**
 * Saves the file at the given path to the desktop.
 */
let save = (name) => {
  // save to desktop
  let pathToSource = path.join(dirname, name, name + zipExtension);
  let pathToDesktop = path.join(process.env['HOME'], "Desktop", name + zipExtension)
  if (!fs.existsSync(pathToSource)) {
    console.log(chalk.red("Error: source zip file does not exist."));
  } else {
    fs.rename(pathToSource, pathToDesktop, function(err) {
      if (err) {
        console.log(chalk.red(err));
      } else {
        cleanup()
      }
    });
  }
}

/**
 * Cleans up the temp files.
 * @return {[type]} [description]
 */
let cleanup = () => {
  // erase downloaded shape files
  rimraf.sync(tempPath);
  console.log(chalk.yellow("✓ Done making map."));
  upload();
};

/**
 * Uploads the zip if the uploader script exists. This should be for ZKM internal use only.
 */
let upload = () => {
  // check for uploading script
  let uploaderPath = path.join(dirname, "uploader.js");
  if (fs.existsSync(uploaderPath)) {
    const uploader = require("./uploader.js");
    uploader.upload(mapName, minZoom, maxZoom, mapBounds);
  }
}


/**
 * This is a command line program.
 */
program
  .version('0.0.1')
  .arguments('<url> <bounds> <name>')
  .option('')
  .usage('<url> <bounds> <name>')
  .description('Creates a vector map of the bounded area from the shapefiles at the given URL. \n')
  .action(function(url, bounds, name) {
    tempPath = path.join(dirname, name);
    checkAndInstall(function() {
      makeMap(url, bounds, name)
    })
  });

program.on('--help', function() {
  console.log('');
  console.log(chalk.blueBright.bold('----------- Help -------------'));
  console.log('');
  console.log(chalk.yellow.bold('mapmaker <url> <bounds> <name>'))
  console.log(chalk.yellow('1. <url> Find the shp.zip URL of your preferred region at http://download.geofabrik.de.\n' + ' Try to select the smallest possible subregion.'));
  console.log(chalk.yellow('2. <bounds> Find the bounding box for the preferred area at https://boundingbox.klokantech.com.\n' + ' Use the CSV RAW format values and copy them into brackets:' +
    '[westlimit,southlimit,eastlimit,northlimit] '));
  console.log(chalk.yellow('3. <name> Choose a name for the map, preferrably the english title.'))
  console.log('');
  console.log(chalk.blueBright('Example of a map for Montreal:'));
  console.log('');
  console.log(chalk.yellow.bold('mapmaker http://download.geofabrik.de/north-america/canada/quebec-latest-free.shp.zip [-73.986345,45.410246,-73.474260,45.705838] Montreal'));

});

program.parse(process.argv);

// if program was called with no arguments, show help.
if (program.args.length === 0) {
  program.help();
}
