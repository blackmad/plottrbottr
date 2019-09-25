var fs = require('fs');

var paper = require('paper-jsdom');
const {fixSVG} = require('./utils.js');

module.exports.writeSVG = function(outputFilename) {
  const svgString = paper.project.exportSVG({
    asString: true,
    bounds: 'content'
  });
  fs.writeFileSync(outputFilename, fixSVG(svgString));
};
