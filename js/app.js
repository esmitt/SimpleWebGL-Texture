//Global
var canvas;
var gl;

//Shaders
var program;

var projectionMatrix; //perspective projection matrix

var cubeData = null;
var earthData = null;
var sunData = null;

var globalTransformations = {y:-1, z: -8, rotateX: -25, rotateY: 0};

var ligthDirection = normalize(vec3(-20, 13, 100));
var lightColor = vec3(0.2, 0.3, 0.45);

var light1Pos = vec3(0, 0, 0);

//initialize WebGL
function initWebGL()
{
	canvas = document.getElementById( "canvas" );

	try 
	{
		gl = canvas.getContext("experimental-webgl", {alpha: false});
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch (e) 
	{
	}

	 if ( !gl ) 
	{ 
		alert( "WebGL isn't available!" ); 
	}
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.CULL_FACE);
	projectionMatrix = perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0 );
}

// load the shaders with name "id". Compiles it, and returns the shader object 
function getShader(gl, id) 
{
	var shaderScript = document.getElementById(id);
	if (!shaderScript) 
		return null;
	var str = "";
	var k = shaderScript.firstChild;
	while (k) 
	{
		if (k.nodeType == 3) 
			str += k.textContent;
		k = k.nextSibling;
	}
	var shader;
	if (shaderScript.type == "x-shader/x-fragment") 
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	else if (shaderScript.type == "x-shader/x-vertex") 
		shader = gl.createShader(gl.VERTEX_SHADER);
	else 
		return null;
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) 
	{
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}

// load the vertex and fragment shaders
function initShaders() 
{
	var fragmentShader = getShader(gl, "fragment-shader");
	var vertexShader = getShader(gl, "vertex-shader");
	
	// create a program to hold both shaders
	program = gl.createProgram();
	
	// attach the shaders  into a program
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	
	// linking
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) 
		alert("Could not initialise shaders");

	// set this program as default!
	gl.useProgram(program);
	
	// getting the location of attributes (vertex position, color and model view matrix)
	program.vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
	gl.enableVertexAttribArray(program.vertexPositionAttribute);
	program.vertexNormalAttribute = gl.getAttribLocation(program, "aVertexNormal");
	gl.enableVertexAttribArray(program.vertexNormalAttribute);
	program.vertexTextureCoordAttribute  = gl.getAttribLocation(program, "aTextureCoord");
	gl.enableVertexAttribArray(program.vertexTextureCoordAttribute);

	program.uPointLightingLocation1 = gl.getUniformLocation(program, "uPointLightingLocation1");
	program.uLightColor = gl.getUniformLocation(program, "uLightColor");
	program.uLightDirection = gl.getUniformLocation(program, "uLightDirection");

    program.mvMatrixUniform = gl.getUniformLocation(program, "uMVMatrix");
    program.uMVMatrixLight = gl.getUniformLocation(program, "uMVMatrixLight");
    program.pMatrixUniform = gl.getUniformLocation(program, "uPMatrix");
    program.nMatrixUniform = gl.getUniformLocation(program, "uNMatrix");
    program.samplerUniform = gl.getUniformLocation(program, "uSampler");
}


// given nv  verteces, with nv colors, and nt triangles indexes
// this function store the data into the GPU, returning the buffers
// of the vertex array, index array (triangles), and color array in GPU format for future references
function createBuffersForShader(vertices, normals, tetureCoords, colors, indexes)
{
	var vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	vertexBuffer.numItems = vertices.length/3;
	vertexBuffer.itemSize = 3;	// x,y,z

	var normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	normalBuffer.numItems = normals.length/3;
	normalBuffer.itemSize = 3;	// x,y,z

	var textureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tetureCoords), gl.STATIC_DRAW);
	textureCoordBuffer.numItems = tetureCoords.length/2;
	textureCoordBuffer.itemSize = 2;	// u,v

	var indexBuffer = gl.createBuffer();
	indexBuffer.itemSize = 1;
	indexBuffer.numItems = indexes.length;
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexes), gl.STATIC_DRAW);

	var colorBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    colorBuffer.itemSize = 4; // r,g,b,a
    colorBuffer.numItems = colors.length/4;
	 
	return [vertexBuffer, normalBuffer, textureCoordBuffer, indexBuffer, colorBuffer];	 
}

function build_sphere(rings, segments, radius, baseColor)
{
	var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    var colorData = [];

    for (var ringsNumber = 0; ringsNumber <= rings; ringsNumber++) 
    {
        var theta = ringsNumber * Math.PI / rings;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var segmentsNumber = 0; segmentsNumber <= segments; segmentsNumber++) 
        {
            var phi = segmentsNumber * 2 * Math.PI / segments;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            
            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (segmentsNumber / segments);
            var v = 1 - (ringsNumber / rings);

            normalData.push(x);
            normalData.push(y);
            normalData.push(z);

            textureCoordData.push(u);
            textureCoordData.push(v);

            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);

            colorData.push(baseColor[0]);
            colorData.push(baseColor[1]);
            colorData.push(baseColor[2]);
            colorData.push(baseColor[3]);
        }
    }
    var indexData = [];
    for (var ringsNumber = 0; ringsNumber < rings; ringsNumber++) 
    {
        for (var segmentsNumber = 0; segmentsNumber < segments; segmentsNumber++) 
        {
            var first = (ringsNumber * (segments + 1)) + segmentsNumber;
            var second = first + segments + 1;

            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);

            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }

	return [vertexPositionData, normalData, textureCoordData, colorData, indexData];
}

 function handleLoadedTexture(texture) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
}

function build_cube()
{
	var vertexPositionData = [
      // Front face
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,

      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,

      // Top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0,

      // Bottom face
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,

      // Right face
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0,

      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0,
    ];

    var normalData = [
      // Front face
       0.0,  0.0,  1.0,
       0.0,  0.0,  1.0,
       0.0,  0.0,  1.0,
       0.0,  0.0,  1.0,

      // Back face
       0.0,  0.0, -1.0,
       0.0,  0.0, -1.0,
       0.0,  0.0, -1.0,
       0.0,  0.0, -1.0,

      // Top face
       0.0,  1.0,  0.0,
       0.0,  1.0,  0.0,
       0.0,  1.0,  0.0,
       0.0,  1.0,  0.0,

      // Bottom face
       0.0, -1.0,  0.0,
       0.0, -1.0,  0.0,
       0.0, -1.0,  0.0,
       0.0, -1.0,  0.0,

      // Right face
       1.0,  0.0,  0.0,
       1.0,  0.0,  0.0,
       1.0,  0.0,  0.0,
       1.0,  0.0,  0.0,

      // Left face
      -1.0,  0.0,  0.0,
      -1.0,  0.0,  0.0,
      -1.0,  0.0,  0.0,
      -1.0,  0.0,  0.0,
    ];

	var textureCoordData = [
	      // Front face
	      0.0, 0.0,
	      1.0, 0.0,
	      1.0, 1.0,
	      0.0, 1.0,

	      // Back face
	      1.0, 0.0,
	      1.0, 1.0,
	      0.0, 1.0,
	      0.0, 0.0,

	      // Top face
	      0.0, 1.0,
	      0.0, 0.0,
	      1.0, 0.0,
	      1.0, 1.0,

	      // Bottom face
	      1.0, 1.0,
	      0.0, 1.0,
	      0.0, 0.0,
	      1.0, 0.0,

	      // Right face
	      1.0, 0.0,
	      1.0, 1.0,
	      0.0, 1.0,
	      0.0, 0.0,

	      // Left face
	      0.0, 0.0,
	      1.0, 0.0,
	      1.0, 1.0,
	      0.0, 1.0,
	];
    
    var  colorData = [];

    for(var i = 0; i < 24 * 4; i++)
    {
    	colorData.push(1.0);
    }

    var indexData = [
      0, 1, 2,      0, 2, 3,    // Front face
      4, 5, 6,      4, 6, 7,    // Back face
      8, 9, 10,     8, 10, 11,  // Top face
      12, 13, 14,   12, 14, 15, // Bottom face
      16, 17, 18,   16, 18, 19, // Right face
      20, 21, 22,   20, 22, 23  // Left face
    ];

    return [vertexPositionData, normalData, textureCoordData, colorData, indexData];
}


function cube()
{
	var cube_data = build_cube();

	var result = createBuffersForShader(cube_data[0], cube_data[1] ,cube_data[2], cube_data[3], cube_data[4]);

	cubeData = {
			vertexPos: result[0],
			normalPos: result[1],
			textureCoordPos: result[2],
			indexPos: result[3],
			colorPos: result[4],
			texture: gl.createTexture()
			};

	cubeData.texture.image = new Image();
    cubeData.texture.image.onload = function () {
    	handleLoadedTexture(cubeData.texture)
    }
    cubeData.texture.image.src = "texture/crate.gif";
}

//create the earth object
function earth()
{
	var earth_data = build_sphere(30, 30, 1, [1, 1, 1, 1]);

	var result = createBuffersForShader(earth_data[0], earth_data[1] ,earth_data[2], earth_data[3], earth_data[4]);

	earthData = {
			vertexPos: result[0],
			normalPos: result[1],
			textureCoordPos: result[2],
			indexPos: result[3],
			colorPos: result[4],
			texture: gl.createTexture(),
			theta: 0,
			orbit: 0
			};

	earthData.texture.image = new Image();
    earthData.texture.image.onload = function () {
    	handleLoadedTexture(earthData.texture)
    }
    earthData.texture.image.src = "texture/earth.jpg";
}

//create the earth object
function sun()
{
	var sun_data = build_sphere(30, 30, 1, [1, 1, 1, 1]);

	var result = createBuffersForShader(sun_data[0], sun_data[1] ,sun_data[2], sun_data[3], sun_data[4]);

	sunData = {
			vertexPos: result[0],
			normalPos: result[1],
			textureCoordPos: result[2],
			indexPos: result[3],
			colorPos: result[4],
			texture: gl.createTexture(),
			theta: 0,
			};

	sunData.texture.image = new Image();
    sunData.texture.image.onload = function () {
    	handleLoadedTexture(sunData.texture)
    }
    sunData.texture.image.src = "texture/sun.jpg";
}

function initObjects()
{
	earth();
	sun();
	cube();
}

function initLights()
{

}

// given the buffers, this function display the corresponding object, using the current shaders
function drawObjectShader(vertexBuffer, normalBuffer, textureCoordBuffer, texture, colorBuffer, indexBuffer)
{
	 gl.activeTexture(gl.TEXTURE0);
     gl.bindTexture(gl.TEXTURE_2D, texture);
     gl.uniform1i(program.samplerUniform, 0);

	 gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	 gl.vertexAttribPointer(program.vertexPositionAttribute, vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

	 gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	 gl.vertexAttribPointer(program.vertexNormalAttribute, normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	 gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
	 gl.vertexAttribPointer(program.vertexTextureCoordAttribute, textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	 /*gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	 gl.vertexAttribPointer(program.vertexColorAttribute, colorBuffer.itemSize, gl.FLOAT, false, 0,0);*/

	 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	 gl.drawElements(gl.TRIANGLES, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function drawCube()
{
	var s = 1.0;
	
	var mv = rotateX(globalTransformations.rotateX);
	mv = mult(mv, rotateY(globalTransformations.rotateY));
	mv = mult(translate(0.0, globalTransformations.y, globalTransformations.z), mv);
	
	gl.uniformMatrix4fv(program.mvMatrixUniform, false, flatten(mv));

	gl.uniformMatrix3fv(program.nMatrixUniform, false, flatten(normalMatrix(mv, true)));

	drawObjectShader(cubeData.vertexPos, cubeData.normalPos, cubeData.textureCoordPos, cubeData.texture, cubeData.colorPos, cubeData.indexPos);
}

function drawSun()
{
	var s = 0.6;
	var mv = mult(rotateZ(-22.1), rotateY(sunData.theta));
	mv = mult(rotateY(globalTransformations.rotateY), mv);
	mv = mult(scalem(s,s,s), mv);
	mv = mult(translate(0,1.6,0), mv);
	mv = mult(rotateX(globalTransformations.rotateX), mv);
	mv = mult(translate(0.0, globalTransformations.y, globalTransformations.z), mv);
	
	gl.uniformMatrix4fv(program.mvMatrixUniform, false, flatten(mv));

	gl.uniformMatrix3fv(program.nMatrixUniform, false, flatten(normalMatrix(mv, true)));

	drawObjectShader(sunData.vertexPos, sunData.normalPos, sunData.textureCoordPos, sunData.texture, sunData.colorPos, sunData.indexPos);
}

function drawEarth()
{
	var s = 0.3;
	var mv = mult(rotateZ(-22.1), rotateY(earthData.theta));
	mv = mult(translate(0, 0, -4), mv);
	mv = mult(rotateY(earthData.orbit), mv);
	mv = mult(rotateY(globalTransformations.rotateY), mv);
	mv = mult(scalem(s,s,s), mv);
	mv = mult(translate(0,1.6,0), mv);
	mv = mult(rotateX(globalTransformations.rotateX), mv);
	mv = mult(translate(0.0, globalTransformations.y, globalTransformations.z), mv);
	
	gl.uniformMatrix4fv(program.mvMatrixUniform, false, flatten(mv));

	gl.uniformMatrix3fv(program.nMatrixUniform, false, flatten(normalMatrix(mv, true)));

	drawObjectShader(earthData.vertexPos, earthData.normalPos, earthData.textureCoordPos, earthData.texture, earthData.colorPos, earthData.indexPos);
}

// render one frame, and do a request for animation
var draw = function() 
{
	// clear the frame buffer and z buffer
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	update();

	gl.uniformMatrix4fv(program.pMatrixUniform, false, flatten(projectionMatrix));   

    gl.uniform3fv(program.uPointLightingLocation1, light1Pos);
    gl.uniform3fv(program.uLightColor, lightColor);
    gl.uniform3fv(program.uLightDirection, ligthDirection);

    var s = 0.6;
	var mv = mult(rotateZ(-22.1), rotateY(sunData.theta));
	mv = mult(rotateY(globalTransformations.rotateY), mv);
	mv = mult(scalem(s,s,s), mv);
	mv = mult(translate(0,1.6,0), mv);
	mv = mult(rotateX(globalTransformations.rotateX), mv);
	mv = mult(translate(0.0, globalTransformations.y, globalTransformations.z), mv);
	
	gl.uniformMatrix4fv(program.uMVMatrixLight, false, flatten(mv));

	drawCube();
	drawSun();
	drawEarth();
			
    requestAnimationFrame(draw);
}

function update()
{
	sunData.theta -= 0.1;
	
	if(sunData.theta <= 0)
		sunData.theta = 360;


	earthData.theta += 0.8;
	
	if(earthData.theta >= 360)
		earthData.theta = 0;

	earthData.orbit -= 0.25;
	if(earthData.orbit <= 0)
		earthData.orbit = 360;
}

// intitialize all
function initApp()
{
	document.onkeydown = handleKeys;
	initWebGL(); //Init webGL context
	initShaders(); //Load and initialize all the shaders

	initObjects(); //Create all the objects
	initLights(); //Initialize all the lights

	draw(); //Draw the first frame
}


function handleKeys(evt)
{
	if (evt.keyCode == 33) {
      // Page Up
      globalTransformations.z -= 0.05;
    }
    if (evt.keyCode == 34) {
      // Page Down
      globalTransformations.z += 0.05;
    }
    if (evt.keyCode == 37) {
      // Left cursor key
      globalTransformations.rotateY -= 1;
    }
    if (evt.keyCode == 39) {
      // Right cursor key
      globalTransformations.rotateY += 1;
    }
    if (evt.keyCode == 38) {
      // Up cursor key
      globalTransformations.rotateX -= 1;
    }
    if (evt.keyCode == 40) {
      // Down cursor key
      globalTransformations.rotateX += 1;
    }
}