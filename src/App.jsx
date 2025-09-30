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
import * as PopoverPrimitive from "@radix-ui/react-popover";
const STATUSES = ["Pendiente", "En ejecucion", "En espera", "Finalizado"];
const INSTANCIAS = [
  "Sala de Autogobierno",
  "Modulo de Justicia y Paz",
  "Cuadrantes de Paz"
];
const PARROQUIAS = [
  "23 de Enero",
  "Altagracia",
  "Antimano",
  "Caricuao",
  "Catedral",
  "Coche",
  "El Junquito",
  "El Paraiso",
  "La Candelaria",
  "La Pastora",
  "La Vega",
  "Macarao",
  "San Agustin",
  "San Bernardino",
  "San Jose",
  "San Juan",
  "San Pedro",
  "Santa Rosalia",
  "Santa Teresa",
  "Sucre",
  "El Recreo",
  "San Martin"
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function todayISO(d = new Date()) {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

const DEMO_DATA = [
  {
    id: uid(),
    parroquia: "La Candelaria",
    comuna: "Comuna 12",
    vocero: "Maria Perez",
    contacto: "+58 412-5551234",
    requerimiento: "Reparacion tuberia",
    compromiso: "TRANSCCS inicia cuadrilla",
    instancias: ["Sala de Autogobierno"],
    ente: "TRANSCCS",
    status: "En ejecucion",
    tiempoEjecucion: 10,
    fechaInicio: todayISO(),
    fechaCierre: "",
    observaciones: "40% avance",
    progreso: 40
  },
  {
    id: uid(),
    parroquia: "San Jose",
    comuna: "Circuito Norte",
    vocero: "Jose Rivas",
    contacto: "+58 414-1112233",
    requerimiento: "Alumbrado Av. Sucre",
    compromiso: "25 luminarias LED",
    instancias: ["Modulo de Justicia y Paz"],
    ente: "TRANSCCS",
    status: "Pendiente",
    tiempoEjecucion: 7,
    fechaInicio: "",
    fechaCierre: "",
    observaciones: "Esperando materiales",
    progreso: 0
  },
  {
    id: uid(),
    parroquia: "23 de Enero",
    comuna: "Sector 23",
    vocero: "Carmen Diaz",
    contacto: "+58 416-2223344",
    requerimiento: "Rehabilitacion de cancha",
    compromiso: "Coordinar jornada comunitaria",
    instancias: ["Cuadrantes de Paz"],
    ente: "TRANSCCS",
    status: "En espera",
    tiempoEjecucion: 5,
    fechaInicio: "",
    fechaCierre: "",
    observaciones: "Esperando aprobacion comunitaria",
    progreso: 20
  }
];

function normalizeRow(row) {
  const instancias = Array.isArray(row.instancias)
    ? row.instancias
    : row.instanciaEspecial
    ? [row.instanciaEspecial]
    : [];
  const parroquia = row.parroquia && PARROQUIAS.includes(row.parroquia)
    ? row.parroquia
    : PARROQUIAS[0];
  const { instanciaEspecial, categorias, ...rest } = row;
  return { ...rest, instancias, parroquia };
}
function loadData() {
  try {
    const raw = localStorage.getItem("sgp_proyectos");
    const parsed = raw ? JSON.parse(raw) : DEMO_DATA;
    return parsed.map(normalizeRow);
  } catch {
    return DEMO_DATA.map(normalizeRow);
  }
} // <-- aquí faltaba cerrar

function saveData(rows) {
  localStorage.setItem("sgp_proyectos", JSON.stringify(rows));
}


function StatusBadge({ value }) {
  const color = {
    Pendiente: "bg-amber-100 text-amber-800",
    "En ejecucion": "bg-blue-100 text-blue-800",
    "En espera": "bg-zinc-100 text-zinc-800",
    Finalizado: "bg-emerald-100 text-emerald-800"
  }[value] || "bg-zinc-100 text-zinc-800";

  return <Badge className={cn("rounded-full px-3", color)}>{value}</Badge>;
}

function DatePicker({ date, onChange }) {
  const [open, setOpen] = useState(false);
  const value = date ? new Date(date) : undefined;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? new Date(date).toLocaleDateString() : "Selecciona fecha"}
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={8}
          className="z-50 w-auto p-0 rounded-md border bg-background shadow-lg"
          onInteractOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <Calendar
            selected={value}
            onSelect={(selected) => {
              onChange(selected ? todayISO(selected) : "");
              setOpen(false);
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}


function ProyectoForm({ initial, onSubmit, onDelete }) {
  const [form, setForm] = useState(() => ({
    ...initial,
    parroquia: initial.parroquia && PARROQUIAS.includes(initial.parroquia)
      ? initial.parroquia
      : PARROQUIAS[0],
    instancias: initial.instancias || [],
  }));

  useEffect(() => {
    setForm({
      ...initial,
      parroquia: initial.parroquia && PARROQUIAS.includes(initial.parroquia)
        ? initial.parroquia
        : PARROQUIAS[0],
      instancias: initial.instancias || [],
    });
  }, [initial]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleInstancia = (value) => {
    setForm((prev) => {
      const present = prev.instancias?.includes(value);
      return {
        ...prev,
        instancias: present
          ? prev.instancias.filter((item) => item !== value)
          : [...(prev.instancias || []), value],
      };
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ ...form, ente: "TRANSCCS" });
      }}
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
    >
      <div>
        <Label>Parroquia</Label>
        <select
          value={form.parroquia}
          onChange={(event) => setField("parroquia", event.target.value)}
          className="w-full rounded-md border px-3 py-2"
        >
          {PARROQUIAS.map((parroquia) => (
            <option key={parroquia} value={parroquia}>
              {parroquia}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Comuna</Label>
        <Input value={form.comuna} onChange={(event) => setField("comuna", event.target.value)} />
      </div>
      <div>
        <Label>Vocero</Label>
        <Input value={form.vocero} onChange={(event) => setField("vocero", event.target.value)} />
      </div>
      <div>
        <Label>Contacto</Label>
        <Input value={form.contacto} onChange={(event) => setField("contacto", event.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Label>Instancias</Label>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INSTANCIAS.map((instancia) => (
            <label key={instancia} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.instancias?.includes(instancia) || false}
                onChange={() => toggleInstancia(instancia)}
              />
              {instancia}
            </label>
          ))}
        </div>
      </div>
      <div className="md:col-span-2">
        <Label>Requerimiento</Label>
        <Input value={form.requerimiento} onChange={(event) => setField("requerimiento", event.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Label>Compromiso</Label>
        <Textarea
          value={form.compromiso}
          onChange={(event) => setField("compromiso", event.target.value)}
        />
      </div>
      <div>
        <Label>Status</Label>
        <select
          value={form.status}
          onChange={(event) => setField("status", event.target.value)}
          className="w-full rounded-md border px-3 py-2"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Tiempo ejecucion (dias)</Label>
        <Input
          type="number"
          value={form.tiempoEjecucion}
          onChange={(event) => setField("tiempoEjecucion", Number(event.target.value))}
        />
      </div>
      <div>
        <Label>Inicio</Label>
        <DatePicker date={form.fechaInicio} onChange={(value) => setField("fechaInicio", value)} />
      </div>
      <div>
        <Label>Cierre</Label>
        <DatePicker date={form.fechaCierre} onChange={(value) => setField("fechaCierre", value)} />
      </div>
      <div className="md:col-span-2">
        <Label>Observaciones</Label>
        <Textarea value={form.observaciones} onChange={(event) => setField("observaciones", event.target.value)} />
      </div>
      <div>
        <Label>Progreso (%)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={form.progreso || 0}
          onChange={(event) => setField("progreso", Number(event.target.value))}
        />
      </div>
      <div className="md:col-span-2 mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete} className="w-full sm:w-auto">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        )}
        <Button type="submit" className="w-full sm:w-auto">
          Guardar
        </Button>
      </div>
    </form>
  );
}

function ExportPDF({ rows, progresoGeneral, reportParroquia, chartRef }) {
  const generarPDF = async () => {
    const doc = new jsPDF();

    // Titulo
    doc.setFontSize(16);
    doc.text("Reporte de Proyectos - TRANSCCS", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);

    // Indicadores
    doc.setFontSize(12);
    doc.text(`Total proyectos: ${rows.length}`, 14, 40);
    doc.text(`Progreso general promedio: ${progresoGeneral}%`, 14, 48);

    // Tabla de proyectos
    autoTable(doc, {
      startY: 60,
      head: [["Parroquia", "Requerimiento", "Instancias", "Status", "Progreso (%)", "Observaciones"]],
      body: rows.map((r) => [
        r.parroquia,
        r.requerimiento,
        r.instancias && r.instancias.length ? r.instancias.join(", ") : "-",
        r.status,
        r.progreso || 0,
        r.observaciones || ""
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 123, 255] }
    });

    // Nueva pagina para reporte por parroquia
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

    // Capturar grafico como imagen
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const imgData = canvas.toDataURL("image/png");
      doc.addPage();
      doc.text("Grafico por Parroquia", 14, 20);
      doc.addImage(imgData, "PNG", 14, 30, 180, 100);
    }

    doc.save(`Reporte_TRANSCCS_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <Button onClick={generarPDF} className="gap-2">Generar PDF</Button>
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

  const onSubmit = (data) => {
  const { categorias, instanciaEspecial, ...rest } = data;
  const payload = {
    ...rest,
    ...data,
    instancias: Array.isArray(data.instancias) ? data.instancias : [],
    parroquia: data.parroquia && PARROQUIAS.includes(data.parroquia) ? data.parroquia : PARROQUIAS[0],
  };
  setRows((prev) => {
    const exists = prev.some((row) => row.id === payload.id);
    return exists ? prev.map((row) => (row.id === payload.id ? payload : row)) : [payload, ...prev];
  });
  setOpen(false);
  setEditing(null);
};
  const onDelete = ()=>{ setRows(p=>p.filter(r=>r.id!==editing.id)); setOpen(false); setEditing(null); };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SGP - Servicios Publicos</h1>

        <div className="flex gap-2">
          <ExportPDF rows={rows} progresoGeneral={progresoGeneral} reportParroquia={reportParroquia} chartRef={chartRef} />
          <Button onClick={()=>{setEditing({
            id: uid(),
            parroquia: PARROQUIAS[0],
            comuna: "",
            vocero: "",
            contacto: "",
            instancias: [],
            requerimiento: "",
            compromiso: "",
            ente: "TRANSCCS",
            status: "Pendiente",
            tiempoEjecucion: 0,
            fechaInicio: "",
            fechaCierre: "",
            observaciones: "",
            progreso: 0,
          }); setOpen(true);}}><Plus className="h-4 w-4"/>Nuevo</Button>
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



      <Card><CardContent><Input placeholder="Buscar..." value={query} onChange={e=>setQuery(e.target.value)} className="mb-2"/><table className="w-full text-sm"><thead><tr><th>Parroquia</th><th>Requerimiento</th><th>Instancias</th><th>Status</th><th>Progreso</th><th></th></tr></thead><tbody>{filtered.map(r=>(<tr key={r.id} className="border-b"><td>{r.parroquia}</td><td>{r.requerimiento}</td><td>{r.instancias && r.instancias.length ? r.instancias.join(", ") : "-"}</td><td><StatusBadge value={r.status}/></td><td className="w-40"><Progress value={r.progreso||0} /><span className="text-xs">{r.progreso||0}%</span></td><td><Button size="sm" variant="outline" onClick={()=>{setEditing(r); setOpen(true);}}><Pencil className="h-3 w-3"/>Editar</Button></td></tr>))}</tbody></table></CardContent></Card>

   <Dialog open={open} onOpenChange={setOpen}>
  <DialogContent
    className="max-w-2xl"
    onInteractOutside={(e) => {
      // Si el click viene del calendario o su popper, no cierres el Dialog
      if (e.target.closest("[data-radix-popper-content-wrapper]")) {
        e.preventDefault();
      }
    }}
  >
    <DialogHeader>
      <DialogTitle>{editing ? "Editar" : "Nuevo"}</DialogTitle>
    </DialogHeader>

    {editing && (
      <ProyectoForm
        initial={editing}
        onSubmit={onSubmit}
        onDelete={rows.some((r) => r.id === editing.id) ? onDelete : undefined}
        setOpen={setOpen} 
      />
    )}

    <DialogFooter />
  </DialogContent>
</Dialog>



    </div>
  );
}

