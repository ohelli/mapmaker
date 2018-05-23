#!/usr/bin/env node

'use strict';

const program = require('commander');
const chalk = require("chalk");
const mapshaper = require('mapshaper');
const shell = require('shelljs');
const commandExists = require('command-exists').sync;
const fs = require('fs');
const path = require('path');
const walk = require('walk');

// the file format to look for when clipping
const format = ".shp"

//  max values for lat and long
const longitudeMaximumValue = 180;
const latitudeMaximumValue = 90;
// the delimeter string for splitting user input
const delimeter = /\[|\]|,/;

// the usage string
const usageString = "Usage:  mapmaker -b= [WestLongitude,SouthLatitude,EastLongitude,NorthLatitude]";

// all shapefiles to be clipped
var files = [];

/**
 * Installs the needed dependencies.
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
let installDependencies = (boundingBox) => {
  if (!commandExists("mapshaper")) {
    console.log(chalk.blueBright("☞☞☞ Installing mapshaper."));
    shell.exec("npm install mapshaper -g",
      function() {
        clip(boundingBox)
      });
  } else {
    clip(boundingBox)
  }
}


/**
 * Clip all files in the current directory
 * @param  {xmin, ymin, xmax, ymax} options A bounding bbox
 * @return {void}
 */
let clip = (boundingBox) => {
  let clippedDirectory = "clipped/"
  // create new directory for clipped files
  if (!fs.existsSync(clippedDirectory)) {
    fs.mkdirSync(clippedDirectory);
  }

  // directory walker
  var walker = walk.walk('.', {
    followLinks: false
  });

  // check if options are a valid bounding box
  if (!isValidBox(boundingBox)) {
    return
  }

  // iterate over all files in current directory
  walker.on('file', function(root, fileStats, next) {
    // if a shapefile, clip it
    boundingBox = boundingBox.replace("[", "");
    boundingBox = boundingBox.replace("]", "");
    if (fileStats.name.endsWith(format)) {
      console.log("Clipping file " + fileStats.name);
      // run as shell command with extra memory
      shell.exec('mapshaper-xl -i ' + fileStats.name + ' -clip bbox=' + boundingBox + ' -o ' + clippedDirectory + fileStats.name, {
        silent: true
      });
      // run with mapshaper module with normal memory
      // mapshaper.applyCommands('mapshaper -i ' + fileStats.name  + ' -clip bbox=' + boundingBox + ' -o ' + clippedDirectory + fileStats.name, "", done );
    }
    next()
  });

  // done iterating
  walker.on('end', function() {
    console.log("Finished clipping");
  });

};

/**
 * Done Callback function for clipping.
 * @param  {Error} Error an error if one occured
 * @return {void}
 */
let done = function(Error) {
  if (Error) {
    console.log("Error: " + Error);
  } else {
    console.log("Success: file clipped")
  }
};

/**
 * Checks if the given bounding box is in the right format.
 * @param  {xmin, ymin, xmax, ymax} options A bounding bbox
 * @return {[type]}             [description]
 */
let isValidBox = (boundingBox) => {
  console.log("Checking " + boundingBox);
  let array = boundingBox.split(delimeter);
  if (array.length != 6) {
    console.log("Error: the bounding box " + boundingBox + " you entered has " + array.length - 2 + " values, but should have 4. \n" + usageString);
    return false;
  }
  if (array[1] < -longitudeMaximumValue || array[1] > longitudeMaximumValue) {
    console.log("Error: WestLongitude must be between " + longitudeMaximumValue + " and -" + longitudeMaximumValue);
  }
  if (array[3] < -longitudeMaximumValue || array[3] > longitudeMaximumValue) {
    console.log("Error: EastLongitude must be between " + longitudeMaximumValue + " and -" + longitudeMaximumValue);
  }
  if (array[2] < -latitudeMaximumValue || array[2] > latitudeMaximumValue) {
    console.log("Error: SouthLatitude must be between " + longitudeMaximumValue + " and -" + longitudeMaximumValue);
  }
  if (array[4] < -latitudeMaximumValue || array[4] > latitudeMaximumValue) {
    console.log("Error: NorthLatitude must be between " + longitudeMaximumValue + " and -" + longitudeMaximumValue);
  }
  return true;
}


// command line program
program
  .option('-b, --bounds <required>', 'the bounding box to clip to in the format: WestLongitude,SouthLatitude,EastLongitude,NorthLatitude')
  .version('0.0.1')
  .description('Clips the shapefiles in the current directory. \n' + usageString)
  .action(installDependencies);

program.parse(process.argv);


// if program was called with no arguments, show help.
if (program.args.length === 0) {
  console.log("You typed no arguments, showing help.")
  program.help();
}
