import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, CircleDollarSign, Download, Fuel, Gauge, IdCard,
  Search, Timer, Truck, UserRound, Wrench,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import data from "../data/logistics.json";

export const Route = createFileRoute("/frota")({
  head: () => ({ meta: [
    { title: "Frota & Motoristas | Vórtice Ops" },
    { name: "description", content: "Dashboard da frota: veículos, utilização, custos, consumo e desempenho dos motoristas." },
    { property: "og:title", content: "Frota & Motoristas | Vórtice Ops" },
    { property: "og:description", content: "Utilização da frota, custos operacionais e performance dos motoristas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: FrotaDashboard,
});

type Tone = "success" | "warning" | "danger" | "neutral";
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const brlFull = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("pt-BR");
const percent = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;
const toneClass: Record<Tone, string> = { success: "text-success", warning: "text-warning", danger: "text-danger", neutral: "text-foreground" };

function Kpi({ label, value, note, tone = "neutral", icon: Icon }: { label: string; value: string; note: string; tone?: Tone; icon: typeof Truck }) {
  return <article className="animate-rise rounded-lg border border-border bg-panel p-4 shadow-sm">
    <div className="flex items-start justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><Icon className={`size-4 ${toneClass[tone]}`} /></div>
    <p className={`mt-2 text-[clamp(1.35rem,2vw,1.8rem)] font-bold leading-none ${toneClass[tone]}`}>{value}</p>
    <p className="mt-2 font-mono text-[10px] text-muted-foreground">{note}</p>
  </article>;
}

function Panel({ title, caption, children, className = "" }: { title: string; caption?: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-border bg-panel p-4 ${className}`}><header className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">{title}</h2>{caption && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{caption}</p>}</div></header>{children}</section>;
}

const fleet = data.fleet;

function FrotaDashboard() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"veiculos" | "motoristas">("veiculos");

  const available = data.vehicleStatus.find((v) => v.status === "Disponível")?.count ?? 0;
  const maintenance = data.vehicleStatus.find((v) => v.status === "Manutenção")?.count ?? 0;
  const totalKm = fleet.vehicles.reduce((s, v) => s + v.km, 0);
  const totalCost = fleet.vehicles.reduce((s, v) => s + v.custo, 0);
  const totalDeliveries = fleet.vehicles.reduce((s, v) => s + v.entregas, 0);
  const fleetOtd = fleet.vehicles.reduce((s, v) => s + v.otd * v.entregas, 0) / Math.max(1, totalDeliveries);
  const avgConsumption = fleet.vehicles.reduce((s, v) => s + v.consumo, 0) / fleet.vehicles.length;

  const vehicles = useMemo(() => fleet.vehicles
    .filter((v) => `${v.placa} ${v.tipo} ${v.status}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.entregas - a.entregas), [query]);

  const drivers = useMemo(() => fleet.drivers
    .filter((d) => `${d.codigo} ${d.nome} ${d.cnh}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.entregas - a.entregas), [query]);

  const maxTypeKm = Math.max(...fleet.types.map((t) => t.km), 1);

  function exportCsv() {
    const rows = tab === "veiculos"
      ? [["Placa", "Tipo", "Capacidade (kg)", "Consumo (km/l)", "Status", "Entregas", "Km", "OTD", "Atraso médio (h)", "Custo", "Receita"],
        ...vehicles.map((v) => [v.placa, v.tipo, v.capacidade, v.consumo, v.status, v.entregas, v.km, (v.otd * 100).toFixed(1), v.atraso, v.custo.toFixed(2), v.receita.toFixed(2)])]
      : [["Código", "Motorista", "CNH", "Experiência (anos)", "Entregas", "Km", "OTD", "Atraso médio (h)"],
        ...drivers.map((d) => [d.codigo, d.nome, d.cnh, d.exp, d.entregas, d.km, (d.otd * 100).toFixed(1), d.atraso])];
    const blob = new Blob([rows.map((r) => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `frota-${tab}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-5">
      <Link to="/" className="flex items-center gap-1.5 rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5" />Painel executivo</Link>
      <div className="mr-auto min-w-[180px]"><h1 className="text-base font-bold leading-none">Frota & motoristas</h1><p className="mt-1 font-mono text-[10px] text-muted-foreground">{fleet.vehicles.length} VEÍCULOS · {fleet.drivers.length} MOTORISTAS</p></div>
      <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-success"><i className="size-1.5 rounded-full bg-success animate-pulse-ring" />DADOS VALIDADOS</span>
    </header>

    <main className="data-grid p-4 md:p-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Kpi label="Veículos" value={String(fleet.vehicles.length)} note={`${available} disponíveis`} tone="success" icon={Truck} />
        <Kpi label="Em manutenção" value={String(maintenance)} note={`${percent(maintenance / fleet.vehicles.length)} da frota`} tone="warning" icon={Wrench} />
        <Kpi label="Motoristas" value={String(fleet.drivers.length)} note={`${fleet.avgExperience.toFixed(0)} anos de experiência média`} icon={UserRound} />
        <Kpi label="Km rodados" value={integer.format(totalKm)} note="acumulado 2025" icon={Gauge} />
        <Kpi label="OTD da frota" value={percent(fleetOtd)} note={`${integer.format(totalDeliveries)} entregas`} tone={fleetOtd < 0.5 ? "danger" : "success"} icon={Timer} />
        <Kpi label="Custo operacional" value={brl.format(totalCost)} note={`Consumo médio ${avgConsumption.toFixed(1).replace(".", ",")} km/l`} icon={CircleDollarSign} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Utilização por tipo de veículo" caption="KM RODADOS, ENTREGAS E OTD">
          <div className="space-y-3">{fleet.types.map((t, i) => <div key={t.tipo} className="grid grid-cols-[92px_1fr_150px] items-center gap-2 text-xs">
            <span className="text-muted-foreground">{String(i + 1).padStart(2, "0")} · {t.tipo} <span className="font-mono text-[9px]">({t.qtd})</span></span>
            <div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-primary" style={{ width: `${(t.km / maxTypeKm) * 100}%` }} /></div>
            <span className="text-right font-mono text-[10px]">{integer.format(t.km)} km · OTD {percent(t.otd)}</span>
          </div>)}</div>
          <div className="mt-4 h-36"><ResponsiveContainer width="100%" height="100%"><BarChart data={fleet.types} margin={{ left: -20, right: 8 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="tipo" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10} />
            <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={10} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
            <Bar dataKey="entregas" name="Entregas" fill="var(--primary)" radius={[3, 3, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Motoristas por CNH" caption="CATEGORIA E NÍVEL DE SERVIÇO">
          <div className="space-y-3">{fleet.cnh.map((c) => <div key={c.cnh} className="rounded-md border border-border bg-raised p-3">
            <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 font-medium"><IdCard className="size-3.5 text-primary" />Categoria {c.cnh}</span><span className="font-mono text-[10px] text-muted-foreground">{c.qtd} motoristas</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: `${c.otd * 100}%` }} /></div>
            <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">OTD {percent(c.otd)}</p>
          </div>)}</div>
          <div className="mt-4 border-t border-border pt-3 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Status da frota</span><strong className="text-success">{available} disp. · <span className="text-warning">{maintenance} manut.</span></strong></div></div>
        </Panel>
      </div>

      <section className="mt-3 overflow-hidden rounded-lg border border-border bg-panel">
        <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="mr-auto"><h2 className="text-sm font-bold">{tab === "veiculos" ? "Veículos" : "Motoristas"}</h2><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">DESEMPENHO INDIVIDUAL</p></div>
          <div className="flex rounded-md border border-border bg-raised p-1 text-[11px]">
            <button onClick={() => setTab("veiculos")} className={`rounded px-2 py-1 ${tab === "veiculos" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Veículos</button>
            <button onClick={() => setTab("motoristas")} className={`rounded px-2 py-1 ${tab === "motoristas" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Motoristas</button>
          </div>
          <label className="flex items-center gap-2 rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs"><Search className="size-3.5 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === "veiculos" ? "Buscar placa, tipo ou status" : "Buscar motorista ou CNH"} className="w-48 bg-transparent outline-none placeholder:text-muted-foreground" /></label>
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs text-primary"><Download className="size-3.5" />Exportar CSV</button>
        </header>
        <div className="overflow-x-auto">
          {tab === "veiculos" ? <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="font-mono text-[9px] uppercase text-muted-foreground"><tr className="border-b border-border">{["Placa", "Tipo", "Capacidade", "Consumo", "Status", "Entregas", "Km", "OTD", "Atraso médio", "Custo", "Receita"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{vehicles.map((v) => <tr key={v.placa} className="border-b border-border/60 transition-colors last:border-0 hover:bg-raised">
              <td className="px-4 py-2.5 font-mono text-primary">{v.placa}</td><td className="px-4 py-2.5">{v.tipo}</td>
              <td className="px-4 py-2.5 font-mono">{integer.format(v.capacidade)} kg</td>
              <td className="px-4 py-2.5 font-mono"><span className="inline-flex items-center gap-1"><Fuel className="size-3 text-muted-foreground" />{v.consumo.toFixed(1).replace(".", ",")} km/l</span></td>
              <td className="px-4 py-2.5"><span className={v.status === "Disponível" ? "text-success" : "text-warning"}>{v.status}</span></td>
              <td className="px-4 py-2.5 font-mono">{integer.format(v.entregas)}</td><td className="px-4 py-2.5 font-mono">{integer.format(v.km)}</td>
              <td className={`px-4 py-2.5 font-mono ${v.otd < 0.3 ? "text-danger" : "text-success"}`}>{percent(v.otd)}</td>
              <td className="px-4 py-2.5 font-mono text-warning">{v.atraso.toFixed(1).replace(".", ",")}h</td>
              <td className="px-4 py-2.5 font-mono">{brlFull.format(v.custo)}</td><td className="px-4 py-2.5 font-mono">{brlFull.format(v.receita)}</td>
            </tr>)}</tbody>
          </table> : <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="font-mono text-[9px] uppercase text-muted-foreground"><tr className="border-b border-border">{["Código", "Motorista", "CNH", "Experiência", "Entregas", "Km", "OTD", "Atraso médio"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{drivers.map((d) => <tr key={d.codigo} className="border-b border-border/60 transition-colors last:border-0 hover:bg-raised">
              <td className="px-4 py-2.5 font-mono text-primary">{d.codigo}</td><td className="px-4 py-2.5">{d.nome}</td>
              <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1"><IdCard className="size-3 text-muted-foreground" />{d.cnh}</span></td>
              <td className="px-4 py-2.5 font-mono">{d.exp} anos</td>
              <td className="px-4 py-2.5 font-mono">{integer.format(d.entregas)}</td><td className="px-4 py-2.5 font-mono">{integer.format(d.km)}</td>
              <td className={`px-4 py-2.5 font-mono ${d.otd < 0.3 ? "text-danger" : "text-success"}`}>{percent(d.otd)}</td>
              <td className="px-4 py-2.5 font-mono text-warning">{d.atraso.toFixed(1).replace(".", ",")}h</td>
            </tr>)}</tbody>
          </table>}
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 py-4 font-mono text-[9px] text-muted-foreground"><span>Fonte: Logistics Intelligence Dataset · abas veiculos, motoristas e entregas</span><span>{integer.format(totalKm)} km · {brl.format(totalCost)} de custo operacional</span></footer>
    </main>
  </div>;
}
