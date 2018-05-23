# mapmaker

An OSX command line tool that makes vector maps out of shapefiles, clipped to a specified bound.

## Installation

Mapmaker is made for OSX and needs **npm** and **homebrew** installed. If these are not installed, they will be installed on first run.
Then, download or `git clone` this repository. Then`cd mapmaker` into the directory via the terminal. You may need `sudo` privileges.
Enter <pre>npm install -g
npm link</pre>

## How To Use

In this example, we will create a map for *Montreal, Canada*. Repeat these steps for your desired location, replacing *Montreal* with your location.
 1. Open your terminal and type `mapmaker`.
 1. Visit [geofabrik](http://download.geofabrik.de) and copy the *.shp.zip* URL of the smallest possible subregion, in this case *Quebec*, after `mapmaker`to your terminal.
 1. Visit [bounding box tool](https://boundingbox.klokantech.com) and type in *Montreal* or a drag the box to a region of your choice. Copy the **CSV RAW** format to your and paste into `[]` and place after the URL.
 1. Type a name fitting for your region.
 1. At the end it should look similar to this (for your city):
 <pre> mapmaker http://download.geofabrik.de/north-america/canada/quebec-latest-free.shp.zip [-73.986345,45.410246,-73.47426,45.705838] Montreal
</pre>
