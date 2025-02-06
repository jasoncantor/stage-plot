// Global array to store the items placed on the 2D stage
let stageItems = [];

const stage = document.getElementById("stage");
const itemList = document.querySelectorAll(".item");
const saveBtn = document.getElementById("saveLayout");
const loadBtn = document.getElementById("loadLayout");
const toggle3DBtn = document.getElementById("toggle3D");
const stage3DContainer = document.getElementById("stage3D");

// =============  2D MODE  ============= //

/********************************************
 * DRAG FROM SIDEBAR
 ********************************************/
itemList.forEach((item) => {
  item.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", e.target.dataset.type);
  });
});

/********************************************
 * DROP ON STAGE
 ********************************************/
stage.addEventListener("dragover", (e) => {
  e.preventDefault();
});

stage.addEventListener("drop", (e) => {
  e.preventDefault();
  const itemType = e.dataTransfer.getData("text/plain");

  if (itemType) {
    // Create a new DOM element for the dropped item
    const newItem = document.createElement("div");
    newItem.classList.add("stage-item");
    newItem.setAttribute("data-type", itemType);
    newItem.textContent = itemType;

    // Position it where dropped
    const stageRect = stage.getBoundingClientRect();
    const offsetX = e.clientX - stageRect.left;
    const offsetY = e.clientY - stageRect.top;

    newItem.style.left = offsetX + "px";
    newItem.style.top = offsetY + "px";

    // Add drag functionality
    makeDraggable(newItem);

    // Add it to the stage
    stage.appendChild(newItem);

    // Save to global array
    const newId = Date.now(); // unique ID
    newItem.dataset.itemId = newId;

    stageItems.push({
      id: newId,
      type: itemType,
      x: offsetX,
      y: offsetY
    });
  }
});

/********************************************
 * MAKE STAGE ITEMS DRAGGABLE
 ********************************************/
function makeDraggable(element) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  element.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    element.style.zIndex = 9999;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const stageRect = stage.getBoundingClientRect();
    const x = e.clientX - stageRect.left - offsetX;
    const y = e.clientY - stageRect.top - offsetY;

    element.style.left = x + "px";
    element.style.top = y + "px";

    // Update in stageItems array
    const itemId = element.dataset.itemId;
    updateStageItem(itemId, x, y);
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    element.style.zIndex = 1;
  });
}

function updateStageItem(itemId, x, y) {
  stageItems = stageItems.map((item) => {
    if (item.id.toString() === itemId) {
      return { ...item, x, y };
    }
    return item;
  });
}

/********************************************
 * SAVE / LOAD LAYOUT (localStorage Example)
 ********************************************/
saveBtn.addEventListener("click", () => {
  localStorage.setItem("stageLayout", JSON.stringify(stageItems));
  alert("Layout saved!");
});

loadBtn.addEventListener("click", () => {
  const savedData = localStorage.getItem("stageLayout");
  if (!savedData) {
    alert("No saved layout found!");
    return;
  }

  stageItems = JSON.parse(savedData);
  // Clear existing items from the DOM
  stage.innerHTML = '<p class="stage-label">Drag items here</p>';
  
  // Recreate each item in the DOM
  stageItems.forEach((item) => {
    const el = document.createElement("div");
    el.classList.add("stage-item");
    el.setAttribute("data-type", item.type);
    el.dataset.itemId = item.id;
    el.textContent = item.type;
    el.style.left = item.x + "px";
    el.style.top = item.y + "px";
    makeDraggable(el);
    stage.appendChild(el);
  });

  alert("Layout loaded!");
});

// =============  3D MODE  ============= //

// Three.js variables
let scene, camera, renderer, controls;
let stagePlane;

// On page load, init the Three.js scene once
window.addEventListener("load", init3D);

function init3D() {
  const canvas = document.getElementById("threeCanvas");

  // Create Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaaaaaa);

  // Create Camera (Perspective)
  // Alternatively, you could use an OrthographicCamera if you prefer.
  camera = new THREE.PerspectiveCamera(
    45,          // FOV
    canvas.clientWidth / canvas.clientHeight, // Aspect
    0.1,         // Near
    1000         // Far
  );
  camera.position.set(0, 200, 300);

  // Create Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  // OrbitControls (for easy camera rotation/panning)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);

  // A simple directional light
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(100, 200, 100);
  scene.add(light);

  // Ambient light
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // Create a plane to represent the stage in 3D
  const planeGeometry = new THREE.PlaneGeometry(400, 300);
  const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x2c3e50, side: THREE.DoubleSide });
  stagePlane = new THREE.Mesh(planeGeometry, planeMaterial);
  stagePlane.rotation.x = -Math.PI / 2; // Lay it flat (horizontal)
  scene.add(stagePlane);

  animate();
}

// Keep rendering the scene
function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

/********************************************
 * Add Items to the 3D Scene
 ********************************************/
function update3DScene() {
  // Remove old items (if any) from the scene
  // (We only keep the stagePlane and lights, so let's remove anything that's a "mesh" but not the plane)
  scene.traverse((obj) => {
    if (obj.isMesh && obj !== stagePlane) {
      scene.remove(obj);
    }
  });

  // For each item in stageItems, add a small 3D box or shape
  stageItems.forEach((item) => {
    // Basic geometry to represent an item
    const geometry = new THREE.BoxGeometry(20, 20, 20);
    const color = getColorForItemType(item.type);
    const material = new THREE.MeshPhongMaterial({ color });
    const box = new THREE.Mesh(geometry, material);

    // Convert 2D stage coordinates to 3D plane coordinates
    // Our plane is 400 x 300 in size, we can assume 2D stage is that scale or ratio
    // If your 2D stage is e.g. 800px wide, 2D X=400 => 3D X=some fraction
    // For simplicity, do a direct mapping with an offset so center is (0,0)

    const planeWidth = 400;  // matches plane geometry
    const planeHeight = 300; // matches plane geometry
    // The 2D "x,y" in stageItems is from top-left corner. 3D plane center is (0,0).
    // Let's assume the top-left of the plane is (-planeWidth/2, 0, planeHeight/2).
    
    const stageWidth = stage.offsetWidth;   // actual stage pixel width
    const stageHeight = stage.offsetHeight; // actual stage pixel height

    // Convert item.x (0 to stageWidth) into a range of -planeWidth/2 to +planeWidth/2
    const mappedX = (item.x / stageWidth) * planeWidth - planeWidth / 2;
    // Convert item.y (0 to stageHeight) into a range of +planeHeight/2 down to -planeHeight/2
    // (notice we invert y because 2D top->bottom = negative -> positive in 3D)
    const mappedZ = planeHeight / 2 - (item.y / stageHeight) * planeHeight;

    box.position.set(mappedX, 10, mappedZ); // y=10 so it floats slightly above the plane
    scene.add(box);
  });
}

// Simple color selector by item type
function getColorForItemType(type) {
  switch (type) {
    case "mic": return 0x9b59b6;     // Purple
    case "stand": return 0x2ecc71;   // Green
    case "amp": return 0xc0392b;     // Red
    case "keys": return 0x16a085;    // Teal
    case "drums": return 0xf39c12;   // Orange
    case "monitor": return 0xe74c3c; // Light Red
    default: return 0x3498db;        // Blue
  }
}

/********************************************
 * TOGGLE BETWEEN 2D & 3D
 ********************************************/
let is3DMode = false;
toggle3DBtn.addEventListener("click", () => {
  is3DMode = !is3DMode;
  if (is3DMode) {
    // Hide 2D stage, show 3D container
    stage.style.display = "none";
    stage3DContainer.style.display = "block";
    toggle3DBtn.textContent = "Switch to 2D";

    // Update the 3D scene with the current stageItems
    update3DScene();
  } else {
    // Show 2D stage, hide 3D container
    stage.style.display = "block";
    stage3DContainer.style.display = "none";
    toggle3DBtn.textContent = "Switch to 3D";
  }
});
