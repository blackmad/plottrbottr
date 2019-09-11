var fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

var pathModule = require('path');

const args = require('minimist')(process.argv.slice(2));

args._.forEach(processFile);

function fixSVG(svgString) {

}

function processFile(filename) {
	// console.log(`processing ${filename}`);
	
	const svgData = fs.readFileSync(filename, 'utf8');

	const dom = new JSDOM(svgData);
  	const document = dom.window.document;

  	document.querySelectorAll('path').forEach((path) =>
	  {
	  	if (path.getAttribute('stroke') == '#ff0000' || path.getAttribute('stroke') == 'red') {
			path.setAttribute('stroke-width', '0.0001pt');
	  	}
	  })
  	fs.writeFileSync('laser-' + pathModule.basename(filename), document.querySelector('svg').outerHTML)
}
