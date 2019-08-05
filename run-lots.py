#!/usr/bin/env python
import os
import sys
import subprocess

if not os.path.exists('output'):
  os.mkdir('output')


def runWithTimeout(cmd):
  print(' '.join(cmd))
  try:
  	subprocess.run(cmd, timeout=60)
  except:
  	print('timed out after 60s')


args = [
  ['--voronoi', ['yes', 'no']],
  ['--subtract', ['yes', 'no']]
]


def processArgsHelper(currentCommand, args, callback):
	if len(args) == 0:
		print('_'.join(currentCommand))
		callback(currentCommand)
		return currentCommand

	if isinstance(args[0][0], list):
		for arg in args[0]:
			processArgsHelper(currentCommand + arg, args[1:], callback)
	else:
		(arg, values) = args[0]
		for value in values:
			processArgsHelper(currentCommand + [arg, value], args[1:], callback)

def processArgs(callback):
  return processArgsHelper([], args, callback)

numIterations = 10
for file in sys.argv[1:]:
  for i in range(numIterations):
    def processFileCallback(argArray):
      cmd = ['node', 'voronoi4.js', file, '--butt', 'no'] + argArray + [
     '--outputTemplate', 'output/{{basePath}}-%s-%s.svg' % ('_'.join(argArray), i)]
      runWithTimeout(cmd)
    # print(i)
    processArgs(processFileCallback)
#   runWithTimeout(cmd)
#   cmd = ['node', 'voronoi4.js', file, '--butt', 'no',
#    '--outputTemplate', 'output/{{basePath}}-delaunay-%s.svg' % i]
#   runWithTimeout(cmd)
