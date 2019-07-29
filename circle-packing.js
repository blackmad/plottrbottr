var fs = require('fs');
 
var paper = require('paper-jsdom');

const _ = require('lodash');

const { Size, Color, Path, Group, Point } = paper;

const { RegularPolygon, Rectangle } = Path;

function Circle(center, size) {
  const circle = new paper.Path.Circle(center, size);
  circle.style = {
    strokeWidth: 1,
    strokeColor: 'black',
    fillColor: '#fffccc'
  };

  return circle
}

function pointFor({x, y}, radius) {
  const countOfEvenRows = Math.floor(y / 2);
  const countOfOddRows = y - countOfEvenRows;
  let yPoint = 2 * radius * countOfOddRows + radius * countOfEvenRows;
  let xPoint = (radius * 2) * x;
  if (!!(y % 2)) {
    xPoint += radius;
    yPoint -= radius / 2;
  }
  return new Point(xPoint + radius, yPoint + radius);
}

const allCircles = [];

function tryCircleAt({center, size}) {
  // console.log(center)
  const circle = new Circle(center, size);

  const intersection = circle.intersect(svgItem.children[1],
    {insert:false});
    
  if (!intersection.bounds.area) {
    console.log('removing circle due to no overlap')
    circle.remove();
    return false;
  } else if (forceContainment && Math.abs(circle.area - intersection.area) > 0.001) {
    console.log('removing circle due to too small overlap')
    circle.remove();
    return false;
  } else if (allCircles.length > 0 && _.some(allCircles, function(otherCircle) {
    return circle.isInside(otherCircle.bounds) || circle.intersects(otherCircle);
    return false;
  })) {
    console.log('removing circle due to intersecting other circles', allCircles)
    circle.remove();
    return false;
  } else {
    console.log('keeping it');
    // circle.remove();
    // const realCircle = new Circle(center, size*0.9);
    allCircles.push(circle);
    return true;
  }
}

function makeGrid({size, dimensions, forceContainment}) {
	for (let x = 0; x <= dimensions.x; x += 1) {
		console.log(`doing row ${x} of ${dimensions.x}`)
	  for (let y = 0; y <= dimensions.y; y += 1) {
      let center = pointFor({x, y}, size);
      tryCircleAt({center, size})
      center = pointFor({x: dimensions.x - x, y: dimensions.y - y}, size);
      tryCircleAt({center, size})
	  
	  }
	}
}

const args = require('minimist')(process.argv.slice(2))

const forceContainment = true; //!!args['forceContainment'];

paper.setup([1000, 1000]);
const svgData = fs.readFileSync('Butterfly.svg', 'utf8');
var svgItem = paper.project.importSVG(svgData); //, {insert: false})
console.log(svgItem.bounds.width);
console.log(svgItem.bounds.height);
console.log(svgItem.bounds.x);
console.log(svgItem.bounds.y);
// paper.setup([svgItem.bounds.width + 100, svgItem.bounds.height + 100])
// svgItem.translate(-svgItem.bounds.width/2, -svgItem.bounds.height/2)

// paper.project.clear();

// const sizes = [35, 25, 15];

// for (const aSize of sizes) {
//   console.log(aSize)
//   const dimensions = { x: svgItem.bounds.width/aSize, y: svgItem.bounds.height/aSize };
//   console.log(dimensions);
//   makeGrid({size: aSize, dimensions, forceContainment});
// }

const maxSize = 45;
const minSize = 5;
const stepSize = 5;
const maxIterations = 10
for (let i=0; i < 1000; i++) {
  let size = maxSize;
  const center =  new Point(Math.random() * svgItem.bounds.width, Math.random() * svgItem.bounds.height);
  console.log(center);
  tryCircleAt(center, 0.1)
  new Circle(center, 1);

  // while (size >= minSize) {
  //   console.log('trying at ' + size)
  //   if (tryCircleAt(center, size)) {
  //     break;
  //   }
  //   size -= stepSize;
  // }
  
}

fs.writeFileSync('test.svg', paper.project.exportSVG({ asString: true }));
