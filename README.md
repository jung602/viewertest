# Scene3D Web Component

Three.js 기반의 3D 모델 렌더링을 위한 웹 컴포넌트입니다.

## 사용 방법

### 방법 1: ESM 모듈 방식 (개발용)

이 방식은 Three.js 모듈을 외부에서 로드합니다.

```html
<script type="module" src="https://altroom3d.com/web-components/embed-all-in-one.js"></script>
<scene-3d></scene-3d>
```

### 방법 2: 단일 파일 방식 (배포용)

이 방식은 모든 의존성이 포함된 단일 파일을 로드합니다.

```html
<script src="https://altroom3d.com/web-components/embed-bundle.js"></script>
<scene-3d></scene-3d>
```

## 테스트 방법

로컬에서 테스트하려면:

```bash
cd web-components
./test.sh
```

그런 다음 다음 주소로 접속하세요:
- http://localhost:8000/demo.html (ESM 모듈 버전)
- http://localhost:8000/bundle-demo.html (번들 버전)

## 파일 구조

- `embed-all-in-one.js`: ESM 모듈 방식으로 Three.js를 로드하는 버전
- `embed-bundle.js`: 모든 의존성이 포함된 단일 파일 버전
- `demo.html`: ESM 모듈 버전 테스트 페이지
- `bundle-demo.html`: 번들 버전 테스트 페이지
- `DEPLOYMENT.md`: 배포 가이드
- `test.sh`: 로컬 테스트 스크립트

## 제한 사항

- 모바일 디바이스에서는 성능에 따라 렌더링 품질이 저하될 수 있습니다.
- 브라우저는 WebGL을 지원해야 합니다.

## 라이센스

전체 저작권은 Altroom3D에 있습니다. 