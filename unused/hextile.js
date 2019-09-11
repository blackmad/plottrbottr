var fs = require('fs');
 
var paper = require('paper-jsdom');

const { Size, Color, Path, Group, Point } = paper;

const { RegularPolygon, Rectangle } = Path;

function Hexagon(center, size) {
  const leftTop = center.subtract({x: Math.sqrt(3/4) * size, y: 1/2 * size });
  const rightBottom = center.add({x: Math.sqrt(3/4) * size, y: size });

  const hexagon = new RegularPolygon(center, 6, size);
  hexagon.style = {
    strokeWidth: 1,
    strokeColor: 'black',
    fillColor: '#fffccc'
  };

  return hexagon
}


function pointFor({x, y}, radius) {
  const countOfEvenRows = Math.floor(y / 2);
  const countOfOddRows = y - countOfEvenRows;
  let yPoint = 2 * radius * countOfOddRows + radius * countOfEvenRows;
  let xPoint = (radius * 2 * Math.sqrt(3/4)) * x;
  if (!!(y % 2)) {
    xPoint += radius * Math.sqrt(3/4);
    yPoint -= radius / 2;
  }
  return new Point(xPoint + radius, yPoint + radius);
}

function makeGrid({dimensions, forceContainment}) {
	for (let x = 0; x <= dimensions.x + 2; x++) {
		console.log(`doing row ${x} of ${dimensions.x}`)
	  for (let y = 0; y <= dimensions.y + 2; y++) {
	    let center = pointFor({x, y}, size);
	    // console.log(center)
	    const hexagon = new Hexagon(center, size);

	    // const isInside = hexagon.isInside(svgItem.bounds);
	    // const intersects = hexagon.intersects(svgItem.bounds);
	    const intersection = hexagon.intersect(svgItem.children[1],
	    	{insert:false});
	    if (!intersection.bounds.area) {
	    	hexagon.remove();
	    }
	    if (forceContainment && Math.abs(hexagon.area - intersection.area) > 0.001) {
	    	hexagon.remove();
	    }

	    hexagon.rotate(360 / 6 * Math.floor(Math.random() * 6));
	  }
	}
}

const args = require('minimist')(process.argv.slice(2))

const size = parseInt(args['radius']);
const forceContainment = !!args['forceContainment'];

paper.setup([1000, 1000]);
const svgData = fs.readFileSync('Butterfly.svg', 'utf8')
var svgItem = paper.project.importSVG(svgData) //, {insert: false})
console.log(svgItem.bounds.width)
console.log(svgItem.bounds.height)
console.log(svgItem.bounds.x)
console.log(svgItem.bounds.y)
paper.setup([svgItem.bounds.width + size, svgItem.bounds.height + size])
// svgItem.translate(-svgItem.bounds.width/2, -svgItem.bounds.height/2)

const dimensions = { x: svgItem.bounds.width/size, y: svgItem.bounds.height/size };
console.log(dimensions);

paper.project.clear()
makeGrid({dimensions, forceContainment});
fs.writeFileSync('test.svg', paper.project.exportSVG({ asString: true }));
