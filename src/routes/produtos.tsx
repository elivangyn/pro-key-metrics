import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowDown, ArrowUp, Boxes, CircleDollarSign, Download, PackageCheck, Scale, Search, Timer, ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import snapshot from "@/data/products.json";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [
    { title: "Produtos & Categorias | Vórtice Ops" },
    { name: "description", content: "Análise de produtos e categorias: valor dos pedidos, unidades, perfil de carga e entregas no prazo." },
    { property: "og:title", content: "Produtos & Categorias | Vórtice Ops" },
    { property: "og:description", content: "Performance do catálogo logístico com ranking de produtos, evolução mensal e indicadores por categoria." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProdutosDashboard,
});

type Product = typeof snapshot.list[number];
type SortKey = "value" | "orders" | "units" | "name";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;
const compactMoney = (v: number) => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi` : money.format(v);
const categories = [...new Set(snapshot.list.map(p => p.category))].sort();
const colors = ["var(--primary)", "var(--warning)", "var(--success)", "var(--danger)", "var(--muted-foreground)", "var(--foreground)"];
const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, color: "var(--foreground)" };

function aggregate(rows: Product[]) {
  return rows.reduce((a, p) => ({ orders: a.orders + p.orders, value: a.value + p.value, units: a.units + p.units, weight: a.weight + p.weight, volume: a.volume + p.volume, ontime: a.ontime + p.ontime }), { orders: 0, value: 0, units: 0, weight: 0, volume: 0, ontime: 0 });
}
function Kpi({ label, value, note, icon: Icon, tone = "text-foreground" }: { label: string; value: string; note: string; icon: typeof Boxes; tone?: string }) {
  return <article className="rounded-lg border border-border bg-panel p-4"><div className="flex items-start justify-between gap-2"><p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p><Icon className={`size-4 shrink-0 ${tone}`} /></div><p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{note}</p></article>;
}
function Section({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return <section className="min-w-0 border-t border-border pt-4"><h2 className="text-sm font-bold">{title}</h2><p className="mt-1 mb-4 font-mono text-[10px] text-muted-foreground">{caption}</p>{children}</section>;
}

function ProdutosDashboard() {
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("value");
  const [descending, setDescending] = useState(true);
  const [page, setPage] = useState(0);
  const selected = useMemo(() => snapshot.list.filter(p => category === "Todas" || p.category === category), [category]);
  const totals = useMemo(() => aggregate(selected), [selected]);
  const categoryRows = useMemo(() => categories.filter(c => category === "Todas" || c === category).map(c => ({ category: c, products: selected.filter(p => p.category === c).length, ...aggregate(selected.filter(p => p.category === c)) })).sort((a, b) => b.value - a.value), [selected, category]);
  const monthly = useMemo(() => monthNames.map((month, i) => {
    const rows = snapshot.monthly.filter(r => r.month === i + 1 && (category === "Todas" || r.category === category));
    const orders = rows.reduce((s, r) => s + r.orders, 0);
    return { month, orders, otd: rows.reduce((s, r) => s + r.ontime, 0) / Math.max(1, orders) * 100 };
  }), [category]);
  const top = useMemo(() => [...selected].sort((a, b) => b.value - a.value).slice(0, 8), [selected]);
  const filtered = useMemo(() => selected.filter(p => `${p.sku} ${p.name} ${p.category}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => {
    const diff = sort === "name" ? a.name.localeCompare(b.name, "pt-BR") : a[sort] - b[sort];
    return descending ? -diff : diff;
  }), [selected, query, sort, descending]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 15));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * 15, (currentPage + 1) * 15);
  function changeSort(key: SortKey) { setDescending(sort === key ? !descending : key !== "name"); setSort(key); setPage(0); }
  function exportCsv() {
    const rows = [["SKU", "Produto", "Categoria", "Preço unitário (R$)", "Pedidos", "Unidades", "Valor dos pedidos (R$)", "Peso expedido (kg)", "Volume expedido (m³)", "OTD (%)"], ...filtered.map(p => [p.sku, p.name, p.category, p.unitPrice.toFixed(2), p.orders, p.units, p.value.toFixed(2), p.weight.toFixed(2), p.volume.toFixed(3), (p.ontime / Math.max(1, p.orders) * 100).toFixed(1)])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "vortice-produtos-categorias.csv"; a.click(); URL.revokeObjectURL(url);
  }
  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-5">
      <Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft />Painel executivo</Link></Button>
      <div className="mr-auto"><h1 className="text-base font-bold">Produtos & categorias</h1><p className="mt-1 font-mono text-[10px] text-muted-foreground">JAN — DEZ 2025 · {integer.format(totals.orders)} PEDIDOS</p></div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">Categoria<select aria-label="Categoria" value={category} onChange={e => { setCategory(e.target.value); setPage(0); }} className="max-w-48 rounded-md border border-border bg-raised px-3 py-2 text-foreground"><option>Todas</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
      <span className="flex items-center gap-1.5 font-mono text-[10px] text-success"><span className="size-1.5 rounded-full bg-success" />DADOS VALIDADOS</span>
    </header>
    <main className="data-grid p-4 md:p-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Kpi label="Produtos ativos" value={integer.format(selected.filter(p => p.orders > 0).length)} note={`${categoryRows.length} categorias`} icon={Boxes} />
        <Kpi label="Valor dos pedidos" value={compactMoney(totals.value)} note={`Ticket ${money.format(totals.value / Math.max(1, totals.orders))}`} tone="text-success" icon={CircleDollarSign} />
        <Kpi label="Unidades pedidas" value={integer.format(totals.units)} note={`${integer.format(totals.orders)} pedidos`} icon={PackageCheck} />
        <Kpi label="Entregas no prazo" value={pct(totals.ontime / Math.max(1, totals.orders))} note={`${integer.format(totals.ontime)} entregas sem atraso`} tone="text-warning" icon={Timer} />
        <Kpi label="Peso expedido" value={`${integer.format(totals.weight / 1000)} t`} note="peso total dos pedidos" icon={Scale} />
        <Kpi label="Concentração top 8" value={pct(top.reduce((s, p) => s + p.value, 0) / Math.max(1, totals.value))} note="participação no valor dos pedidos" icon={Boxes} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Participação por categoria" caption="VALOR DOS PEDIDOS · R$">
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryRows} layout="vertical" margin={{ left: 0, right: 20 }}><CartesianGrid stroke="var(--grid)" horizontal={false} /><XAxis type="number" tickFormatter={compactMoney} fontSize={10} stroke="var(--muted-foreground)" /><YAxis type="category" dataKey="category" width={90} fontSize={10} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" /><Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money.format(v)} /><Bar dataKey="value" name="Valor dos pedidos" radius={[0, 3, 3, 0]}>{categoryRows.map((c, i) => <Cell key={c.category} fill={colors[i % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
        </Section>
        <Section title="Cadência e nível de serviço" caption="PEDIDOS E ENTREGAS NO PRAZO POR MÊS">
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthly} margin={{ left: -15, right: 0 }}><CartesianGrid stroke="var(--grid)" vertical={false} /><XAxis dataKey="month" fontSize={10} stroke="var(--muted-foreground)" /><YAxis yAxisId="orders" fontSize={10} stroke="var(--muted-foreground)" /><YAxis yAxisId="otd" orientation="right" domain={[0, 100]} unit="%" fontSize={10} stroke="var(--warning)" /><Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => name === "OTD (%)" ? `${v.toFixed(1)}%` : integer.format(v)} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar yAxisId="orders" dataKey="orders" name="Pedidos" fill="var(--primary)" radius={[3, 3, 0, 0]} /><Line yAxisId="otd" dataKey="otd" name="OTD (%)" stroke="var(--warning)" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></div>
        </Section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Section title="Top 8 produtos" caption="RANKING POR VALOR DOS PEDIDOS">
          <div className="divide-y divide-border">{top.map((p, i) => <div key={p.id} className="flex items-center gap-3 py-2.5 text-xs"><span className="font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="font-medium">{p.name}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{p.sku} · {p.category}</p></div><span className="shrink-0 font-mono">{compactMoney(p.value)}</span></div>)}</div>
        </Section>
        <Section title="Perfil logístico das categorias" caption="VOLUME DE CARGA E NÍVEL DE SERVIÇO">
          <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left text-xs"><thead className="font-mono text-[10px] text-muted-foreground"><tr>{["Categoria", "Produtos", "Unidades", "Peso (t)", "Volume (m³)", "OTD"].map(h => <th key={h} className="py-3 pr-3 font-medium">{h}</th>)}</tr></thead><tbody>{categoryRows.map(c => <tr key={c.category} className="border-t border-border"><td className="py-3 pr-3">{c.category}</td><td>{c.products}</td><td className="font-mono">{integer.format(c.units)}</td><td className="font-mono">{integer.format(c.weight / 1000)}</td><td className="font-mono">{integer.format(c.volume)}</td><td className="font-mono text-warning">{pct(c.ontime / Math.max(1, c.orders))}</td></tr>)}</tbody></table></div>
        </Section>
      </div>
      <section className="mt-6 border-t border-border pt-4">
        <header className="mb-4 flex flex-wrap items-center gap-3"><div className="mr-auto"><h2 className="text-sm font-bold">Catálogo de produtos</h2><p className="mt-1 font-mono text-[10px] text-muted-foreground">{filtered.length} PRODUTOS · {category.toUpperCase()}</p></div><label className="flex max-w-full items-center gap-2 rounded-md border border-border bg-raised px-3 py-2 text-xs"><Search className="size-4 shrink-0 text-muted-foreground" /><input aria-label="Buscar produto" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder="Buscar produto ou SKU" className="w-44 min-w-0 bg-transparent outline-none placeholder:text-muted-foreground" /></label><Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}><Download />Exportar CSV</Button></header>
        <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-xs"><thead className="border-b border-border font-mono text-[10px] text-muted-foreground"><tr><th className="px-3 py-2">SKU</th>{([{ key: "name", label: "Produto" }, { key: "orders", label: "Pedidos" }, { key: "units", label: "Unidades" }, { key: "value", label: "Valor dos pedidos" }] as const).map(h => <th key={h.key} className="px-3 py-2" aria-sort={sort === h.key ? descending ? "descending" : "ascending" : "none"}><Button variant="ghost" size="sm" onClick={() => changeSort(h.key)} className="px-0 hover:bg-transparent hover:text-primary">{h.label}{sort === h.key && (descending ? <ArrowDown /> : <ArrowUp />)}</Button></th>)}<th className="px-3 py-2">Categoria</th><th className="px-3 py-2">Preço unitário</th><th className="px-3 py-2">Peso (kg)</th><th className="px-3 py-2">OTD</th></tr></thead><tbody>{visible.map(p => <tr key={p.id} className="border-b border-border/60 hover:bg-raised"><td className="px-3 py-3 font-mono text-primary">{p.sku}</td><td className="px-3 py-3">{p.name}</td><td className="px-3 py-3 font-mono">{integer.format(p.orders)}</td><td className="px-3 py-3 font-mono">{integer.format(p.units)}</td><td className="px-3 py-3 font-mono">{money.format(p.value)}</td><td className="px-3 py-3 text-muted-foreground">{p.category}</td><td className="px-3 py-3 font-mono">{money.format(p.unitPrice)}</td><td className="px-3 py-3 font-mono">{integer.format(p.weight)}</td><td className="px-3 py-3 font-mono text-warning">{pct(p.ontime / Math.max(1, p.orders))}</td></tr>)}{visible.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">Nenhum produto encontrado.</td></tr>}</tbody></table></div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{filtered.length === 0 ? "0 produtos" : `${currentPage * 15 + 1}–${Math.min((currentPage + 1) * 15, filtered.length)} de ${filtered.length} produtos`}</span><div className="flex items-center gap-2"><Button aria-label="Página anterior" title="Página anterior" variant="outline" size="icon" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button><span>{currentPage + 1} / {pageCount}</span><Button aria-label="Próxima página" title="Próxima página" variant="outline" size="icon" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button></div></div>
      </section>
      <footer className="mt-5 flex flex-wrap justify-between gap-2 border-t border-border py-4 font-mono text-[9px] text-muted-foreground"><span>Fonte: Logistics Intelligence Dataset · produtos, pedidos e entregas</span><span>120 produtos · 6 categorias · ano 2025</span></footer>
    </main>
  </div>;
}
