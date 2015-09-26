var SA_DEFAULTS = {
  coolingFactor: 0.98,
  minTemp: 0.001,
  initialTemp: 100,
  iterationsPerStep: 100,
  stepCallback: function() {}
};

function SimulatedAnnealing(initialState, costFn, opts) {
  this._opts = _.defaults(opts || {}, SA_DEFAULTS);
  this._state = initialState;
  this._temp = this._opts.initialTemp;
  this._cost = null;
  this._costFn = costFn;
}

SimulatedAnnealing.prototype = {
  run: function() {
    var self = this;
    this._cost = this._costFn(this._state);
    function stepLoop() {
      self.step()
      if (!self.done()) {
        setTimeout(stepLoop, 0);
      }
    }
    stepLoop();
  },

  step: function() {
    if (this.done()) {
      return;
    }

    for (var i = 0; i < this._opts.iterationsPerStep; ++i) {
      this._state.randomMutation();
      var newCost = this._costFn(this._state);
      var ap = Math.exp((this._cost - newCost) / this._temp);
      if (Math.random() < ap) {
        this._cost = newCost;
      } else {
        this._state.undo();
      }
    }

    this._opts.stepCallback(this._state, this._cost, this._temp);
    this._temp *= this._opts.coolingFactor;
  },

  done: function() {
    return this._temp < this._opts.minTemp;
  },
};

function State(numTris, width, height) {
  this._scene = new THREE.Scene();
  this._numTris = numTris;
  this._width = width;
  this._height = height;
  this._undo = null;
}

var COLORS = ["r", "g", "b"];
State.prototype = {
  draw: function(renderer, camera) {
    renderer.render(this._scene, camera);
  },

  randomMutation: function() {
    var i;
    var tri;
    var x;
    while (true) {
      if (!this._scene.children.length) {
        x = 11;
      } else {
        i = randomInt(0, this._scene.children.length);
        tri = this._scene.children[i];
        x = randomInt(0, 13);
      }
      switch (x) {
        case 0:
        case 1:
        case 2:
          this._undo = mutateVertex(tri, x, "x", 0, this._width);
          return;
        case 3:
        case 4:
        case 5:
          this._undo = mutateVertex(tri, x % 3, "y", 0, this._height);
          return;
        case 6:
        case 7:
        case 8:
          this._undo = mutateFloat(tri.material.color, COLORS[x % 3]);
          return;
        case 9:
          this._undo = mutateFloat(tri.material, "opacity");
          return;
        case 10:
          if (this._scene.children.length < 5) {
            continue;
          }
          this._undo = swap(this._scene.children, i, randomInt(0, this._scene.children.length));
          return;
        case 11:
          if (this._numTris + 1 === this._scene.children.length) {
            continue;
          }
          this._undo = mutateCreateTriangle(this._scene, this._width, this._height);
          return;
        case 12:
          this._undo = mutateRemoveTriangle(this._scene, i);
          return;
      }
    }
  },

  undo: function() {
    this._undo();
  }
}

function createRandomTriangle(width, height) {
  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3(randomInt(0, width), randomInt(0, height), 0));
  geometry.vertices.push(new THREE.Vector3(randomInt(0, width), randomInt(0, height), 0));
  geometry.vertices.push(new THREE.Vector3(randomInt(0, width), randomInt(0, height), 0));
  geometry.faces.push(new THREE.Face3(0, 1, 2));

  var material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(Math.random(), Math.random(), Math.random())
  });
  material.opacity = Math.random();
  material.transparent = true;
  material.side = THREE.DoubleSide;
  return new THREE.Mesh(geometry, material);
}

function mutateCreateTriangle(scene, width, height) {
  var tri = createRandomTriangle(width, height);
  scene.add(tri);
  return function() {
    scene.remove(tri);
  };
}

function mutateRemoveTriangle(scene, i) {
  var tri = scene.children[i];
  scene.remove(tri);
  return function() {
    scene.children.splice(i, 0, tri)
  };
}

function mutateVertex(tri, vertex, dimension, min, max) {
  var oldValue = tri.geometry.vertices[vertex][dimension];
  tri.geometry.vertices[vertex][dimension] = randomInt(min, max);
  tri.geometry.verticesNeedUpdate = true;
  return function() {
    tri.geometry.vertices[vertex][dimension] = oldValue;
    tri.geometry.verticesNeedUpdate = true;
  };
}

function mutateFloat(obj, field) {
  var oldValue = obj[field];
  obj[field] = Math.random();
  return function() {
    obj[field] = oldValue;
  };
}

function swap(arr, i, j) {
  var tmp = arr[j];
  arr[j] = arr[i]
  arr[i] = tmp;
  return function() {
    arr[i] = arr[j];
    arr[j] = tmp;
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function buildCostFunction(renderer, camera, srcCtx, diffCtx, width, height) {
  var renderBuf = new Uint8Array(width * height * 4);
  var renderCtx = renderer.getContext();

  var srcBuf = srcCtx.getImageData(0, 0, width, height).data;

  var diffData = diffCtx.createImageData(width, height);
  var diffBuf = diffData.data;
  for (var i = 3, il = width * height * 4; i < il; i += 4) {
    diffBuf[i] = 0xFF;
  }

  return function(state) {
    state.draw(renderer, camera);
    renderCtx.readPixels(0, 0, width, height, renderCtx.RGBA, renderCtx.UNSIGNED_BYTE, renderBuf);

    var diffSq = 0;
    var diff;
    // This is more complicated that it seems it should be because readPixels
    // starts from the lower left while canvas 2D starts from the more intuitive
    // upper left.
    for (var x = 0; x < width; ++x) {
      for (var y = 0; y < height; ++y) {
        var j = ((height - y - 1) * width + x) * 4;
        var k = (y * width + x) * 4;

        diff = diffBuf[k] = Math.abs(renderBuf[j] - srcBuf[k]);
        diffSq += diff * diff;

        diff = diffBuf[k+1] = Math.abs(renderBuf[j+1] - srcBuf[k+1]);
        diffSq += diff * diff;

        diff = diffBuf[k+2] = Math.abs(renderBuf[j+2] - srcBuf[k+2]);
        diffSq += diff * diff;
      }
    }

    diffCtx.putImageData(diffData, 0, 0);
    return Math.sqrt(diffSq);
  };
}
