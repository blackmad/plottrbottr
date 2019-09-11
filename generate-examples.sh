#!/bin/sh

set +x

mkdir examples/output-svg/
rm examples/output-svg/*
mkdir examples/output-png/
rm examples/output-png/*

do_cmd () {
  DESC=$1;
  CMD_ARGS=$2;
  OUTPUT=$3;
  INPUT=$4;
  if [ -z "$INPUT" ]; then
   INPUT='examples/input/butterfly.svg';
  fi

  SVG="examples/output-svg/$OUTPUT.svg"
  PNG="examples/output-png/$OUTPUT.png"

  CMD="node lace-maker2.js $INPUT --outputTemplate '$SVG' $CMD_ARGS"
  echo "## $DESC" >> README.md
  echo "    $CMD"  >> README.md
  echo "important bits:\n"  >> README.md
  echo "    $CMD_ARGS"  >> README.md
  eval $CMD
  
  convert $SVG $PNG;
  echo "![$ARGS]($PNG)" >> README.md
  #
}

cp README-base.md README.md

do_cmd 'Triangles with 0 extra points' '--numExtraPoints 0' 'triangles-0'
do_cmd 'Triangles with 10 extra points' '--numExtraPoints 10' 'triangles-10'
do_cmd 'Triangles with 10 extra points + rounding' '--rounded --numExtraPoints 10' 'triangles-rounded-10'
do_cmd 'Triangles with 10 extra points + inner-subtract' '--subtract --numExtraPoints 10' 'triangles-subtract-10'
do_cmd 'Voronoi with 0 extra points' '--voronoi --numExtraPoints 0' 'voronoi-0'
do_cmd 'Voronoi with 10 extra points' '--voronoi  --numExtraPoints 10' 'voronoi-10'
do_cmd 'Voronoi with 10 extra points + rounded' '--rounded --voronoi  --numExtraPoints 10' 'voronoi-rounded-10'
do_cmd 'Voronoi with 10 extra points + inner subtract' '--voronoi --subtract --numExtraPoints 10' 'voronoi-subtract-10'

do_cmd 'Voronoi with 10 extra points + inner subtract + see debugging' '--voronoi --subtract --debug --numExtraPoints 10' 'voronoi-subtract-debug-10'
do_cmd 'Voronoi with 10 extra points + inner subtract + add pendant hole' '--addHole --voronoi --subtract --numExtraPoints 10' 'voronoi-subtract-hole-10'

do_cmd 'Triangular caterpillar with center hole' '--addHole' 'caterpillar-hole' 'examples/input/caterpillar.svg'
#do_cmd 'Triangular caterpillar with end (butt) hole' '--addHole --butt' 'caterpillar-hole-butt' 'examples/input/caterpillar.svg'