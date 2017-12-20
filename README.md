SimpleWebGL project (texturing)
===================

A project in WebGL where two spheres are rotating over its center, and one aroung the another one (the Earth over the Sun). Each sphere was created with:
```js
function build_sphere(rings, segments, radius, baseColor)
```
Each one has texture and all the scene is lit. Moreover, exists a cube, composed by 6 planes/faces, which is also textured. The cube is under the *'Earth'*.

I am using the `MV.js` extracted from [Angel's code](https://github.com/esangel/WebGL/tree/master/Common) to handle the matrix and vector in Javascript. The required textures are:
* [crate.gif](http://ccg.ciens.ucv.ve/~esmitt/files/textures/crate.gif)
* [earth.jpg](http://ccg.ciens.ucv.ve/~esmitt/files/textures/earth.jpg)
* [moon.gif](http://ccg.ciens.ucv.ve/~esmitt/files/textures/moon.gif)
* [sun.jpg](http://ccg.ciens.ucv.ve/~esmitt/files/textures/sun.jpg)

The last time, it was tested on Firefox Quantum 57.0.2

###### Do you want to contribute? Great!