import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  Activity, AlertTriangle, Boxes, ChevronDown, CircleDollarSign, Clock3,
  Download, FileImage, FileText, Gauge, LayoutDashboard, Loader2, PackageCheck,
  Route as RouteIcon, Search, Truck, UsersRound, Warehouse,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import data from "../data/logistics.json";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Torre de Controle | Vórtice Ops" },
    { name: "description", content: "Dashboard executivo com indicadores reais de pedidos, entregas, frota e ocorrências." },
    { property: "og:title", content: "Torre de Controle Logística | Vórtice Ops" },
    { property: "og:description", content: "Indicadores executivos de performance logística em uma única visão." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Dashboard,
});

type Tone = "success" | "warning" | "danger" | "neutral";
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
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

function Kpi({ label, value, note, tone = "neutral", icon: Icon }: { label: string; value: string; note: string; tone?: Tone; icon: typeof Activity }) {
  return <article className="animate-rise rounded-lg border border-border bg-panel p-4 shadow-sm">
    <div className="flex items-start justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><Icon className={`size-4 ${toneClass[tone]}`} /></div>
    <p className={`mt-2 text-[clamp(1.35rem,2vw,1.8rem)] font-bold leading-none ${toneClass[tone]}`}>{value}</p>
    <p className="mt-2 font-mono text-[10px] text-muted-foreground">{note}</p>
  </article>;
}

function Panel({ title, caption, children, className = "" }: { title: string; caption?: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-border bg-panel p-4 ${className}`}><header className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">{title}</h2>{caption && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{caption}</p>}</div></header>{children}</section>;
}

function Dashboard() {
  const [region, setRegion] = useState("Todos");
  const [priority, setPriority] = useState("Todos");
  const [period, setPeriod] = useState("Ano");
  const [query, setQuery] = useState("");
  const captureRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<null | "png" | "pdf">(null);
  const months = period === "Q1" ? [1,2,3] : period === "Q2" ? [4,5,6] : period === "Q3" ? [7,8,9] : period === "Q4" ? [10,11,12] : [...Array(12)].map((_,i)=>i+1);

  const filtered = useMemo(() => data.cube.filter((r) => months.includes(r.month) && (region === "Todos" || r.regiao === region) && (priority === "Todos" || r.prioridade === priority)), [region, priority, period]);
  const totals = useMemo(() => filtered.reduce((a, r) => ({ orders:a.orders+r.orders, value:a.value+r.value, freight:a.freight+r.freight, cost:a.cost+r.cost, ontime:a.ontime+r.ontimeCount, delay:a.delay+r.delaySum, plan:a.plan+r.distancePlan, real:a.real+r.distanceReal }), {orders:0,value:0,freight:0,cost:0,ontime:0,delay:0,plan:0,real:0}), [filtered]);
  const monthly = useMemo(() => months.map(m => { const rows=filtered.filter(r=>r.month===m); return { month:monthNames[m-1], orders:rows.reduce((s,r)=>s+r.orders,0), value:rows.reduce((s,r)=>s+r.value,0), ontime: rows.reduce((s,r)=>s+r.ontimeCount,0) / Math.max(1,rows.reduce((s,r)=>s+r.orders,0)) * 100 }; }), [filtered, period]);
  const regionRows = useMemo(() => data.filters.regions.map(name => { const rows=data.cube.filter(r=>months.includes(r.month)&&r.regiao===name&&(priority==="Todos"||r.prioridade===priority)); const orders=rows.reduce((s,r)=>s+r.orders,0); return { name, orders, value:rows.reduce((s,r)=>s+r.value,0), ontime:rows.reduce((s,r)=>s+r.ontimeCount,0)/Math.max(1,orders) }; }).sort((a,b)=>b.value-a.value), [priority, period]);
  const margin = (totals.freight-totals.cost)/Math.max(1,totals.freight);
  const adherence = 1 - Math.max(0, totals.real-totals.plan)/Math.max(1,totals.plan);
  const maxRegion = Math.max(...regionRows.map(r=>r.value),1);
  const visibleExceptions = data.exceptions.filter(e => (region === "Todos" || e.regiao === region) && (priority === "Todos" || e.prioridade === priority) && `${e.numero_pedido} ${e.nome_cliente}`.toLowerCase().includes(query.toLowerCase())).slice(0,5);
  const available = data.vehicleStatus.find(v=>v.status==="Disponível")?.count ?? 0;
  const maintenance = data.vehicleStatus.find(v=>v.status==="Manutenção")?.count ?? 0;

  function exportCsv() {
    const rows = [["Mês","Pedidos","Valor","OTD"], ...monthly.map(m=>[m.month,m.orders,m.value,m.ontime.toFixed(2)])];
    const blob=new Blob([rows.map(r=>r.join(";")).join("\n")],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="vortice-ops.csv"; a.click(); URL.revokeObjectURL(url);
  }

  async function captureNode(): Promise<string> {
    const node = captureRef.current!;
    node.classList.add("exporting");
    await new Promise((r) => setTimeout(r, 80));
    try {
      return await toPng(node, { pixelRatio: 2, backgroundColor: "oklch(0.13 0.025 260)", cacheBust: true });
    } finally {
      node.classList.remove("exporting");
    }
  }

  async function exportPng() {
    if (exporting) return;
    setExporting("png");
    try {
      const url = await captureNode();
      const a = document.createElement("a");
      a.href = url; a.download = "vortice-ops-dashboard.png"; a.click();
    } finally { setExporting(null); }
  }

  async function exportPdf() {
    if (exporting) return;
    setExporting("pdf");
    try {
      const url = await captureNode();
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url; });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgH = (img.height / img.width) * pw;
      let y = 0;
      while (y < imgH) {
        pdf.addImage(url, "PNG", 0, -y, pw, imgH);
        y += ph;
        if (y < imgH) pdf.addPage();
      }
      pdf.save("vortice-ops-dashboard.pdf");
    } finally { setExporting(null); }
  }

  return <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[224px_1fr]">
    <aside className="hidden min-h-screen border-r border-border bg-panel/70 p-4 lg:flex lg:flex-col">
      <div className="mb-7 flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-md border border-primary/40 bg-primary/10 font-bold text-primary">V</span><div><p className="text-sm font-bold">Vórtice <span className="font-mono text-[10px] font-normal text-muted-foreground">/ops</span></p><p className="font-mono text-[9px] text-muted-foreground">LOGISTICS INTELLIGENCE</p></div></div>
      <nav className="space-y-1 text-xs"><a className="flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-2 text-primary"><LayoutDashboard className="size-4"/>Painel executivo</a>{([{Icon:PackageCheck,label:"Pedidos"},{Icon:Truck,label:"Frota & motoristas"},{Icon:UsersRound,label:"Clientes & segmentos"},{Icon:Boxes,label:"Produtos & categorias"},{Icon:Warehouse,label:"Docas & estoque"}]).map(({Icon,label})=><a key={label} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"><Icon className="size-4"/>{label}</a>)}</nav>
      <div className="mt-auto border-t border-border pt-4 font-mono text-[10px] text-muted-foreground"><div className="flex justify-between"><span>Base</span><span className="text-foreground">11 abas</span></div><div className="mt-2 flex justify-between"><span>Qualidade</span><span className="text-success">100% íntegra</span></div></div>
    </aside>

    <main className="min-w-0 data-grid">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-5">
        <div className="mr-auto min-w-[180px]"><h1 className="text-base font-bold leading-none">Torre de controle</h1><p className="mt-1 font-mono text-[10px] text-muted-foreground">01 JAN — 31 DEZ 2025 · {integer.format(totals.orders)} PEDIDOS</p></div>
        <div className="flex rounded-md border border-border bg-raised p-1 text-[11px]">{["Q1","Q2","Q3","Q4","Ano"].map(p=><button key={p} onClick={()=>setPeriod(p)} className={`rounded px-2 py-1 ${period===p?"bg-primary/15 text-primary":"text-muted-foreground hover:text-foreground"}`}>{p}</button>)}</div>
        <Filter label="Região" value={region} options={data.filters.regions} onChange={setRegion}/><Filter label="Prioridade" value={priority} options={data.filters.priorities} onChange={setPriority}/>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-success"><i className="size-1.5 rounded-full bg-success animate-pulse-ring"/>DADOS VALIDADOS</span>
      </header>

      <div className="p-4 md:p-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <Kpi label="Pedidos" value={integer.format(totals.orders)} note={`${region} · ${period}`} icon={PackageCheck}/>
          <Kpi label="Valor dos pedidos" value={brl.format(totals.value)} note={`Ticket ${brl.format(totals.value/Math.max(1,totals.orders))}`} icon={CircleDollarSign}/>
          <Kpi label="Receita de frete" value={brl.format(totals.freight)} note={`Margem ${percent(margin)}`} tone="success" icon={Activity}/>
          <Kpi label="Entregas no prazo" value={percent(totals.ontime/Math.max(1,totals.orders))} note={`Atraso médio ${(totals.delay/Math.max(1,totals.orders)).toFixed(1).replace(".",",")}h`} tone={totals.ontime/totals.orders<.5?"danger":"success"} icon={Clock3}/>
          <Kpi label="Aderência de rota" value={percent(adherence)} note={`${integer.format(totals.real-totals.plan)} km excedentes`} tone={adherence<.9?"warning":"success"} icon={RouteIcon}/>
          <Kpi label="Custo operacional" value={brl.format(totals.cost)} note={`${percent(totals.cost/Math.max(1,totals.freight))} da receita`} icon={Gauge}/>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Panel title="Cadência operacional" caption="PEDIDOS, VALOR E OTD POR MÊS">
            <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthly} margin={{top:8,right:8,left:-20,bottom:0}}><defs><linearGradient id="orders" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity=".5"/><stop offset="100%" stopColor="var(--primary)" stopOpacity=".05"/></linearGradient></defs><CartesianGrid stroke="var(--grid)" vertical={false}/><XAxis dataKey="month" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10}/><YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10}/><Tooltip contentStyle={{background:"var(--popover)",border:"1px solid var(--border)",borderRadius:6,fontSize:11}}/><Area type="monotone" dataKey="orders" fill="url(#orders)" stroke="var(--primary)" strokeWidth={2}/><Line type="monotone" dataKey="ontime" stroke="var(--warning)" strokeWidth={2} dot={false} yAxisId={0}/></ComposedChart></ResponsiveContainer></div>
          </Panel>
          <Panel title="Saúde da operação" caption="CAPACIDADE E GARGALOS">
            <div className="grid grid-cols-2 gap-2"><div className="rounded-md border border-border bg-raised p-3"><p className="text-xl font-bold text-success">{available}</p><p className="font-mono text-[9px] text-muted-foreground">VEÍCULOS DISPONÍVEIS</p></div><div className="rounded-md border border-border bg-raised p-3"><p className="text-xl font-bold text-warning">{maintenance}</p><p className="font-mono text-[9px] text-muted-foreground">EM MANUTENÇÃO</p></div><div className="rounded-md border border-border bg-raised p-3"><p className="text-xl font-bold">{data.summary.drivers}</p><p className="font-mono text-[9px] text-muted-foreground">MOTORISTAS</p></div><div className="rounded-md border border-border bg-raised p-3"><p className="text-xl font-bold text-danger">{data.summary.avgDockWait.toFixed(0)} min</p><p className="font-mono text-[9px] text-muted-foreground">ESPERA EM DOCA</p></div></div>
            <div className="mt-4 border-t border-border pt-3"><div className="flex justify-between text-xs"><span className="text-muted-foreground">Ocorrências registradas</span><strong>{integer.format(data.summary.occurrences)}</strong></div><div className="mt-2 flex justify-between text-xs"><span className="text-muted-foreground">Impacto financeiro</span><strong className="text-danger">{brl.format(data.summary.occurrenceCost)}</strong></div><div className="mt-2 flex justify-between text-xs"><span className="text-muted-foreground">Utilização da frota</span><strong className="text-success">{percent(available/data.summary.vehicles)}</strong></div></div>
          </Panel>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr_320px]">
          <Panel title="Performance regional" caption="VALOR DOS PEDIDOS E OTD">
            <div className="space-y-3">{regionRows.map((r,i)=><div key={r.name} className="grid grid-cols-[82px_1fr_68px] items-center gap-2 text-xs"><span className="text-muted-foreground">{String(i+1).padStart(2,"0")} · {r.name}</span><div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-primary" style={{width:`${r.value/maxRegion*100}%`}}/></div><span className="text-right font-mono text-[10px]">{brl.format(r.value)}</span></div>)}</div>
          </Panel>
          <Panel title="Mix de prioridade" caption="VOLUME E NÍVEL DE SERVIÇO">
            <div className="h-40"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.priorities} layout="vertical" margin={{left:5,right:8}}><XAxis type="number" hide/><YAxis type="category" dataKey="prioridade" width={78} axisLine={false} tickLine={false} fontSize={10} stroke="var(--muted-foreground)"/><Tooltip contentStyle={{background:"var(--popover)",border:"1px solid var(--border)",borderRadius:6,fontSize:11}}/><Bar dataKey="orders" radius={[0,3,3,0]}>{data.priorities.map(p=><Cell key={p.prioridade} fill={p.prioridade==="Urgente"?"var(--danger)":p.prioridade==="Programada"?"var(--warning)":"var(--primary)"}/>)}</Bar></BarChart></ResponsiveContainer></div>
          </Panel>
          <Panel title="Principais ocorrências" caption="FREQUÊNCIA E SEVERIDADE">
            <div className="space-y-2">{data.occurrences.slice(0,5).map((o,i)=><div key={`${o.tipo_ocorrencia}${o.severidade}`} className="flex items-center gap-2 border-b border-border/60 pb-2 text-xs last:border-0"><span className={`size-1.5 rounded-full ${o.severidade==="Alta"?"bg-danger":o.severidade==="Média"?"bg-warning":"bg-primary"}`}/><span className="min-w-0 flex-1 truncate text-muted-foreground">{o.tipo_ocorrencia}</span><span className="font-mono text-[10px]">{o.count}</span></div>)}</div>
          </Panel>
        </div>

        <section className="mt-3 overflow-hidden rounded-lg border border-border bg-panel">
          <header className="flex flex-wrap items-center gap-3 border-b border-border p-4"><div className="mr-auto"><h2 className="text-sm font-bold">Exceções críticas</h2><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">MAIORES ATRASOS DA OPERAÇÃO</p></div><label className="flex items-center gap-2 rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs"><Search className="size-3.5 text-muted-foreground"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar pedido ou cliente" className="w-44 bg-transparent outline-none placeholder:text-muted-foreground"/></label><button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs text-primary"><Download className="size-3.5"/>Exportar CSV</button></header>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="font-mono text-[9px] uppercase text-muted-foreground"><tr className="border-b border-border">{["Pedido","Cliente","Região","Prioridade","Atraso","Valor","Status"].map(h=><th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead><tbody>{visibleExceptions.map(e=><tr key={e.numero_pedido} className="border-b border-border/60 transition-colors last:border-0 hover:bg-raised"><td className="px-4 py-2.5 font-mono text-primary">{e.numero_pedido}</td><td className="px-4 py-2.5">{e.nome_cliente}</td><td className="px-4 py-2.5 text-muted-foreground">{e.regiao}</td><td className="px-4 py-2.5">{e.prioridade}</td><td className="px-4 py-2.5 font-mono text-danger">+{e.atraso_h.toFixed(1).replace(".",",")}h</td><td className="px-4 py-2.5 font-mono">{brl.format(e.valor_pedido)}</td><td className="px-4 py-2.5"><span className="inline-flex items-center gap-1 text-danger"><AlertTriangle className="size-3"/>{e.status_entrega}</span></td></tr>)}</tbody></table></div>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-2 py-4 font-mono text-[9px] text-muted-foreground"><span>Fonte: Logistics Intelligence Dataset · 11 abas · sem valores estimados</span><span>{data.summary.clients} clientes · {data.summary.vehicles} veículos · {data.summary.drivers} motoristas</span></footer>
      </div>
      </div>
    </main>
  </div>;
}