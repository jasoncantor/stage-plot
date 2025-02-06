// Global array to store the items placed on the stage (for saving/loading).
let stageItems = [];

const stage = document.getElementById("stage");
const itemList = document.querySelectorAll(".item");
const saveBtn = document.getElementById("saveLayout");
const loadBtn = document.getElementById("loadLayout");

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
// Allow drop
stage.addEventListener("dragover", (e) => {
  e.preventDefault(); // Allows dropping
});

stage.addEventListener("drop", (e) => {
  e.preventDefault();
  const itemType = e.dataTransfer.getData("text/plain");

  if (itemType) {
    // Create a new DOM element for the dropped item
    const newItem = document.createElement("div");
    newItem.classList.add("stage-item");
    newItem.setAttribute("data-type", itemType);
    newItem.textContent = itemType; // or a more descriptive label
    // Position it where the user dropped
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
    stageItems.push({
      id: Date.now(),
      type: itemType,
      x: offsetX,
      y: offsetY
    });
  }
});

/********************************************
 * MAKE STAGE ITEMS DRAGGABLE AFTER DROP
 ********************************************/
function makeDraggable(element) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  element.addEventListener("mousedown", (e) => {
    isDragging = true;
    // Store the initial offset from the element's left/top
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    element.style.zIndex = 9999; // Bring to front
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const stageRect = stage.getBoundingClientRect();
    const x = e.clientX - stageRect.left - offsetX;
    const y = e.clientY - stageRect.top - offsetY;

    element.style.left = x + "px";
    element.style.top = y + "px";

    // Update the global stageItems array for saving
    const itemId = getStageItemId(element);
    if (itemId) {
      updateStageItem(itemId, x, y);
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    element.style.zIndex = 1;
  });
}

/********************************************
 * HELPERS TO MANAGE STAGE ITEMS
 ********************************************/
function getStageItemId(element) {
  // We don't actually store the element itself, so match by position or a unique ID
  // For simplicity, we can match by top/left + type or store an ID in data attributes
  // Let's store an ID in data attributes if we have one
  return element.dataset.itemId || null;
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
 * SAVE / LOAD LAYOUT EXAMPLE
 ********************************************/
// We'll store items in localStorage as JSON for demonstration.
// In production, you might send this to a server or a database.

saveBtn.addEventListener("click", () => {
  // Attach each .stage-item DOM's "id" to data-item-id so we can identify them
  const stageElements = document.querySelectorAll(".stage-item");
  stageElements.forEach((el) => {
    // If not assigned an itemId yet, do so now
    if (!el.dataset.itemId) {
      const matchedItem = stageItems.find(
        (item) =>
          item.type === el.dataset.type &&
          parseInt(el.style.left) === item.x &&
          parseInt(el.style.top) === item.y
      );
      if (matchedItem) {
        el.dataset.itemId = matchedItem.id;
      }
    }
  });

  localStorage.setItem("stageLayout", JSON.stringify(stageItems));
  alert("Layout saved!");
});

loadBtn.addEventListener("click", () => {
  const savedData = localStorage.getItem("stageLayout");
  if (!savedData) {
    alert("No saved layout found!");
    return;
  }

  // Clear existing items
  stageItems = [];
  stage.innerHTML = '<p class="stage-label">Drag items here</p>';

  const savedItems = JSON.parse(savedData);
  savedItems.forEach((item) => {
    // Recreate item on the stage
    const el = document.createElement("div");
    el.classList.add("stage-item");
    el.setAttribute("data-type", item.type);
    el.dataset.itemId = item.id; // store unique ID
    el.textContent = item.type;
    el.style.left = item.x + "px";
    el.style.top = item.y + "px";
    makeDraggable(el);
    stage.appendChild(el);
  });

  // Reassign to global array
  stageItems = savedItems;
});
