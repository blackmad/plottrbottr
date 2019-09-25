'use strict';

import _ from 'lodash';

const debug = false;
const realCut = false;
import Shape from '@doodle3d/clipper-js';

import jsEnv from 'browser-or-node';

export let paper = null;
var JSDOM = null;

export async function waitForPaper() {
  if (!jsEnv.isBrowser) {
    const jsdom = await import("jsdom");
    console.log(jsdom);
    JSDOM = jsdom.default.JSDOM;
    console.log(JSDOM);
    paper = await import('paper-jsdom');
  } else {
    paper = await import('paper');
  }
  paper = paper.default;
  return paper;
}

export function show(path, color) {
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

export function showPathCut(path, color) {
  paper.project.activeLayer.addChild(path);

  path.style = {
    strokeWidth: realCut ? '0.001pt' : '1px',
    strokeColor: color || 'red',
    fill: 'none'
  };
};

export function showCut(path, color) {
  if (_.isArray(path)) {
    path.forEach(p => showPathCut(p, color));
  } else {
    showPathCut(path);
  }
}

export function approxShape(
  shape,
  numPointsToGet = 200
) {
  // console.log('in appro: ', shape);
  let points = [];
  let shapeToUse = shape;

  if (shape instanceof paper.CompoundPath) {
    shapeToUse = shape.children[0];
	}
	
  // console.log(actualPath)
  for (let i = 0; i < numPointsToGet; i++) {
		points.push(
			shapeToUse.getPointAt((i / numPointsToGet) * shapeToUse.length)
		);
	}

	return points.map(point => shapeToUse.localToGlobal(point));
};

export function bufferPoints(buffer, points) {
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
    roundPrecision: 50
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
}

export function bufferPath({buffer, path, numPoints}) {
	// console.log('path', path);
  const points = approxShape(path, numPoints);
  // console.log(points);
  return bufferPoints(buffer, points);
}

export function isArgTrue(arg) {
  return arg != null && arg != undefined && arg != 'no' && arg != 'false';
}

export function isArgFalse(arg) {
	return !isArgTrue(arg);
}

export function fixPoint({ point, shape }) {
  return new paper.Point(
    point.x + shape.bounds.x,
    point.y + shape.bounds.y / 2
  );
}

export function getRelativePoint({ shape, pos }) {
  return fixPoint({ shape, point: shape.getPointAt(pos) });
}

export function generatePointsInPath({path, exclude, numExtraPoints}) {
  console.log('making extra points', numExtraPoints);
  const extraPoints = [];
  while (extraPoints.length < numExtraPoints * 2) {
    const testPoint = new paper.Point(
      Math.random() * path.bounds.width + path.bounds.x,
      Math.random() * path.bounds.height + path.bounds.y
    );
    if (path.contains(testPoint) && (!exclude || !exclude.contains(testPoint))) {
			extraPoints.push([testPoint.x, testPoint.y]);
			show(new paper.Path.Circle(testPoint, 0.02), 'lightblue')
    }
  }
  console.log('done with extra points');
  return extraPoints;
};

export function fixSVG(svgString) {
  let document = null;
  console.log('jsEnv');
  console.log(jsEnv)
  console.log(jsEnv.isNode);
  
  if (jsEnv.isNode) {
    const dom = new JSDOM(svgString);
    document = dom.window.document;
  } else {
    document = window.document;
  }

  const paths = document.querySelectorAll('path[d=""]');
  console.log(`have ${paths.length} empty Ds to remove`)
  paths.forEach((path) => path.remove())
  
  const svgEl = document.querySelector("svg");
  return svgEl.outerHTML;
}

export function roundCorners(path, radius) {
  var segments = path.segments.slice(0);
  path.removeSegments();

  for (var i = 0, l = segments.length; i < l; i++) {
    var curPoint = segments[i].point;
    var nextPoint = segments[i + 1 == l ? 0 : i + 1].point;
    var prevPoint = segments[i - 1 < 0 ? segments.length - 1 : i - 1].point;
    var nextDelta = curPoint.subtract(nextPoint);
    var prevDelta = curPoint.subtract(prevPoint);

    nextDelta.length = radius;
    prevDelta.length = radius;

    path.add(
      new paper.Segment(curPoint.subtract(prevDelta), null, prevDelta.divide(2))
    );

    path.add(
      new paper.Segment(curPoint.subtract(nextDelta), nextDelta.divide(2), null)
    );
  }
  path.closed = true;
  return path;
}