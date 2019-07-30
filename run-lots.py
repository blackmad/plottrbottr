#!/usr/bin/env python
import os
import sys

os.mkdir('output')
numIterations = 25
for file in sys.argv[1:]:
  for i in range(numIterations):
    cmd = 'node voronoi4.js "%s" --butt no --voronoi --outputTemplate="output/{{basePath}}-voronoi-%s.svg"' % (file, i)
    print(cmd)
    os.system(cmd)
    cmd = 'node voronoi4.js "%s" --butt no --outputTemplate="output/{{basePath}}-delaunay-%s.svg"' % (file, i)