const Delaunay = require('d3-delaunay').Delaunay;

var fs = require('fs');

var paper = require('paper-jsdom');

const _ = require('lodash');

var pathModule = require('path');

var ArgumentParser = require('argparse').ArgumentParser;
var parser = new ArgumentParser({
  addHelp: true
});
parser.addArgument(
  [ 'inputFile' ],
  {
    nargs: '+'
  }
)
parser.addArgument(
  [ '--debug' ],
  {
    default: false,
    action: 'storeTrue',
    help: 'output debugging in console and svg output'
  }
);
parser.addArgument(
  [ '--inchInPoints' ],
  {
    defaultValue: 72,
    help: 'an inch in points, some people say 96, illustrator says 72'
  }
);
parser.addArgument(
  '--addHole',
  {
    help: 'add a hole to the output for putting a cord or jumpring through',
    defaultValue: false,
    action: 'storeTrue'
  }
);
parser.addArgument(
  '--butt',
  {
    help: 'if shape is wider than it is long, puts hole at long end rather than middle of width, only meaningful with --addHole',
    defaultValue: false,
    action: 'storeTrue'

  }
);
parser.addArgument(
  '--holeSize',
  {
    help: '--addHole size in inches',
    defaultValue: 0.1,
    type: 'float'
  }
);
parser.addArgument(
  '--maxWidth',
  {
    help: 'maximum width (in inches) to resize width of input svg to',
    defaultValue: 3,
    type: 'float'
  }
);
parser.addArgument(
  '--maxHeight',
  {
    help: 'maximum height (in inches) to resize height of input svg to',
    defaultValue: 3,
    type: 'float'
  }
);
parser.addArgument(
  '--voronoi',
  {
    help: 'if false, fills with delaunay triangles, if true, with voronoi diagram',
    defaultValue: false,
    action: 'storeTrue'
  }
);
parser.addArgument(
  '--subtract',
  {
    help: 'subtracts a shrunk copy of the outline from the inner lace',
    defaultValue: false,
    action: 'storeTrue'
  }
);
parser.addArgument(
  '--numPoints',
  {
    help: 'number of points to sample along outline for triangulation',
    defaultValue: 50,
    type: 'int'
  }
);
parser.addArgument(
  '--numExtraPoints',
  {
    help: 'number of extra random interior points to add to triangulation',
    defaultValue: 25,
    type: 'int'
  }
);
parser.addArgument(
  '--open',
  {
    help: 'open resulting svg in google chrome',
    defaultValue: false,
    action: 'storeTrue'
  }
);
parser.addArgument(
  '--outputTemplate',
  {
    help: 'template for outputting final svg. {{basePath}} is the only interpolated variable - original filename without extension',
    defaultValue: '{{basePath}}-lace.svg'
  }
);
parser.addArgument(
  '--subtractBuffer',
  {
    help: '(in inches) how much to shrink outline by to create inner shape',
    defaultValue: 0.2,
    type: 'float'
  }
)
parser.addArgument(
  '--outlineSize',
  {
    help: '(in inches) half of border width between inner cutouts',
    defaultValue: 0.03,
    type: 'float'
  }
)
parser.addArgument(
  '--safeBorder',
  {
    help: '(in inches) width of border around the inner design',
    defaultValue: 0.1,
    type: 'float'
  }
)
parser.addArgument(
  '--rounded',
  {
    help: 'rounds corners of triangles/voronois',
    defaultValue: false,
    action: 'storeTrue'
  }
)

var args = parser.parseArgs();
console.dir(args);

const debug = args.debug;

const threadHoleSize = pointInches(args.holeSize)
const threadHoleBuffer = pointInches(0.04);
const threadHoleTotalSize = threadHoleSize + threadHoleBuffer;

const utils = require('./utils.js');
const { writeSVG, showCut, show, approxShape, bufferPath, bufferPoints, generatePointsInPath, roundCorners } = utils;

if (!debug) {
  console.log = (s) => {}
}

console.log('debug', debug);
args.inputFile.forEach(processFile);

function pointInches(n) {
  return n * args.inchInPoints;
}

function inchPoints(n) {
  return n / args.inchInPoints;
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
  const maxWidthPixels = pointInches(args.maxWidth);
  const maxHeightPixels = pointInches(args.maxHeight);
  console.log(`current size: ${inchPoints(actualPath.bounds.width)} x ${inchPoints(actualPath.bounds.height)}`)
  const scale = Math.min(
    maxWidthPixels / actualPath.bounds.width,
    maxHeightPixels / actualPath.bounds.height
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
  if (!args.addHole) {
    showCut(path);
    return;
  }
  let movement = new paper.Point(0, 1);
  let initial = new paper.Point(path.bounds.width / 2, 0);
  // super wide
  if (args.butt && path.bounds.width / path.bounds.height > 3) {
    movement = new paper.Point(-1, 0);
    initial = new paper.Point(
      path.bounds.x + path.bounds.width + (size + buffer) * 2,
      path.bounds.y + path.bounds.height / 2
    );
  }
  // add hole for string
  let threadHoleOuter = new paper.Path.Circle(initial, size + buffer);

  function touchingEnough(path1, path2) {
		console.log('length of path1', path1.length)
		console.log('length of path1', path1.area)
		
		const intersection = path1.intersect(path2, {insert: false, trace: false});
		console.log('length of path1 after subtract path2', intersection.length)
		console.log('length of path1 after subtract path2', intersection.area)
    // showCut(intersection, 'blue')
    if (intersection) {
      console.log(intersection.length);
      return intersection.length < path1.length * 0.5;
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
  let innerShapes = bufferPath({buffer: -pointInches(args.safeBorder), path});
  show(innerShapes, 'brown');
  innerShapes.forEach(innerShape => processInnerShape({innerShape, outerShape}))
}

function processInnerShape({outerShape, innerShape}) {
  let veryInnerShapes = bufferPath({buffer: -pointInches(args.subtractBuffer), path: outerShape});
  show(veryInnerShapes, 'brown');

  const numPointsToGet = args.numPoints;
  const points = pointsToArray(approxShape(innerShape, numPointsToGet));
  points.forEach(p => show(new paper.Path.Circle(p, 1), 'blue'));

  const extraPoints = generatePointsInPath({path: innerShape, numExtraPoints: args.numExtraPoints});
  const allPoints = points.concat(extraPoints);

  console.log('triangulating');
  const delaunay = Delaunay.from(allPoints);
  console.log('done');
  let polygonArray = Array.from(delaunay.trianglePolygons());
  if (args.voronoi) {
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
    let smallShape = bufferPoints(-pointInches(args.outlineSize), points);
    if (smallShape) {
      smallShape = smallShape[0];
      smallShape.closePath();

   if (args.rounded) {
     smallShape = roundCorners(smallShape, 2)
   }

	 smallShape.closePath();
      let cutOffShape = smallShape.intersect(innerShape);

      if (args.subtract && veryInnerShapes) {
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
  const outputFilename = interpolate(args.outputTemplate, {
    basePath: pathModule.basename(filename).split('.')[0]
	});
	writeSVG(outputFilename);


  var opn = require('open');
  if (args.open) {
    const fullPath = 'file://' + process.cwd() + '/' + outputFilename;
    console.log(fullPath);
    opn(fullPath, { app: 'google chrome' });
  }
}