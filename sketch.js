const orbitals = [
  { label: "1s",  capacity: 2,  shell: 1 },
  { label: "2s",  capacity: 2,  shell: 2 },
  { label: "2p",  capacity: 6,  shell: 2 },
  { label: "3s",  capacity: 2,  shell: 3 },
  { label: "3p",  capacity: 6,  shell: 3 },
  { label: "4s",  capacity: 2,  shell: 4 },
  { label: "3d",  capacity: 10, shell: 3 },
  { label: "4p",  capacity: 6,  shell: 4 },
  { label: "5s",  capacity: 2,  shell: 5 },
  { label: "4d",  capacity: 10, shell: 4 },
  { label: "5p",  capacity: 6,  shell: 5 },
  { label: "6s",  capacity: 2,  shell: 6 },
  { label: "4f",  capacity: 14, shell: 4 },
  { label: "5d",  capacity: 10, shell: 5 },
  { label: "6p",  capacity: 6,  shell: 6 },
  { label: "7s",  capacity: 2,  shell: 7 },
  { label: "5f",  capacity: 14, shell: 5 },
  { label: "6d",  capacity: 10, shell: 6 },
  { label: "7p",  capacity: 6,  shell: 7 }
];

let electronCount = 0;         // Atomic number from user input.
let electronInput;
let topRowDiv, bottomRowDiv;
let elementSymbolSpan;
let zoom = 1;                // Global zoom factor.

// ---- For removing electrons from the orbital ----
let dragging = false; 
let draggedElectron = null;  // stores {x, y} for removal-dragged electrons

// ---- For adding electrons from the supply ----
let supplyElectron = { x: 0, y: 0, radius: 10 }; 
let draggingSupply = false;    // true when dragging the supply electron

// ---- For the shell overlay toggle ----
let showShellOverlay = false;
let toggleShellButton;         // Button for toggling the shell overlay

// Global variables for orbital data:
let electronPositions = {};        // { shellNumber: [ { x, y }, ... ] }
let originalDistribution = {};     // e.g., { "1": 2, "2": 8, ... } computed from electronCount.
let currentOuterShell = 0;         // Highest shell with electrons.
let outerRemoved = 0;              // Number of electrons removed (via removal action).
let extraAdded = 0;                // Number of electrons added from the supply.

const smoothFactor = 0.005;  // Animation factor for repositioning.

const elementSymbols = {
  1: "H", 2: "He", 3: "Li", 4: "Be", 5: "B", 6: "C", 7: "N", 8: "O", 9: "F", 10: "Ne",
  11: "Na", 12: "Mg", 13: "Al", 14: "Si", 15: "P", 16: "S", 17: "Cl", 18: "Ar", 19: "K", 20: "Ca",
  21: "Sc", 22: "Ti", 23: "V", 24: "Cr", 25: "Mn", 26: "Fe", 27: "Co", 28: "Ni", 29: "Cu", 30: "Zn",
  31: "Ga", 32: "Ge", 33: "As", 34: "Se", 35: "Br", 36: "Kr", 37: "Rb", 38: "Sr", 39: "Y", 40: "Zr",
  41: "Nb", 42: "Mo", 43: "Tc", 44: "Ru", 45: "Rh", 46: "Pd", 47: "Ag", 48: "Cd", 49: "In", 50: "Sn",
  51: "Sb", 52: "Te", 53: "I", 54: "Xe", 55: "Cs", 56: "Ba", 57: "La", 58: "Ce", 59: "Pr", 60: "Nd",
  61: "Pm", 62: "Sm", 63: "Eu", 64: "Gd", 65: "Tb", 66: "Dy", 67: "Ho", 68: "Er", 69: "Tm", 70: "Yb",
  71: "Lu", 72: "Hf", 73: "Ta", 74: "W", 75: "Re", 76: "Os", 77: "Ir", 78: "Pt", 79: "Au", 80: "Hg",
  81: "Tl", 82: "Pb", 83: "Bi", 84: "Po", 85: "At", 86: "Rn", 87: "Fr", 88: "Ra", 89: "Ac", 90: "Th",
  91: "Pa", 92: "U", 93: "Np", 94: "Pu", 95: "Am", 96: "Cm", 97: "Bk", 98: "Cf", 99: "Es", 100: "Fm",
  101: "Md", 102: "No", 103: "Lr", 104: "Rf", 105: "Db", 106: "Sg", 107: "Bh", 108: "Hs", 109: "Mt", 110: "Ds",
  111: "Rg", 112: "Cn", 113: "Nh", 114: "Fl", 115: "Mc", 116: "Lv", 117: "Ts", 118: "Og"
};

function setup() {
  createCanvas(700, 700);
  textAlign(CENTER, CENTER);
  textSize(16);

  // Setup top-left input cho electron count và element symbol.
  topRowDiv = createDiv("");
  topRowDiv.position(20, 20);
  topRowDiv.style("color", "white");
  topRowDiv.style("font-family", "sans-serif");
  let labelSpan = createSpan("Số electron: ");
  labelSpan.parent(topRowDiv);
  electronInput = createInput("0");
  electronInput.style("width", "30px");
  electronInput.parent(topRowDiv);
  electronInput.input(updateElectronCount);
  elementSymbolSpan = createSpan(" (Kí hiệu: -)");
  elementSymbolSpan.parent(topRowDiv);

  // Setup bottom row cho shell distribution.
  bottomRowDiv = createDiv("");
  bottomRowDiv.position(20, 60);
  bottomRowDiv.style("color", "white");
  bottomRowDiv.style("font-family", "sans-serif");
  bottomRowDiv.html("Số electron theo lớp: ");

  // Tạo nút "Lớp vỏ" cho shell overlay.
  toggleShellButton = createButton("Lớp vỏ");
  toggleShellButton.mousePressed(toggleShellOverlay);
  toggleShellButton.style("font-family", "sans-serif");
}

function toggleShellOverlay() {
  showShellOverlay = !showShellOverlay;
}

function updateElectronCount() {
  let val = parseInt(electronInput.value());
  if (!isNaN(val)) {
    electronCount = val;
    // Reset trạng thái khi nhập số electron mới.
    outerRemoved = 0;
    extraAdded = 0;
    dragging = false;
    draggingSupply = false;
    draggedElectron = null;
    electronPositions = {};
    originalDistribution = getShellDistribution(electronCount);
    let shells = Object.keys(originalDistribution).map(Number);
    currentOuterShell = shells.length > 0 ? Math.max(...shells) : 0;
  }
  let symbol = (electronCount >= 1 && electronCount <= 118) ? elementSymbols[electronCount] : "-";
  elementSymbolSpan.html(" (Kí hiệu: " + symbol + ")");
}

function getOrbitalConfiguration(n) {
  // Các trường hợp ngoại lệ cho số electron cụ thể.
  if (n === 24) {
    return [
      { label: "1s", electrons: 2, shell: 1 },
      { label: "2s", electrons: 2, shell: 2 },
      { label: "2p", electrons: 6, shell: 2 },
      { label: "3s", electrons: 2, shell: 3 },
      { label: "3p", electrons: 6, shell: 3 },
      { label: "4s", electrons: 1, shell: 4 },
      { label: "3d", electrons: 5, shell: 3 }
    ];
  }
  if (n === 29) {
    return [
      { label: "1s", electrons: 2, shell: 1 },
      { label: "2s", electrons: 2, shell: 2 },
      { label: "2p", electrons: 6, shell: 2 },
      { label: "3s", electrons: 2, shell: 3 },
      { label: "3p", electrons: 6, shell: 3 },
      { label: "4s", electrons: 1, shell: 4 },
      { label: "3d", electrons: 10, shell: 3 }
    ];
  }
  if (n === 42) {
    return [
      { label: "1s", electrons: 2, shell: 1 },
      { label: "2s", electrons: 2, shell: 2 },
      { label: "2p", electrons: 6, shell: 2 },
      { label: "3s", electrons: 2, shell: 3 },
      { label: "3p", electrons: 6, shell: 3 },
      { label: "4s", electrons: 2, shell: 4 },
      { label: "3d", electrons: 10, shell: 3 },
      { label: "4p", electrons: 6, shell: 4 },
      { label: "5s", electrons: 1, shell: 5 },
      { label: "4d", electrons: 5, shell: 4 }
    ];
  }
  if (n === 47) {
    return [
      { label: "1s", electrons: 2, shell: 1 },
      { label: "2s", electrons: 2, shell: 2 },
      { label: "2p", electrons: 6, shell: 2 },
      { label: "3s", electrons: 2, shell: 3 },
      { label: "3p", electrons: 6, shell: 3 },
      { label: "4s", electrons: 2, shell: 4 },
      { label: "3d", electrons: 10, shell: 3 },
      { label: "4p", electrons: 6, shell: 4 },
      { label: "5s", electrons: 1, shell: 5 },
      { label: "4d", electrons: 10, shell: 4 }
    ];
  }
  if (n === 74) {
    let xenonConfig = [];
    let xenonElectrons = 54;
    let remainingXenon = xenonElectrons;
    for (let orb of orbitals) {
      if (["6s", "4f", "5d", "6p", "7s", "5f", "6d", "7p"].includes(orb.label))
        break;
      if (remainingXenon <= 0) break;
      let count = Math.min(orb.capacity, remainingXenon);
      xenonConfig.push({ label: orb.label, electrons: count, shell: orb.shell });
      remainingXenon -= count;
    }
    let anomaly = [
      { label: "6s", electrons: 1, shell: 6 },
      { label: "4f", electrons: 14, shell: 4 },
      { label: "5d", electrons: 5, shell: 5 }
    ];
    return xenonConfig.concat(anomaly);
  }
  if (n === 79) {
    let xenonConfig = [];
    let xenonElectrons = 54;
    let remainingXenon = xenonElectrons;
    for (let orb of orbitals) {
      if (["6s", "4f", "5d", "6p", "7s", "5f", "6d", "7p"].includes(orb.label))
        break;
      if (remainingXenon <= 0) break;
      let count = Math.min(orb.capacity, remainingXenon);
      xenonConfig.push({ label: orb.label, electrons: count, shell: orb.shell });
      remainingXenon -= count;
    }
    let anomaly = [
      { label: "6s", electrons: 1, shell: 6 },
      { label: "4f", electrons: 14, shell: 4 },
      { label: "5d", electrons: 10, shell: 5 }
    ];
    return xenonConfig.concat(anomaly);
  }
  // Mặc định: điền orbitals theo thứ tự.
  let config = [];
  let remaining = n;
  for (let orb of orbitals) {
    if (remaining <= 0) break;
    let electronsInOrbital = Math.min(orb.capacity, remaining);
    config.push({ label: orb.label, electrons: electronsInOrbital, shell: orb.shell });
    remaining -= electronsInOrbital;
  }
  return config;
}

function getShellDistribution(n) {
  let orbitalConfig = getOrbitalConfiguration(n);
  let distribution = {};
  for (let orb of orbitalConfig) {
    if (distribution[orb.shell])
      distribution[orb.shell] += orb.electrons;
    else
      distribution[orb.shell] = orb.electrons;
  }
  return distribution;
}

function draw() {
  background(0);
  push();
  // Áp dụng hiệu ứng zoom cho phần hiển thị nguyên tử.
  translate(width / 2, height / 2);
  scale(zoom);
  translate(-width / 2, -height / 2);

  const centerX = width / 2;
  const centerY = height / 2;

  // Vẽ hạt nhân.
  const nucleusLabel = (electronCount === 0) ? "0" : electronCount + "+";
  fill(255, 0, 0);
  noStroke();
  ellipse(centerX, centerY, 50, 50);
  fill(255);
  text(nucleusLabel, centerX, centerY);

  // Tính toán phân bố electron theo lớp.
  let displayDistribution = {};
  for (let s in originalDistribution) {
    let shellNum = parseInt(s);
    if (shellNum < currentOuterShell) {
      displayDistribution[s] = originalDistribution[s];
    } else if (shellNum === currentOuterShell) {
      let subtracted = outerRemoved;
      if (draggedElectron && !draggingSupply) {
        subtracted += 1;
      }
      displayDistribution[s] = Math.max(originalDistribution[s] - subtracted + extraAdded, 0);
    }
  }

  const sortedShells = Object.keys(displayDistribution).sort((a, b) => a - b);
  const shellCounts = sortedShells.map(s => displayDistribution[s]);
  bottomRowDiv.html("Số electron theo lớp: " + shellCounts.join(" / "));

  const baseRadiusIncrement = 50;
  // Cập nhật hoặc khởi tạo vị trí cho từng lớp.
  for (let s of sortedShells) {
    const shellNumber = parseInt(s);
    let nElectrons = displayDistribution[s];
    const radius = 60 + (shellNumber - 1) * baseRadiusIncrement;

    // Vẽ vòng quỹ đạo.
    noFill();
    stroke(200);
    strokeWeight(1);
    ellipse(centerX, centerY, radius * 2, radius * 2);

    if (!electronPositions[s] || electronPositions[s].length !== nElectrons) {
      electronPositions[s] = [];
      for (let i = 0; i < nElectrons; i++) {
        const angle = TWO_PI / nElectrons * i;
        const targetX = centerX + radius * cos(angle);
        const targetY = centerY + radius * sin(angle);
        electronPositions[s].push({ x: targetX, y: targetY });
      }
    } else {
      if (!(draggedElectron && !draggingSupply && shellNumber === currentOuterShell)) {
        for (let i = 0; i < nElectrons; i++) {
          const angle = TWO_PI / nElectrons * i;
          const targetX = centerX + radius * cos(angle);
          const targetY = centerY + radius * sin(angle);
          electronPositions[s][i].x = lerp(electronPositions[s][i].x, targetX, smoothFactor);
          electronPositions[s][i].y = lerp(electronPositions[s][i].y, targetY, smoothFactor);
        }
      }
    }
  }

  // Vẽ electron trên các quỹ đạo.
  for (let s of sortedShells) {
    let targets = electronPositions[s];
    if (!targets) continue;
    for (let pos of targets) {
      fill(255);
      noStroke();
      ellipse(pos.x, pos.y, 20, 20);
      fill(0);
      text("-", pos.x, pos.y);
    }
  }

  // Nếu có electron đang được kéo để xóa, vẽ electron đó màu vàng.
  if (draggedElectron && !draggingSupply) {
    fill(255, 255, 0);
    noStroke();
    ellipse(draggedElectron.x, draggedElectron.y, 20, 20);
    fill(0);
    text("-", draggedElectron.x, draggedElectron.y);
  }

  // Vẽ overlay lớp vỏ nếu bật tính năng.
  if (showShellOverlay && currentOuterShell > 0) {
    const outerRadius = 60 + (currentOuterShell - 1) * baseRadiusIncrement;
    const overlayRadius = outerRadius + 20;
    fill(255, 255, 0, 77);  // 30% opacity
    noStroke();
    ellipse(centerX, centerY, overlayRadius * 2, overlayRadius * 2);
    // Tạo khoảng trống không chạm vào hạt nhân.
    const gapDiameter = 50 + 30;
    fill(0);
    ellipse(centerX, centerY, gapDiameter, gapDiameter);
    // Vẽ lại hạt nhân.
    fill(255, 0, 0);
    ellipse(centerX, centerY, 50, 50);
    fill(255);
    text(nucleusLabel, centerX, centerY);
  }
  pop();

  // ---- Vẽ UI góc phải với thứ tự: "Lớp vỏ" - "Electron:" - supply electron ----
  push();
  resetMatrix();
  noStroke();
  const paddingRight = 20;
  // Các khoảng cách giữa các đối tượng UI.
  const gap = 15;
  // Chiều cao cố định của dòng UI.
  const uiY = 20;
  
  // Lấy chiều rộng nút "Lớp vỏ"
  const toggleWidth = toggleShellButton.elt.offsetWidth;
  // Lấy chiều rộng nhãn "Electron:" 
  const electronLabel = "Electron:";
  const labelWidth = textWidth(electronLabel);
  // Supply electron có chiều rộng bằng 2 * radius.
  const supplyWidth = supplyElectron.radius * 2;
  // Tính tổng chiều rộng các phần UI.
  const totalUIWidth = toggleWidth + gap + labelWidth + gap + supplyWidth;
  // Điểm bắt đầu bên trái cần vẽ UI (từ mép phải)
  let startX = width - paddingRight - totalUIWidth;
  
  // Vị trí nút "Lớp vỏ"
  let toggleX = startX;
  // Increase vertical alignment offset to lower the button further.
  let toggleY = uiY - (toggleShellButton.elt.offsetHeight / 2) + 8;
  toggleShellButton.position(toggleX, toggleY);
  
  // Vẽ nhãn "Electron:" bên phải nút "Lớp vỏ"
  let labelX = toggleX + toggleWidth + gap;
  fill(255);
  textAlign(LEFT, CENTER);
  text(electronLabel, labelX, uiY);
  
  // Vẽ supply electron bên phải nhãn "Electron:".
  let supplyX = labelX + labelWidth + gap;
  supplyElectron.y = uiY;
  if (!draggingSupply) {
    supplyElectron.x = supplyX + supplyElectron.radius;
  }
  let currentSupplyPos = draggingSupply ? draggedElectron : supplyElectron;
  fill(draggingSupply ? color(255, 255, 0) : color(255));
  ellipse(currentSupplyPos.x, currentSupplyPos.y, supplyElectron.radius * 2, supplyElectron.radius * 2);
  fill(0);
  textAlign(CENTER, CENTER);
  text("-", currentSupplyPos.x, currentSupplyPos.y);
  pop();
}

function mousePressed() {
  // Kiểm tra nếu chuột đang trỏ vào supply electron (toạ độ cửa sổ).
  if (dist(mouseX, mouseY, supplyElectron.x, supplyElectron.y) < supplyElectron.radius) {
    draggingSupply = true;
    draggedElectron = { x: supplyElectron.x, y: supplyElectron.y };
    return;
  }
  
  // Nếu không, kiểm tra việc kéo electron để xóa khỏi quỹ đạo.
  const worldMouseX = (mouseX - width / 2) / zoom + width / 2;
  const worldMouseY = (mouseY - height / 2) / zoom + height / 2;
  if (currentOuterShell <= 0) return;
  
  const effectiveCount = originalDistribution[currentOuterShell] - outerRemoved + extraAdded;
  let positions = electronPositions[currentOuterShell];
  if (!positions || positions.length !== effectiveCount) {
    const baseRadiusIncrement = 50;
    const radius = 60 + (currentOuterShell - 1) * baseRadiusIncrement;
    positions = [];
    for (let i = 0; i < effectiveCount; i++) {
      const angle = TWO_PI / effectiveCount * i;
      const targetX = width / 2 + radius * cos(angle);
      const targetY = height / 2 + radius * sin(angle);
      positions.push({ x: targetX, y: targetY });
    }
    electronPositions[currentOuterShell] = positions;
  }
  
  // Bắt đầu kéo electron để xóa nếu chuột trúng.
  for (let i = 0; i < positions.length; i++) {
    let pos = positions[i];
    if (dist(worldMouseX, worldMouseY, pos.x, pos.y) < 10) {
      draggedElectron = { x: pos.x, y: pos.y };
      positions.splice(i, 1);
      dragging = true;
      break;
    }
  }
}

function mouseDragged() {
  if (dragging && draggedElectron && !draggingSupply) {
    const worldMouseX = (mouseX - width / 2) / zoom + width / 2;
    const worldMouseY = (mouseY - height / 2) / zoom + height / 2;
    draggedElectron.x = worldMouseX;
    draggedElectron.y = worldMouseY;
  }
  if (draggingSupply && draggedElectron) {
    draggedElectron.x = mouseX;
    draggedElectron.y = mouseY;
  }
}

function mouseReleased() {
  // Khi thả supply electron để thêm.
  if (draggingSupply) {
    const baseRadiusIncrement = 50;
    const radius = 60 + (currentOuterShell - 1) * baseRadiusIncrement;
    const worldX = (draggedElectron.x - width / 2) / zoom + width / 2;
    const worldY = (draggedElectron.y - height / 2) / zoom + height / 2;
    const d = dist(worldX, worldY, width / 2, height / 2);
    if (abs(d - radius) < 20) {
      extraAdded++;
      delete electronPositions[currentOuterShell];
    }
    draggingSupply = false;
    draggedElectron = null;
    supplyElectron.y = 20;
  }
  
  // Xử lý khi thả electron được kéo để xóa.
  if (dragging) {
    outerRemoved++;
    dragging = false;
    draggedElectron = null;
    delete electronPositions[currentOuterShell];
    if (outerRemoved >= originalDistribution[currentOuterShell]) {
      let shells = Object.keys(originalDistribution)
                        .map(Number)
                        .filter(s => s < currentOuterShell);
      if (shells.length > 0) {
        currentOuterShell = Math.max(...shells);
        outerRemoved = 0;
        delete electronPositions[currentOuterShell];
      } else {
        currentOuterShell = 0;
      }
    }
  }
}

function mouseWheel(event) {
  zoom = constrain(zoom - event.delta * 0.001, 0.1, 5);
  return false;
}