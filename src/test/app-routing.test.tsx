import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import products from "@/data/products.json";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches the products dashboard", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/produtos").at(-1)?.routeId).toBe("/produtos");
  });

  it("reconciles the product snapshot with orders and monthly aggregates", () => {
    expect(products.list).toHaveLength(120);
    expect(products.list.reduce((s, p) => s + p.orders, 0)).toBe(12000);
    expect(products.list.reduce((s, p) => s + p.value, 0)).toBeCloseTo(132173475.75, 2);
    expect(products.list.reduce((s, p) => s + p.ontime, 0)).toBe(3657);
    for (const category of new Set(products.list.map(p => p.category))) {
      const items = products.list.filter(p => p.category === category);
      const months = products.monthly.filter(p => p.category === category);
      expect(items.reduce((s, p) => s + p.orders, 0)).toBe(months.reduce((s, p) => s + p.orders, 0));
      expect(items.reduce((s, p) => s + p.value, 0)).toBeCloseTo(months.reduce((s, p) => s + p.value, 0), 2);
    }
  });
});
