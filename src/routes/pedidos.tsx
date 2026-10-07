import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, ChevronDown, CircleDollarSign, Clock3,
  Download, PackageCheck, PackageX, Search, Timer, TrendingUp,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import data from "../data/logistics.json";

export const Route = createFileRoute("/pedidos")({
  head: () => ({ meta: [
    { title: "Situação dos Pedidos | Vórtice Ops" },
    { name: "description", content: "Dashboard de situação dos pedidos: prazos, atrasos, prioridades, regiões e exceções críticas." },
    { property: "og:title", content: "Situação dos Pedidos | Vórtice Ops" },
    { property: "og:description", content: "Acompanhe prazos, atrasos e exceções dos pedidos em tempo real." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: PedidosDashboard,
});

type Tone = "success" | "warning" | "danger" | "neutral";
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const brlFull = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("pt-BR");
const percent = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;
const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const toneClass: Record<Tone, string> = { success: "text-success", warning: "text-warning", danger: "text-danger", neutral: "text-foreground" };

function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <label className="relative flex items-center gap-1.5 rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs text-muted-foreground focus-within:ring-1 focus-within:ring-ring">
    <span className="hidden sm:inline">{label}:</span>
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-transparent pr-5 font-medium text-foreground outline-none">
      <option value="Todos">Todos</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select><ChevronDown className="pointer-events-none absolute right-2 size-3" />
  </label>;
}

function Kpi({ label, value, note, tone = "neutral", icon: Icon }: { label: string; value: string; note: string; tone?: Tone; icon: typeof PackageCheck }) {
  return <article className="animate-rise rounded-lg border border-border bg-panel p-4 shadow-sm">
    <div className="flex items-start justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><Icon className={`size-4 ${toneClass[tone]}`} /></div>
    <p className={`mt-2 text-[clamp(1.35rem,2vw,1.8rem)] font-bold leading-none ${toneClass[tone]}`}>{value}</p>
    <p className="mt-2 font-mono text-[10px] text-muted-foreground">{note}</p>
  </article>;
}

function Panel({ title, caption, children, className = "" }: { title: string; caption?: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-border bg-panel p-4 ${className}`}><header className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">{title}</h2>{caption && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{caption}</p>}</div></header>{children}</section>;
}

function PedidosDashboard() {
  const [region, setRegion] = useState("Todos");
  const [priority, setPriority] = useState("Todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => data.cube.filter((r) => (region === "Todos" || r.regiao === region) && (priority === "Todos" || r.prioridade === priority)), [region, priority]);

  const totals = useMemo(() => filtered.reduce((a, r) => ({
    orders: a.orders + r.orders, value: a.value + r.value,
    ontime: a.ontime + r.ontimeCount, delay: a.delay + r.delaySum,
  }), { orders: 0, value: 0, ontime: 0, delay: 0 }), [filtered]);

  const late = totals.orders - totals.ontime;
  const otd = totals.ontime / Math.max(1, totals.orders);
  const avgDelay = totals.delay / Math.max(1, totals.orders);

  const monthly = useMemo(() => monthNames.map((name, i) => {
    const rows = filtered.filter((r) => r.month === i + 1);
    const orders = rows.reduce((s, r) => s + r.orders, 0);
    const ontime = rows.reduce((s, r) => s + r.ontimeCount, 0);
    return { month: name, orders, atrasados: orders - ontime, otd: (ontime / Math.max(1, orders)) * 100 };
  }), [filtered]);

  const priorityRows = useMemo(() => data.filters.priorities.map((p) => {
    const rows = filtered.filter((r) => r.prioridade === p);
    const orders = rows.reduce((s, r) => s + r.orders, 0);
    const ontime = rows.reduce((s, r) => s + r.ontimeCount, 0);
    return { prioridade: p, orders, atrasados: orders - ontime, otd: ontime / Math.max(1, orders) };
  }), [filtered]);

  const regionRows = useMemo(() => data.filters.regions.map((name) => {
    const rows = filtered.filter((r) => r.regiao === name);
    const orders = rows.reduce((s, r) => s + r.orders, 0);
    const ontime = rows.reduce((s, r) => s + r.ontimeCount, 0);
    const delay = rows.reduce((s, r) => s + r.delaySum, 0);
    return { name, orders, atrasados: orders - ontime, otd: ontime / Math.max(1, orders), avgDelay: delay / Math.max(1, orders) };
  }).sort((a, b) => b.atrasados - a.atrasados), [filtered]);

  const maxLate = Math.max(...regionRows.map((r) => r.atrasados), 1);

  const exceptions = useMemo(() => data.exceptions
    .filter((e) => (region === "Todos" || e.regiao === region) && (priority === "Todos" || e.prioridade === priority) && `${e.numero_pedido} ${e.nome_cliente}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 12), [region, priority, query]);

  const riskValue = data.exceptions
    .filter((e) => (region === "Todos" || e.regiao === region) && (priority === "Todos" || e.prioridade === priority))
    .reduce((s, e) => s + e.valor_pedido, 0);

  function exportCsv() {
    const rows = [["Pedido", "Cliente", "Região", "Prioridade", "Atraso (h)", "Valor", "Status"],
      ...exceptions.map((e) => [e.numero_pedido, e.nome_cliente, e.regiao, e.prioridade, e.atraso_h.toFixed(2), e.valor_pedido.toFixed(2), e.status_entrega])];
    const blob = new Blob([rows.map((r) => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "situacao-pedidos.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-5">
      <Link to="/" className="flex items-center gap-1.5 rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5" />Painel executivo</Link>
      <div className="mr-auto min-w-[180px]"><h1 className="text-base font-bold leading-none">Situação dos pedidos</h1><p className="mt-1 font-mono text-[10px] text-muted-foreground">01 JAN — 31 DEZ 2025 · {integer.format(totals.orders)} PEDIDOS</p></div>
      <Filter label="Região" value={region} options={data.filters.regions} onChange={setRegion} />
      <Filter label="Prioridade" value={priority} options={data.filters.priorities} onChange={setPriority} />
      <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-success"><i className="size-1.5 rounded-full bg-success animate-pulse-ring" />DADOS VALIDADOS</span>
    </header>

    <main className="data-grid p-4 md:p-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Kpi label="Pedidos totais" value={integer.format(totals.orders)} note={`${region} · ${priority}`} icon={PackageCheck} />
        <Kpi label="No prazo" value={integer.format(totals.ontime)} note={`OTD ${percent(otd)}`} tone={otd < 0.5 ? "danger" : "success"} icon={TrendingUp} />
        <Kpi label="Atrasados" value={integer.format(late)} note={`${percent(late / Math.max(1, totals.orders))} do volume`} tone="danger" icon={PackageX} />
        <Kpi label="Atraso médio" value={`${avgDelay.toFixed(1).replace(".", ",")}h`} note="por pedido" tone={avgDelay > 1 ? "warning" : "neutral"} icon={Timer} />
        <Kpi label="Valor em risco" value={brl.format(riskValue)} note="pedidos com exceção" tone="warning" icon={CircleDollarSign} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Evolução mensal" caption="PEDIDOS, ATRASADOS E OTD">
          <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10} />
            <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
            <Bar dataKey="orders" fill="var(--primary)" radius={[3, 3, 0, 0]} opacity={0.55} />
            <Bar dataKey="atrasados" fill="var(--danger)" radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="otd" stroke="var(--warning)" strokeWidth={2} dot={false} />
          </ComposedChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Situação por prioridade" caption="VOLUME E NÍVEL DE SERVIÇO">
          <div className="space-y-3">{priorityRows.map((p) => <div key={p.prioridade} className="rounded-md border border-border bg-raised p-3">
            <div className="flex items-center justify-between text-xs"><span className="font-medium">{p.prioridade}</span><span className="font-mono text-[10px] text-muted-foreground">{integer.format(p.orders)} pedidos</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-background"><div className={`h-full rounded-full ${p.prioridade === "Urgente" ? "bg-danger" : p.prioridade === "Programada" ? "bg-warning" : "bg-primary"}`} style={{ width: `${p.otd * 100}%` }} /></div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px]"><span className="text-muted-foreground">OTD {percent(p.otd)}</span><span className="text-danger">{integer.format(p.atrasados)} atrasados</span></div>
          </div>)}</div>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr]">
        <Panel title="Atrasos por região" caption="PEDIDOS ATRASADOS E ATRASO MÉDIO">
          <div className="space-y-3">{regionRows.map((r, i) => <div key={r.name} className="grid grid-cols-[82px_1fr_110px] items-center gap-2 text-xs">
            <span className="text-muted-foreground">{String(i + 1).padStart(2, "0")} · {r.name}</span>
            <div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-danger" style={{ width: `${(r.atrasados / maxLate) * 100}%` }} /></div>
            <span className="text-right font-mono text-[10px]">{integer.format(r.atrasados)} · {r.avgDelay.toFixed(1).replace(".", ",")}h</span>
          </div>)}</div>
        </Panel>
        <Panel title="Distribuição de status" caption="NO PRAZO VS ATRASADO POR PRIORIDADE">
          <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={priorityRows} layout="vertical" margin={{ left: 5, right: 8 }}>
            <XAxis type="number" hide /><YAxis type="category" dataKey="prioridade" width={78} axisLine={false} tickLine={false} fontSize={10} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
            <Bar dataKey="orders" name="Pedidos" radius={[0, 3, 3, 0]}>{priorityRows.map((p) => <Cell key={p.prioridade} fill={p.prioridade === "Urgente" ? "var(--danger)" : p.prioridade === "Programada" ? "var(--warning)" : "var(--primary)"} />)}</Bar>
            <Bar dataKey="atrasados" name="Atrasados" fill="var(--danger)" radius={[0, 3, 3, 0]} opacity={0.5} />
          </BarChart></ResponsiveContainer></div>
        </Panel>
      </div>

      <section className="mt-3 overflow-hidden rounded-lg border border-border bg-panel">
        <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="mr-auto"><h2 className="text-sm font-bold">Pedidos em exceção</h2><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">MAIORES ATRASOS DA OPERAÇÃO</p></div>
          <label className="flex items-center gap-2 rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs"><Search className="size-3.5 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pedido ou cliente" className="w-44 bg-transparent outline-none placeholder:text-muted-foreground" /></label>
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs text-primary"><Download className="size-3.5" />Exportar CSV</button>
        </header>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs">
          <thead className="font-mono text-[9px] uppercase text-muted-foreground"><tr className="border-b border-border">{["Pedido", "Cliente", "Região", "Prioridade", "Atraso", "Valor", "Status"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{exceptions.map((e) => <tr key={e.numero_pedido} className="border-b border-border/60 transition-colors last:border-0 hover:bg-raised">
            <td className="px-4 py-2.5 font-mono text-primary">{e.numero_pedido}</td><td className="px-4 py-2.5">{e.nome_cliente}</td><td className="px-4 py-2.5 text-muted-foreground">{e.regiao}</td><td className="px-4 py-2.5">{e.prioridade}</td>
            <td className="px-4 py-2.5 font-mono text-danger">+{e.atraso_h.toFixed(1).replace(".", ",")}h</td><td className="px-4 py-2.5 font-mono">{brlFull.format(e.valor_pedido)}</td>
            <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1 text-danger"><AlertTriangle className="size-3" />{e.status_entrega}</span></td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 py-4 font-mono text-[9px] text-muted-foreground"><span>Fonte: Logistics Intelligence Dataset · sem valores estimados</span><span><Clock3 className="mr-1 inline size-3" />atraso médio geral {data.summary.avgDelay.toFixed(1).replace(".", ",")}h</span></footer>
    </main>
  </div>;
}
