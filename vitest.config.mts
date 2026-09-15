import { defineConfig } from "vitest/config";

// Unit tests for plain modules, run in Node. The Next.js guide's jsdom and
// React Testing Library setup is for component tests; add it with the first
// one. Async server components cannot be unit-tested at all — they want E2E.
//
// `tsconfigPaths` stands in for the guide's vite-tsconfig-paths plugin, which
// Vite has since made built in. It is what resolves the `@/` imports.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
  },
});
