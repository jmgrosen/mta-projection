const { Application, Assets, SimpleMesh, SVGScene } = PIXI;

const app = new Application({resizeTo: window});
window.app = app;
document.body.appendChild(app.view);


const map_overlay = await PIXI.SVGScene.from("/subway_map_overlay.svg").catch((err) => { console.log(err); });
console.log("map_overlay:");
console.log(map_overlay);
map_overlay.position.set(
  document.documentElement.clientWidth / 2,
  window.innerHeight / 2
);
map_overlay.scale.set(0.25);
window.map_overlay = map_overlay;
//map_viewport.addChild(map_overlay);

const tile_pgw = await fetch("initial_tile.pgw").then((resp) => resp.text());
// assume square pixels, 4096x4096 size for now
const TEXTURE_SIZE = 4096;
const [pixelsize, , , , xcoord, ycoord] = tile_pgw.split("\r\n").map(Number);
console.log(`${pixelsize} ${xcoord} ${ycoord}`);

const station_data = await fetch("data.json").then((resp) => resp.json());
const source_vertices = new Float32Array(2 * station_data.vertices.length);
const target_vertices = new Float32Array(2 * station_data.vertices.length);
const uvs = new Float32Array(2 * station_data.vertices.length);
for (let i = 0; i < station_data.vertices.length; i++) {
    const [sx, sy, tx, ty] = station_data.vertices[i];
    const sx_norm = (sx - xcoord) / (pixelsize * TEXTURE_SIZE);
    const sy_norm = -(sy - ycoord) / (pixelsize * TEXTURE_SIZE);
    if (sx_norm < 0 || sx_norm > 1 || sy_norm < 0 || sy_norm > 1) {
	console.log(`wat? (${sx_norm}, ${sy_norm})`);
    }
    uvs[i*2 + 0] = sx_norm;
    uvs[i*2 + 1] = sy_norm;
    source_vertices[i*2 + 0] = sx_norm * 2 - 1;
    source_vertices[i*2 + 1] = (sy_norm * 2 - 1);
    target_vertices[i*2 + 0] = tx * 2 - 1;
    target_vertices[i*2 + 1] = -(ty * 2 - 1);
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
// const geometry = new THREE.BufferGeometry();
// geometry.setIndex(station_data.triangles.flat());
// console.log(station_data.triangles.flat());
const geom_vertices = new Float32Array(source_vertices);
// geometry.setAttribute('position', geom_vertices);
// geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

const tile_texture = await Assets.load("initial_tile.png");
// const material = new THREE.MeshBasicMaterial({map: tile_texture, side: THREE.DoubleSide});
// const material = new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide});
const indices = new Uint16Array(station_data.triangles.flat());
const mesh = new SimpleMesh(tile_texture, geom_vertices, uvs, indices);
mesh.position.set(
  document.documentElement.clientWidth / 2,
  window.innerHeight / 2
);
mesh.scale.set(200);
// mesh.scale.x = 200;
// mesh.scale.y = 200;
// mesh.scale.z = 200;
window.mesh = mesh;
//camera.lookAt(mesh.position);
app.stage.addChild(mesh);

const map_viewport = app.stage.addChild(new PIXI.Container());
window.map_viewport = map_viewport;
// map_viewport.addChild(map_overlay);

// const controls = new DragControls([mesh], camera, renderer.domElement);

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

app.ticker.add(() => {
    t = clip(t + dt);
    interpolate(source_vertices, target_vertices, geom_vertices, t);
});

