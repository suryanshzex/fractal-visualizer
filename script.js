const canvas = document.getElementById('fractalCanvas');
const gl = canvas.getContext('webgl');
const fractalSelect = document.getElementById('fractalType');
const zoomSlider = document.getElementById('zoomSlider');

let coordDisplay = document.getElementById('coordDisplay');
if (!coordDisplay) {
    coordDisplay = document.createElement('div');
    coordDisplay.id = 'coordDisplay';
    coordDisplay.style.position = 'absolute';
    coordDisplay.style.top = '10px';
    coordDisplay.style.left = '10px';
    coordDisplay.style.color = 'white';
    coordDisplay.style.fontFamily = 'monospace';
    coordDisplay.style.background = 'rgba(0,0,0,0.5)';
    coordDisplay.style.padding = '5px';
    coordDisplay.style.borderRadius = '5px';
    coordDisplay.style.zIndex = '10';
    document.body.appendChild(coordDisplay);
}

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const vertexShaderSrc = `
attribute vec2 a_position;
varying vec2 v_position;
void main() {
  v_position = a_position;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSrc = `
precision highp float;
varying vec2 v_position;
uniform vec2 u_resolution;
uniform float u_zoom;
uniform int u_type;
const int MAX_ITER = 1000;
const float P = 0.5667;

vec3 getColor(int iter){
  float t = float(iter)/float(MAX_ITER);
  return vec3(9.0*(1.0-t)*t*t*t, 15.0*(1.0-t)*(1.0-t)*t*t, 8.5*(1.0-t)*(1.0-t)*(1.0-t)*t);
}

void main(){
  vec2 pos = vec2(v_position.x * u_resolution.x / u_resolution.y, v_position.y);
  vec2 c;
  if(u_type==0) c = pos / u_zoom + vec2(-0.74364388703, 0.13182590421);
  else if(u_type==1) c = pos / u_zoom + vec2(-1.831, -0.004);
  else c = pos / u_zoom + vec2(-0.74543, 0.11301);

  float x=0.0, y=0.0, xPrev=0.0, yPrev=0.0;
  int iter=0;

  for(int i=0;i<MAX_ITER;i++){
    if(u_type==0){
      float xNew = x*x - y*y + c.x;
      y = 2.0*x*y + c.y;
      x = xNew;
    } else if(u_type==1){
      float xNew = x*x - y*y + c.x;
      y = -(abs(2.0*x*y) + c.y);
      x = -xNew;
    } else if(u_type==2){
      float xNew = x*x - y*y + c.x + P*xPrev;
      float yNew = 2.0*x*y + c.y + P*yPrev;
      xPrev = x;
      yPrev = y;
      x = xNew;
      y = yNew;
    }
    if(x*x + y*y > 4.0) break;
    iter++;
  }

  vec3 color = getColor(iter);
  gl_FragColor = vec4(color,1.0);
}
`;

function compileShader(src,type){
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
    console.error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

const vertexShader = compileShader(vertexShaderSrc, gl.VERTEX_SHADER);
const fragmentShader = compileShader(fragmentShaderSrc, gl.FRAGMENT_SHADER);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
const posAttrib = gl.getAttribLocation(program,"a_position");
gl.enableVertexAttribArray(posAttrib);
gl.vertexAttribPointer(posAttrib,2,gl.FLOAT,false,0,0);

const uResolution = gl.getUniformLocation(program,"u_resolution");
const uZoom = gl.getUniformLocation(program,"u_zoom");
const uType = gl.getUniformLocation(program,"u_type");

let zoom = 50000;
let baseZoom = 50000;

function resetFractal(){
  if(fractalSelect.value==="mandelbrot") baseZoom = 50000;
  else if(fractalSelect.value==="burningShip") baseZoom = 100000;
  else baseZoom = 120000;

  zoom = baseZoom;
  zoomSlider.value = 0;
}

fractalSelect.addEventListener('change', resetFractal);
resetFractal();

zoomSlider.addEventListener('input', e=>{
  const t = zoomSlider.value / 100;
  zoom = baseZoom * Math.pow(0.00001, t);
});

function draw(){
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.uniform2f(uResolution,canvas.width,canvas.height);
  gl.uniform1f(uZoom,zoom);
  gl.uniform1i(uType, fractalSelect.value==="mandelbrot"?0:fractalSelect.value==="burningShip"?1:2);
  gl.drawArrays(gl.TRIANGLES,0,6);
  requestAnimationFrame(draw);
}

draw();

window.addEventListener('resize', ()=>{
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
  
    if (mouseX <= 100 && mouseY <= 100) {
        let node;
        if(fractalSelect.value==="mandelbrot") node = {x:-0.74364388703, y:0.13182590421};
        else if(fractalSelect.value==="burningShip") node = {x:-1.831, y:-0.004};
        else node = {x:-0.74543, y:0.11301};
        coordDisplay.innerText = `x: ${node.x.toFixed(8)}, y: ${node.y.toFixed(8)}`;
        return;
    }
  
    const ndcX = (mouseX / canvas.width) * 2 - 1;
    const ndcY = ((canvas.height - mouseY) / canvas.height) * 2 - 1;
  
    const aspect = canvas.width / canvas.height;
    const posX = ndcX * aspect;
    const posY = ndcY;
  
    let node;
    if(fractalSelect.value==="mandelbrot") node = {x:-0.74364388703, y:0.13182590421};
    else if(fractalSelect.value==="burningShip") node = {x:-1.831, y:-0.004};
    else node = {x:-0.74543, y:0.11301};
  
    const x = (posX / zoom + node.x).toFixed(8);
    const y = (posY / zoom + node.y).toFixed(8);
  
    coordDisplay.innerText = `x: ${x}, y: ${y}`;
});
