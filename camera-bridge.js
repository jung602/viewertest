// 카메라 정보 브릿지
// Scene3D 웹 컴포넌트와 카메라 인디케이터 간 통신을 위한 파일

(function() {
  // 전역 공간에 CameraBridge 객체 생성
  window.CameraBridge = {
    // 카메라 정보 저장 변수들
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    fov: 10, // 기본값
    
    // 카메라 정보 업데이트 메서드
    updateCameraInfo: function(camera) {
      if (!camera) return;
      
      // 위치 정보 복사
      this.position.x = camera.position.x;
      this.position.y = camera.position.y;
      this.position.z = camera.position.z;
      
      // 회전 정보 복사
      this.rotation.x = camera.rotation.x;
      this.rotation.y = camera.rotation.y;
      this.rotation.z = camera.rotation.z;
      
      // FOV 정보 복사
      this.fov = camera.fov;
      
      // 커스텀 이벤트 발생
      const event = new CustomEvent('camera-update', {
        detail: {
          position: this.position,
          rotation: this.rotation,
          fov: this.fov
        }
      });
      
      document.dispatchEvent(event);
    }
  };
  
  // Scene3D가 로드되고 나서 패치하는 함수
  function patchScene3D() {
    // 모든 scene-3d 요소에 대해 진행
    const scene3dElements = document.querySelectorAll('scene-3d');
    
    scene3dElements.forEach(element => {
      // animate 함수 패치하여 카메라 정보 브릿지에 전달
      if (element.animate && typeof element.animate === 'function') {
        const originalAnimate = element.animate;
        
        // 업데이트 간격 관리를 위한 변수
        let lastUpdateTime = 0;
        const updateInterval = 100; // ms
        
        element.animate = function() {
          // 원래 animate 메서드 호출
          const result = originalAnimate.apply(this, arguments);
          
          const now = Date.now();
          if (now - lastUpdateTime > updateInterval) {
            lastUpdateTime = now;
            
            // 카메라 정보 브릿지를 통해 업데이트
            if (this.camera) {
              window.CameraBridge.updateCameraInfo(this.camera);
            }
          }
          
          return result;
        };
        
        console.log('카메라 브릿지: Scene3D 애니메이션 함수 패치 완료');
      } else {
        console.warn('카메라 브릿지: Scene3D 애니메이션 함수를 찾을 수 없습니다');
      }
    });
  }
  
  // Scene3D 웹 컴포넌트가 초기화될 때까지 대기
  let attempts = 0;
  const maxAttempts = 10;
  
  function checkAndPatch() {
    const scene3dElements = document.querySelectorAll('scene-3d');
    
    if (scene3dElements.length > 0 && scene3dElements[0].animate) {
      patchScene3D();
    } else {
      attempts++;
      
      if (attempts < maxAttempts) {
        setTimeout(checkAndPatch, 500);
      } else {
        console.error('카메라 브릿지: Scene3D 컴포넌트를 찾을 수 없거나 초기화되지 않았습니다.');
      }
    }
  }
  
  // DOM이 로드된 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // 웹 컴포넌트가 정의되고 렌더링될 시간을 주기 위해 지연
      setTimeout(checkAndPatch, 1000);
    });
  } else {
    // 이미 로드된 경우
    setTimeout(checkAndPatch, 1000);
  }
})(); 