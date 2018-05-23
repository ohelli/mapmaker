# mapcutter

A simple command line tool for clipping large amounts of shapefiles to a given bounds.
This tool is needed if a group shapefiles cover a large area and need to be clipped to the exact same bounds, f.e. a country needs to be clipped to a specific city.  

![Bildschirmfoto_2018-03-14_um_20.24.24](/uploads/11281bf45356734c871c848b1f7eda56/Bildschirmfoto_2018-03-14_um_20.24.24.png)

## Installation

1. Clone or download this repository.
2. With the terminal, go into the repository directory via `cd` and execute (you might need *sudo* privelages):
3. <pre> npm install -g </pre>

## How To Use

1. Get the bounds of the area or city you want to clip to (see below).
1. Open the terminal.
1. `cd` to the directory with shapefiles (.shp) you wish to clip.
1.  Enter <pre> mapmaker -b= [westlimit,southlimit,eastlimit,northlimit]  </pre>

## Getting Map Bounds for Locations
To get the bounds needed for clipping shapefiles:
1. visit https://boundingbox.klokantech.com.
1. Enter your city/region and use the Dublin Core format values at the bottom in the following order:
<pre> mapmaker -b= [westlimit,southlimit,eastlimit,northlimit] </pre>
