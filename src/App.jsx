import React, { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { BarChart, XAxis, YAxis, CartesianGrid, Bar, Tooltip, ResponsiveContainer } from "recharts";
import { Progress } from "@/components/ui/progress";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

const STATUSES = ["Pendiente", "En ejecución", "En espera", "Finalizado"];

function uid() { return Math.random().toString(36).slice(2, 10); }
function todayISO(d = new Date()) { const tz = new Date(d.getTime() - d.getTimezoneOffset()*60000); return tz.toISOString().slice(0,10); }

const DEMO_DATA = [
  { id: uid(), parroquia: "Candelaria", comuna: "Comuna 12", vocero: "María Pérez", contacto: "+58 412-5551234", requerimiento: "Reparación tubería", compromiso: "TRANSCCS inicia cuadrilla", ente: "TRANSCCS", status: "En ejecución", tiempoEjecucion: 10, fechaInicio: todayISO(), fechaCierre: "", observaciones: "40% avance", progreso: 40 },
  { id: uid(), parroquia: "San José", comuna: "Circuito Norte", vocero: "José Rivas", contacto: "+58 414-1112233", requerimiento: "Alumbrado Av. Sucre", compromiso: "25 luminarias LED", ente: "TRANSCCS", status: "Pendiente", tiempoEjecucion: 7, fechaInicio: "", fechaCierre: "", observaciones: "Esperando materiales", progreso: 0 },
];

function loadData() { try { const raw = localStorage.getItem("sgp_proyectos"); return raw? JSON.parse(raw): DEMO_DATA; } catch { return DEMO_DATA; } }
function saveData(rows) { localStorage.setItem("sgp_proyectos", JSON.stringify(rows)); }

function StatusBadge({ value }) {
  const color = { "Pendiente": "bg-amber-100 text-amber-800", "En ejecución": "bg-blue-100 text-blue-800", "En espera": "bg-zinc-100 text-zinc-800", "Finalizado": "bg-emerald-100 text-emerald-800" }[value] || "bg-zinc-100 text-zinc-800";
  return <Badge className={cn("rounded-full px-3", color)}>{value}</Badge>;
}

function DatePicker({ date, onChange }) {
  const [open, setOpen] = useState(false);
  const value = date ? new Date(date) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start text-left font-normal w-full", !date && "text-muted-foreground")}> 
          <CalendarIcon className="mr-2 h-4 w-4"/>
          {date ? new Date(date).toLocaleDateString() : "Selecciona fecha"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={(d) => { onChange(d ? todayISO(d) : ""); setOpen(false); }} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

function ProyectoForm({ initial, onSubmit, onDelete }) {
  const [form, setForm] = useState(initial);
  useEffect(()=>setForm(initial), [initial]);
  const set = (k,v)=> setForm(p=>({...p,[k]:v}));
  return (
    <form onSubmit={(e)=>{e.preventDefault(); onSubmit({...form, ente: "TRANSCCS"});}} className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><Label>Parroquia</Label><Input value={form.parroquia} onChange={e=>set("parroquia", e.target.value)} /></div>
      <div><Label>Comuna</Label><Input value={form.comuna} onChange={e=>set("comuna", e.target.value)} /></div>
      <div><Label>Vocero</Label><Input value={form.vocero} onChange={e=>set("vocero", e.target.value)} /></div>
      <div><Label>Contacto</Label><Input value={form.contacto} onChange={e=>set("contacto", e.target.value)} /></div>
      <div className="md:col-span-2"><Label>Requerimiento</Label><Input value={form.requerimiento} onChange={e=>set("requerimiento", e.target.value)} /></div>
      <div className="md:col-span-2"><Label>Compromiso</Label><Textarea value={form.compromiso} onChange={e=>set("compromiso", e.target.value)} /></div>
      <div><Label>Status</Label><select value={form.status} onChange={e=>set("status", e.target.value)} className="border rounded-md px-2 py-1 w-full">{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
      <div><Label>Tiempo ejecución (días)</Label><Input type="number" value={form.tiempoEjecucion} onChange={e=>set("tiempoEjecucion", Number(e.target.value))} /></div>
      <div><Label>Inicio</Label><DatePicker date={form.fechaInicio} onChange={v=>set("fechaInicio",v)} /></div>
      <div><Label>Cierre</Label><DatePicker date={form.fechaCierre} onChange={v=>set("fechaCierre",v)} /></div>
      <div className="md:col-span-2"><Label>Observaciones</Label><Textarea value={form.observaciones} onChange={e=>set("observaciones", e.target.value)} /></div>
      <div><Label>Progreso (%)</Label><Input type="number" min={0} max={100} value={form.progreso||0} onChange={e=>set("progreso", Number(e.target.value))} /></div>
      <div className="md:col-span-2 flex justify-between mt-2">{onDelete&&<Button type="button" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4"/>Eliminar</Button>}<Button type="submit">Guardar</Button></div>
    </form>
  );
}

function ExportPDF({ rows, progresoGeneral, reportParroquia, chartRef }) {
  const generarPDF = async () => {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(16);
    doc.text("Reporte de Proyectos – TRANSCCS", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);

    // Indicadores
    doc.setFontSize(12);
    doc.text(`Total proyectos: ${rows.length}`, 14, 40);
    doc.text(`Progreso general promedio: ${progresoGeneral}%`, 14, 48);

    // Tabla de proyectos
    autoTable(doc, {
      startY: 60,
      head: [["Parroquia", "Requerimiento", "Status", "Progreso (%)", "Observaciones"]],
      body: rows.map(r => [
        r.parroquia,
        r.requerimiento,
        r.status,
        r.progreso || 0,
        r.observaciones || ""
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 123, 255] }
    });

    // Nueva página para reporte por parroquia
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Resumen por Parroquia", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [["Parroquia", "Cantidad", "Progreso Promedio (%)"]],
      body: reportParroquia.map(r => [ r.name, r.value, r.avgProgreso ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 167, 69] }
    });

    // Capturar gráfico como imagen
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const imgData = canvas.toDataURL("image/png");
      doc.addPage();
      doc.text("Gráfico por Parroquia", 14, 20);
      doc.addImage(imgData, "PNG", 14, 30, 180, 100);
    }

    doc.save(`Reporte_TRANSCCS_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <Button onClick={generarPDF} className="gap-2">📄 Generar PDF</Button>
  );
}

export default function AppServiciosPublicos(){
  const [rows, setRows] = useState(loadData);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const chartRef = useRef(null);
  useEffect(()=>saveData(rows), [rows]);

  const parroquias = useMemo(()=> Array.from(new Set(rows.map(r=>r.parroquia).filter(Boolean))), [rows]);
  const filtered = useMemo(()=> rows.filter(r=> !query||JSON.stringify(r).toLowerCase().includes(query.toLowerCase())), [rows,query]);

  const reportParroquia = useMemo(()=> parroquias.map(p=>{
    const subset = rows.filter(r=>r.parroquia===p);
    const avg = subset.length? Math.round(subset.reduce((a,b)=>a+(b.progreso||0),0)/subset.length):0;
    return { name:p, value: subset.length, avgProgreso: avg };
  }), [rows,parroquias]);

  const progresoGeneral = useMemo(()=>{ if(!rows.length) return 0; return Math.round(rows.reduce((a,b)=>a+(b.progreso||0),0)/rows.length); },[rows]);

  const onSubmit = (data)=>{ setRows(p=>{const ex=p.some(r=>r.id===data.id); return ex? p.map(r=>r.id===data.id?data:r):[data,...p];}); setOpen(false); setEditing(null); };
  const onDelete = ()=>{ setRows(p=>p.filter(r=>r.id!==editing.id)); setOpen(false); setEditing(null); };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SGP – Servicios Públicos</h1>
        <div className="flex gap-2">
          <ExportPDF rows={rows} progresoGeneral={progresoGeneral} reportParroquia={reportParroquia} chartRef={chartRef} />
          <Button onClick={()=>{setEditing({id:uid(), parroquia:"", comuna:"", vocero:"", contacto:"", requerimiento:"", compromiso:"", ente:"TRANSCCS", status:"Pendiente", tiempoEjecucion:0, fechaInicio:"", fechaCierre:"", observaciones:"", progreso:0}); setOpen(true);}}><Plus className="h-4 w-4"/>Nuevo</Button>
        </div>
      </header>

      <Card><CardHeader><CardTitle>Progreso General</CardTitle></CardHeader><CardContent><Progress value={progresoGeneral} className="h-4"/><p className="text-sm mt-1">{progresoGeneral}% promedio de todos los proyectos</p></CardContent></Card>

    <Card>
  <CardHeader>
    <CardTitle>Reportes por Parroquia</CardTitle>
  </CardHeader>
  <CardContent>
    <div style={{ width: "100%", height: "300px" }} ref={chartRef}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={reportParroquia}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false}/>
          <Tooltip formatter={(v, name)=> name==="avgProgreso"? v+"%": v}/>
          <Bar dataKey="value" name="Proyectos" fill="#8884d8"/>
          <Bar dataKey="avgProgreso" name="% Promedio" fill="#82ca9d"/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>



      <Card><CardContent><Input placeholder="Buscar..." value={query} onChange={e=>setQuery(e.target.value)} className="mb-2"/><table className="w-full text-sm"><thead><tr><th>Parroquia</th><th>Requerimiento</th><th>Status</th><th>Progreso</th><th></th></tr></thead><tbody>{filtered.map(r=>(<tr key={r.id} className="border-b"><td>{r.parroquia}</td><td>{r.requerimiento}</td><td><StatusBadge value={r.status}/></td><td className="w-40"><Progress value={r.progreso||0} /><span className="text-xs">{r.progreso||0}%</span></td><td><Button size="sm" variant="outline" onClick={()=>{setEditing(r); setOpen(true);}}><Pencil className="h-3 w-3"/>Editar</Button></td></tr>))}</tbody></table></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{editing?"Editar":"Nuevo"}</DialogTitle></DialogHeader>{editing&&<ProyectoForm initial={editing} onSubmit={onSubmit} onDelete={rows.some(r=>r.id===editing.id)?onDelete:undefined}/>}<DialogFooter/></DialogContent></Dialog>
    </div>
  );
}
