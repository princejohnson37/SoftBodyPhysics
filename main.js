import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";
import { World, Box, Vec3, Quaternion, ConvexPolyhedron } from "cannon-es";

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0xffffff);
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const controls = new OrbitControls(camera, renderer.domElement);

camera.position.set(0, 0, 5);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
});

let physicsWorld;
let softBody;
let softBodyMesh;
let mesh;

let mouse = new THREE.Vector2();

const loader = new PLYLoader();
// Load the PLY file
loader.load(
  "models/_gum.ply",
  (geometry) => {
    // Create a Three.js mesh from the loaded PLY geometry
    const material = new THREE.MeshLambertMaterial({ color: 0x303f00, side: THREE.DoubleSide, wireframe: true });
    mesh = new THREE.Mesh(geometry, material);

    softBodyMesh = mesh.clone();
    scene.add(softBodyMesh);

    // Add the mesh to the scene
    scene.add(mesh);

    convertToSoftBody(mesh);

    // Position and orient the camera to view the mesh
    camera.position.z = 5;

    // Render the scene
    animate();
  },
  (xhr) => {
    // Progress callback (optional)
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  (error) => {
    // Error callback (optional)
    console.error("An error occurred while loading the PLY file:", error);
  }
);

// Convert Three.js mesh to Cannon-es soft body
function convertToSoftBody(mesh) {
  const vertices = mesh.geometry.attributes.position.array;
  const indices = mesh.geometry.index.array;
  const scale = mesh.scale.x; // Adjust scale as needed

  // Scale and center the vertices
  const center = new THREE.Vector3();
  mesh.geometry.computeBoundingBox();
  mesh.geometry.boundingBox.getCenter(center);
  const matrix = new THREE.Matrix4()
    .makeTranslation(-center.x, -center.y, -center.z)
    .scale(new THREE.Vector3(scale, scale, scale));
  mesh.geometry.applyMatrix4(matrix);
  mesh.position.copy(center);

  // Convert vertices to Vec3
  const cannonVertices = [];
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];
    cannonVertices.push(new Vec3(x, y, z));
  }

  // Create Cannon-es soft body
  const softBodyShape = new ConvexPolyhedron({
    vertices: cannonVertices,
    indices,
  });
    // Create the soft body from the shape and body
    // softBody = new SoftBody({ shape: softBodyShape, body });

    // Set the soft body mesh layers
    softBodyMesh.layers.set(1); // Add the mesh to layer 1 for raycasting
  
    // Add the soft body to the Cannon-es physics world
    // physicsWorld.addSoftBody(softBody);
  softBody = new Box(new Vec3(scale, scale, scale)); // Example: use Box shape for soft body

  if (softBody.body !== null) {
    softBody.body.angularDamping = 0.1; // Example: set angular damping
    softBody.body.position.copy(mesh.position);
    softBody.body.quaternion.copy(mesh.quaternion);

    // Add the soft body to the Cannon-es physics world
    physicsWorld.addBody(softBody.body);
  }
}

window.addEventListener("click", onMouseClick, false);

function onMouseClick(event) {
  // Calculate normalized device coordinates (NDC) based on mouse position
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Call the stimulateSoftBody function
  stimulateSoftBody();
}

function stimulateSoftBody() {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Intersect the ray with the soft body mesh
  const intersects = raycaster.intersectObject(softBodyMesh);

  if (intersects.length > 0) {
    const contactPoint = intersects[0].point.clone();
    const contactNormal = intersects[0].face.normal.clone();

    // Apply an impulse to the soft body
    const impulse = new Vec3().copy(contactNormal).scale(10);
    softBody.body.applyImpulse(impulse, contactPoint);
  }
}
function updateSoftBody() {
    // Update the Cannon-es physics simulation
    // physicsWorld.step(1 / 60);

    // Update the Three.js mesh to reflect the soft body simulation
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    softBody.position = position;
    softBody.quaternion = quaternion;
    mesh.position.copy(position);
    mesh.quaternion.copy(quaternion);
  }

function animate() {
  requestAnimationFrame(animate);

  // Update the controls
  controls.update();

  updateSoftBody();

  // Render the scene
  renderer.render(scene, camera);
}