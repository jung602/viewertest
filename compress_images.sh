#!/bin/bash

# 설명: 이 스크립트는 1~21 폴더 내의 8K webp 이미지를 4K로 압축합니다.
# 이미 4K 이하인 이미지는 건너뜁니다. 고품질을 유지하도록 설정했습니다.

# 필요한 도구 확인
if ! command -v convert &> /dev/null; then
    echo "ImageMagick이 설치되어 있지 않습니다. 'brew install imagemagick'으로 설치하세요."
    exit 1
fi

# 임시 디렉토리 생성
TEMP_DIR="./compressed_temp"
mkdir -p "$TEMP_DIR"

# 1~21 폴더 처리
for dir in {1..21}; do
    if [ -d "$dir" ]; then
        echo "폴더 $dir 처리 중..."
        
        # 각 폴더의 webp 파일 처리
        for img in "$dir"/*.webp; do
            if [ -f "$img" ]; then
                # 이미지 해상도 확인
                dimensions=$(identify -format "%wx%h" "$img")
                width=$(echo $dimensions | cut -d'x' -f1)
                height=$(echo $dimensions | cut -d'x' -f2)
                
                echo "$img: $width x $height"
                
                # 8K 해상도인지 확인 (약 8192x8192 이상)
                if [ "$width" -ge 7000 ] || [ "$height" -ge 7000 ]; then
                    echo "  8K 이미지 발견, 고품질 유지하며 4K(4096x4096)로 압축합니다..."
                    
                    # 3D 텍스처는 정사각형이므로 4096x4096으로 직접 리사이즈
                    new_width=4096
                    new_height=4096
                    
                    # 압축 실행 - 고품질 설정 추가 (품질 95%, 무손실 필터 사용)
                    temp_file="$TEMP_DIR/$(basename "$img")"
                    convert "$img" -resize ${new_width}x${new_height} -quality 95 -define webp:lossless=true -define webp:method=6 "$temp_file"
                    
                    # 원본 백업 만들기 (선택사항)
                    # cp "$img" "${img}.backup"
                    
                    # 원본 파일 교체
                    mv "$temp_file" "$img"
                    echo "  압축 완료: $img ($width x $height → $new_width x $new_height)"
                else
                    echo "  이미 4K 이하 해상도입니다. 건너뜁니다."
                fi
            fi
        done
    fi
done

# 임시 디렉토리 정리
rm -rf "$TEMP_DIR"

echo "모든 이미지 압축이 완료되었습니다." 