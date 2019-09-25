const paper = require('paper');

const _ = require('lodash');


function roundCorners(path, radius) {
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

const MillimeterToInches = 0.0393701;
const RivetRadius = 2.5 * MillimeterToInches;
const BeltHoleRadius = 3 * MillimeterToInches;

function makeEvenlySpacedBolts(numBolts, p1, p2) {
    let line = new paper.Path.Line(p1, p2);

    const circles = [];
  _.times(numBolts * 3, boltNum => {
    if ((boltNum - 1) % 3 == 0) {
      const center = line.getPointAt(
        (line.length * (boltNum + 1)) / (numBolts * 3 + 1)
      );
      const circle = new paper.Path.Circle(center, RivetRadius);
      circles.push(circle);
    }
  });

  return circles;
}

class StraightCuffOuter {
  makeHoles({ path, height, width }) {
    const paddingDiff = Math.abs(this.topPadding - this.bottomPadding);
    const guideLineLeftP1 = new paper.Point(
      this.topPadding / 2 + RivetRadius / 2,
      0
    );
    const guideLineLeftP2 = new paper.Point(
      this.topPadding / 2 + paddingDiff + RivetRadius / 2,
      height
    );

    const holes1 = makeEvenlySpacedBolts(
      Math.floor(height),
      guideLineLeftP1,
      guideLineLeftP2
    );

    const guideLineRightP1 = new paper.Point(
      width - this.topPadding / 2 - RivetRadius / 2,
      0
    );
    const guideLineRightP2 = new paper.Point(
      width - this.topPadding / 2 - paddingDiff - RivetRadius / 2,
      height
    );

    const holes2 = makeEvenlySpacedBolts(
      Math.floor(height),
      guideLineRightP1,
      guideLineRightP2
		);

    return [...holes1, ...holes2];
  }

  constructor() {
		this.bottomPadding = 1.0;
		this.topPadding = 0.8;
	}

  make(options) {
    var { height, wristCircumference, safeBorderWidth, debug } = options;

    const bottomPadding = 1.0;
    const topPadding = 0.8;
    const totalWidth = wristCircumference + bottomPadding * 2;
    // console.log(scope);
    let cuffOuter = new paper.Path();
    cuffOuter.strokeColor = 'black';
    cuffOuter.add(new paper.Point(0, 0));
    cuffOuter.add(new paper.Point(bottomPadding - topPadding, height));
    cuffOuter.add(
      new paper.Point(bottomPadding + wristCircumference + topPadding, height)
    );
    cuffOuter.add(new paper.Point(totalWidth, 0));
    roundCorners(cuffOuter, '0.2');
    cuffOuter.closed = true;

		console.log('???')
    const holes = this.makeHoles({
      path: cuffOuter,
      height,
      width: totalWidth
		});
		console.log('xxxx')
		console.log('holes', holes);


    const safeAreaPadding = 0.5;
    const safeAreaLength = wristCircumference;
    const safeArea = new paper.Path.Rectangle(
      new paper.Point(bottomPadding, safeBorderWidth),
      new paper.Size(safeAreaLength, height - safeBorderWidth * 2)
    );

    if (debug) {
      console.log('green');
      safeArea.strokeColor = 'green';
    } else {
      safeArea.remove();
    }

    const safeCone = new paper.Path.Rectangle(
      new paper.Point(bottomPadding, -10),
      new paper.Size(safeAreaLength, 20)
    );
    safeCone.remove();

    const innerOptions = {};
    innerOptions.height = height;
    innerOptions.width = totalWidth;
    innerOptions.boundaryModel = safeArea;
    innerOptions.safeCone = safeCone;
		innerOptions.outerModel = cuffOuter;
		innerOptions.holes = holes;

    return innerOptions;

    // const innerDesign = this.designMaker(innerOptions);
    // if (innerDesign.outline) {
    //   const oldCuffOuter = cuffOuter;

    //   cuffOuter = cuffOuter.unite(innerDesign.outline);
    //   cuffOuter.remove();
    //   // cheap hack to fill in inner holes for some reason
    //   cuffOuter = cuffOuter.unite(safeArea);
      
    //   oldCuffOuter.remove();
    //   // innerDesign.outline.removeChildren();
    //   // innerDesign.outline.remove();
    //   // innerDesign.paths.forEach(p => p.remove());
    // }

    // if (debug) {
    //   return [innerDesign.paths];
    // } else {
    //   const path = new paper.CompoundPath({
    //     // children: [cuffOuter],
    //     children: [cuffOuter, ...innerDesign.paths],
    //     strokeColor: 'red',
    //     strokeWidth: '0.1',
    //     fillColor: 'lightgrey',
    //     fillRule: 'evenodd'
    //   });
    //   return [path];
    // }

    // innerDesign.layer = "inner"
    // models['design'] = innerDesign;

    // if (debug) {
    //   // console.log(safeCone);
    //   // safeCone.layer = 'brightpink';
    //   // models['safeCone'] = safeCone;

    //   // console.log(safeArea);
    //   // safeArea.layer = 'orange';
    //   // models['safeArea'] = safeArea;
    // }

    // /***** END DESIGN *****/
  }
}
module.exports = {StraightCuffOuter}