import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Award, Building2, CircleDollarSign, Download, MapPin,
  PackageCheck, Search, Timer, UsersRound,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import data from "../data/logistics.json";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [
    { title: "Clientes & Segmentos | Vórtice Ops" },
    { name: "description", content: "Dashboard de clientes: segmentos, classes, concentração de receita, regiões e nível de serviço." },
    { property: "og:title", content: "Clientes & Segmentos | Vórtice Ops" },
    { property: "og:description", content: "Análise de segmentos, classes de clientes e performance de entrega por carteira." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ClientesDashboard,
});

type Tone = "success" | "warning" | "danger" | "neutral";
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const brlFull = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("pt-BR");
const percent = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;
const toneClass: Record<Tone, string> = { success: "text-success", warning: "text-warning", danger: "text-danger", neutral: "text-foreground" };
const segmentColors = ["var(--primary)", "var(--success)", "var(--warning)", "var(--danger)"];

function Kpi({ label, value, note, tone = "neutral", icon: Icon }: { label: string; value: string; note: string; tone?: Tone; icon: typeof UsersRound }) {
  return <article className="animate-rise rounded-lg border border-border bg-panel p-4 shadow-sm">
    <div className="flex items-start justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><Icon className={`size-4 ${toneClass[tone]}`} /></div>
    <p className={`mt-2 text-[clamp(1.35rem,2vw,1.8rem)] font-bold leading-none ${toneClass[tone]}`}>{value}</p>
    <p className="mt-2 font-mono text-[10px] text-muted-foreground">{note}</p>
  </article>;
}

function Panel({ title, caption, children, className = "" }: { title: string; caption?: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-border bg-panel p-4 ${className}`}><header className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">{title}</h2>{caption && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{caption}</p>}</div></header>{children}</section>;
}

const clients = data.clients;

function ClientesDashboard() {
  const [segment, setSegment] = useState("Todos");
  const [query, setQuery] = useState("");

  const totalValue = clients.list.reduce((s, c) => s + c.valor, 0);
  const totalOrders = clients.list.reduce((s, c) => s + c.pedidos, 0);
  const avgTicket = totalValue / Math.max(1, totalOrders);
  const globalOtd = clients.list.reduce((s, c) => s + c.otd * c.pedidos, 0) / Math.max(1, totalOrders);

  const top10 = useMemo(() => [...clients.list].sort((a, b) => b.valor - a.valor).slice(0, 10), []);
  const concentration = top10.reduce((s, c) => s + c.valor, 0) / Math.max(1, totalValue);

  const visible = useMemo(() => clients.list
    .filter((c) => (segment === "Todos" || c.segmento === segment) && `${c.codigo} ${c.nome} ${c.cidade} ${c.regiao}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 20), [segment, query]);

  const maxSegValue = Math.max(...clients.bySegment.map((s) => s.valor), 1);
  const segments = data.filters.segments;

  function exportCsv() {
    const rows = [["Código", "Cliente", "Segmento", "Classe", "Região", "Cidade", "Pedidos", "Valor", "Frete", "OTD", "Atraso médio (h)"],
      ...visible.map((c) => [c.codigo, c.nome, c.segmento, c.classe, c.regiao, c.cidade, c.pedidos, c.valor.toFixed(2), c.frete.toFixed(2), (c.otd * 100).toFixed(1), c.atraso])];
    const blob = new Blob([rows.map((r) => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "clientes-segmentos.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-5">
      <Link to="/" className="flex items-center gap-1.5 rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5" />Painel executivo</Link>
      <div className="mr-auto min-w-[180px]"><h1 className="text-base font-bold leading-none">Clientes & segmentos</h1><p className="mt-1 font-mono text-[10px] text-muted-foreground">{clients.list.length} CLIENTES ATIVOS · {integer.format(totalOrders)} PEDIDOS</p></div>
      <div className="flex rounded-md border border-border bg-raised p-1 text-[11px]">{["Todos", ...segments].map((s) => <button key={s} onClick={() => setSegment(s)} className={`rounded px-2 py-1 ${segment === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{s}</button>)}</div>
      <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-success"><i className="size-1.5 rounded-full bg-success animate-pulse-ring" />DADOS VALIDADOS</span>
    </header>

    <main className="data-grid p-4 md:p-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Kpi label="Clientes ativos" value={String(clients.list.length)} note={`${segments.length} segmentos · 5 regiões`} icon={UsersRound} />
        <Kpi label="Receita da carteira" value={brl.format(totalValue)} note="valor total dos pedidos" tone="success" icon={CircleDollarSign} />
        <Kpi label="Ticket médio" value={brlFull.format(avgTicket)} note="por pedido" icon={PackageCheck} />
        <Kpi label="OTD da carteira" value={percent(globalOtd)} note="entregas no prazo" tone={globalOtd < 0.5 ? "danger" : "success"} icon={Timer} />
        <Kpi label="Concentração top 10" value={percent(concentration)} note="da receita total" tone="warning" icon={Award} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px_320px]">
        <Panel title="Receita por segmento" caption="VALOR DOS PEDIDOS E NÍVEL DE SERVIÇO">
          <div className="space-y-3">{clients.bySegment.map((s, i) => <div key={s.segmento} className="grid grid-cols-[110px_1fr_150px] items-center gap-2 text-xs">
            <span className="text-muted-foreground">{String(i + 1).padStart(2, "0")} · {s.segmento} <span className="font-mono text-[9px]">({s.qtd})</span></span>
            <div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full" style={{ width: `${(s.valor / maxSegValue) * 100}%`, background: segmentColors[i % 4] }} /></div>
            <span className="text-right font-mono text-[10px]">{brl.format(s.valor)} · OTD {percent(s.otd)}</span>
          </div>)}</div>
          <div className="mt-4 h-36"><ResponsiveContainer width="100%" height="100%"><BarChart data={clients.bySegment} margin={{ left: -20, right: 8 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="segmento" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10} />
            <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
            <Bar dataKey="pedidos" name="Pedidos" radius={[3, 3, 0, 0]}>{clients.bySegment.map((s, i) => <Cell key={s.segmento} fill={segmentColors[i % 4]} />)}</Bar>
          </BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Classes de cliente" caption="CURVA ABC DA CARTEIRA">
          <div className="h-40"><ResponsiveContainer width="100%" height="100%"><PieChart>
            <Pie data={clients.byClass} dataKey="valor" nameKey="classe" innerRadius={42} outerRadius={64} strokeWidth={2} stroke="var(--background)">
              {clients.byClass.map((c, i) => <Cell key={c.classe} fill={segmentColors[i % 4]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} formatter={(v: number) => brl.format(v)} />
          </PieChart></ResponsiveContainer></div>
          <div className="space-y-2">{clients.byClass.map((c, i) => <div key={c.classe} className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-sm" style={{ background: segmentColors[i % 4] }} />
            <span className="font-medium">Classe {c.classe}</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">{c.qtd} clientes · {brl.format(c.valor)} · OTD {percent(c.otd)}</span>
          </div>)}</div>
        </Panel>
        <Panel title="Top 10 clientes" caption="POR VALOR DE PEDIDOS">
          <div className="space-y-2">{top10.map((c, i) => <div key={c.codigo} className="flex items-center gap-2 border-b border-border/60 pb-2 text-xs last:border-0">
            <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{c.nome}</p><p className="font-mono text-[9px] text-muted-foreground">{c.segmento} · {c.regiao}</p></div>
            <span className="font-mono text-[10px]">{brl.format(c.valor)}</span>
          </div>)}</div>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-1">
        <Panel title="Cobertura regional" caption="CLIENTES, PEDIDOS E RECEITA POR REGIÃO">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{clients.byRegion.map((r) => <div key={r.regiao} className="rounded-md border border-border bg-raised p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium"><MapPin className="size-3.5 text-primary" />{r.regiao}</p>
            <p className="mt-2 text-lg font-bold">{brl.format(r.valor)}</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{r.qtd} clientes · {integer.format(r.pedidos)} pedidos</p>
            <p className={`font-mono text-[10px] ${r.otd < 0.32 ? "text-danger" : "text-success"}`}>OTD {percent(r.otd)}</p>
          </div>)}</div>
        </Panel>
      </div>

      <section className="mt-3 overflow-hidden rounded-lg border border-border bg-panel">
        <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="mr-auto"><h2 className="text-sm font-bold">Carteira de clientes</h2><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">TOP 20 POR RECEITA {segment !== "Todos" ? `· ${segment.toUpperCase()}` : ""}</p></div>
          <label className="flex items-center gap-2 rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs"><Search className="size-3.5 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente, cidade ou região" className="w-52 bg-transparent outline-none placeholder:text-muted-foreground" /></label>
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs text-primary"><Download className="size-3.5" />Exportar CSV</button>
        </header>
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-xs">
          <thead className="font-mono text-[9px] uppercase text-muted-foreground"><tr className="border-b border-border">{["Código", "Cliente", "Segmento", "Classe", "Região", "Cidade", "Pedidos", "Valor", "Frete", "OTD", "Atraso médio"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{visible.map((c) => <tr key={c.codigo} className="border-b border-border/60 transition-colors last:border-0 hover:bg-raised">
            <td className="px-4 py-2.5 font-mono text-primary">{c.codigo}</td><td className="px-4 py-2.5">{c.nome}</td>
            <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1"><Building2 className="size-3 text-muted-foreground" />{c.segmento}</span></td>
            <td className="px-4 py-2.5"><span className={`font-mono font-bold ${c.classe === "A" ? "text-success" : c.classe === "B" ? "text-warning" : "text-muted-foreground"}`}>{c.classe}</span></td>
            <td className="px-4 py-2.5 text-muted-foreground">{c.regiao}</td><td className="px-4 py-2.5 text-muted-foreground">{c.cidade}</td>
            <td className="px-4 py-2.5 font-mono">{integer.format(c.pedidos)}</td><td className="px-4 py-2.5 font-mono">{brlFull.format(c.valor)}</td>
            <td className="px-4 py-2.5 font-mono">{brlFull.format(c.frete)}</td>
            <td className={`px-4 py-2.5 font-mono ${c.otd < 0.3 ? "text-danger" : "text-success"}`}>{percent(c.otd)}</td>
            <td className="px-4 py-2.5 font-mono text-warning">{c.atraso.toFixed(1).replace(".", ",")}h</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 py-4 font-mono text-[9px] text-muted-foreground"><span>Fonte: Logistics Intelligence Dataset · abas clientes, pedidos e entregas</span><span>{clients.list.length} clientes · {brl.format(totalValue)} em pedidos</span></footer>
    </main>
  </div>;
}
