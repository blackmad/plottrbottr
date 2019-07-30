const Delaunay = require('d3-delaunay').Delaunay;

var fs = require('fs');

var paper = require('paper-jsdom');

const _ = require('lodash');

var pathModule = require('path');

var shuffle = require('shuffle-array');

var Shape = require('@doodle3d/clipper-js');

const args = require('minimist')(process.argv.slice(2));
const debug = args.debug;
console.log('debug', debug);
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
  const roundingBit = (1 / scaleFactor) * 10;
  const scaledPoints = points.map(p => {
    return {
      X: p.x * scaleFactor + roundingBit,
      Y: p.y * scaleFactor + roundingBit
    };
  });
  const shape = new Shape.default([scaledPoints]);

  const roundedShape = shape.offset(buffer * scaleFactor, {
    jointType: 'jtRound',
    endType: 'etClosedPolygon',
    miterLimit: 2.0,
    roundPrecision: 0.25
  });

  if (!roundedShape || !roundedShape.paths || roundedShape.paths.length == 0) {
    return null;
  }

  const roundedPolygon = new paper.Path(
    roundedShape.paths[0].map(p => {
      return new paper.Point(p.X / scaleFactor, p.Y / scaleFactor);
    })
  );
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
  const path = svgItem.children[1];
  const actualPath = path.children[0];

  const maxSizeInches = 3;
  const maxSizePixels = pixelInches(maxSizeInches);
  const scale = Math.min(
    maxSizePixels / actualPath.bounds.width,
    maxSizePixels / actualPath.bounds.height
  );
  console.log(svgItem.bounds.width, svgItem.bounds.height);
  console.log(scale);

  svgItem = svgItem.scale(scale);
  svgItem.translate(
    new paper.Point(-actualPath.bounds.x, -actualPath.bounds.y)
  );
  console.log(svgItem.bounds.width, svgItem.bounds.height);
  return actualPath;
}

function addHole({path, size, buffer}) {
  // add hole for string
  let threadHoleOuter = new paper.Path.Circle(
    new paper.Point(path.bounds.width / 2, 0),
    size + buffer
  );
  while (!threadHoleOuter.intersects(path)) {
    threadHoleOuter = threadHoleOuter.translate(new paper.Point(0, 1));
  }
  // showCut(threadHoleOuter);
  threadHoleOuter.scale(1.2);
  showCut(threadHoleOuter.unite(path));

  const threadHole = new paper.Path.Circle(
    threadHoleOuter.bounds.center,
    size
  );
  showCut(threadHole);
}

function buildTriangles({ path, points }) {
  const outerShape = bufferPath(1, path);
  outerShape.closePath();
  show(outerShape, 'brown');

  let innerShape = bufferPath(-pixelInches(0.1), path);
  // innerShape = bufferPath(1, actualPath);
  show(innerShape, 'brown');
  innerShape.closePath();

  // const shouldSubtract = true;

  let veryInnerShape = bufferPath(-pixelInches(0.2), path);
  show(veryInnerShape, 'brown');
  veryInnerShape.closePath();

  console.log('triangulating');
  const delaunay = Delaunay.from(points);
  console.log('done');
  // const voronoi = delaunay.voronoi([0, 0, path.bounds.width, path.bounds.height]);
  const numTriangles = Array.from(delaunay.trianglePolygons());
  Array.from(delaunay.trianglePolygons()).forEach((triangle, index) => {
    console.log(`triangle ${index} of ${numTriangles.length}`);
    const points = [
      new paper.Point(triangle[0][0], triangle[0][1]),
      new paper.Point(triangle[1][0], triangle[1][1]),
      new paper.Point(triangle[2][0], triangle[2][1]),
      new paper.Point(triangle[3][0], triangle[3][1])
    ];
    const tri = new paper.Path(points);

    show(tri);
    const smallShape = bufferPoints(-pixelInches(0.02), points);
    if (smallShape) {
      smallShape.closePath();
      let cutOffShape = smallShape.intersect(innerShape);
      smallShape.remove();

      if (args.shouldSubtract) {
        cutOffShape = cutOffShape.subtract(veryInnerShape);
      }

      showCut(cutOffShape);
    }
  });
}

function generatePointsInPath(path) {
  console.log('making extra points');
  const numExtraPoints = 5;
  const extraPoints = [];
  while (extraPoints.length < numExtraPoints * 2) {
    const testPoint = new paper.Point(
      Math.random() * path.bounds.width + path.bounds.x,
      Math.random() * path.bounds.height + path.bounds.y
    );
    if (path.contains(testPoint)) {
      extraPoints.push([testPoint.x, testPoint.y]);
      show(new paper.Path.Circle(testPoint, 1));
    }
  }
  console.log('done with extra points');
  return extraPoints;
}

function pointsToArray(points) {
  const ret = [];
  points.forEach(p => {
    ret.push([p.x, p.y])
  });
  return ret;
}

function processFile(filename) {
  console.log(`processing ${filename}`);
  const forceContainment = true; //!!args['forceContainment'];

  const threadHoleSize = pixelInches(0.1);
  const threadHoleBuffer = pixelInches(0.05);
  const threadHoleTotalSize = threadHoleSize + threadHoleBuffer;

  paper.setup([1000, 1000]);
  let svgItem = loadAndResizeFile(filename);
  let actualPath = svgItem;
  paper.setup(
    new paper.Size(actualPath.bounds.width + 10, actualPath.bounds.height + 10 + threadHoleTotalSize*2)
  );
  paper.project.activeLayer.addChild(svgItem);
  svgItem = loadAndResizeFile(filename);
  svgItem = svgItem.translate(new paper.Point(0, threadHoleTotalSize*2));
  actualPath = svgItem;

  show(actualPath, 'black');

  const numPointsToGet = 50;
  const points = pointsToArray(approxShape(actualPath, numPointsToGet));
  const extraPoints = generatePointsInPath(actualPath);
  const allPoints = points.concat(extraPoints)
  // showCut(svgItem);
  actualPath.closePath();

  buildTriangles({ path: actualPath, points: allPoints });
  addHole({path: actualPath, size: threadHoleSize, buffer: threadHoleBuffer});

  console.log('all done, writing out');
  const outputFilename =
    pathModule.basename(filename).split('.')[0] + '-voronoi4.svg';
  fs.writeFileSync(outputFilename, paper.project.exportSVG({ asString: true }));

  var opn = require('opn');
  if (args.open) {
    const fullPath = 'file://' + process.cwd() + '/' + outputFilename;
    console.log(fullPath);
    opn(fullPath, {app: 'google chrome'});
  }
}
