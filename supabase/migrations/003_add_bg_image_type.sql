-- Migration: assets.type 컬럼에 'bg_image' 값 추가
-- 기존 CHECK 제약이 있다면 삭제 후 재생성

-- 기존 type 제약 삭제 (이름이 다를 수 있으므로 safe하게 처리)
DO $$
BEGIN
    ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_type_check;
EXCEPTION WHEN OTHERS THEN
    NULL; -- 제약이 없어도 실패하지 않음
END;
$$;

-- 새 CHECK 제약 추가 (기존 타입 + bg_image)
ALTER TABLE assets
    ADD CONSTRAINT assets_type_check
    CHECK (type IN ('script_json', 'slide_image', 'bg_image'));
