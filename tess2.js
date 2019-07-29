var fs = require('fs');

var paper = require('paper-jsdom');

const _ = require('lodash');

var pathModule = require('path');

var Tess2 = require('tess2');

var shuffle = require('shuffle-array');

const earcut = require('earcut');

const args = require('minimist')(process.argv.slice(2));
args._.forEach(processFile);

function tesselatePath(actualPath) {
  const numPointsToGet = 40;

  let positions = [];
  for (let i = 0; i < numPointsToGet; i++) {
    positions.push(Math.random());
  }
  positions = positions.sort();

  let contours = [];
  let points = [];
  // console.log(actualPath)
  for (let i = 0; i < numPointsToGet; i++) {
    const p = actualPath.getPointAt((i / numPointsToGet) * actualPath.length);
    // const p = actualPath.getPointAt(positions[i] * actualPath.length);
    // contours.push(p)
    if (p.x == contours[(i - 1) * 2] || p.y == contours[(i - 1) * 2 + 1]) {
      // continue;
      console.log('same line ..');
    }

    if (i != 0) {
      console.log(`${i}`, p.getDistance(points[i-1]));
    }

    contours.push(p.x);
    contours.push(p.y);
  }
  // contours.push(actualPath.getPointAt(0).x)
  // contours.push(actualPath.getPointAt(0).y)

  console.log('making extra points');
  const numExtraPoints = 0;
  const extraPoints = [];
  while (extraPoints.length < numExtraPoints * 2) {
    const testPoint = new paper.Point(
      Math.random() * path.bounds.width,
      Math.random() * path.bounds.height
    );
    if (path.contains(testPoint)) {
      extraPoints.push(testPoint.x);
      extraPoints.push(testPoint.y);
    }
  }
  console.log('done with extra points');

  contours = contours.concat(extraPoints);

  // libtess2
  // Tesselate;
  // var res = Tess2.tesselate({
  //   contours: [contours],
  //   windingRule: Tess2.wind,
  //   elementType: Tess2.POLYGONS,
  //   polySize: 3,
  //   vertexSize: 2
  // });

  // // Use triangles
  // for (var i = 0; i < res.elements.length; i += 3) {
  //   var a = res.elements[i],
  //     b = res.elements[i + 1],
  //     c = res.elements[i + 2];
  //   const cellPath = new paper.Path([
  //     new paper.Point(res.vertices[a * 2], res.vertices[a * 2 + 1]),
  //     new paper.Point(res.vertices[b * 2], res.vertices[b * 2 + 1]),
  //     new paper.Point(res.vertices[c * 2], res.vertices[c * 2 + 1])
  //   ]);
  //   cellPath.style = {
  //     strokeWidth: 1,
  //     strokeColor: 'black',
  //     fillColor: '#fffccc'
  //   };
  // }

  var triangles = earcut(contours); // returns [1,0,3, 3,2,1]
  // console.log(triangles);
  for (var i = 0; i < triangles.length - 2; i += 3) {
    var a = triangles[i],
      b = triangles[i + 1],
      c = triangles[i + 2];
    // console.log([contours[a], contours[b], contours[c]]);
    const cellPath = new paper.Path([
      new paper.Point(contours[a * 2], contours[a * 2 + 1]),
      new paper.Point(contours[b * 2], contours[b * 2 + 1]),
      new paper.Point(contours[c * 2], contours[c * 2 + 1])
    ]);

    cellPath.closePath();

    cellPath.style = {
      strokeWidth: 1,
      strokeColor: 'black'
      // fillColor: '#fffccc'
    };
  }
}

function splitAndGetChildren(paths, splitter) {
  const ret = [];

  paths.forEach(path => {
    const parts = path.divide(splitter, { insert: false });
    console.log(parts)
    if (!parts.children) {
      ret.push(parts);
    } else {
      
      for (let i = 0; i < parts.children.length; i++) {
        ret.push(parts.children[i]);
      }
    }
  });

  return ret;
}

function processFile(filename) {
  console.log(`processing ${filename}`);
  const forceContainment = true; //!!args['forceContainment'];

  paper.setup([1000, 1000]);
  const svgData = fs.readFileSync(filename, 'utf8');
  var svgItem = paper.project.importSVG(svgData); //, {insert: false})

  const path = svgItem.children[1];
  const actualPath = path.children[0];
  path.style = {
    strokeWidth: 1,
    strokeColor: 'pink'
  };

  // const splitLine = new paper.Path([
  //   new paper.Point(0, 0),
  //   new paper.Point(0, svgItem.bounds.height / 2),
  //   new paper.Point(svgItem.bounds.width, svgItem.bounds.height / 2),
  //   new paper.Point(svgItem.bounds.width, 0)
  // ]);
  // let splitPaths = splitAndGetChildren([actualPath], splitLine);

  // const splitLine2 = new paper.Path([
  //   new paper.Point(svgItem.bounds.width / 2, 0),
  //   new paper.Point(svgItem.bounds.width / 2, svgItem.bounds.height),
  //   new paper.Point(svgItem.bounds.width, svgItem.bounds.height),
  //   new paper.Point(svgItem.bounds.width, 0)
  // ]);

  const splitLine = new paper.Path([
    new paper.Point(0, 0),
    new paper.Point(svgItem.bounds.width, svgItem.bounds.height),
    new paper.Point(svgItem.bounds.width, 0)
  ]);
  splitLine.closePath();
  let splitPaths = splitAndGetChildren([actualPath], splitLine);

  const splitLine2 = new paper.Path([
    new paper.Point(0, svgItem.bounds.height),
    new paper.Point(svgItem.bounds.width, svgItem.bounds.height),
    new paper.Point(svgItem.bounds.width, 0)
  ]);
  splitLine2.closePath();

  splitPaths  = splitAndGetChildren(splitPaths, splitLine2);

  console.log(splitPaths.length);
  for (let i = 0; i < splitPaths.length; i++) {
    tesselatePath(splitPaths[i]);
  }
  // parts.style = {
  //   strokeWidth: 1,
  //   strokeColor: 'black',
  //   // fillColor: '#fffccc'
  // };
  // tesselatePath(actualPath);

  const outputFilename =
    pathModule.basename(filename).split('.')[0] + '-tess2.svg';
  fs.writeFileSync(outputFilename, paper.project.exportSVG({ asString: true }));
}
