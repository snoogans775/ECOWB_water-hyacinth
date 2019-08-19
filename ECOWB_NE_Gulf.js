//// ECO-WB Water Hycanith Project ////
//// NorthEast Gulf Draft Script ////
//// By: Joshua Sumers ////
//// Start Date: 06-25-2019 ////
//// Update Date: 07-29-2019 ////

//Set NE study Area
var NorthGulf = ee.FeatureCollection("users/joshsumers1996/North_Gulf");

//set start Date
var Start = ee.Date('2017-01-01');

//set End Date

var End = ee.Date('2017-12-31');

// import sentinel imagery
var Sent1 = ee.ImageCollection("COPERNICUS/S1_GRD");

//filter sentinel imagery to include vv+vh
var vvvh = Sent1
 //VV
 .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
 //VH
 .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
// set to IW mode
 .filter(ee.Filter.eq('instrumentMode', 'IW'))
 //Date
 .filter(ee.Filter.date(Start, End))
 //filter North
 .filterBounds(NorthGulf)
 //Clip North
 .map(function(image){return image.clip(NorthGulf)});

 // Difference in days between start and finish
 var diff = End.difference(Start, 'day');

 // Make a list of all dates
 var range = ee.List.sequence(0, diff.subtract(1)).map(function(day){return Start.advance(day,'day')})

 // Funtion for iteraton over the range of dates
 var day_mosaics = function(date, newlist) {
   // Cast
   date = ee.Date(date)
   newlist = ee.List(newlist)
   // Filter collection between date and the next day
     var filtered = vvvh.filterDate(date, date.advance(1,'day'))

 // Make the mosaic
 var image = ee.Image(filtered.mosaic())

 // Add the mosaic to a list only if the collection has images
return ee.List(ee.Algorithms.If(filtered.size(), newlist.add(image), newlist))
 }

// Iterate over the range to make a new list, and then cast the list to an imagecollection
var newcol = ee.ImageCollection(ee.List(range.iterate(day_mosaics, ee.List([]))))

//Create a band to serve as a Hycanith Determination based on VH value greater than -23
var HycDet = function(image){
  var VH = image.select(['VH']);
  return image.addBands(ee.Image(1).updateMask(VH.gte(-23)).rename('Hycanith'));
};


//create variable that has both bands
var HycanithDeter = vvvh.map(HycDet);

//print out values
print(HycanithDeter);
var Hyc = HycanithDeter.select('Hycanith');

var finalcol = ee.ImageCollection(Hyc);

//print final collection images
print('Final Collection', finalcol);

//create image of Hycanith based on median VH values
var Hycanith = HycanithDeter.select('Hycanith').median();

//standard image using VV and VH values
var SImage = vvvh.select('VV','VH').median();

//set visualization parameters
var visParm = {Bands: 'VV,VH', min: -30, max: 5};

//visualation parameters for water/hycanith determination
var visParms = {Bands: 'VHH', min: -23, max: 1};

 //Map.addLayer(testingm, visParms, 'test');
 Map.addLayer(finalcol, visParms, 'collection');
 Map.addLayer(Hycanith, visParms, 'Hycanith');
 Map.addLayer(vvvh, visParm, 'North');
 Map.addLayer(SImage, visParm, 'Median image');
 Map.centerObject(NorthGulf, 11);
 Map.style().set('cursor', 'crosshair');

//Do you want to export an individual image?
var IExport = false;

//export indvidual image
if (IExport === true){
  Export.image.toDrive({
    image: Hycanith,
    description: "WaterHycanith",
    maxPixels: 1e13,
    crs: "EPSG:3857",
    scale: 10,
    region: NorthGulf,
    fileFormat: 'GeoTIFF',
  })
}

//Do you want to export video?
var VExport = false;

//export video
if (VExport === true) {
Export.video.toDrive({
    collection: finalcol,
    description: "VideoOfWaterHy" ,
    scale: 30,
    framesPerSecond: 10,
    region: NorthGulf
})}

var batch = require('users/fitoprincipe/geetools:batch');


//Export image collection?
var ICExport = false;

if (ICExport === true) {
  batch.Download.ImageCollection.toDrive(finalcol, 'WCTEST',
                {scale: 10,
                 region: NorthGulf,
                 type: 'float'})
}
