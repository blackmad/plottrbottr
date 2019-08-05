const _ = require('lodash');

const args = require('minimist')(process.argv.slice(2));
const debug = args.debug;
var paper = require('paper-jsdom');
var Shape = require('@doodle3d/clipper-js');

module.exports.show = function(path, color) {
  if (debug) {
    let paths = [path];
    if (_.isArray(path)) {
      paths = path;
    }

    paths.forEach(path => {
      paper.project.activeLayer.addChild(path);

      path.style = {
        strokeWidth: 1,
        strokeColor: color || 'green'
      };
    });
  }
};

module.exports.showPathCut = function(path, color) {
  paper.project.activeLayer.addChild(path);

  path.style = {
    strokeWidth: args.realCut ? '0.001pt' : '1px',
    strokeColor: color || 'red',
    fill: 'none'
  };
};

module.exports.showCut = function(path, color) {
  if (_.isArray(path)) {
    path.forEach(p => module.exports.showPathCut(p));
  } else {
    module.exports.showPathCut(path);
  }
};

module.exports.approxShape = function(
  shape,
  numPointsToGet = 200,
  useRelative = false
) {
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
};

module.exports.bufferPoints = function(buffer, points) {
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

  if (!roundedShape || !roundedShape.paths || roundedShape.paths.length == 0) {
    return null;
  }

  const roundedPolygons = roundedShape.paths.map(
    path =>
      new paper.Path(
        path.map(p => {
          return new paper.Point(p.X / scaleFactor, p.Y / scaleFactor);
        })
      )
  );

  return roundedPolygons;
};

module.exports.bufferPath = function(buffer, path, numPoints) {
  const points = module.exports.approxShape(path, numPoints);
  // console.log(points);
  return module.exports.bufferPoints(buffer, points);
};

module.exports.isArgTrue = function(arg) {
  return arg != 'no' && arg != 'false';
};

module.exports.fixPoint = function({ point, shape }) {
  return new paper.Point(
    point.x + shape.bounds.x,
    point.y + shape.bounds.y / 2
  );
};

module.exports.getRelativePoint = function({ shape, pos }) {
  return module.exports.fixPoint({ shape, point: shape.getPointAt(pos) });
};

module.exports.generatePointsInPath = function(path, numExtraPoints = 5) {
  console.log('making extra points');
  const extraPoints = [];
  while (extraPoints.length < numExtraPoints * 2) {
    const testPoint = new paper.Point(
      Math.random() * path.bounds.width + path.bounds.x,
      Math.random() * path.bounds.height + path.bounds.y
    );
    if (path.contains(testPoint)) {
      extraPoints.push([testPoint.x, testPoint.y]);
      module.exports.show(new paper.Path.Circle(testPoint, 1));
    }
  }
  console.log('done with extra points');
  return extraPoints;
};
