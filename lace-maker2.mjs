import * as fs from 'fs';
import {LaceMaker} from './lace-maker2-lib.mjs';
import * as pathModule from 'path';
import {fixSVG} from './utils.mjs';

import interpolate from 'interpolate-string';
import opn from 'open';

import argparse from 'argparse';

var parser = new argparse.ArgumentParser({
  addHelp: true
});
parser.addArgument(['inputFile'], {
  nargs: '+'
});
parser.addArgument(['--debug'], {
  default: false,
  action: 'storeTrue',
  help: 'output debugging in console and svg output'
});
parser.addArgument(['--inchInPoints'], {
  defaultValue: 72,
  help: 'an inch in points, some people say 96, illustrator says 72'
});
parser.addArgument('--addHole', {
  help: 'add a hole to the output for putting a cord or jumpring through',
  defaultValue: false,
  action: 'storeTrue'
});
parser.addArgument('--butt', {
  help:
    'if shape is wider than it is long, puts hole at long end rather than middle of width, only meaningful with --addHole',
  defaultValue: false,
  action: 'storeTrue'
});
parser.addArgument('--holeSize', {
  help: '--addHole size in inches',
  defaultValue: 0.1,
  type: 'float'
});
parser.addArgument('--maxWidth', {
  help: 'maximum width (in inches) to resize width of input svg to',
  defaultValue: 3,
  type: 'float'
});
parser.addArgument('--maxHeight', {
  help: 'maximum height (in inches) to resize height of input svg to',
  defaultValue: 3,
  type: 'float'
});
parser.addArgument('--voronoi', {
  help:
    'if false, fills with delaunay triangles, if true, with voronoi diagram',
  defaultValue: false,
  action: 'storeTrue'
});
parser.addArgument('--subtract', {
  help: 'subtracts a shrunk copy of the outline from the inner lace',
  defaultValue: false,
  action: 'storeTrue'
});
parser.addArgument('--numPoints', {
  help: 'number of points to sample along outline for triangulation',
  defaultValue: 50,
  type: 'int'
});
parser.addArgument('--numExtraPoints', {
  help: 'number of extra random interior points to add to triangulation',
  defaultValue: 25,
  type: 'int'
});
parser.addArgument('--open', {
  help: 'open resulting svg in google chrome',
  defaultValue: false,
  action: 'storeTrue'
});
parser.addArgument('--outputTemplate', {
  help:
    'template for outputting final svg. {{basePath}} is the only interpolated variable - original filename without extension',
  defaultValue: '{{basePath}}-lace.svg'
});
parser.addArgument('--subtractBuffer', {
  help: '(in inches) how much to shrink outline by to create inner shape',
  defaultValue: 0.2,
  type: 'float'
});
parser.addArgument('--outlineSize', {
  help: '(in inches) half of border width between inner cutouts',
  defaultValue: 0.03,
  type: 'float'
});
parser.addArgument('--safeBorder', {
  help: '(in inches) width of border around the inner design',
  defaultValue: 0.1,
  type: 'float'
});
parser.addArgument('--rounded', {
  help: 'rounds corners of triangles/voronois',
  defaultValue: false,
  action: 'storeTrue'
});

async function processFile({ filename, args }) {
  console.log(`processing ${filename}`);
  const svgData = fs.readFileSync(filename, 'utf8');

  const laceMaker = new LaceMaker(args);
  await laceMaker.loadAndProcessSvgData({ svgData });
  const newSvgString = laceMaker.exportSVGString();

  // show(actualPath, 'black');

  console.log('all done, writing out');

  const outputFilename = interpolate(args.outputTemplate, {
    basePath: pathModule.basename(filename).split('.')[0]
  });
  fs.writeFileSync(outputFilename, fixSVG(newSvgString));

  if (args.open) {
    const fullPath = 'file://' + process.cwd() + '/' + outputFilename;
    console.log(fullPath);
    opn(fullPath, { app: 'google chrome' });
  }
}

async function runFromConsole() {
  var args = parser.parseArgs();
  console.dir(args);

  args.inputFile.forEach(async (filename) => {
    await processFile({ filename, args })
  }
 );
}

runFromConsole();
