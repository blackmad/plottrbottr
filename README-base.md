# Overview
A tool for taking in an SVG and making it more interesting to plot or cut with the magic of voronois and delaunay triangulation.

Takes the longest path found in an SVG and fills it with parametric joy.

I guess somewhat inspried by trammel's [lace maker](https://bitbucket.org/hudson/boxer/src/tip/lace-maker?at=default)

And very inspired by Julien Leonard's [paper cut butterflies](https://julienleonard.com/making-of-paper-cut-butterfly.html)

# Usage
Requires a pretty recent version of node, I use 
     
     nvm use v12.7.0

Command line options mostly make sense

    [blackmad@wnyc plottrbottr (master)]$ node lace-maker2.js --help
    usage: lace-maker2.js [-h] [--debug] [--inchInPoints INCHINPOINTS] [--addHole]
                          [--butt] [--holeSize HOLESIZE] [--maxWidth MAXWIDTH]
                          [--maxHeight MAXHEIGHT] [--voronoi] [--subtract]
                          [--numPoints NUMPOINTS]
                          [--numExtraPoints NUMEXTRAPOINTS] [--open]
                          [--outputTemplate OUTPUTTEMPLATE]
                          [--subtractBuffer SUBTRACTBUFFER]
                          [--outlineSize OUTLINESIZE] [--safeBorder SAFEBORDER]
                          [--rounded]
                          inputFile [inputFile ...]

    Positional arguments:
      inputFile

    Optional arguments:
      -h, --help            Show this help message and exit.
      --debug               output debugging in console and svg output
      --inchInPoints INCHINPOINTS
                            an inch in points, some people say 96, illustrator 
                            says 72
      --addHole             add a hole to the output for putting a cord or 
                            jumpring through
      --butt                if shape is wider than it is long, puts hole at long 
                            end rather than middle of width, only meaningful with 
                            --addHole
      --holeSize HOLESIZE   --addHole size in inches
      --maxWidth MAXWIDTH   maximum width (in inches) to resize width of input 
                            svg to
      --maxHeight MAXHEIGHT
                            maximum height (in inches) to resize height of input 
                            svg to
      --voronoi             if false, fills with delaunay triangles, if true, 
                            with voronoi diagram
      --subtract            subtracts a shrunk copy of the outline from the inner 
                            lace
      --numPoints NUMPOINTS
                            number of points to sample along outline for 
                            triangulation
      --numExtraPoints NUMEXTRAPOINTS
                            number of extra random interior points to add to 
                            triangulation
      --open                open resulting svg in google chrome
      --outputTemplate OUTPUTTEMPLATE
                            template for outputting final svg. {{basePath}} is 
                            the only interpolated variable - original filename 
                            without extension
      --subtractBuffer SUBTRACTBUFFER
                            (in inches) how much to shrink outline by to create 
                            inner shape
      --outlineSize OUTLINESIZE
                            (in inches) half of border width between inner cutouts
      --safeBorder SAFEBORDER
                            (in inches) width of border around the inner design
      --rounded             rounds corners of triangles/voronois
    
 # Examples