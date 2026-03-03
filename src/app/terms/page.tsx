import React from 'react';

export default function TermsOfService() {
    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
            <h1>이용약관 (Terms of Service)</h1>
            <p>본 약관은 틱톡 자동화 솔루션(이하 "서비스")의 이용 조건 및 절차를 규정합니다.</p>

            <h3>1. 서비스 목적</h3>
            <p>본 서비스는 AI를 활용하여 틱톡용 숏폼 영상을 생성하고, 사용자의 승인 하에 틱톡 계정에 업로드하는 기능을 제공합니다.</p>

            <h3>2. 계정 연동</h3>
            <p>사용자는 틱톡 OAuth 인증을 통해 자신의 계정을 연동할 수 있으며, 서비스는 영상 업로드에 필요한 최소한의 권한만을 요청합니다.</p>

            <h3>3. 책임 제한</h3>
            <p>사용자가 생성하고 업로드하는 콘텐츠에 대한 모든 책임은 사용자에게 있으며, 서비스는 콘텐츠의 내용으로 발생하는 법적 문제에 대해 책임지지 않습니다.</p>

            <h3>4. 서비스 중단</h3>
            <p>천재지변, 서버 점검 등 불가피한 사유가 있을 경우 서비스가 일시 중단될 수 있습니다.</p>

            <p>시행일: 2026년 3월 3일</p>
        </div>
    );
}
