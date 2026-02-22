const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let image = new Image();
let imagePos = { x: 0, y: 0, dragging: false, dragOffset: { x: 0, y: 0 } };
let imageLoaded = false;
let imageDrawSize = { width: 0, height: 0 };

let texts = [];
let undoStack = [];
let redoStack = [];
let fontSize = 17;
let lineHeight = fontSize * 1.2;

window.addEventListener('load', () => {
  canvas.width = 800;
  canvas.height = 600;
  drawCanvas();
});

function saveState() {
  undoStack.push(JSON.parse(JSON.stringify(texts)));
  redoStack = [];
}

document.getElementById('imageInput').addEventListener('change', (e) => {
  handleImageUpload(e.target.files[0]);
});

canvas.addEventListener('click', () => {
  if (!imageLoaded) {
    document.getElementById('imageInput').click();
  }
});

function handleImageUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (event) {
    image.onload = () => {
      imageLoaded = true;

      const canvasRatio = 4 / 3;
      const imgRatio = image.width / image.height;

      if (imgRatio > canvasRatio) {
        imageDrawSize.height = canvas.height;
        imageDrawSize.width = canvas.height * imgRatio;
      } else {
        imageDrawSize.width = canvas.width;
        imageDrawSize.height = canvas.width / imgRatio;
      }

      imagePos.x = (canvas.width - imageDrawSize.width) / 2;
      imagePos.y = (canvas.height - imageDrawSize.height) / 2;

      drawCanvas();
    };
    image.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function drawCanvas() {
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!imageLoaded) {
    ctx.font = '20px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('Klik atau drop gambar di sini', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
  } else {
    ctx.drawImage(image, imagePos.x, imagePos.y, imageDrawSize.width, imageDrawSize.height);
  }

  ctx.font = `bold ${fontSize}px Calibri`;
  ctx.lineWidth = 2;

  texts.forEach((textObj) => {
    const isActionText = textObj.text.startsWith("*");
    ctx.strokeStyle = 'black';
    ctx.fillStyle = isActionText ? "#C2A2DA" : "#FFFFFF";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    textObj.text.split('\n').forEach((line, i) => {
      ctx.strokeText(line, textObj.x, textObj.y + (i * lineHeight));
      ctx.fillText(line, textObj.x, textObj.y + (i * lineHeight));
    });

    ctx.shadowColor = "transparent";
  });
}

function addText() {
  const textInput = document.getElementById('textInput').value.trim();
  if (!textInput) return;

  saveState();

  texts.push({
    text: textInput,
    x: 50,
    y: 50 + texts.reduce((acc, curr) => acc + curr.text.split('\n').length, 0) * lineHeight
  });

  document.getElementById('textInput').value = '';
  drawCanvas();
}

function undoAction() {
  if (undoStack.length > 0) {
    redoStack.push(JSON.parse(JSON.stringify(texts)));
    texts = undoStack.pop();
    drawCanvas();
  }
}

function redoAction() {
  if (redoStack.length > 0) {
    undoStack.push(JSON.parse(JSON.stringify(texts)));
    texts = redoStack.pop();
    drawCanvas();
  }
}

function changeFontSize(delta) {
  fontSize = Math.max(12, Math.min(30, fontSize + delta));
  lineHeight = fontSize * 1.2;
  document.getElementById('fontSizeLabel').textContent = fontSize;
  drawCanvas();
}

function downloadImage() {
  drawCanvas();
  const link = document.createElement('a');
  link.download = 'ssrp-image.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

async function uploadToImgur() {
  const linkContainer = document.getElementById('imgurLinkContainer');
  const linkInput = document.getElementById('imgurLinkInput');

  drawCanvas();
  linkInput.value = "Uploading to Imgur...";
  linkContainer.style.display = 'block';

  try {
    const imageData = canvas.toDataURL('image/png').split(',')[1];
    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': 'Client-ID 6b1da49ab5fce27',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `image=${encodeURIComponent(imageData)}`
    });

    const result = await response.json();
    linkInput.value = result.success ? `[img]${result.data.link}[/img]` : 'Upload failed';
  } catch (error) {
    linkInput.value = `Error: ${error.message}`;
  }
}

function copyImgurLink() {
  const input = document.getElementById('imgurLinkInput');
  input.select();
  document.execCommand('copy');

  const btn = document.querySelector('#imgurLinkContainer button:first-of-type');
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 2000);
}

function closeImgurLink() {
  document.getElementById('imgurLinkContainer').style.display = 'none';
}

// === MOUSE DRAG (Hanya Horizontal) ===
canvas.addEventListener('mousedown', (e) => {
  if (!imageLoaded) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (mouseX >= imagePos.x &&
      mouseX <= imagePos.x + imageDrawSize.width &&
      mouseY >= imagePos.y &&
      mouseY <= imagePos.y + imageDrawSize.height) {
    imagePos.dragging = true;
    imagePos.dragOffset = {
      x: mouseX - imagePos.x,
      y: mouseY - imagePos.y
    };
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!imageLoaded || !imagePos.dragging) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;

  let newX = mouseX - imagePos.dragOffset.x;
  newX = Math.min(0, Math.max(canvas.width - imageDrawSize.width, newX));

  imagePos.x = newX;
  drawCanvas();
});

canvas.addEventListener('mouseup', () => {
  imagePos.dragging = false;
  canvas.style.cursor = 'grab';
});

canvas.addEventListener('mouseleave', () => {
  imagePos.dragging = false;
  canvas.style.cursor = 'grab';
});

// === TOUCH DRAG (Hanya Horizontal) ===
canvas.addEventListener('touchstart', (e) => {
  if (!imageLoaded) return;

  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (x >= imagePos.x &&
      x <= imagePos.x + imageDrawSize.width &&
      y >= imagePos.y &&
      y <= imagePos.y + imageDrawSize.height) {
    imagePos.dragging = true;
    imagePos.dragOffset = {
      x: x - imagePos.x,
      y: y - imagePos.y
    };
  }
});

canvas.addEventListener('touchmove', (e) => {
  if (!imageLoaded || !imagePos.dragging) return;

  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const touchX = touch.clientX - rect.left;

  let newX = touchX - imagePos.dragOffset.x;
  newX = Math.min(0, Math.max(canvas.width - imageDrawSize.width, newX));

  imagePos.x = newX;
  drawCanvas();
}, { passive: false });

canvas.addEventListener('touchend', () => {
  imagePos.dragging = false;
});

// === ENTER KEY ===
document.getElementById('textInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addText();
  }
});

window.addEventListener('load', () => {
  setTimeout(() => {
    const tray = document.getElementById('adsTray');
    if (tray) {
      tray.classList.add('show');
    }
  }, 800);
});

function closeAdsTray() {
  const tray = document.getElementById('adsTray');
  tray.classList.remove('show');
}

.ad-banner iframe {
    width: 100%;
    max-width: 160px;
}
