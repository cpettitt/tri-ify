# Try-ify

A program that takes a picture and produces an arrangement of triangles that
maximizes the similarity to the original picture.

![Screen Shot](/screenshot.png?raw=true)

This idea is in no way original. See [Genetic Programming: Evolution of Mona Lisa](http://rogeralsing.com/2008/12/07/genetic-programming-evolution-of-mona-lisa/).

## How to run it

In the root of this project, do:

```
python -m SimpleHTTPServer
```

Then launch a browser and connect to http://localhost:8000

## How does it work?

This program uses [simulated annealing](https://en.wikipedia.org/wiki/Simulated_annealing)
to do the optimization. We load an initial source image into a
[2D canvas](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D),
giving us access to the raw data. Then we generate an initial empty state for
the simulated annealing algorithm. On each iteration of the algorithm we
mutate the state, render it with [three.js](http://threejs.org/), diff it
against the source image, and either keep it or revert depending on the quality
of the rendered output and the current temperature.

## Why?

To learn more about three.js and to play with JavaScript's Typed Arrays.
