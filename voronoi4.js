const Delaunay = require('d3-delaunay').Delaunay;

var fs = require('fs');

var paper = require('paper-jsdom');

const _ = require('lodash');

var pathModule = require('path');

var shuffle = require('shuffle-array');

var Shape = require('@doodle3d/clipper-js');

const threadHoleSize = pixelInches(0.1);
const threadHoleBuffer = pixelInches(0.05);
const threadHoleTotalSize = threadHoleSize + threadHoleBuffer;

const args = require('minimist')(process.argv.slice(2));
const debug = args.debug;
console.log('debug', debug);
args._.forEach(processFile);

function fixPoint({ point, shape }) {
  return new paper.Point(
    point.x + shape.bounds.x,
    point.y + shape.bounds.y / 2
  );
}

function getRelativePoint({ shape, pos }) {
  return fixPoint({ shape, point: shape.getPointAt(pos) });
}

function approxShape(shape, numPointsToGet = 200, useRelative = false) {
  // console.log('in appro: ', shape);
  let points = [];
  let shapeToUse = shape;

  if (shape instanceof paper.CompoundPath) {
    shape = shape.children[0];
  }
  // console.log(actualPath)
  for (let i = 0; i < numPointsToGet; i++) {
    if (useRelative) {
      points.push(
        getRelativePoint({
          shape: shapeToUse,
          pos: (i / numPointsToGet) * shapeToUse.length
        })
      );
    } else {
      points.push(shapeToUse.getPointAt((i / numPointsToGet) * shapeToUse.length));
    }
   
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

function showCut(path, color) {
  path.style = {
    strokeWidth: 1,
    strokeColor: color || 'red'
  };
}

function pixelInches(n) {
  return n * 96;
}

function loadAndResizeFile(filename) {
  const svgData = fs.readFileSync(filename, 'utf8');
  var svgItem = paper.project.importSVG(svgData); //, {insert: false})
  // show(svgItem, 'black');
  const path = svgItem.children[1];
  console.log(svgItem.children.length);
  let actualPath = path;
  if (path.children) {
    actualPath = path.children[0];
  }
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
    new paper.Point(-actualPath.bounds.x, -actualPath.bounds.y + (threadHoleTotalSize * 2))
  );
  console.log(svgItem.bounds.width, svgItem.bounds.height);
  return actualPath;
}

function addHole({ path, size, buffer }) {
  let movement = new paper.Point(0, 1);
  let initial = new paper.Point(path.bounds.width / 2, 0);
  // super wide
  if (args.butt != 'no' && path.bounds.width / path.bounds.height > 3) {
    movement = new paper.Point(-1, 0);
    initial = new paper.Point(
      path.bounds.x + path.bounds.width + (size + buffer) * 2,
      path.bounds.y + path.bounds.height / 2
    );
  }
  // add hole for string
  let threadHoleOuter = new paper.Path.Circle(initial, size + buffer);

  function touchingEnough(path1, path2) {
    const intersection = path1.intersect(path2);
    // showCut(intersection, 'blue')
    if (intersection) {
      console.log(intersection.length);
      return intersection.length > path1.length * 0.8;
    }
    return false;
  }

  while (
    !threadHoleOuter.intersects(path) ||
    !touchingEnough(threadHoleOuter, path)
  ) {
    threadHoleOuter = threadHoleOuter.translate(movement);
  }
  // showCut(threadHoleOuter);
  threadHoleOuter.scale(1.2);
  for (let i = 0; i < 10; i++) {
    threadHoleOuter.translate(movement);
  }

  let pathToUnite = path;
  if (pathToUnite instanceof paper.CompoundPath) {
    pathToUnite = pathToUnite.children[0];
  }
  showCut(threadHoleOuter.unite(pathToUnite));

  const threadHole = new paper.Path.Circle(threadHoleOuter.bounds.center, size);
  showCut(threadHole);
}

function buildTriangles({ path }) {
  const outerShape = bufferPath(1, path);
  outerShape.closePath();
  show(outerShape, 'brown');

  show(new paper.Path(approxShape(path)), 'brown');
  let innerShape = bufferPath(-pixelInches(0.1), path);
  show(innerShape, 'brown');
  innerShape.closePath();

  // const shouldSubtract = true;

  let veryInnerShape = bufferPath(-pixelInches(0.2), path);
  show(veryInnerShape, 'brown');
  if (veryInnerShape) {
    veryInnerShape.closePath();
  }

  const numPointsToGet = 50;
  const points = pointsToArray(approxShape(innerShape, numPointsToGet));
  points.forEach(p => show(new paper.Path.Circle(p, 1), 'blue'));

  const extraPoints = generatePointsInPath(innerShape);
  const allPoints = points.concat(extraPoints);

  console.log('triangulating');
  const delaunay = Delaunay.from(allPoints);
  console.log('done');
  let polygonArray = Array.from(delaunay.trianglePolygons());
  if (args.voronoi) {
    const voronoi = delaunay.voronoi([
      path.bounds.x,
      path.bounds.y,
      path.bounds.x + path.bounds.width,
      path.bounds.y + path.bounds.height
    ]);
    polygonArray = Array.from(voronoi.cellPolygons());
  }
  console.log(`have ${polygonArray.length} triangles`);
  polygonArray.forEach((polygon, index) => {
    // console.log(`triangle ${index} of ${numTriangles.length}`);
    const points = polygon.map(p => new paper.Point(p[0], p[1]));
    // const tri = new paper.Path(points);
    // showCut(tri);
    const smallShape = bufferPoints(-pixelInches(0.02), points);
    if (smallShape) {
      smallShape.closePath();
      // showCut(smallShape)

      let cutOffShape = smallShape.intersect(innerShape);

      if (args.shouldSubtract && veryInnerShape) {
        cutOffShape = cutOffShape.subtract(veryInnerShape);
      }

      // cutOffShape.translate(new paper.Point(0, threadHoleTotalSize * 2));

      showCut(cutOffShape);
    } else {
      console.log(`could not shrink :-( triagnel ${index}`);
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
    ret.push([p.x, p.y]);
  });
  return ret;
}

function processFile(filename) {
  console.log(`processing ${filename}`);
  const forceContainment = true; //!!args['forceContainment'];

  paper.setup([1000, 1000]);
  let svgItem = loadAndResizeFile(filename);
  let actualPath = svgItem;
  paper.setup(
    new paper.Size(
      actualPath.bounds.width + 10 + threadHoleTotalSize * 2,
      actualPath.bounds.height + 10 + threadHoleTotalSize * 2
    )
  );
  paper.project.activeLayer.addChild(svgItem);
  svgItem = loadAndResizeFile(filename);
  // svgItem = svgItem.translate(new paper.Point(0, ));
  actualPath = svgItem;
  if (!actualPath.closed) {
    console.log('not closed outer ring');
    process.exit(1);
  }

  // show(actualPath, 'black');

  // showCut(svgItem);
  actualPath.closePath();

  buildTriangles({ path: actualPath }); //, points: allPoints });
  addHole({ path: actualPath, size: threadHoleSize, buffer: threadHoleBuffer });

  console.log('all done, writing out');

  const interpolate = require('interpolate-string');
  let outputTemplate = args.outputTemplate || '{{basePath}}-voronoi4.svg';

  const outputFilename = interpolate(outputTemplate, {
    basePath: pathModule.basename(filename).split('.')[0]
  });
  fs.writeFileSync(outputFilename, paper.project.exportSVG({ asString: true }));

  var opn = require('opn');
  if (args.open) {
    const fullPath = 'file://' + process.cwd() + '/' + outputFilename;
    console.log(fullPath);
    opn(fullPath, { app: 'google chrome' });
  }
}
