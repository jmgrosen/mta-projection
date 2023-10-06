const { Application, Assets, SimpleMesh } = PIXI;

const app = new Application({resizeTo: window, backgroundColor: 0xffffff, antialias: true, autoDensity: true, resolution: window.devicePixelRatio});
window.app = app;
document.body.appendChild(app.view);

const overlay_texture = await PIXI.Texture.fromURL("subway_map_overlay.svg");
// const map_sprite = new PIXI.Sprite(map_overlay);
// const map_overlay = await PIXI.SVGScene.from("/subway_map_overlay_light.svg").catch((err) => { console.log(err); });
// console.log("map_overlay:");
// console.log(map_overlay);
// map_overlay.position.set(
//   document.documentElement.clientWidth / 2,
//   window.innerHeight / 2
// );
// map_overlay.scale.set(0.25);
// window.map_overlay = map_overlay;
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

const geom_vertices = new Float32Array(source_vertices);

const tile_texture = await Assets.load("initial_tile.png");
const indices = new Uint16Array(station_data.triangles.flat());
const mesh = new SimpleMesh(tile_texture, geom_vertices, uvs, indices);
mesh.position.set(
  document.documentElement.clientWidth / 2,
  window.innerHeight / 2
);
console.log(document.documentElement.clientWidth + ", " + window.innerHeight);
const overlay_ratio = overlay_texture.height / overlay_texture.width;
const scale = Math.min(document.documentElement.clientWidth, window.innerHeight / overlay_ratio) / 2;
mesh.scale.set(scale);
window.mesh = mesh;
app.stage.addChild(mesh);

console.log(overlay_texture.width + ", " + overlay_texture.height);
// const overlay_vertices = new Float32Array([-1 / overlay_ratio, -1, -1 / overlay_ratio, 1, 1 / overlay_ratio, 1, 1 / overlay_ratio, -1]);
const overlay_vertices = new Float32Array([-1, -1 * overlay_ratio, -1, 1 * overlay_ratio, 1, 1 * overlay_ratio, 1, -1 * overlay_ratio]);
const overlay_indices = new Uint16Array([0, 1, 2, 2, 3, 0]);
const overlay_uvs = new Float32Array([0, 0, 0, 1, 1, 1, 1, 0]);
const overlay_mesh = new SimpleMesh(overlay_texture, overlay_vertices, overlay_uvs, overlay_indices);
overlay_mesh.position.set(document.documentElement.clientWidth / 2, window.innerHeight / 2);
overlay_mesh.scale.set(scale);
overlay_mesh.alpha = 0;
app.stage.addChild(overlay_mesh);

// const map_viewport = app.stage.addChild(new PIXI.Container());
// window.map_viewport = map_viewport;
// map_viewport.addChild(map_overlay);

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
    overlay_mesh.alpha = t;
});


app.renderer.render(app.stage);
