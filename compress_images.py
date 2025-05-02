import os
from PIL import Image
import glob

def compress_image(input_path, output_path, target_size_kb=1500):
    # 이미지 열기
    with Image.open(input_path) as img:
        # 현재 이미지 크기 확인
        width, height = img.size
        
        # 4K 해상도로 조정 (4096x4096)
        if width > 4096 or height > 4096:
            # 비율 유지하면서 크기 조정
            ratio = min(4096/width, 4096/height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # webp 포맷으로 저장 (최대 품질)
        img.save(output_path, 'WEBP', quality=100, method=6)
        
        # 파일 크기 확인
        file_size_kb = os.path.getsize(output_path) / 1024
        
        # 목표 크기보다 큰 경우 품질을 조정하여 다시 저장
        if file_size_kb > target_size_kb:
            quality = 100
            while file_size_kb > target_size_kb and quality > 10:
                quality -= 5
                img.save(output_path, 'WEBP', quality=quality, method=6)
                file_size_kb = os.path.getsize(output_path) / 1024

def process_folders():
    # 1~21 폴더 처리
    for folder_num in range(1, 22):
        folder_path = f"{folder_num}"
        if not os.path.exists(folder_path):
            continue
            
        # webp 파일 찾기
        webp_files = glob.glob(os.path.join(folder_path, "*.webp"))
        
        for input_path in webp_files:
            # 출력 파일 경로 설정 (원본 파일명 유지)
            output_path = input_path
            
            print(f"처리 중: {input_path}")
            compress_image(input_path, output_path)
            print(f"완료: {output_path}")

if __name__ == "__main__":
    process_folders() 