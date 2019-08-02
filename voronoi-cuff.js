const Delaunay = require('d3-delaunay').Delaunay;

var fs = require('fs');

var paper = require('paper-jsdom');

const _ = require('lodash');

var pathModule = require('path');

var shuffle = require('shuffle-array');

var Shape = require('@doodle3d/clipper-js');

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

console.log(require('./straight-cuff-outer'));
var StraightCuffOuter = require('./straight-cuff-outer').StraightCuffOuter;

const args = require('minimist')(process.argv.slice(2));
const debug = args.debug;

const cuffWidth = pixelInches(7.5)
const cuffHeight = pixelInches(2)

if (!debug) {
  console.log = s => {};
}

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
    shapeToUse = shape.children[0];
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
      points.push(
        shapeToUse.getPointAt((i / numPointsToGet) * shapeToUse.length)
      );
    }
  }
  return points;
}

function bufferPath(buffer, path, numPoints) {
  const points = approxShape(path, numPoints);
  // console.log(points);
  return bufferPoints(buffer, points);
}

function bufferPoints(buffer, points) {
  const scaleFactor = 1000;
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
      strokeWidth: '1px',
      strokeColor: color || 'green',
      fill: 'none'
    };
  }
}

function showCut(path, color) {
  path.style = {
    strokeWidth: '1px',
    strokeColor: color || 'red',
    fill: 'none'
  };
}

function pixelInches(n) {
  return n;
}

function loadAndResizeFile({ filename, yOffset = 0, xOffset = 0 }) {
  const svgData = fs.readFileSync(filename, 'utf8');
  var svgItem = paper.project.importSVG(svgData); //, {insert: false})
  // show(svgItem, 'black');
  const path = svgItem.children[1];
  console.log('num children', svgItem.children.length);
  let actualPath = path;
  if (path.children) {
    actualPath = _.sortBy(path.children, path => -path.length)[0];
    console.log('num children children', path.children.length);
    // actualPath = path.children[0];
  }
  const scale = Math.min(
    cuffWidth*0.65 / actualPath.bounds.width,
    cuffHeight*0.65 / actualPath.bounds.height
  );
  console.log(svgItem.bounds.width, svgItem.bounds.height);
  console.log(scale);

  svgItem = svgItem.scale(scale);
  svgItem.translate(
        new paper.Point(
          -actualPath.bounds.x + (cuffWidth - actualPath.bounds.width)/2,
          -actualPath.bounds.y + (cuffHeight - actualPath.bounds.height)/2 
        )
      );

  // showCut(new paper.Path.Rectangle(actualPath.bounds));
  console.log(svgItem.bounds.width, svgItem.bounds.height);
  return actualPath;
}

function makeOutline() {
  // console.log
  const outer = new StraightCuffOuter().make({
    height: pixelInches(2), 
    wristCircumference: pixelInches(7), 
    safeBorderWidth: pixelInches(0.25)
  });
  showCut(outer.outerModel);
  return outer;

  // const outline = new paper.Path.Rectangle(new paper.Rectangle(new paper.Point(1, 1), new paper.Size(cuffWidth-2, cuffHeight-2)))
  // showCut(outline)
  return outline;
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

function buildTriangles({ path, rect }) {
  const outerShape = bufferPath(1, path);
  outerShape.closePath();
  show(outerShape, 'brown');

  const numPointsToGet = 40 + Math.floor(Math.random()*10);
  const points = pointsToArray(approxShape(path, numPointsToGet));
  points.forEach(p => show(new paper.Path.Circle(p, 0.02), 'blue'));

  let rectPoints = [];
  
  if (!args.voronoi) {
    console.log('rect points!')
    rectPoints = pointsToArray(approxShape(rect, numPointsToGet));
    console.log(rectPoints);
    rectPoints.forEach(p => show(new paper.Path.Circle(p, 0.02), 'blue'));
  }

  const extraPoints = generatePointsInPath(rect, path);

  const allPoints = points.concat(extraPoints).concat(rectPoints);

  console.log('triangulating');
  const delaunay = Delaunay.from(allPoints);
  console.log('done');
  let polygonArray = Array.from(delaunay.trianglePolygons());
  if (args.voronoi) {
    const voronoi = delaunay.voronoi([
      rect.bounds.x,
      rect.bounds.y,
      rect.bounds.x + rect.bounds.width,
      rect.bounds.y + rect.bounds.height
    ]);
    polygonArray = Array.from(voronoi.cellPolygons());
  }
  console.log(`have ${polygonArray.length} triangles`);
  polygonArray.forEach((polygon, index) => {
    // console.log(`triangle ${index} of ${numTriangles.length}`);
    const points = polygon.map(p => new paper.Point(p[0], p[1]));
    // const tri = new paper.Path(points);
    // showCut(tri);
    let smallShape = bufferPoints(-pixelInches(0.04), points);
    if (!smallShape || smallShape.area < 0.1)  { 
      console.log('trying again')
      smallShape = bufferPoints(-pixelInches(0.03), points);
    }
    if (smallShape) {
      smallShape.closePath();
      // showCut(smallShape)

      let cutOffShape = smallShape.subtract(path);

      // cutOffShape.translate(new paper.Point(0, threadHoleTotalSize * 2));

      showCut(cutOffShape);
    } else {
      console.log(`could not shrink :-( triagnel ${index}`);
    }
  });
}

function generatePointsInPath(path, exclude) {
  console.log('making extra points');
  const numExtraPoints = 5 + Math.floor(5 * Math.random()); 
  const extraPoints = [];
  while (extraPoints.length < numExtraPoints * 2) {
    const testPoint = new paper.Point(
      Math.random() * path.bounds.width + path.bounds.x,
      Math.random() * path.bounds.height + path.bounds.y
    );
    if (!exclude.contains(testPoint)) {
      extraPoints.push([testPoint.x, testPoint.y]);
      show(new paper.Path.Circle(testPoint, 0.02));
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

function loadFileAdjustCanvas({
  filename,
  xOffset = 0,
  yOffset = 0,
  xPadding = 0,
  yPadding = 0
}) {
  paper.setup([cuffWidth+4, cuffHeight]);

  let actualPath = loadAndResizeFile({ filename, xOffset, yOffset });

  if (!actualPath.closed) {
    console.log('not closed outer ring');
    process.exit(1);
  }
  return actualPath;
}

function processFile(filename) {
  console.log(`processing ${filename}`);
  let actualPath = loadFileAdjustCanvas({
    filename
  });
  // showCut(actualPath);

  const outline = makeOutline();
  // actualPath.
  console.log(outline.boundaryModel.bounds.height);
  console.log(actualPath.bounds.height);
  console.log(outline.boundaryModel.bounds.width - actualPath.bounds.width);
  actualPath = actualPath.translate(
    new paper.Point(
      -actualPath.bounds.x + outline.boundaryModel.bounds.x + (outline.boundaryModel.bounds.width - actualPath.bounds.width)/2,
      -actualPath.bounds.y + outline.boundaryModel.bounds.y + (outline.boundaryModel.bounds.height - actualPath.bounds.height)/2 
    )
  );

  // showCut(actualPath)
  buildTriangles({path: actualPath, rect: outline.boundaryModel});

  // buildTriangles({ path: actualPath }); //, points: allPoints });
  // addHole({ path: actualPath, size: threadHoleSize, buffer: threadHoleBuffer });

  console.log('all done, writing out');

  const interpolate = require('interpolate-string');
  let outputTemplate = args.outputTemplate || '{{basePath}}-voronoi4.svg';

  const outputFilename = interpolate(outputTemplate, {
    basePath: pathModule.basename(filename).split('.')[0]
  });

  const svgOutput = paper.project.exportSVG({ 
    asString: true
 })

 const dom = new JSDOM(svgOutput);
 const document = dom.window.document;
const svgEl = document.querySelector("svg");
 svgEl.setAttribute('width', svgEl.getAttribute('width') + 'in');
 svgEl.setAttribute('height', svgEl.getAttribute('height') + 'in');
 const paths = document.querySelectorAll("path");
 console.log(paths.length)
 paths.forEach((path) => path.setAttribute('vector-effect', "non-scaling-stroke"))
 
//  console.log(svgEl.outerHTML)

  
  fs.writeFileSync(outputFilename, svgEl.outerHTML);

  var opn = require('opn');
  if (args.open) {
    const fullPath = 'file://' + process.cwd() + '/' + outputFilename;
    console.log(fullPath);
    opn(fullPath, { app: 'google chrome' });
  }
}
