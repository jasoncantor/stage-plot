// -------------------  Global Data  ------------------- //
let stageItems = []; // store items placed on the 2D stage
let is3DMode = false; // track current mode

// -------------------  2D Elements  ------------------- //
const stage = document.getElementById("stage");
const itemList = document.querySelectorAll(".item");
const saveBtn = document.getElementById("saveLayout");
const loadBtn = document.getElementById("loadLayout");
const toggle3DBtn = document.getElementById("toggle3D");
const exportPDFBtn = document.getElementById("exportPDF");

// -------------------  3D Elements  ------------------- //
const stage3DContainer = document.getElementById("stage3D");
let scene, camera, renderer, controls;
let stagePlane;

// --------------------------------------------------------
//  1) Drag and drop from sidebar to 2D stage
// --------------------------------------------------------
itemList.forEach((item) => {
  item.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", e.target.dataset.type);
  });
});

stage.addEventListener("dragover", (e) => {
  e.preventDefault();
});

stage.addEventListener("drop", (e) => {
  e.preventDefault();
  const itemType = e.dataTransfer.getData("text/plain");

  if (itemType) {
    // Create a new DOM element
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

    // Draggable
    makeDraggable(newItem);

    // Append to stage
    stage.appendChild(newItem);

    // Save item data
    const newId = Date.now();
    newItem.dataset.itemId = newId;
    stageItems.push({
      id: newId,
      type: itemType,
      x: offsetX,
      y: offsetY,
    });
  }
});

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

    // Update stageItems
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

// --------------------------------------------------------
//  2) Save / Load Layout (using localStorage demo)
// --------------------------------------------------------
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

  // Clear current items
  stageItems = JSON.parse(savedData);
  stage.innerHTML = '<p class="stage-label">Drag items here</p>';

  // Recreate items in the DOM
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

// --------------------------------------------------------
//  3) Three.js Setup for 3D Mode
// --------------------------------------------------------
window.addEventListener("load", init3D);

function init3D() {
  const canvas = document.getElementById("threeCanvas");

  // Create scene, camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaaaaaa);

  camera = new THREE.PerspectiveCamera(
    45,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 200, 300);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  // OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);

  // Lights
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(100, 200, 100);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // Plane to represent stage
  const planeGeometry = new THREE.PlaneGeometry(400, 300);
  const planeMaterial = new THREE.MeshPhongMaterial({
    color: 0x2c3e50,
    side: THREE.DoubleSide,
  });
  stagePlane = new THREE.Mesh(planeGeometry, planeMaterial);
  stagePlane.rotation.x = -Math.PI / 2; // horizontal
  scene.add(stagePlane);

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Rebuild the 3D scene from current stageItems
function update3DScene() {
  // remove old 3D items (except plane, lights)
  scene.traverse((obj) => {
    if (obj.isMesh && obj !== stagePlane) {
      scene.remove(obj);
    }
  });

  // create a small box for each stage item
  stageItems.forEach((item) => {
    const geometry = new THREE.BoxGeometry(20, 20, 20);
    const material = new THREE.MeshPhongMaterial({ color: getColorForItemType(item.type) });
    const box = new THREE.Mesh(geometry, material);

    // map 2D positions (x,y) -> 3D plane coords (x, z)
    const planeWidth = 400;
    const planeHeight = 300;

    const stageWidth = stage.offsetWidth;
    const stageHeight = stage.offsetHeight;

    const mappedX = (item.x / stageWidth) * planeWidth - planeWidth / 2;
    const mappedZ = planeHeight / 2 - (item.y / stageHeight) * planeHeight;

    box.position.set(mappedX, 10, mappedZ);
    scene.add(box);
  });
}

function getColorForItemType(type) {
  switch (type) {
    case "mic":
      return 0x9b59b6; // Purple
    case "stand":
      return 0x2ecc71; // Green
    case "amp":
      return 0xc0392b; // Red
    case "keys":
      return 0x16a085; // Teal
    case "drums":
      return 0xf39c12; // Orange
    case "monitor":
      return 0xe74c3c; // Light Red
    default:
      return 0x3498db; // Blue
  }
}

// --------------------------------------------------------
//  4) Toggle between 2D & 3D
// --------------------------------------------------------
toggle3DBtn.addEventListener("click", () => {
  is3DMode = !is3DMode;
  if (is3DMode) {
    stage.style.display = "none";
    stage3DContainer.style.display = "block";
    toggle3DBtn.textContent = "Switch to 2D";
    update3DScene(); // rebuild 3D objects
  } else {
    stage.style.display = "block";
    stage3DContainer.style.display = "none";
    toggle3DBtn.textContent = "Switch to 3D";
  }
});

// --------------------------------------------------------
//  5) Export as PDF (html2canvas + jsPDF)
// --------------------------------------------------------
exportPDFBtn.addEventListener("click", exportToPDF);

async function exportToPDF() {
  // We'll capture whichever view is currently visible
  // (the 2D stage or the 3D canvas)
  if (!is3DMode) {
    // 2D mode: capture the stage DIV
    const stageEl = document.getElementById("stage");
    await captureAndDownloadPDF(stageEl, "StageLayout-2D.pdf");
  } else {
    // 3D mode: capture the 3D canvas
    const threeCanvas = document.getElementById("threeCanvas");
    await captureAndDownloadPDF(threeCanvas, "StageLayout-3D.pdf");
  }
}

async function captureAndDownloadPDF(element, filename = "StageLayout.pdf") {
  // 1) Use html2canvas to capture the element
  const canvas = await html2canvas(element, {
    backgroundColor: null, // keep transparent background if any
    scale: 2,             // increase resolution if desired
  });

  // 2) Convert the canvas to an image data URL
  const imgData = canvas.toDataURL("image/png");

  // 3) Create a new jsPDF instance (portrait, A4)
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "pt", "a4");

  // 4) Calculate dimensions so it fits A4 nicely
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // We'll keep aspect ratio from the canvas
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

  const imgScaledWidth = imgWidth * ratio;
  const imgScaledHeight = imgHeight * ratio;

  // 5) Add the image to PDF and save
  pdf.addImage(
    imgData,
    "PNG",
    (pdfWidth - imgScaledWidth) / 2, // center horizontally
    (pdfHeight - imgScaledHeight) / 2, // center vertically
    imgScaledWidth,
    imgScaledHeight
  );

  pdf.save(filename);
}
