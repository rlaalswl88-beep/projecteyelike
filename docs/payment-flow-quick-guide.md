# EYELIKE 결제 흐름 빠른 가이드

## 1) 키 입력 위치
- 파일: `.env.local`
- `NEXT_PUBLIC_TOSS_CLIENT_KEY`: 프론트(브라우저)에서 결제창 호출할 때 사용
- `TOSS_PAYMENTS_SECRET_KEY`: 서버에서 토스 결제 승인 API 호출할 때 사용

## 2) 페이지 흐름
- `app/[locale]/page.tsx`: 이름/연락처 입력
- `app/[locale]/reservation/page.tsx`: 날짜/시간 선택 후 예약 생성 + 결제 준비
- `app/[locale]/checkout-preview/page.tsx`: Toss SDK v2로 결제창 호출
- `app/[locale]/payment/success/page.tsx`: 리다이렉트 후 승인 API 호출
- `app/[locale]/payment/fail/page.tsx`: 결제 실패 표시

## 3) API 흐름
- `POST /api/v1/reservations`: 예약 생성
- `POST /api/v1/payments/prepare`: 주문(orderId)/금액 준비
- `POST /api/v1/payments/confirm`: 결제 승인
  - `TOSS_PAYMENTS_SECRET_KEY`가 있으면 토스 실 승인 호출
  - 없으면 현재 목업 저장소 기준으로만 승인 처리

## 4) 핵심 라이브러리
- Toss SDK v2: `@tosspayments/tosspayments-sdk`
- 다국어: `next-intl`

## 5) 테스트/운영 전환
- 테스트: `test_ck_...` + `test_sk_...`
- 운영: `live_ck_...` + `live_sk_...`
- 코드 수정 없이 환경변수 값만 교체
