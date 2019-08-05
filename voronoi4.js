const Delaunay = require('d3-delaunay').Delaunay;

var fs = require('fs');

var paper = require('paper-jsdom');

const _ = require('lodash');

var pathModule = require('path');

const args = require('minimist')(process.argv.slice(2));
const debug = args.debug;

const threadHoleSize = pointInches(Number.parseFloat(args.holeSize) || 0.25);
const threadHoleBuffer = pointInches(0.1);
const threadHoleTotalSize = threadHoleSize + threadHoleBuffer;

const utils = require('./utils.js');
const { showCut, show, approxShape, isArgTrue, bufferPath, bufferPoints, generatePointsInPath } = utils;

if (!debug) {
  console.log = (s) => {}
}

console.log('debug', debug);
args._.forEach(processFile);

// some people say 96, illustrator says 72

function pointInches(n) {
  return n * 72;
}

function inchPoints(n) {
  return n / 72;
}

function loadAndResizeFile({filename, yOffset = 0, xOffset = 0}) {
  const svgData = fs.readFileSync(filename, 'utf8');
  var svgItem = paper.project.importSVG(svgData); //, {insert: false})
  // show(svgItem, 'black');
  const path = svgItem.children[1];
  console.log('num children', svgItem.children.length);
  let actualPath = path;
  if (path.children) {
    actualPath = _.sortBy(path.children, (path) => -path.length)[0]
    console.log('num children children', path.children.length);
    // actualPath = path.children[0];
  }
  const maxSizeInches = 3;
  const maxSizePixels = pointInches(maxSizeInches);
  console.log(`current size: ${inchPoints(actualPath.bounds.width)} x ${inchPoints(actualPath.bounds.height)}`)
  const scale = Math.min(
    maxSizePixels / actualPath.bounds.width,
    maxSizePixels / actualPath.bounds.height
  );
  // console.log(svgItem.bounds.width, svgItem.bounds.height);
  // console.log(scale);

  svgItem = svgItem.scale(scale);
  svgItem.translate(
    new paper.Point(-actualPath.bounds.x + xOffset, -actualPath.bounds.y + yOffset)
  );
  console.log(`new size: ${inchPoints(actualPath.bounds.width)} x ${inchPoints(actualPath.bounds.height)}`)
  console.log(`new size: ${inchPoints(svgItem.bounds.width)} x ${inchPoints(svgItem.bounds.height)}`)
  svgItem.remove();

  // console.log(svgItem.bounds.width, svgItem.bounds.height);
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
    const intersection = path1.subtract(path2, {insert: false, trace: false});
    // showCut(intersection, 'blue')
    if (intersection) {
      // console.log(intersection.length);
      return intersection.length < path1.length * 0.8;
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
  // let outerShape = bufferPath(1, path);
  // outerShape.closePath();
  // show(outerShape, 'brown');
  // outerShape = outerShape.unite(path);
  const outerShape = path;

  show(new paper.Path(approxShape(path)), 'brown');
  let innerShapes = bufferPath({buffer: -pointInches(0.1), path});
  show(innerShapes, 'brown');
  innerShapes.forEach(innerShape => processInnerShape({innerShape, outerShape}))
}

function processInnerShape({outerShape, innerShape}) {
  let veryInnerShapes = bufferPath({buffer: -pointInches(0.2), path: outerShape});
  show(veryInnerShapes, 'brown');

  const numPointsToGet = args.numPoints || 50;
  const points = pointsToArray(approxShape(innerShape, numPointsToGet));
  points.forEach(p => show(new paper.Path.Circle(p, 1), 'blue'));

  const extraPoints = generatePointsInPath({path: innerShape});
  const allPoints = points.concat(extraPoints);

  console.log('triangulating');
  const delaunay = Delaunay.from(allPoints);
  console.log('done');
  let polygonArray = Array.from(delaunay.trianglePolygons());
  if (isArgTrue(args.voronoi)) {
    const voronoi = delaunay.voronoi([
      outerShape.bounds.x,
      outerShape.bounds.y,
      outerShape.bounds.x + outerShape.bounds.width,
      outerShape.bounds.y + outerShape.bounds.height
    ]);
    polygonArray = Array.from(voronoi.cellPolygons());
  }
  console.log(`have ${polygonArray.length} triangles`);
  polygonArray.forEach((polygon, index) => {
    // console.log(`triangle ${index} of ${numTriangles.length}`);
    const points = polygon.map(p => new paper.Point(p[0], p[1]));
    // const tri = new paper.Path(points);
    // showCut(tri);
    let smallShape = bufferPoints(-pointInches(args.outlineSize || 0.02), points);
    if (smallShape) {
      smallShape = smallShape[0];
      smallShape.closePath();
      // showCut(smallShape)

      let cutOffShape = smallShape.intersect(innerShape);

      if (isArgTrue(args.subtract) && veryInnerShapes) {
        veryInnerShapes.forEach((veryInnerShape) =>
          cutOffShape = cutOffShape.subtract(veryInnerShape)
        )
      }

      // cutOffShape.translate(new paper.Point(0, threadHoleTotalSize * 2));

      showCut(cutOffShape);
    } else {
      console.log(`could not shrink :-( triagnel ${index}`);
    }
  });
}

function pointsToArray(points) {
  const ret = [];
  points.forEach(p => {
    ret.push([p.x, p.y]);
  });
  return ret;
}

function loadFileAdjustCanvas({filename, xOffset = 0, yOffset = 0, xPadding = 0, yPadding = 0}) {
  paper.setup([10, 10]);
  paper.settings.insertItems = false;
  let actualPath = loadAndResizeFile({filename, xOffset, yOffset});

  if (!actualPath.closed) {
    console.log('not closed outer ring');
    process.exit(1);
  }
  return actualPath;
}

function processFile(filename) {
  console.log(`processing ${filename}`);
  const actualPath = loadFileAdjustCanvas({filename, yOffset: threadHoleTotalSize*2, xPadding: threadHoleTotalSize*2, yPadding: threadHoleTotalSize*2})

  // show(actualPath, 'black');

  buildTriangles({ path: actualPath }); //, points: allPoints });
  addHole({ path: actualPath, size: threadHoleSize, buffer: threadHoleBuffer });

  console.log('all done, writing out');

  const interpolate = require('interpolate-string');
  let outputTemplate = args.outputTemplate || '{{basePath}}-voronoi4.svg';

  const outputFilename = interpolate(outputTemplate, {
    basePath: pathModule.basename(filename).split('.')[0]
	});
	writeSVG(outputFilename);


  var opn = require('opn');
  if (args.open) {
    const fullPath = 'file://' + process.cwd() + '/' + outputFilename;
    console.log(fullPath);
    opn(fullPath, { app: 'google chrome' });
  }
}
