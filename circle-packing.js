var fs = require('fs');

var paper = require('paper-jsdom');

const _ = require('lodash');

const { Size, Color, Path, Group, Point } = paper;

const { RegularPolygon, Rectangle } = Path;

const { Delaunay } = require('d3-delaunay');

var pathModule = require('path');

function Circle(center, size) {
  const circle = new paper.Path.Circle(center, size);
  circle.style = {
    strokeWidth: 1,
    strokeColor: 'black',
    fillColor: '#fffccc'
  };

  return circle;
}

function pointFor({ x, y }, radius) {
  const countOfEvenRows = Math.floor(y / 2);
  const countOfOddRows = y - countOfEvenRows;
  let yPoint = 2 * radius * countOfOddRows + radius * countOfEvenRows;
  let xPoint = radius * 2 * x;
  if (!!(y % 2)) {
    xPoint += radius;
    yPoint -= radius / 2;
  }
  return new Point(xPoint + radius, yPoint + radius);
}

const allCircles = [];

function tryCircleAt({ center, size, checkContainment, path }) {
  // console.log(center)
  const circle = new Circle(center, size);

  if (!checkIntersection({bigShape:path, shape:circle, checkContainment})) {
    circle.remove();
    return false;
  }

  if (
    allCircles.length > 0 &&
    _.some(allCircles, function(otherCircle) {
      return (
        circle.isInside(otherCircle.bounds) || circle.intersects(otherCircle)
      );
    })
  ) {
    // console.log('removing circle due to intersecting other circles', allCircles)
    circle.remove();
    return false;
  }

  allCircles.push(circle);
  return circle;
}

function checkIntersection({shape, bigShape, checkContainment}) {
  const intersection = shape.intersect(bigShape, { insert: false });

  if (!intersection.bounds.area) {
    // console.log('removing circle due to no overlap')
    return false;
  } else if (
    checkContainment &&
    Math.abs(shape.area - intersection.area) > 0.001
  ) {
    // console.log('removing circle due to too small overlap')
    return false;
  } else {
    // console.log('keeping it');
    return true;
  }
}

function makeGrid({ size, dimensions, checkContainment, path }) {
  for (let x = 0; x <= dimensions.x; x += 1) {
    console.log(`doing row ${x} of ${dimensions.x}`);
    for (let y = 0; y <= dimensions.y; y += 1) {
      let center = pointFor({ x, y }, size);
      tryCircleAt({ center, size, checkContainment, path});
      center = pointFor({ x: dimensions.x - x, y: dimensions.y - y }, size);
      tryCircleAt({ center, size, checkContainment, path });
    }
  }
}

const args = require('minimist')(process.argv.slice(2));
args._.forEach(processFile)


function processFile(filename) {
  console.log(`processing ${filename}`)
  const forceContainment = true; //!!args['forceContainment'];

  paper.setup([1000, 1000]);
  const svgData = fs.readFileSync(filename, 'utf8');
  var svgItem = paper.project.importSVG(svgData); //, {insert: false})
  console.log(svgItem.bounds.width);
  console.log(svgItem.bounds.height);
  console.log(svgItem.bounds.x);
  console.log(svgItem.bounds.y);
  svgItem.style = {
    strokeWidth: 1,
    strokeColor: 'black',
    fillColor: '#fffccc'
  };
  const path = svgItem.children[1];
 
  //.children[0];

  // paper.setup([svgItem.bounds.width + 100, svgItem.bounds.height + 100])
  // svgItem.translate(-svgItem.bounds.width/2, -svgItem.bounds.height/2)

  // paper.project.clear();

  // const sizes = [35, 25, 15];

  // kinda symmetric griddy fill-in
  // for (const aSize of sizes) {
  //   console.log(aSize)
  //   const dimensions = { x: svgItem.bounds.width/aSize, y: svgItem.bounds.height/aSize };
  //   console.log(dimensions);
  //   makeGrid({size: aSize, dimensions, forceContainment});
  // }

  // pretty terrible circle packing inside
  // const maxSize = 45;
  // const minSize = 5;
  // const stepSize = 5;
  // const maxIterations = 1000
  // for (let i=0; i < maxIterations; i++) {
  //   console.log(`on iteration ${i} of ${maxIterations}`);
  //   let size = maxSize;
  //   const center =  new Point(Math.random() * svgItem.bounds.width, Math.random() * svgItem.bounds.height);
  //   // console.log(center);

  //   while (size >= minSize) {
  //     if (tryCircleAt({center, size, checkContainment: true})) {
  //       break;
  //     }
  //     size -= stepSize;
  //   }
  // }

  const maxSize = 30;
  const minSize = 5;
  const stepSize = 3;
  const maxIterations = 1000;
  const centers = [];
  for (let i = 0; i < maxIterations; i++) {
    if (i % 50 == 0) {
      console.log(`on iteration ${i} of ${maxIterations}`);
    }
    let size = maxSize;
    const center = new Point(
      Math.random() * svgItem.bounds.width,
      Math.random() * svgItem.bounds.height
    );
    // console.log(center);

    while (size >= minSize) {
      const circle = tryCircleAt({ center, size, checkContainment: true, path: path });
      if (circle) {
        circle.remove();
        centers.push([center.x, center.y]);
        break;
      }
      size -= stepSize;
    }
  }


  // console.log(path);
  // console.log(path.children[0]);
  // console.log(path.segments[0]);
  const numPointsToGet = 50;
  const actualPath = path.children[0];
  // console.log(actualPath)
  for (let i = 0; i < numPointsToGet; i++) {
    const p = actualPath.getPointAt((i / numPointsToGet) * actualPath.length);
    centers.push([p.x, p.y]);
  }

  console.log(centers);

  var delaunay = Delaunay.from(centers);
  var voronoi = delaunay.voronoi([
    svgItem.bounds.x,
    svgItem.bounds.y,
    svgItem.bounds.x + svgItem.bounds.width,
    svgItem.bounds.y + svgItem.bounds.height
  ]);

  const polys = [];
  for (const cellPolygon of voronoi.cellPolygons()) {
    // console.log('cellpolygon', cellPolygon);
    const points = cellPolygon.map(p => new paper.Point(p[0], p[1]));
    points.pop();
    const cellPath = new paper.Path(points);
    cellPath.style = {
      strokeWidth: 1,
      strokeColor: 'black',
      fillColor: '#fffccc'
    };
    cellPath.closePath();
    if (!checkIntersection({shape: cellPath, bigShape: path, checkContainment: false})) {
      cellPath.remove();
    }
    // const bufferedShape = bufferShape(-params.borderSize, points)
    // if (bufferedShape) {
    //   polys.push(bufferedShape);
    // }
  }

  const outputFilename = pathModule.basename(filename).split('.')[0] + '-modded.svg'
  fs.writeFileSync(outputFilename, paper.project.exportSVG({ asString: true }));
}