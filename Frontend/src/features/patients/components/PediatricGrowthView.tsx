import React, { useState } from 'react';
import {
  TrendingUp,
  Scale,
  Ruler,
  Brain,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { Panel } from '../../../design-system/components/Panel';
import { Button } from '../../../design-system/components/Button';
import { Input } from '../../../design-system/components/Input';
import { Alert } from '../../../design-system/components/Alert';
import { Paciente, ConsultaPaciente, SignosVitales } from '../../../services/types';

interface PediatricGrowthViewProps {
  paciente: Paciente;
  consultas: ConsultaPaciente[];
  onActualizado?: () => Promise<void>;
}

interface RegistroCrecimientoCalculado {
  id: string;
  fechaHora: string;
  edadMeses: number;
  edadEtiqueta: string;
  pesoKg: number | null;
  tallaCm: number | null;
  perimetroCefalicoCm: number | null;
  temperaturaC: number | null;
  frecuenciaCardiacaLpm: number | null;
  imcCalculado: number | null;
  imcEtiqueta: string;
  variacionPesoKg: number | null;
  variacionTallaCm: number | null;
  variacionPerimetroCm: number | null;
  profesionalNombre: string;
}

export const PediatricGrowthView: React.FC<PediatricGrowthViewProps> = ({
  paciente,
  consultas
}) => {
  const [modalNuevoControl, setModalNuevoControl] = useState(false);

  // Formulario nuevo control
  const [fechaControl, setFechaControl] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [pesoInput, setPesoInput] = useState('');
  const [tallaInput, setTallaInput] = useState('');
  const [pcInput, setPcInput] = useState('');
  const [tempInput, setTempInput] = useState('36.6');
  const [fcInput, setFcInput] = useState('95');
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Lista local combinada de consultas con controles
  const [controlesAdicionales, setControlesAdicionales] = useState<
    Array<{
      id: string;
      fechaHora: string;
      motivo: string;
      profesionalNombre: string;
      signosVitales: SignosVitales;
    }>
  >([]);

  // Función de cálculo de edad exacta
  const calcularEdadMeses = (fechaNacStr: string, fechaMedicionStr: string) => {
    const nac = new Date(fechaNacStr);
    const med = new Date(fechaMedicionStr);
    let meses = (med.getFullYear() - nac.getFullYear()) * 12 + (med.getMonth() - nac.getMonth());
    if (med.getDate() < nac.getDate()) {
      meses--;
    }
    return Math.max(0, meses);
  };

  const formatearEdad = (meses: number) => {
    if (meses < 12) return `${meses} meses`;
    const anios = Math.floor(meses / 12);
    const rem = meses % 12;
    if (rem === 0) return `${anios} años (${meses} m)`;
    return `${anios} a ${rem} m (${meses} m)`;
  };

  // Procesar todas las consultas y controles cronológicamente
  const registrosProcesados: RegistroCrecimientoCalculado[] = React.useMemo(() => {
    const todos: Array<{
      id: string;
      fechaHora: string;
      profesionalNombre: string;
      signosVitales: SignosVitales;
    }> = [];

    // Consultas existentes
    consultas.forEach((c) => {
      if (
        c.signosVitales &&
        (c.signosVitales.pesoKg !== null ||
          c.signosVitales.tallaCm !== null ||
          c.signosVitales.perimetroCefalicoCm !== null)
      ) {
        todos.push({
          id: c.id,
          fechaHora: c.fechaHora,
          profesionalNombre: c.profesionalNombre,
          signosVitales: c.signosVitales
        });
      }
    });

    // Controles adicionales registrados en la sesión
    controlesAdicionales.forEach((ca) => {
      todos.push({
        id: ca.id,
        fechaHora: ca.fechaHora,
        profesionalNombre: ca.profesionalNombre,
        signosVitales: ca.signosVitales
      });
    });

    // Ordenar cronológicamente (más antiguo al más reciente) para calcular variaciones
    todos.sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());

    const procesados: RegistroCrecimientoCalculado[] = [];
    let previo: RegistroCrecimientoCalculado | null = null;

    for (const item of todos) {
      const edadMeses = calcularEdadMeses(paciente.fechaNacimiento, item.fechaHora);
      const edadEtiqueta = formatearEdad(edadMeses);
      const peso = item.signosVitales.pesoKg;
      const talla = item.signosVitales.tallaCm;
      const pc = item.signosVitales.perimetroCefalicoCm ?? null;

      // Honest IMC calculation (Regla CA10)
      let imcCalculado: number | null = null;
      let imcEtiqueta = 'No calculable (talla no registrada)';

      if (peso !== null && peso > 0 && talla !== null && talla > 0) {
        const tallaMetros = talla / 100;
        imcCalculado = parseFloat((peso / (tallaMetros * tallaMetros)).toFixed(2));
        imcEtiqueta = `${imcCalculado} kg/m²`;
      }

      // Variaciones respecto al control inmediatamente anterior
      let variacionPesoKg: number | null = null;
      let variacionTallaCm: number | null = null;
      let variacionPerimetroCm: number | null = null;

      if (previo) {
        if (peso !== null && previo.pesoKg !== null) {
          variacionPesoKg = parseFloat((peso - previo.pesoKg).toFixed(2));
        }
        if (talla !== null && previo.tallaCm !== null) {
          variacionTallaCm = parseFloat((talla - previo.tallaCm).toFixed(1));
        }
        if (pc !== null && previo.perimetroCefalicoCm !== null) {
          variacionPerimetroCm = parseFloat((pc - previo.perimetroCefalicoCm).toFixed(1));
        }
      }

      const nuevo: RegistroCrecimientoCalculado = {
        id: item.id,
        fechaHora: item.fechaHora,
        edadMeses,
        edadEtiqueta,
        pesoKg: peso,
        tallaCm: talla,
        perimetroCefalicoCm: pc,
        temperaturaC: item.signosVitales.temperaturaC ?? null,
        frecuenciaCardiacaLpm: item.signosVitales.frecuenciaCardiacaLpm ?? null,
        imcCalculado,
        imcEtiqueta,
        variacionPesoKg,
        variacionTallaCm,
        variacionPerimetroCm,
        profesionalNombre: item.profesionalNombre
      };

      procesados.push(nuevo);
      previo = nuevo;
    }

    // Retornar en orden descendente (más reciente arriba) para la tabla clínica
    return procesados.reverse();
  }, [consultas, controlesAdicionales, paciente.fechaNacimiento]);

  const ultimoRegistro = registrosProcesados.length > 0 ? registrosProcesados[0] : null;

  // Registrar nuevo control de crecimiento (CA10)
  const handleGuardarControl = (e: React.FormEvent) => {
    e.preventDefault();
    const pesoNum = pesoInput ? parseFloat(pesoInput) : null;
    const tallaNum = tallaInput ? parseFloat(tallaInput) : null;
    const pcNum = pcInput ? parseFloat(pcInput) : null;

    if (!pesoNum && !tallaNum && !pcNum) {
      setErrorForm('Debe registrar al menos un parámetro somatométrico (peso, talla o perímetro cefálico).');
      return;
    }

    if (pesoNum !== null && pesoNum <= 0) {
      setErrorForm('El peso debe ser mayor a cero.');
      return;
    }

    if (tallaNum !== null && tallaNum <= 0) {
      setErrorForm('La talla debe ser mayor a cero.');
      return;
    }

    const nuevoControl = {
      id: `ctrl-${Date.now()}`,
      fechaHora: `${fechaControl}T10:00:00Z`,
      motivo: 'Control de crecimiento y desarrollo ambulatorio (P02)',
      profesionalNombre: 'Dra. Marcela Estrada (Pediatra)',
      signosVitales: {
        pesoKg: pesoNum,
        tallaCm: tallaNum,
        temperaturaC: tempInput ? parseFloat(tempInput) : null,
        presionSistolica: null,
        presionDiastolica: null,
        frecuenciaCardiacaLpm: fcInput ? parseInt(fcInput, 10) : null,
        perimetroCefalicoCm: pcNum
      }
    };

    setControlesAdicionales((prev) => [nuevoControl, ...prev]);
    setModalNuevoControl(false);
    setErrorForm(null);
  };

  const renderVariacionBadge = (valor: number | null, unidad: string) => {
    if (valor === null) return <span className="text-slate-400 font-mono">-</span>;
    if (valor > 0) {
      return (
        <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <ArrowUpRight size={12} className="mr-0.5" />
          +{valor} {unidad}
        </span>
      );
    }
    if (valor < 0) {
      return (
        <span className="inline-flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
          <ArrowDownRight size={12} className="mr-0.5" />
          {valor} {unidad}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
        <Minus size={12} className="mr-0.5" />
        0.0 {unidad}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner de Regla CA10 */}
      <Alert
        variant="info"
        title="Seguimiento Longitudinal y Evaluación Somatométrica (P02, Regla CA10)"
      >
        Los cálculos derivados de edad e <strong>Índice de Masa Corporal (IMC)</strong> se obtienen en
        tiempo real únicamente cuando existen mediciones válidas y honestas de peso y talla. Cada consulta
        pediátrica contiene como máximo un único registro somatométrico inmutable para garantizar la
        fidelidad de las curvas de crecimiento.
      </Alert>

      {/* Tarjetas KPI de Estado Somatométrico Actual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Peso Actual */}
        <Panel className="bg-white border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Último Peso Medido
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {ultimoRegistro?.pesoKg !== null && ultimoRegistro?.pesoKg !== undefined
                  ? `${ultimoRegistro.pesoKg.toFixed(2)} kg`
                  : 'Sin registro'}
              </p>
              <div className="mt-1">
                {ultimoRegistro ? renderVariacionBadge(ultimoRegistro.variacionPesoKg, 'kg') : null}
              </div>
            </div>
            <div className="p-3 bg-teal-50 text-[#20666B] rounded-lg">
              <Scale size={24} />
            </div>
          </div>
        </Panel>

        {/* Talla Actual */}
        <Panel className="bg-white border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Última Talla Medida
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {ultimoRegistro?.tallaCm !== null && ultimoRegistro?.tallaCm !== undefined
                  ? `${ultimoRegistro.tallaCm.toFixed(1)} cm`
                  : 'Sin registro'}
              </p>
              <div className="mt-1">
                {ultimoRegistro ? renderVariacionBadge(ultimoRegistro.variacionTallaCm, 'cm') : null}
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
              <Ruler size={24} />
            </div>
          </div>
        </Panel>

        {/* IMC Derivado (Honesto CA10) */}
        <Panel className="bg-white border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Índice de Masa Corporal (IMC)
              </p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {ultimoRegistro?.imcCalculado !== null && ultimoRegistro?.imcCalculado !== undefined
                  ? `${ultimoRegistro.imcCalculado} kg/m²`
                  : 'No calculable'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {ultimoRegistro?.imcCalculado !== null && ultimoRegistro?.imcCalculado !== undefined
                  ? 'Fórmula: peso / (talla en m)²'
                  : 'Requiere peso y talla simultáneos'}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg">
              <TrendingUp size={24} />
            </div>
          </div>
        </Panel>

        {/* Perímetro Cefálico */}
        <Panel className="bg-white border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Perímetro Cefálico
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {ultimoRegistro?.perimetroCefalicoCm !== null && ultimoRegistro?.perimetroCefalicoCm !== undefined
                  ? `${ultimoRegistro.perimetroCefalicoCm.toFixed(1)} cm`
                  : 'No registrado'}
              </p>
              <div className="mt-1">
                {ultimoRegistro ? renderVariacionBadge(ultimoRegistro.variacionPerimetroCm, 'cm') : null}
              </div>
            </div>
            <div className="p-3 bg-purple-50 text-purple-700 rounded-lg">
              <Brain size={24} />
            </div>
          </div>
        </Panel>
      </div>

      {/* Curva Visual de Crecimiento OMS (Referencial 0 - 5 años) */}
      <Panel
        title="Curvas de Crecimiento Referenciales OMS (Peso y Talla para la Edad)"
        subtitle="Trayectoria del paciente contrastada contra los percentiles P3, P50 (mediana) y P97 de la Organización Mundial de la Salud"
      >
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1.5 bg-[#20666B] rounded-full inline-block" />
                <span className="font-semibold text-slate-800">Paciente ({paciente.nombreCompleto})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-600 inline-block border-t border-emerald-600" />
                <span className="text-slate-600">Percentil 50 (Mediana OMS)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-400 inline-block border-t border-dashed border-slate-400" />
                <span className="text-slate-500">Percentiles P3 y P97 (Límites Normativos)</span>
              </div>
            </div>

            <span className="text-[11px] font-medium text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200">
              Patrón de Referencia: OMS Niño/a 0-5 años
            </span>
          </div>

          {/* Gráfico SVG Responsivo */}
          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 650 240" className="w-full min-w-[550px] h-60 bg-white rounded-lg border border-slate-200 p-2">
              {/* Ejes y líneas de cuadrícula */}
              <line x1="50" y1="20" x2="50" y2="200" stroke="#E2E8F0" strokeWidth="1.5" />
              <line x1="50" y1="200" x2="630" y2="200" stroke="#E2E8F0" strokeWidth="1.5" />

              <line x1="50" y1="150" x2="630" y2="150" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="50" y1="100" x2="630" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="50" y1="50" x2="630" y2="50" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />

              {/* Etiquetas Eje Y (Peso kg) */}
              <text x="40" y="200" fontSize="10" textAnchor="end" fill="#64748B">0 kg</text>
              <text x="40" y="150" fontSize="10" textAnchor="end" fill="#64748B">6 kg</text>
              <text x="40" y="100" fontSize="10" textAnchor="end" fill="#64748B">12 kg</text>
              <text x="40" y="50" fontSize="10" textAnchor="end" fill="#64748B">18 kg</text>

              {/* Etiquetas Eje X (Edad Meses) */}
              <text x="50" y="215" fontSize="10" textAnchor="middle" fill="#64748B">0m</text>
              <text x="160" y="215" fontSize="10" textAnchor="middle" fill="#64748B">12m (1a)</text>
              <text x="270" y="215" fontSize="10" textAnchor="middle" fill="#64748B">24m (2a)</text>
              <text x="390" y="215" fontSize="10" textAnchor="middle" fill="#64748B">36m (3a)</text>
              <text x="510" y="215" fontSize="10" textAnchor="middle" fill="#64748B">48m (4a)</text>
              <text x="620" y="215" fontSize="10" textAnchor="middle" fill="#64748B">60m (5a)</text>

              {/* Curva OMS P97 */}
              <path
                d="M 50 170 Q 200 120 350 85 T 620 35"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text x="625" y="38" fontSize="9" fill="#94A3B8">P97</text>

              {/* Curva OMS P50 (Mediana) */}
              <path
                d="M 50 176 Q 200 135 350 105 T 620 58"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
              />
              <text x="625" y="60" fontSize="9" fill="#10B981" fontWeight="bold">P50</text>

              {/* Curva OMS P3 */}
              <path
                d="M 50 182 Q 200 148 350 125 T 620 85"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text x="625" y="87" fontSize="9" fill="#94A3B8">P3</text>

              {/* Puntos y línea del paciente */}
              {registrosProcesados.length > 0 && (
                <>
                  <polyline
                    fill="none"
                    stroke="#20666B"
                    strokeWidth="2.5"
                    points={registrosProcesados
                      .slice()
                      .reverse()
                      .filter((r) => r.pesoKg !== null)
                      .map((r) => {
                        const x = 50 + (r.edadMeses / 60) * 570;
                        const y = 200 - ((r.pesoKg || 0) / 20) * 160;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                  {registrosProcesados
                    .filter((r) => r.pesoKg !== null)
                    .map((r) => {
                      const x = 50 + (r.edadMeses / 60) * 570;
                      const y = 200 - ((r.pesoKg || 0) / 20) * 160;
                      return (
                        <g key={r.id}>
                          <circle cx={x} cy={y} r="5" fill="#20666B" stroke="#ffffff" strokeWidth="2" />
                          <text x={x} y={y - 10} fontSize="10" textAnchor="middle" fill="#0E4347" fontWeight="bold">
                            {r.pesoKg} kg
                          </text>
                        </g>
                      );
                    })}
                </>
              )}
            </svg>
          </div>
        </div>
      </Panel>

      {/* Tabla Longitudinal de Crecimiento */}
      <Panel
        title={`Historial de Controles Somatométricos (${registrosProcesados.length})`}
        subtitle="Tabla comparativa ordenada cronológicamente con variaciones absolutas entre controles sucesivos (CA10)"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setPesoInput('');
              setTallaInput('');
              setPcInput('');
              setErrorForm(null);
              setModalNuevoControl(true);
            }}
            className="flex items-center gap-1.5 bg-[#20666B] hover:bg-[#184d50] text-white text-xs"
          >
            <Plus size={15} />
            Nuevo Control de Crecimiento (P02)
          </Button>
        }
      >
        {registrosProcesados.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
            <Scale size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Sin mediciones somatométricas registradas</p>
            <p className="text-xs text-slate-400 mt-1">
              Las mediciones de peso, talla y perímetro cefálico se capturan durante las consultas pediátricas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold">Fecha de Control</th>
                  <th className="py-3 px-4 font-semibold">Edad Exacta</th>
                  <th className="py-3 px-4 font-semibold text-right">Peso (kg)</th>
                  <th className="py-3 px-4 font-semibold text-center">Variación Peso</th>
                  <th className="py-3 px-4 font-semibold text-right">Talla (cm)</th>
                  <th className="py-3 px-4 font-semibold text-center">Variación Talla</th>
                  <th className="py-3 px-4 font-semibold text-right">IMC Calculado (CA10)</th>
                  <th className="py-3 px-4 font-semibold text-right">P. Cefálico (cm)</th>
                  <th className="py-3 px-4 font-semibold">Profesional Evaluador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrosProcesados.map((ctrl) => (
                  <tr key={ctrl.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {new Date(ctrl.fechaHora).toLocaleDateString('es-GT', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {ctrl.edadEtiqueta}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {ctrl.pesoKg !== null ? `${ctrl.pesoKg.toFixed(2)} kg` : <span className="text-slate-400 font-normal">No medido</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderVariacionBadge(ctrl.variacionPesoKg, 'kg')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {ctrl.tallaCm !== null ? `${ctrl.tallaCm.toFixed(1)} cm` : <span className="text-slate-400 font-normal">No medida</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderVariacionBadge(ctrl.variacionTallaCm, 'cm')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {ctrl.imcCalculado !== null ? (
                        <span className="font-bold text-slate-900">{ctrl.imcCalculado} kg/m²</span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No calculable (falta talla)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {ctrl.perimetroCefalicoCm !== null ? `${ctrl.perimetroCefalicoCm.toFixed(1)} cm` : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {ctrl.profesionalNombre}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* MODAL: Nuevo Control Somatométrico Ambulatorio */}
      {modalNuevoControl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#20666B]/10 rounded-md text-[#20666B]">
                  <Scale size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Nuevo Control de Crecimiento</h3>
                  <p className="text-xs text-slate-500">Evaluación somatométrica infantil (P02, CA10)</p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevoControl(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarControl} className="p-6 space-y-4 text-xs">
              <Input
                label="Fecha de la medición *"
                type="date"
                value={fechaControl}
                onChange={(e) => setFechaControl(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Peso en Kilogramos (kg) *"
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="150"
                  value={pesoInput}
                  onChange={(e) => setPesoInput(e.target.value)}
                  placeholder="ej. 16.50"
                />

                <Input
                  label="Talla en Centímetros (cm)"
                  type="number"
                  step="0.1"
                  min="20"
                  max="220"
                  value={tallaInput}
                  onChange={(e) => setTallaInput(e.target.value)}
                  placeholder="ej. 103.5"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Perímetro Cefálico (cm)"
                  type="number"
                  step="0.1"
                  min="20"
                  max="70"
                  value={pcInput}
                  onChange={(e) => setPcInput(e.target.value)}
                  placeholder="ej. 50.8"
                />

                <Input
                  label="Temperatura (°C)"
                  type="number"
                  step="0.1"
                  value={tempInput}
                  onChange={(e) => setTempInput(e.target.value)}
                  placeholder="36.5"
                />

                <Input
                  label="Frecuencia Cardíaca (lpm)"
                  type="number"
                  value={fcInput}
                  onChange={(e) => setFcInput(e.target.value)}
                  placeholder="95"
                />
              </div>

              {/* Cálculo en Vivo del IMC (CA10) */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-600 block">IMC Derivado Estimado:</span>
                <strong className="text-slate-900 text-sm">
                  {pesoInput && tallaInput && parseFloat(tallaInput) > 0 && parseFloat(pesoInput) > 0
                    ? `${(parseFloat(pesoInput) / Math.pow(parseFloat(tallaInput) / 100, 2)).toFixed(2)} kg/m²`
                    : 'No calculable (requiere peso y talla simultáneos válidos)'}
                </strong>
              </div>

              {errorForm && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{errorForm}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalNuevoControl(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-[#20666B] text-white"
                >
                  Guardar Medición Somatométrica (CA10)
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PediatricGrowthView;
