-- assets.type 체크 제약 조건에 audio_narration 추가
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_type_check;

ALTER TABLE assets ADD CONSTRAINT assets_type_check 
CHECK (type IN ('script_json', 'slide_image', 'bg_image', 'audio_narration', 'final_video'));
