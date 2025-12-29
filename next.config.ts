import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // TypeScript 类型检查由 CI 的 tsc --noEmit 执行
  // 构建时跳过以加速部署（tsconfig.json 已排除 sdk/workers）
};

export default withNextIntl(nextConfig);
