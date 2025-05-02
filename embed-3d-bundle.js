(function() {
  const DEBUG = false;
  
  const THREEJS_VERSION = '0.140.0';
  const CDN_SOURCES = [
    `https://cdn.jsdelivr.net/npm/three@${THREEJS_VERSION}`,
    `https://unpkg.com/three@${THREEJS_VERSION}`
  ];
  
  const logger = {
    warn: (msg, error) => DEBUG && console.warn(msg, error),
    error: (msg, error) => DEBUG && console.error(msg, error),
    info: (msg) => DEBUG && console.info(msg)
  };
  
  class ScriptCache {
    constructor() {
      this.dbName = 'threejs-cache';
      this.storeName = 'scripts';
      this.db = null;
      this.initPromise = this.initializeDB();
    }
    
    async initializeDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'url' });
          }
        };
        
        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };
        
        request.onerror = (event) => {
          logger.warn('IndexedDB 초기화 실패, 캐싱 없이 진행:', event.target.error);
          resolve(null);
        };
      });
    }
    
    async getScript(url) {
      await this.initPromise;
      if (!this.db) return null;
      
      return new Promise((resolve) => {
        try {
          const transaction = this.db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.get(url);
          
          request.onsuccess = () => resolve(request.result ? request.result.content : null);
          request.onerror = () => resolve(null);
        } catch (e) {
          logger.warn('캐시 읽기 오류:', e);
          resolve(null);
        }
      });
    }
    
    async saveScript(url, content) {
      await this.initPromise;
      if (!this.db) return false;
      
      return new Promise((resolve) => {
        try {
          const transaction = this.db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.put({ url, content, timestamp: Date.now() });
          
          request.onsuccess = () => resolve(true);
          request.onerror = () => resolve(false);
        } catch (e) {
          logger.warn('캐시 저장 오류:', e);
          resolve(false);
        }
      });
    }
  }
  
  const scriptCache = new ScriptCache();
  
  // 스크립트 내용 가져오기
  async function fetchScript(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`스크립트 다운로드 실패: ${url}, 상태: ${response.status}`);
    }
    return await response.text();
  }
  
  // 스크립트 적용 함수
  function applyScript(content) {
    const script = document.createElement('script');
    script.textContent = content;
    document.head.appendChild(script);
    return true;
  }
  
  // 캐시에서 스크립트 로드 시도
  async function loadFromCache(url) {
    try {
      const cachedScript = await scriptCache.getScript(url);
      if (cachedScript) {
        return applyScript(cachedScript);
      }
    } catch (error) {
      logger.warn('캐시 로드 실패:', error);
    }
    return false;
  }
  
  // 단일 CDN에서 스크립트 로드 시도
  async function loadFromSingleCDN(fullUrl, maxRetries, retryDelay) {
    let retries = 0;
    while (retries <= maxRetries) {
      try {
        const content = await fetchScript(fullUrl);
        await scriptCache.saveScript(fullUrl, content);
        return applyScript(content);
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    return false;
  }
  
  // 향상된 스크립트 로딩 함수 - 캐싱, 재시도, 폴백 기능
  async function loadScriptWithRetryAndFallback(path, maxRetries = 2, retryDelay = 1000) {
    for (let cdnIndex = 0; cdnIndex < CDN_SOURCES.length; cdnIndex++) {
      const fullUrl = `${CDN_SOURCES[cdnIndex]}${path}`;
      
      if (await loadFromCache(fullUrl)) {
        return true;
      }
      
      if (await loadFromSingleCDN(fullUrl, maxRetries, retryDelay)) {
        return true;
      }
      
      logger.warn(`CDN ${CDN_SOURCES[cdnIndex]} 로드 실패, 다음 CDN 시도 중...`);
    }
    
    throw new Error(`모든 CDN에서 스크립트 로드 실패: ${path}`);
  }
  
  // Three.js 초기화 검증 함수
  async function verifyThreeJsLoaded(maxWaitTime = 10000, checkInterval = 100) {
    return new Promise((resolve, reject) => {
      let elapsedTime = 0;
      const intervalId = setInterval(() => {
        if (window.THREE) {
          clearInterval(intervalId);
          resolve(true);
        }
        
        elapsedTime += checkInterval;
        if (elapsedTime >= maxWaitTime) {
          clearInterval(intervalId);
          reject(new Error('Three.js 로드 타임아웃'));
        }
      }, checkInterval);
    });
  }
  
  // 필요한 라이브러리 로드 및 검증
  async function loadDependencies() {
    try {
      await loadScriptWithRetryAndFallback('/build/three.min.js');
      await verifyThreeJsLoaded();
      
      await Promise.all([
        loadScriptWithRetryAndFallback('/examples/js/controls/OrbitControls.js'),
        loadScriptWithRetryAndFallback('/examples/js/loaders/GLTFLoader.js')
      ]);
      
      defineComponent();
    } catch (error) {
      logger.error('라이브러리 로드 실패:', error);
    }
  }
  
  loadDependencies();
  
  function defineComponent() {
    class Scene3D extends HTMLElement {
      static get observedAttributes() {
        return ['id'];
      }
      
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isGrabbing = false;
        this.modelId = this.getAttribute('id') || '1';
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationFrameId = null;
        this.initializeDOM();
      }
      
      initializeDOM() {
        const shadowRoot = this.shadowRoot;
        
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
              width: 200px;
              box-sizing: border-box;
              overflow: hidden;
            }
            .progress-bar {
              width: 100%;
              height: 4px;
              background-color: #eeeeee;
              margin: 10px auto;
              position: relative;
              overflow: hidden;
            }
            .progress-fill {
              position: absolute;
              height: 100%;
              background-color: #666666;
              width: 0%;
              transition: width 0.3s;
              left: 0;
              top: 0;
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
                  <img src="https://rareraw.cafe24.com/altroom/logowhite.png" alt="Logo">
                </a>
              </div>
            </div>
          </div>
        `;
        
        this.canvas = shadowRoot.querySelector('canvas');
        this.loadingEl = shadowRoot.querySelector('.loading');
        this.canvasContainer = shadowRoot.querySelector('.canvas-container');
        this.progressFill = shadowRoot.querySelector('.progress-fill');
      }
      
      setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.mouseUpHandler = this.handleMouseUp.bind(this);
        document.addEventListener('mouseup', this.mouseUpHandler);
        
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.touchEndHandler = this.handleTouchEnd.bind(this);
        document.addEventListener('touchend', this.touchEndHandler);
        
        this.handleResize = this.onResize.bind(this);
        window.addEventListener('resize', this.handleResize);
      }
      
      handleMouseDown() {
        this.isGrabbing = true;
        this.canvasContainer.style.cursor = 'grabbing';
      }
      
      handleMouseUp() {
        this.isGrabbing = false;
        this.canvasContainer.style.cursor = 'grab';
      }
      
      handleTouchStart() {
        this.isGrabbing = true;
        this.canvasContainer.style.cursor = 'grabbing';
      }
      
      handleTouchEnd() {
        this.isGrabbing = false;
        this.canvasContainer.style.cursor = 'grab';
      }
      
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
      
      connectedCallback() {
        try {
          this.setupEventListeners();
          this.initThreeJS();
        } catch (error) {
          logger.error('ThreeJS 초기화 중 오류 발생:', error);
          
          if (this.loadingEl) {
            this.loadingEl.style.display = 'none';
          }
          
          const errorContainer = document.createElement('div');
          errorContainer.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;';
          
          const reloadButton = document.createElement('button');
          reloadButton.textContent = 'Reload';
          reloadButton.style.cssText = 'padding: 8px 16px; background-color: black; color: white; border: none; border-radius: 4px; cursor: pointer;';
          reloadButton.addEventListener('click', () => {
            window.location.reload();
          });
          errorContainer.appendChild(reloadButton);
          
          this.canvasContainer.appendChild(errorContainer);
        }
      }
      
      disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('mouseup', this.mouseUpHandler);
        document.removeEventListener('touchend', this.touchEndHandler);
        
        if (this.renderer) {
          this.renderer.dispose();
        }
        
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
      }
      
      onResize() {
        if (!this.camera || !this.renderer) return;
        
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
        this.render();
      }
      
      initThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
        
        this.camera = new THREE.PerspectiveCamera(10, this.canvas.clientWidth / this.canvas.clientHeight, 0.5, 1000);
        this.camera.position.set(0.86, 2.52, 9.69);
        this.camera.rotation.set(
          THREE.MathUtils.degToRad(-14.60),
          THREE.MathUtils.degToRad(4.93),
          THREE.MathUtils.degToRad(1.28)
        );
        
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
        this.renderer.toneMappingExposure = 1;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.setupControls();
        
        this.setupLights();
        this.onResize();
        this.loadModel();
        this.startAnimationLoop();
      }
      
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
      
      setupLights() {
        const light1 = new THREE.DirectionalLight(0xffffff, 0.5);
        light1.position.set(-5, 3, -7);
        
        const light2 = new THREE.DirectionalLight(0xffffff, 0.1);
        light2.position.set(-5, 3, 7);
        
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x080820, 0.5);
        
        this.scene.add(light1, light2, hemisphereLight);
      }
      
      clearSceneModels() {
        if (!this.scene) return;
        
        const toRemove = [];
        this.scene.traverse(child => {
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
      
      showLoadingIndicator() {
        if (this.loadingEl) {
          this.loadingEl.style.display = 'block';
          if (this.progressFill) {
            this.progressFill.style.width = '0%';
          }
        }
      }
      
      updateLoadingProgress(xhr) {
        if (!this.progressFill) return;
        
        const percent = xhr.total > 0 
          ? (xhr.loaded / xhr.total) * 100 
          : Math.min(xhr.loaded / 1000000 * 100, 99);
        
        this.progressFill.style.width = `${percent}%`;
      }
      
      loadModel() {
        const loader = new THREE.GLTFLoader();
        const modelId = this.modelId;
        const modelPath = `https://rareraw.cafe24.com/altroom/${modelId}/`;
        const modelUrl = `${modelId}.json`;

        const handleBinFiles = (url) => {
          if (url.includes('.bin') && !url.includes('_bin.json')) {
            const binFileName = url.split('/').pop();
            const modelName = binFileName.split('.')[0];
            return url.replace(binFileName, `${modelName}_bin.json`);
          }
          return url;
        };
        
        const originalLoadFunc = THREE.FileLoader.prototype.load;
        
        THREE.FileLoader.prototype.load = function(url, onLoad, onProgress, onError) {
          return originalLoadFunc.call(this, handleBinFiles(url), onLoad, onProgress, onError);
        };
        
        loader.setResourcePath(modelPath);
        loader.setPath(modelPath);
        
        this.fetchModelSettings(modelId)
          .then(modelConfig => {
            loader.load(
              modelUrl,
              (gltf) => {
                const model = gltf.scene;
                this.applyModelOptimizations(model, modelConfig);
                this.scene.add(model);
                this.loadingEl.style.display = 'none';
                THREE.FileLoader.prototype.load = originalLoadFunc;
                this.render();
              },
              (xhr) => this.updateLoadingProgress(xhr),
              (error) => {
                logger.error('모델 로드 실패:', error);
                THREE.FileLoader.prototype.load = originalLoadFunc;
                this.loadingEl.style.display = 'none';
                
                const errorContainer = document.createElement('div');
                errorContainer.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;';
                
                const reloadButton = document.createElement('button');
                reloadButton.textContent = 'Reload';
                reloadButton.style.cssText = 'padding: 8px 16px; background-color: black; color: white; border: none; border-radius: 4px; cursor: pointer;';
                reloadButton.addEventListener('click', () => {
                  window.location.reload();
                });
                errorContainer.appendChild(reloadButton);
                
                this.canvasContainer.appendChild(errorContainer);
              }
            );
          })
          .catch(error => {
            logger.error('모델 설정 로드 실패:', error);
            THREE.FileLoader.prototype.load = originalLoadFunc;
            this.loadingEl.style.display = 'none';
            
            const errorContainer = document.createElement('div');
            errorContainer.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;';
            
            const reloadButton = document.createElement('button');
            reloadButton.textContent = 'Reload';
            reloadButton.style.cssText = 'padding: 8px 16px; background-color: black; color: white; border: none; border-radius: 4px; cursor: pointer;';
            reloadButton.addEventListener('click', () => {
              window.location.reload();
            });
            errorContainer.appendChild(reloadButton);
            
            this.canvasContainer.appendChild(errorContainer);
          });
      }
      
      async fetchModelSettings(modelId) {
        try {
          const response = await fetch('./rareraw.json');
          if (!response.ok) throw new Error('설정 파일을 불러올 수 없습니다.');
          
          const configData = await response.json();
          return configData.find(item => item.id === parseInt(modelId)) || configData[0] || null;
        } catch (error) {
          logger.warn('모델 설정 로드 실패, 기본값 사용:', error);
          return null;
        }
      }
      
      applyModelOptimizations(model, modelConfig) {
        model.traverse((node) => {
          if (node.isMesh && node.geometry) {
            node.geometry.computeVertexNormals();
            if (node.material) {
              node.material.flatShading = false;
            }
          }
        });
        
        if (modelConfig && modelConfig.model) {
          const { position, rotation, scale } = modelConfig.model;
          
          if (position && position.length === 3) {
            model.position.set(...position);
          }
          
          if (rotation && rotation.length === 3) {
            model.rotation.set(...rotation);
          }
          
          if (typeof scale === 'number') {
            model.scale.set(scale, scale, scale);
          } else if (scale && scale.length === 3) {
            model.scale.set(...scale);
          }
        } else {
          model.scale.set(0.6, 0.6, 0.6);
          model.position.set(-0.35, modelConfig ? -1 : -0.55, 1);
          model.rotation.set(0, (Math.PI * 3) - 0.1, 0);
        }
        
        if (modelConfig && modelConfig.camera) {
          this.applyCameraSettings(modelConfig.camera);
        }
      }
      
      applyCameraSettings(cameraConfig) {
        if (!cameraConfig) return;
        
        if (cameraConfig.position && cameraConfig.position.length === 3) {
          this.camera.position.set(...cameraConfig.position);
        }
        
        if (cameraConfig.rotation && cameraConfig.rotation.length === 3) {
          this.camera.rotation.set(
            THREE.MathUtils.degToRad(cameraConfig.rotation[0]),
            THREE.MathUtils.degToRad(cameraConfig.rotation[1]),
            THREE.MathUtils.degToRad(cameraConfig.rotation[2])
          );
        }
        
        this.controls.update();
      }
      
      render() {
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      }
      
      startAnimationLoop() {
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
        }
        
        const animate = () => {
          this.animationFrameId = requestAnimationFrame(animate);
          
          if (this.controls) {
            this.controls.update();
            this.render();
          }
        };
        
        animate();
      }
    }
    
    customElements.define('scene-3d', Scene3D);
  }
})(); 