#!/bin/bash

echo "Scene3D 웹 컴포넌트 테스트 서버 시작..."
echo "http://localhost:8000/demo.html 에서 컴포넌트를 확인하세요."

# Python 서버 실행
if command -v python3 &>/dev/null; then
    python3 -m http.server
elif command -v python &>/dev/null; then
    python -m http.server
else
    echo "Python이 설치되어 있지 않습니다. http://localhost:8000/ 에 접속하기 위해 Python을 설치하세요."
    exit 1
fi 