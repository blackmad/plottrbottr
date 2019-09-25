import * as fs from 'fs';
import 'paper-jsdom';
import {fixSVG} from './utils.mjs';

export function writeSVG({
  paper,
  outputFilename
}) {
  const svgString = paper.project.exportSVG({
    asString: true,
    bounds: 'content'
  });
  fs.writeFileSync(outputFilename, fixSVG(svgString));
}