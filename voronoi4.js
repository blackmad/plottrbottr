const Delaunay = require('d3-delaunay').Delaunay;

var fs = require('fs');

var paper = require('paper-jsdom');

const _ = require('lodash');

var pathModule = require('path');

var shuffle = require('shuffle-array');

var Shape = require('@doodle3d/clipper-js');

const args = require('minimist')(process.argv.slice(2));
const debug = args.debug;
console.log('debug', debug)
args._.forEach(processFile);


function approxShape(shape, numPointsToGet = 1000) {
  let points = [];
  // console.log(actualPath)
  for (let i = 0; i < numPointsToGet; i++) {
    const p = shape.getPointAt((i / numPointsToGet) * shape.length);
    points.push(p);
  }
  return points;
}

function bufferPath(buffer, path, numPoints) {
  const shape = approxShape(path, numPoints);
  // console.log(shape);
  return bufferPoints(buffer, shape);
}

 function bufferPoints(buffer, points) {
  const scaleFactor = 100;
  const roundingBit = 1 / scaleFactor * 10 
  const scaledPoints = points.map((p) => { return {X: (p.x*scaleFactor) + roundingBit , Y: (p.y*scaleFactor) + roundingBit}});
  const shape = new Shape.default([scaledPoints]);

  const roundedShape = shape.offset(buffer*scaleFactor, {
    jointType: 'jtRound',
    endType: 'etClosedPolygon',
    miterLimit: 2.0,
    roundPrecision: 0.25
  })

  if (!roundedShape || !roundedShape.paths || roundedShape.paths.length == 0) {
    return null;
  }

  const roundedPolygon = new paper.Path(
    roundedShape.paths[0].map((p) => {
      return new paper.Point(p.X / scaleFactor, p.Y / scaleFactor)
    })
  )
  // console.log(roundedPolygon);

  return roundedPolygon;
}

function show(path, color) {
  if (debug) {
    path.style = {
      strokeWidth: 1,
      strokeColor: color || 'green'
    };
  }
}

function showCut(path) {
  path.style = {
    strokeWidth: 1,
    strokeColor: 'red'
  };
}

function pixelInches(n) {
  return n * 96;
}

function loadAndResizeFile(filename) {
  const svgData = fs.readFileSync(filename, 'utf8');
  var svgItem = paper.project.importSVG(svgData); //, {insert: false})
  show(svgItem, 'black');

  const maxSizeInches = 3;
  const maxSizePixels = pixelInches(maxSizeInches);
  const scale = Math.min(
    maxSizePixels / svgItem.bounds.width,
    maxSizePixels / svgItem.bounds.height
  )
  console.log(svgItem.bounds.width, svgItem.bounds.height)
  console.log(scale);
  svgItem = svgItem.scale(scale);
  svgItem.translate(new paper.Point(
    -svgItem.bounds.x,
    -svgItem.bounds.y
  ));
  console.log(svgItem.bounds.width, svgItem.bounds.height)
  return svgItem;
}

function processFile(filename) {
  console.log(`processing ${filename}`);
  const forceContainment = true; //!!args['forceContainment'];

  paper.setup([1000, 1000]);
  let svgItem = loadAndResizeFile(filename);
  paper.setup(new paper.Size(svgItem.bounds.width + 10, svgItem.bounds.height + 10))
  svgItem = loadAndResizeFile(filename);

  const path = svgItem.children[1];
  const actualPath = path.children[0];
  show(path, 'black');

  const numPointsToGet = 50;
  let points = [];
  // console.log(actualPath)
  for (let i = 0; i < numPointsToGet; i++) {
    const p = actualPath.getPointAt((i / numPointsToGet) * actualPath.length);
    points.push([p.x, p.y])
  }

  console.log('making extra points');
  const numExtraPoints = 20;
  const extraPoints = [];
  while (extraPoints.length < numExtraPoints * 2) {
    const testPoint = new paper.Point(
      Math.random() * svgItem.bounds.width,
      Math.random() * svgItem.bounds.height
    );
    if (path.contains(testPoint)) {
      extraPoints.push([testPoint.x, testPoint.y]);
      show(new paper.Path.Circle(testPoint, 1))
    }
  }
  console.log('done with extra points');

  showCut(svgItem);
  actualPath.closePath();

  const outerShape = bufferPath(1, actualPath);
  outerShape.closePath();
  show(outerShape, 'brown')

  let innerShape = bufferPath(-pixelInches(0.1), actualPath);
  // innerShape = bufferPath(1, actualPath);
  show(innerShape, 'brown')
  innerShape.closePath();

  // const shouldSubtract = true;

  let veryInnerShape = bufferPath(-pixelInches(0.2), actualPath);
  show(veryInnerShape, 'brown')
  veryInnerShape.closePath();

  console.log('triangulating')
  const delaunay = Delaunay.from(points.concat(extraPoints));
  console.log('done')
  // const voronoi = delaunay.voronoi([0, 0, path.bounds.width, path.bounds.height]);
  const numTriangles = Array.from(delaunay.trianglePolygons())
  // Array.from(delaunay.trianglePolygons()).forEach((triangle, index) => {
  //   console.log(`triangle ${index} of ${numTriangles.length}`)
  //   const points = [
  //     new paper.Point(triangle[0][0], triangle[0][1]),
  //     new paper.Point(triangle[1][0], triangle[1][1]),
  //     new paper.Point(triangle[2][0], triangle[2][1]),
  //     new paper.Point(triangle[3][0], triangle[3][1]),
  //   ];
  //   const tri = new paper.Path(points);

  //   show(tri);
  //   const smallShape = bufferPoints(-pixelInches(0.02), points);
  //   if (smallShape) {
  //     smallShape.closePath();
  //     let cutOffShape = smallShape.intersect(innerShape);
  //     smallShape.remove();
      
  //     if (args.shouldSubtract) {
  //       cutOffShape = cutOffShape.subtract(veryInnerShape)
  //     }

  //     showCut(cutOffShape);
  //   }
  // })

  const threadHoleSize = pixelInches(0.1)
  const threadHoleBuffer = pixelInches(0.1)
  let  threadHole = new paper.Path.Circle(
    new paper.Point(svgItem.bounds.width / 2, 0),
    threadHoleSize + threadHoleBuffer
  )
  while (!threadHole.intersects(actualPath)) {
    threadHole = threadHole.translate(
      new paper.Point(0, 1)
    )
  }
  showCut(threadHole);

  console.log('all done, writing out')
  const outputFilename =
    pathModule.basename(filename).split('.')[0] + '-voronoi4.svg';
  fs.writeFileSync(outputFilename, paper.project.exportSVG({ asString: true }));
}
