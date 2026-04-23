/**
 * 토스페이먼츠 클라이언트 키는 동일 API로, 접두어로 구분됩니다.
 * - test_ck_ : 테스트(샌드박스) — 실제 청구 없음
 * - live_ck_ : 라이브(정식) — 실제 결제
 * @see https://docs.tosspayments.com/reference/using-api/api-keys
 */
export type TossClientKeyMode = "test" | "live" | "unknown";

export function getTossClientKeyMode(clientKey: string | undefined | null): TossClientKeyMode {
  if (!clientKey) {
    return "unknown";
  }
  if (clientKey.startsWith("test_ck_") || clientKey.startsWith("test_")) {
    return "test";
  }
  if (clientKey.startsWith("live_ck_") || clientKey.startsWith("live_")) {
    return "live";
  }
  return "unknown";
}
