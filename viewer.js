import * as THREE from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';

const scene = new THREE.Scene();

const width = window.innerWidth;
const height = window.innerHeight;
const ratio = width / height;
// const camera = new THREE.OrthographicCamera(ratio / -2, ratio / 2, 2 / ratio, -2 / ratio, -500, 1000);
const camera = new THREE.PerspectiveCamera(75, ratio, 0.1, 1000);
camera.position.z = 1;
camera.position.y = 0;
camera.position.x = 0;
scene.add(camera);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

const tile_pgw = await fetch("initial_tile.pgw").then((resp) => resp.text());
// assume square pixels, 4096x4096 size for now
const TEXTURE_SIZE = 4096;
const [pixelsize, , , , xcoord, ycoord] = tile_pgw.split("\r\n").map(Number);
console.log(`${pixelsize} ${xcoord} ${ycoord}`);

const station_data = await fetch("data.json").then((resp) => resp.json());
const source_vertices = new Float32Array(3 * station_data.vertices.length);
const target_vertices = new Float32Array(3 * station_data.vertices.length);
const uvs = new Float32Array(2 * station_data.vertices.length);
for (let i = 0; i < station_data.vertices.length; i++) {
    const [sx, sy, tx, ty] = station_data.vertices[i];
    const sx_norm = (sx - xcoord) / (pixelsize * TEXTURE_SIZE);
    const sy_norm = -(sy - ycoord) / (pixelsize * TEXTURE_SIZE);
    if (sx_norm < 0 || sx_norm > 1 || sy_norm < 0 || sy_norm > 1) {
	console.log(`wat? (${sx_norm}, ${sy_norm})`);
    }
    uvs[i*2 + 0] = sx_norm;
    uvs[i*2 + 1] = 1 - sy_norm;
    source_vertices[i*3 + 0] = sx_norm * 2 - 1;
    source_vertices[i*3 + 1] = -(sy_norm * 2 - 1);
    source_vertices[i*3 + 2] = 0.0;
    target_vertices[i*3 + 0] = tx * 2 - 1;
    target_vertices[i*3 + 1] = -(ty * 2 - 1);
    target_vertices[i*3 + 2] = 0.0;
}
console.log(source_vertices);
console.log(target_vertices);
console.log(uvs);

// const geometry = new THREE.PlaneGeometry(300, 300);
// const geometry = new THREE.BufferGeometry();
// const plane = new Float32Array([
//     -150, 150, 0,
//     150, 150, 0,
//     150, -150, 0,
//     -150, -150, 0
// ]);
// geometry.setIndex([2, 1, 0, 2, 3, 0]);
// geometry.setAttribute('position', new THREE.BufferAttribute(plane, 3));
// console.log(geometry.getAttribute('position'));
const geometry = new THREE.BufferGeometry();
geometry.setIndex(station_data.triangles.flat());
console.log(station_data.triangles.flat());
const geom_vertices = new THREE.BufferAttribute(new Float32Array(source_vertices), 3);
geometry.setAttribute('position', geom_vertices);
geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

const tile_texture = new THREE.TextureLoader().load("initial_tile.png");
tile_texture.colorSpace = THREE.SRGBColorSpace;
const material = new THREE.MeshBasicMaterial({map: tile_texture, side: THREE.DoubleSide});
// const material = new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide});
const mesh = new THREE.Mesh(geometry, material);
// mesh.scale.x = 200;
// mesh.scale.y = 200;
// mesh.scale.z = 200;
window.mesh = mesh;
//camera.lookAt(mesh.position);
scene.add(mesh);

const controls = new DragControls([mesh], camera, renderer.domElement);

window.dt = 0;

function interpolate(from, to, out, t) {
    for (let i = 0; i < out.length; i++) {
	out[i] = from[i] * (1 - t) + to[i] * t;
    }
}

function clip(x) {
    if (x < 0) { return 0; }
    else if (x > 1) { return 1; }
    else { return x; }
}

let t = 0;

window.dz = 0;

function animate() {
    requestAnimationFrame(animate);

    t = clip(t + dt);
    interpolate(source_vertices, target_vertices, geom_vertices.array, t);
    geom_vertices.needsUpdate = true;

    mesh.rotation.z += window.dz;

    renderer.render(scene, camera);
}

animate();

