// 번들링된 Three.js 라이브러리 코드
// 실제로는 webpack, rollup 등의 번들러를 통해 Three.js와 관련 라이브러리를 포함해야 합니다
// 이 파일은 예시용이며, 실제 배포를 위해서는 번들링 도구를 사용하여 생성해야 합니다

(function() {
  // CDN에서 Three.js 라이브러리와 의존성 로드 - ES6 모듈 모드로 개선
  const THREEJS_VERSION = '0.140.0';
  const CDN_BASE = `https://cdn.jsdelivr.net/npm/three@${THREEJS_VERSION}`;
  
  const loadScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  };
  
  // 필요한 라이브러리 한꺼번에 로드
  Promise.all([
    loadScript(`${CDN_BASE}/build/three.min.js`),
    loadScript(`${CDN_BASE}/examples/js/controls/OrbitControls.js`),
    loadScript(`${CDN_BASE}/examples/js/loaders/GLTFLoader.js`)
  ]).then(defineComponent);
  
  function defineComponent() {
    // Scene3D 웹 컴포넌트 정의
    class Scene3D extends HTMLElement {
      static get observedAttributes() {
        return ['id'];
      }
      
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isGrabbing = false;
        this.modelId = this.getAttribute('id') || '1';
        this.initializeDOM();
      }
      
      // DOM 요소 초기화
      initializeDOM() {
        const shadowRoot = this.shadowRoot;
        
        // CSS 스타일 적용
        shadowRoot.innerHTML = `
          <style>
            :host { display: block; width: 100%; }
            .container {
              width: 100%;
              height: 100dvh;
              background-color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            }
            .canvas-container {
              width: 100%;
              max-height: 100dvh;
              aspect-ratio: 4/3;
              position: relative;
              cursor: grab;
              max-width: calc(100dvh * 4 / 3);
            }
            canvas {
              display: block;
              width: 100% !important;
              height: 100% !important;
              background-color: white;
            }
            .logo {
              position: absolute;
              bottom: 12px;
              right: 12px;
              z-index: 9900;
              mix-blend-mode: screen;
            }
            .logo a {
              display: block;
              backdrop-filter: blur(4px);
              opacity: 0.6;
              transition: opacity 0.3s;
            }
            .logo a:hover { opacity: 0.9; }
            .logo img {
              width: auto;
              height: 48px;
            }
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: #666666;
              font-family: Arial, sans-serif;
              text-align: center;
              z-index: 9800;
              background-color: white;
              padding: 15px;
              border-radius: 5px;
            }
            .progress-bar {
              width: 200px;
              height: 4px;
              background-color: #eeeeee;
              margin: 10px auto;
              position: relative;
            }
            .progress-fill {
              position: absolute;
              height: 100%;
              background-color: #666666;
              width: 0%;
              transition: width 0.3s;
            }
          </style>
          <div class="container">
            <div class="canvas-container">
              <canvas></canvas>
              <div class="loading">
                <div>Loading</div>
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>
              </div>
              <div class="logo">
                <a href="https://www.altroom3d.com/" target="_blank" rel="noopener noreferrer">
                  <img src="https://altroom3d.com/logowhite.png" alt="Logo">
                </a>
              </div>
            </div>
          </div>
        `;
        
        // 주요 요소에 대한 참조 저장
        this.canvas = shadowRoot.querySelector('canvas');
        this.loadingEl = shadowRoot.querySelector('.loading');
        this.canvasContainer = shadowRoot.querySelector('.canvas-container');
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
      }
      
      // 이벤트 리스너 설정
      setupEventListeners() {
        // 마우스 이벤트
        this.canvas.addEventListener('mousedown', () => {
          this.isGrabbing = true;
          this.canvasContainer.style.cursor = 'grabbing';
        });
        
        this.mouseUpHandler = () => {
          this.isGrabbing = false;
          this.canvasContainer.style.cursor = 'grab';
        };
        
        // 터치 이벤트
        this.canvas.addEventListener('touchstart', () => {
          this.isGrabbing = true;
          this.canvasContainer.style.cursor = 'grabbing';
        });
        
        this.touchEndHandler = () => {
          this.isGrabbing = false;
          this.canvasContainer.style.cursor = 'grab';
        };
        
        // 이벤트 리스너 등록
        document.addEventListener('mouseup', this.mouseUpHandler);
        document.addEventListener('touchend', this.touchEndHandler);
      }
      
      // 속성 변경 시 호출되는 메서드
      attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'id' && oldValue !== newValue) {
          this.modelId = newValue;
          
          if (this.scene) {
            this.clearSceneModels();
            this.showLoadingIndicator();
            this.loadModel();
          }
        }
      }
      
      // 컴포넌트가 DOM에 연결될 때
      connectedCallback() {
        try {
          this.initThreeJS();
        } catch (error) {
          console.error('ThreeJS 초기화 중 오류 발생:', error);
          
          // 오류 발생 시 로딩 표시기 숨기기
          if (this.loadingEl) {
            this.loadingEl.style.display = 'none';
          }
          
          const errorContainer = document.createElement('div');
          errorContainer.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff0000; background: rgba(0, 0, 0, 0.7); padding: 20px; border-radius: 5px; text-align: center;';
          
          const reloadButton = document.createElement('button');
          reloadButton.textContent = 'Reload';
          reloadButton.style.cssText = 'margin-top: 15px; padding: 8px 16px; background-color: black; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;';
          reloadButton.addEventListener('click', () => {
            window.location.reload();
          });
          errorContainer.appendChild(reloadButton);
          
          this.canvasContainer.appendChild(errorContainer);
        }
      }
      
      // 컴포넌트가 DOM에서 제거될 때
      disconnectedCallback() {
        // 이벤트 리스너 제거
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('mouseup', this.mouseUpHandler);
        document.removeEventListener('touchend', this.touchEndHandler);
        
        // 리소스 정리
        if (this.renderer) {
          this.renderer.dispose();
        }
        
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
        }
      }
      
      // ThreeJS 초기화
      initThreeJS() {
        // 씬 생성
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
        
        // 카메라 생성
        this.camera = new THREE.PerspectiveCamera(10, this.canvas.clientWidth / this.canvas.clientHeight, 0.5, 1000);
        this.camera.position.set(0.86, 2.52, 9.69);
        this.camera.rotation.set(
          THREE.MathUtils.degToRad(-14.60),
          THREE.MathUtils.degToRad(4.93),
          THREE.MathUtils.degToRad(1.28)
        );
        
        // 렌더러 생성 - 성능 최적화
        this.renderer = new THREE.WebGLRenderer({ 
          canvas: this.canvas,
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance',
          samples: 8
        });
        
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.7;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        // 컨트롤 설정
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.setupControls();
        
        // 조명 설정
        this.setupLights();
        
        // 리사이즈 핸들러 설정
        this.handleResize = () => {
          const container = this.canvas.parentElement;
          const width = container.clientWidth;
          const height = container.clientHeight;
          
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(width, height, false);
          this.render();
        };
        
        // 이벤트 리스너 등록 및 초기 렌더링
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
        
        // 모델 로드
        this.loadModel();
        
        // 애니메이션 루프 시작
        this.animate();
      }
      
      // 컨트롤 설정
      setupControls() {
        this.controls.enableZoom = false;
        this.controls.enablePan = false;
        this.controls.rotateSpeed = 0.5;
        this.controls.minAzimuthAngle = -0.52;
        this.controls.maxAzimuthAngle = 0.39;
        this.controls.minPolarAngle = 1.12;
        this.controls.maxPolarAngle = 1.44;
        this.controls.target.set(0, 0, 0);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.01;
        this.controls.update();
      }
      
      // 조명 설정
      setupLights() {
        // 주 방향광
        const light1 = new THREE.DirectionalLight(0xffffff, 1);
        light1.position.set(-5, 3, -7);
        
        const light2 = new THREE.DirectionalLight(0xffffff, 1);
        light2.position.set(-5, 3, 7);
        
        // 반구광 - 부드러운 배경 조명
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x080820, 1);
        
        // 씬에 조명 추가
        this.scene.add(light1, light2, hemisphereLight);
      }
      
      // 씬의 모델들을 제거
      clearSceneModels() {
        if (!this.scene) return;
        
        const toRemove = [];
        this.scene.traverse(child => {
          // 조명과 바닥 메쉬를 제외한 모든 객체
          if (child.type !== 'AmbientLight' && 
              child.type !== 'DirectionalLight' &&
              child.type !== 'HemisphereLight' &&
              child.type !== 'Scene' &&
              !(child.isMesh && child.name === 'ground')) {
            toRemove.push(child);
          }
        });
        
        toRemove.forEach(obj => this.scene.remove(obj));
      }
      
      // 로딩 인디케이터 표시
      showLoadingIndicator() {
        if (this.loadingEl) {
          this.loadingEl.style.display = 'block';
          const progressFill = this.shadowRoot.querySelector('.progress-fill');
          if (progressFill) {
            progressFill.style.width = '0%';
          }
        }
      }
      
      // 로딩 진행률 업데이트
      updateLoadingProgress(xhr) {
        if (!this.loadingEl) return;
        
        const percent = xhr.total > 0 
          ? (xhr.loaded / xhr.total) * 100 
          : Math.min(xhr.loaded / 1000000 * 100, 99);
        
        const progressFill = this.shadowRoot.querySelector('.progress-fill');
        if (progressFill) {
          progressFill.style.width = `${percent}%`;
        }
      }
      
      // 모델 로드
      loadModel() {
        const loader = new THREE.GLTFLoader();
        const modelId = this.modelId;
        const modelUrl = `${modelId}.json`;
        
        // 경로 설정
        const modelPath = `./${modelId}/`;
        loader.setResourcePath(modelPath);
        loader.setPath(modelPath);

        // bin 파일 처리 로직
        const originalLoadFunc = THREE.FileLoader.prototype.load;
        THREE.FileLoader.prototype.load = function(url, onLoad, onProgress, onError) {
          // bin 파일을 json으로 변환
          if (url.includes('.bin') && !url.includes('_bin.json')) {
            const binFileName = url.split('/').pop();
            const modelName = binFileName.split('.')[0];
            url = url.replace(binFileName, `${modelName}_bin.json`);
          }
          return originalLoadFunc.call(this, url, onLoad, onProgress, onError);
        };
        
        // 모델 설정 로드 후 모델 로드
        this.loadModelSettings(loader, modelUrl, originalLoadFunc);
      }
      
      // 모델 설정 로드
      loadModelSettings(loader, modelUrl, originalLoadFunc) {
        fetch('./rarerow.json')
          .then(response => response.json())
          .then(configData => {
            const modelConfig = configData.find(item => item.id === parseInt(this.modelId)) || configData[0];
            this.loadModelWithSettings(loader, modelUrl, modelConfig, originalLoadFunc);
          })
          .catch(() => {
            // 설정 로드 실패 시 기본 설정으로 진행
            this.loadModelWithSettings(loader, modelUrl, null, originalLoadFunc);
          });
      }
      
      // 설정과 함께 모델 로드
      loadModelWithSettings(loader, modelUrl, modelConfig, originalLoadFunc) {
        loader.load(
          modelUrl,
          (gltf) => this.onModelLoaded(gltf, modelConfig, originalLoadFunc),
          (xhr) => this.updateLoadingProgress(xhr),
          (error) => {
            console.error('모델 로드 실패:', error);
            THREE.FileLoader.prototype.load = originalLoadFunc;
            this.loadBasicFallbackObject();
          }
        );
      }
      
      // 모델 로드 완료 처리
      onModelLoaded(gltf, modelConfig, originalLoadFunc) {
        const model = gltf.scene;
        
        // 메시 최적화 및 설정 적용
        this.applySmoothing(model);
        this.applyModelSettings(model, modelConfig);
        
        // 카메라 설정 적용
        if (modelConfig && modelConfig.camera) {
          this.applyCameraSettings(modelConfig.camera);
        }
        
        // 씬에 모델 추가 및 UI 업데이트
        this.scene.add(model);
        this.loadingEl.style.display = 'none';
        
        // 원래 로더 함수 복원 및 렌더링
        THREE.FileLoader.prototype.load = originalLoadFunc;
        this.render();
      }
      
      // 모델에 스무딩 적용
      applySmoothing(model) {
        model.traverse((node) => {
          if (node.isMesh && node.geometry) {
            node.geometry.computeVertexNormals();
            if (node.material) {
              node.material.flatShading = false;
            }
          }
        });
      }
      
      // 모델 설정 적용
      applyModelSettings(model, modelConfig) {
        if (modelConfig && modelConfig.model) {
          const { position, rotation, scale } = modelConfig.model;
          
          // 위치 설정
          if (position && position.length === 3) {
            model.position.set(...position);
          }
          
          // 회전 설정
          if (rotation && rotation.length === 3) {
            model.rotation.set(...rotation);
          }
          
          // 스케일 설정
          if (typeof scale === 'number') {
            model.scale.set(scale, scale, scale);
          } else if (scale && scale.length === 3) {
            model.scale.set(...scale);
          }
        } else {
          // 기본 설정
          model.scale.set(0.6, 0.6, 0.6);
          model.position.set(-0.35, modelConfig ? -1 : -0.55, 1);
          model.rotation.set(0, (Math.PI * 3) - 0.1, 0);
        }
      }
      
      // 카메라 설정 적용
      applyCameraSettings(cameraConfig) {
        if (!cameraConfig) return;
        
        // 카메라 위치 설정
        if (cameraConfig.position && cameraConfig.position.length === 3) {
          this.camera.position.set(...cameraConfig.position);
        }
        
        // 카메라 회전 설정
        if (cameraConfig.rotation && cameraConfig.rotation.length === 3) {
          this.camera.rotation.set(
            THREE.MathUtils.degToRad(cameraConfig.rotation[0]),
            THREE.MathUtils.degToRad(cameraConfig.rotation[1]),
            THREE.MathUtils.degToRad(cameraConfig.rotation[2])
          );
        }
        
        // 컨트롤 업데이트
        this.controls.update();
      }
      
      
      // 렌더링
      render() {
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      }
      
      // 애니메이션 루프
      animate() {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
        
        if (this.controls) {
          this.controls.update();
          this.render();
        }
      }
    }
    
    // 웹 컴포넌트 등록
    customElements.define('scene-3d', Scene3D);
  }
})(); 