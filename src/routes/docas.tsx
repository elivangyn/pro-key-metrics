import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Download, Gauge, Search, Timer, Warehouse } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import snapshot from "@/data/docks.json";

export const Route = createFileRoute("/docas")({
  head: () => ({ meta: [
    { title: "Docas & Estoque | Menu Ops" },
    { name: "description", content: "Ocupação e espera nas docas, movimentações de estoque por categoria e saldo de produtos." },
    { property: "og:title", content: "Docas & Estoque | Menu Ops" },
    { property: "og:description", content: "Capacidade das docas e fluxo de entradas e saídas do estoque em uma visão executiva." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: DocasDashboard,
});

const money = (v: number) => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi` : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const dec = (v: number) => v.toFixed(1).replace(".", ",");
const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, color: "var(--foreground)" };
const categories = [...new Set(snapshot.products.map(p => p.category))].sort();
const occTone = (v: number) => v >= 80 ? "text-danger" : v >= 65 ? "text-warning" : "text-success";
const occBg = (v: number) => v >= 80 ? "bg-danger" : v >= 65 ? "bg-warning" : "bg-success";

function Kpi({ label, value, note, icon: Icon, tone = "text-foreground" }: { label: string; value: string; note: string; icon: typeof Gauge; tone?: string }) {
  return <article className="rounded-lg border border-border bg-panel p-4"><div className="flex items-start justify-between gap-2"><p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p><Icon className={`size-4 shrink-0 ${tone}`} /></div><p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{note}</p></article>;
}
function Panel({ title, caption, children, className = "" }: { title: string; caption: string; children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-border bg-panel p-4 ${className}`}><h2 className="text-sm font-bold">{title}</h2><p className="mb-4 mt-0.5 font-mono text-[10px] text-muted-foreground">{caption}</p>{children}</section>;
}
function sumBy<T>(rows: T[], f: (r: T) => number) { return rows.reduce((s, r) => s + f(r), 0); }

function DocasDashboard() {
  const [operation, setOperation] = useState("Todas");
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");

  const docks = useMemo(() => snapshot.docks.filter(d => operation === "Todas" || d.op === operation), [operation]);
  const stockMonthly = useMemo(() => monthNames.map((m, i) => {
    const rows = snapshot.stockMonthly.filter(r => r.month === i + 1);
    const q = (t: string) => sumBy(rows.filter(r => r.tipo === t), r => r.qty);
    return { month: m, Entradas: q("Entrada"), Saídas: q("Saída"), Ajustes: q("Ajuste") };
  }), []);
  const products = useMemo(() => snapshot.products
    .filter(p => (category === "Todas" || p.category === category) && `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.saldo - b.saldo), [category, query]);
  const byCategory = useMemo(() => categories.map(c => {
    const rows = snapshot.stockByCategory.filter(r => r.category === c);
    const q = (t: string) => sumBy(rows.filter(r => r.tipo === t), r => r.qty);
    return { category: c, Entradas: q("Entrada"), Saídas: q("Saída"), value: sumBy(rows, r => r.value) };
  }), []);

  const days = sumBy(docks, d => d.days);
  const occ = sumBy(docks, d => d.occ * d.days) / Math.max(1, days);
  const wait = sumBy(docks, d => d.wait * d.days) / Math.max(1, days);
  const critical = sumBy(docks, d => d.critical);
  const moves = sumBy(docks, d => d.moves);
  const stockIn = sumBy(snapshot.stockMonthly.filter(r => r.tipo === "Entrada"), r => r.qty);
  const stockOut = sumBy(snapshot.stockMonthly.filter(r => r.tipo === "Saída"), r => r.qty);
  const stockValue = sumBy(snapshot.stockMonthly, r => r.value);
  const negative = snapshot.products.filter(p => p.saldo < 0).length;

  function exportCsv() {
    const rows = [["Produto", "Categoria", "Entradas", "Saídas", "Saldo", "Movimentações", "Valor"], ...products.map(p => [p.name, p.category, p.entradas, p.saidas, p.saldo, p.moves, p.value.toFixed(2)])];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(r => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "menu-ops-estoque.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="min-h-screen bg-background text-foreground data-grid">
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-5">
      <Link to="/" className="flex items-center gap-1.5 rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Painel executivo</Link>
      <div className="mr-auto"><h1 className="text-base font-bold leading-none">Docas & Estoque</h1><p className="mt-1 font-mono text-[10px] text-muted-foreground">{snapshot.docks.length} DOCAS · {integer.format(sumBy(snapshot.stockMonthly, r => r.count))} MOVIMENTAÇÕES DE ESTOQUE · 2025</p></div>
      <div className="flex rounded-md border border-border bg-raised p-1 text-[11px]">{["Todas", "Expedição", "Recebimento"].map(o => <button key={o} onClick={() => setOperation(o)} className={`rounded px-2 py-1 ${operation === o ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{o}</button>)}</div>
      <span className="flex items-center gap-1.5 font-mono text-[10px] text-success"><i className="size-1.5 rounded-full bg-success animate-pulse-ring" />DADOS VALIDADOS</span>
    </header>

    <main className="p-4 md:p-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Kpi label="Ocupação média" value={`${dec(occ)}%`} note={`${docks.length} docas · ${operation}`} icon={Gauge} tone={occTone(occ)} />
        <Kpi label="Espera média" value={`${dec(wait)} min`} note="Tempo médio na fila" icon={Timer} tone={wait > 60 ? "text-danger" : "text-warning"} />
        <Kpi label="Dias críticos" value={integer.format(critical)} note={`${dec(critical / Math.max(1, days) * 100)}% dos dias com ocupação ≥ 85%`} icon={AlertTriangle} tone="text-danger" />
        <Kpi label="Movimentações em doca" value={integer.format(moves)} note={`${integer.format(moves / Math.max(1, days))} por doca/dia`} icon={Warehouse} />
        <Kpi label="Entradas x saídas" value={`${dec(stockIn / Math.max(1, stockOut))}x`} note={`${integer.format(stockIn)} un. entram · ${integer.format(stockOut)} saem`} icon={ArrowDownToLine} tone="text-success" />
        <Kpi label="Valor movimentado" value={money(stockValue)} note={`${negative} produtos com saldo negativo`} icon={ArrowUpFromLine} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Mapa de ocupação das docas" caption="OCUPAÇÃO MÉDIA, ESPERA E DIAS CRÍTICOS POR DOCA">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">{docks.map(d => <div key={d.id} className="rounded-md border border-border bg-raised p-3">
            <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold">{d.code}</span><span className="font-mono text-[9px] text-muted-foreground">{d.type}</span></div>
            <p className={`mt-2 text-xl font-bold ${occTone(d.occ)}`}>{dec(d.occ)}%</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background"><div className={`h-full ${occBg(d.occ)}`} style={{ width: `${d.occ}%` }} /></div>
            <p className="mt-2 font-mono text-[9px] text-muted-foreground">{d.op.toUpperCase()} · {dec(d.wait)} MIN · {d.critical} CRÍT.</p>
          </div>)}</div>
        </Panel>
        <Panel title="Sazonalidade das docas" caption="OCUPAÇÃO (%) E ESPERA (MIN) POR MÊS · TODAS AS DOCAS">
          <div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={snapshot.dockMonthly.map(m => ({ month: monthNames[m.month - 1], Ocupação: m.occ, Espera: m.wait }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--grid)" vertical={false} /><XAxis dataKey="month" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10} /><YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10} domain={[0, 100]} /><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="Ocupação" fill="var(--primary)" radius={[3, 3, 0, 0]} /><Line dataKey="Espera" stroke="var(--warning)" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></div>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <Panel title="Fluxo mensal do estoque" caption="UNIDADES DE ENTRADA, SAÍDA E AJUSTE">
          <div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={stockMonthly} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}><CartesianGrid stroke="var(--grid)" vertical={false} /><XAxis dataKey="month" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10} /><YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10} tickFormatter={v => `${Math.round(v / 1000)}k`} /><Tooltip contentStyle={tooltipStyle} formatter={(v: number) => integer.format(v)} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="Entradas" fill="var(--success)" radius={[3, 3, 0, 0]} /><Bar dataKey="Saídas" fill="var(--primary)" radius={[3, 3, 0, 0]} /><Bar dataKey="Ajustes" fill="var(--warning)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Giro por categoria" caption="ENTRADAS VS SAÍDAS (UN.) E VALOR MOVIMENTADO">
          <div className="space-y-3">{byCategory.map(c => { const max = Math.max(...byCategory.map(x => Math.max(x.Entradas, x.Saídas))); return <div key={c.category} className="text-xs">
            <div className="mb-1 flex justify-between"><span>{c.category}</span><span className="font-mono text-[10px] text-muted-foreground">{money(c.value)}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-raised"><div className="h-full bg-success" style={{ width: `${c.Entradas / max * 100}%` }} /></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised"><div className="h-full bg-primary" style={{ width: `${c.Saídas / max * 100}%` }} /></div>
          </div>; })}<p className="font-mono text-[9px] text-muted-foreground"><span className="text-success">■</span> Entradas · <span className="text-primary">■</span> Saídas</p></div>
        </Panel>
      </div>

      <section className="mt-3 overflow-hidden rounded-lg border border-border bg-panel">
        <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="mr-auto"><h2 className="text-sm font-bold">Saldo de estoque por produto</h2><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">ENTRADAS − SAÍDAS NO PERÍODO · PIORES SALDOS PRIMEIRO</p></div>
          <select aria-label="Categoria" value={category} onChange={e => setCategory(e.target.value)} className="rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs outline-none"><option>Todas</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
          <label className="flex items-center gap-2 rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs"><Search className="size-3.5 text-muted-foreground" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar produto" className="w-40 bg-transparent outline-none placeholder:text-muted-foreground" /></label>
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs text-primary"><Download className="size-3.5" />Exportar CSV</button>
        </header>
        <div className="max-h-[480px] overflow-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="sticky top-0 bg-panel font-mono text-[9px] uppercase text-muted-foreground"><tr className="border-b border-border">{["Produto", "Categoria", "Entradas", "Saídas", "Saldo", "Movim.", "Valor"].map(h => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{products.map(p => <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-raised"><td className="px-4 py-2.5">{p.name}</td><td className="px-4 py-2.5 text-muted-foreground">{p.category}</td><td className="px-4 py-2.5 font-mono">{integer.format(p.entradas)}</td><td className="px-4 py-2.5 font-mono">{integer.format(p.saidas)}</td><td className={`px-4 py-2.5 font-mono font-bold ${p.saldo < 0 ? "text-danger" : "text-success"}`}>{p.saldo > 0 ? "+" : ""}{integer.format(p.saldo)}</td><td className="px-4 py-2.5 font-mono">{p.moves}</td><td className="px-4 py-2.5 font-mono">{money(p.value)}</td></tr>)}
            {products.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum produto encontrado.</td></tr>}</tbody></table></div>
      </section>
      <footer className="py-4 font-mono text-[9px] text-muted-foreground">Fonte: abas docas, operacao_docas e estoque · dados reais, sem valores estimados</footer>
    </main>
  </div>;
}
