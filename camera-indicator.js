// 카메라 위치, 회전, 줌 정보를 표시하는 인디케이터
document.addEventListener('DOMContentLoaded', () => {
  // 인디케이터 UI 생성
  createCameraIndicator();
  
  // 카메라 정보 업데이트 이벤트 리스닝
  document.addEventListener('camera-update', function(event) {
    updateIndicatorDisplay(event.detail);
  });
});

function createCameraIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'camera-indicator';
  indicator.innerHTML = `
    <div class="camera-info">
      <div class="indicator-header">
        <h3>카메라 정보</h3>
        <div class="indicator-controls">
          <button id="toggle-indicator" title="인디케이터 토글">▼</button>
        </div>
      </div>
      <div class="indicator-content">
        <div class="info-row">
          <span>위치 (X, Y, Z):</span>
          <span id="camera-position">0, 0, 0</span>
        </div>
        <div class="info-row">
          <span>회전 (X, Y, Z):</span>
          <span id="camera-rotation">0, 0, 0</span>
        </div>
        <div class="info-row">
          <span>FOV:</span>
          <span id="camera-zoom">0</span>
        </div>
      </div>
    </div>
  `;
  
  // 스타일 추가
  const style = document.createElement('style');
  style.textContent = `
    #camera-indicator {
      position: fixed;
      bottom: 20px;
      left: 20px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 15px;
      border-radius: 10px;
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      transition: all 0.3s;
      cursor: move;
      user-select: none;
    }
    #camera-indicator:hover {
      opacity: 0.95;
    }
    #camera-indicator .camera-info {
      display: flex;
      flex-direction: column;
    }
    #camera-indicator .indicator-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    #camera-indicator h3 {
      margin: 0;
      font-size: 16px;
      color: #7cb9f5;
    }
    #camera-indicator .indicator-controls {
      display: flex;
      gap: 5px;
    }
    #camera-indicator button {
      background: none;
      border: none;
      color: #7cb9f5;
      cursor: pointer;
      font-size: 14px;
      padding: 2px 5px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    #camera-indicator button:hover {
      opacity: 1;
    }
    #camera-indicator .indicator-content {
      overflow: hidden;
      max-height: 200px;
      transition: max-height 0.3s;
    }
    #camera-indicator.collapsed .indicator-content {
      max-height: 0;
    }
    #camera-indicator.collapsed #toggle-indicator {
      transform: rotate(180deg);
    }
    #camera-indicator .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    #camera-indicator .info-row span:first-child {
      margin-right: 10px;
      min-width: 120px;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(indicator);
  
  // 토글 기능 추가
  const toggleButton = document.getElementById('toggle-indicator');
  toggleButton.addEventListener('click', function() {
    indicator.classList.toggle('collapsed');
  });
  
  // 드래그 기능 추가
  let isDragging = false;
  let offsetX, offsetY;
  
  indicator.addEventListener('mousedown', function(e) {
    // 버튼 클릭 시 드래그 방지
    if (e.target.tagName === 'BUTTON') return;
    
    isDragging = true;
    offsetX = e.clientX - indicator.getBoundingClientRect().left;
    offsetY = e.clientY - indicator.getBoundingClientRect().top;
    
    indicator.style.opacity = '0.7';
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // 화면 밖으로 나가지 않도록 경계 체크
    const maxX = window.innerWidth - indicator.offsetWidth;
    const maxY = window.innerHeight - indicator.offsetHeight;
    
    indicator.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    indicator.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    
    // bottom/right 스타일 제거 (left/top 우선)
    indicator.style.bottom = 'auto';
    indicator.style.right = 'auto';
  });
  
  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      indicator.style.opacity = '';
    }
  });
}

// 카메라 정보를 화면에 업데이트
function updateIndicatorDisplay(cameraInfo) {
  if (!cameraInfo) return;
  
  // 위치 정보 업데이트
  const positionEl = document.getElementById('camera-position');
  if (positionEl && cameraInfo.position) {
    const { x, y, z } = cameraInfo.position;
    positionEl.textContent = `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`;
  }
  
  // 회전 정보 업데이트 (라디안에서 각도로 변환)
  const rotationEl = document.getElementById('camera-rotation');
  if (rotationEl && cameraInfo.rotation) {
    const rotation = {
      x: cameraInfo.rotation.x * (180 / Math.PI),
      y: cameraInfo.rotation.y * (180 / Math.PI),
      z: cameraInfo.rotation.z * (180 / Math.PI)
    };
    rotationEl.textContent = `${rotation.x.toFixed(2)}°, ${rotation.y.toFixed(2)}°, ${rotation.z.toFixed(2)}°`;
  }
  
  // FOV 정보 업데이트
  const zoomEl = document.getElementById('camera-zoom');
  if (zoomEl && cameraInfo.fov !== undefined) {
    zoomEl.textContent = cameraInfo.fov.toFixed(2) + '°';
  }
} 