import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "테토-에겐 성격 유형 테스트",
  description: "호르몬 기반 성격 유형 테스트. 12개 질문으로 알아보는 나의 진짜 성향",
};

export default function TetoEgenTestPage() {
  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden", margin: 0, padding: 0 }}>
      <iframe
        src="/teto-egen-test.html"
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Teto Egen Test"
      />
    </div>
  );
}
