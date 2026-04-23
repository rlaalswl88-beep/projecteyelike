import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* 기존 설정이 있다면 여기에 유지 */
};

export default withNextIntl(nextConfig);
