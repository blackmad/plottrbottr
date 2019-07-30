#!/usr/bin/env python
import os
import sys
import subprocess

if not os.path.exists('output'):
    os.mkdir('output')


def runWithTimeout(cmd):
    print(cmd)
    try:
        subprocess.run(cmd, timeout=60)
    except:
        print('timed out after 60s')


numIterations = 25
for file in sys.argv[1:]:
    for i in range(numIterations):
        cmd = ['node', 'voronoi4.js', file, '--butt', 'no', '--voronoi', 'yes',
               '--outputTemplate', 'output/{{basePath}}-voronoi-%s.svg' % i]
        runWithTimeout(cmd)
        cmd = ['node', 'voronoi4.js', file, '--butt', 'no',
               '--outputTemplate', 'output/{{basePath}}-delaunay-%s.svg' % i]
        runWithTimeout(cmd)
