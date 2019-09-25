import d3Delaunay from 'd3-delaunay';
const Delaunay = d3Delaunay.Delaunay;
import _ from 'lodash';
import * as utils from './utils.mjs';
import { setPaper } from './utils.mjs';

const {
  showCut,
  show,
  approxShape,
  bufferPath,
  bufferPoints,
  generatePointsInPath,
  roundCorners
} = utils;

let paper = null;

async function waitForPaper() {
  console.error('waiitng for paper in lace maker')
  paper = await utils.waitForPaper();
}

export class LaceMaker {
  constructor({
    debug,
    holeSize,
    inchInPoints,
    rounded,
    subtract,
    subtractBuffer,
    numPoints,
    numExtraPoints,
    voronoi,
    addHole,
    butt,
    maxWidth,
    maxHeight,
    safeBorder,
    outlineSize
  }) {
    this.debug = debug;
    this.rounded = rounded;
    this.subtract = subtract;
    this.inchInPoints = inchInPoints;
    this.numPoints = numPoints;
    this.numExtraPoints = numExtraPoints;
    this.voronoi = voronoi;
    this.addHole = addHole;
    this.butt = butt;
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    this.safeBorder = safeBorder;
    this.subtractBuffer = subtractBuffer;
    this.outlineSize = outlineSize;

    this.threadHoleSize = this.pointInches(holeSize);
    this.threadHoleBuffer = this.pointInches(0.04);
    this.threadHoleTotalSize = this.threadHoleSize + this.threadHoleBuffer;

    if (!this.debug) {
      console.log = s => {};
    }
  }

  pointInches(n) {
    return n * this.inchInPoints;
  }

  inchPoints(n) {
    return n / this.inchInPoints;
  }

  loadAndResizeSvg({ svgData, yOffset = 0, xOffset = 0 }) {
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
    const maxWidthPixels = this.pointInches(this.maxWidth);
    const maxHeightPixels = this.pointInches(this.maxHeight);
    console.log(
      `current size: ${this.inchPoints(
        actualPath.bounds.width
      )} x ${this.inchPoints(actualPath.bounds.height)}`
    );

    const scale = Math.min(
      maxWidthPixels / actualPath.bounds.width,
      maxHeightPixels / actualPath.bounds.height
    );

    svgItem = svgItem.scale(scale);
    svgItem.translate(
      new paper.Point(
        -actualPath.bounds.x + xOffset,
        -actualPath.bounds.y + yOffset
      )
    );
    console.log(
      `new size: ${this.inchPoints(
        actualPath.bounds.width
      )} x ${this.inchPoints(actualPath.bounds.height)}`
    );
    console.log(
      `new size: ${this.inchPoints(svgItem.bounds.width)} x ${this.inchPoints(
        svgItem.bounds.height
      )}`
    );
    svgItem.remove();
   
    // console.log(svgItem.bounds.width, svgItem.bounds.height);
    return actualPath;
  }

  doAddHole({ path, size, buffer }) {
    if (!this.addHole) {
      showCut(path);
      return;
    }
    let movement = new paper.Point(0, 1);
    let initial = new paper.Point(path.bounds.width / 2, 0);
    // super wide
    if (this.butt && path.bounds.width / path.bounds.height > 3) {
      movement = new paper.Point(-1, 0);
      initial = new paper.Point(
        path.bounds.x + path.bounds.width + (size + buffer) * 2,
        path.bounds.y + path.bounds.height / 2
      );
    }
    // add hole for string
    let threadHoleOuter = new paper.Path.Circle(initial, size + buffer);

    function touchingEnough(path1, path2) {
      console.log('length of path1', path1.length);
      console.log('length of path1', path1.area);

      const intersection = path1.intersect(path2, {
        insert: false,
        trace: false
      });
      console.log('length of path1 after subtract path2', intersection.length);
      console.log('length of path1 after subtract path2', intersection.area);
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

    const threadHole = new paper.Path.Circle(
      threadHoleOuter.bounds.center,
      size
    );
    showCut(threadHole);
  }

  buildTriangles({ path }) {
    // let outerShape = bufferPath(1, path);
    // outerShape.closePath();
    // show(outerShape, 'brown');
    // outerShape = outerShape.unite(path);
    const outerShape = path;

    show(new paper.Path(approxShape(path)), 'brown');
    let innerShapes = bufferPath({
      buffer: -this.pointInches(this.safeBorder),
      path
    });
    show(innerShapes, 'brown');
    innerShapes.forEach(innerShape =>
      this.processInnerShape({ innerShape, outerShape })
    );
  }

  processInnerShape({ outerShape, innerShape }) {
    let veryInnerShapes = bufferPath({
      buffer: -this.pointInches(this.subtractBuffer),
      path: outerShape
    });
    show(veryInnerShapes, 'brown');

    const numPointsToGet = this.numPoints;
    const points = this.pointsToArray(approxShape(innerShape, numPointsToGet));
    points.forEach(p => show(new paper.Path.Circle(p, 1), 'blue'));

    const extraPoints = generatePointsInPath({
      path: innerShape,
      numExtraPoints: this.numExtraPoints
    });
    const allPoints = points.concat(extraPoints);

    console.log('triangulating');
    const delaunay = Delaunay.from(allPoints);
    console.log('done');
    let polygonArray = Array.from(delaunay.trianglePolygons());
    if (this.voronoi) {
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
      let smallShape = bufferPoints(
        -this.pointInches(this.outlineSize),
        points
      );
      if (smallShape) {
        smallShape = smallShape[0];
        smallShape.closePath();

        if (this.rounded) {
          smallShape = roundCorners(smallShape, 2);
        }

        smallShape.closePath();
        let cutOffShape = smallShape.intersect(innerShape);

        if (this.subtract && veryInnerShapes) {
          veryInnerShapes.forEach(
            veryInnerShape =>
              (cutOffShape = cutOffShape.subtract(veryInnerShape))
          );
        }

        // cutOffShape.translate(new paper.Point(0, threadHoleTotalSize * 2));

        showCut(cutOffShape);
      } else {
        console.log(`could not shrink :-( triagnel ${index}`);
      }
    });
  }

  pointsToArray(points) {
    const ret = [];
    points.forEach(p => {
      ret.push([p.x, p.y]);
    });
    return ret;
  }

  async loadAndProcessSvgData({ svgData, paperModule }) {
    if (paperModule) {
      paper = paperModule;
      utils.setPaper(paper);
    }

    if (!paper) {
      await waitForPaper();
      paper.setup([10, 10]);
    }

    paper.settings.insertItems = false;
    let actualPath = this.loadAndResizeSvg({
      svgData,
      xOffset: this.threadHoleTotalSize * 2,
      yOffset: this.threadHoleTotalSize * 2
    });

    if (!actualPath.closed) {
      console.log('not closed outer ring');
      actualPath.closePath();
      //process.exit(1);
    } 

    this.buildTriangles({ path: actualPath }); //, points: allPoints });
    this.doAddHole({
      path: actualPath,
      size: this.threadHoleSize,
      buffer: this.threadHoleBuffer
    });
  }

  exportSVGString() {
    return paper.project.exportSVG({
      asString: true,
      bounds: 'content'
    });
  }
}