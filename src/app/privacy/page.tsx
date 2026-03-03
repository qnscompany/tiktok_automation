import React from 'react';

export default function PrivacyPolicy() {
    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
            <h1>개인정보 처리방침 (Privacy Policy)</h1>
            <p>틱톡 자동화 솔루션은 사용자의 개인정보를 소중히 다루며, 관련 법령을 준수합니다.</p>

            <h3>1. 수집하는 정보</h3>
            <p>- 틱톡 인증 정보: Access Token, Refresh Token (영상 업로드 용도)</p>
            <p>- 틱톡 프로필 정보: Open ID, 닉네임 (계정 식별 용도)</p>

            <h3>2. 정보의 이용 목적</h3>
            <p>수집된 정보는 오직 AI 영상 생성 및 틱톡 계정으로의 업로드 자동화 기능을 수행하기 위해서만 사용됩니다.</p>

            <h3>3. 정보의 보관 및 파기</h3>
            <p>사용자가 연동 해제를 요청하거나 서비스 탈퇴 시, 수집된 모든 인증 토큰 및 개인정보는 즉시 파기됩니다.</p>

            <h3>4. 제3자 제공</h3>
            <p>본 서비스는 사용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 틱톡 API를 통한 영상 전송 시 틱톡 플랫폼에 필요한 데이터가 전달됩니다.</p>

            <p>시행일: 2026년 3월 3일</p>
        </div>
    );
}
