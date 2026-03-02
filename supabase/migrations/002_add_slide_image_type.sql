-- 002: assets.type에 'slide_image' 허용 추가
-- 기존 CHECK 제약 삭제 후 새로운 제약 추가

ALTER TABLE public.assets
DROP CONSTRAINT IF EXISTS assets_type_check;

ALTER TABLE public.assets
ADD CONSTRAINT assets_type_check
CHECK (type IN ('script_json', 'slide_image'));

-- content_json을 nullable로 변경 (slide_image는 스토리지 경로 정보만 저장)
ALTER TABLE public.assets
ALTER COLUMN content_json DROP NOT NULL;
