import React from 'react';
import {
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { Panel } from '../../../design-system/components/Panel';
import { MetricStrip } from '../../../design-system/components/MetricStrip';
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
  }, [consultas, paciente.fechaNacimiento]);

  const ultimoRegistro = registrosProcesados.length > 0 ? registrosProcesados[0] : null;

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
      <MetricStrip
        label="Últimas medidas registradas"
        items={[
          {
            id: 'peso',
            label: 'Peso',
            value: ultimoRegistro?.pesoKg != null ? `${ultimoRegistro.pesoKg.toFixed(2)} kg` : 'Sin registro',
            detail: ultimoRegistro ? renderVariacionBadge(ultimoRegistro.variacionPesoKg, 'kg') : undefined,
          },
          {
            id: 'talla',
            label: 'Talla',
            value: ultimoRegistro?.tallaCm != null ? `${ultimoRegistro.tallaCm.toFixed(1)} cm` : 'Sin registro',
            detail: ultimoRegistro ? renderVariacionBadge(ultimoRegistro.variacionTallaCm, 'cm') : undefined,
          },
          {
            id: 'imc',
            label: 'IMC',
            value: ultimoRegistro?.imcCalculado != null ? `${ultimoRegistro.imcCalculado} kg/m²` : 'No calculable',
            detail: ultimoRegistro?.imcCalculado != null ? 'Indicador complementario' : 'Requiere peso y talla',
          },
          {
            id: 'perimetro',
            label: 'Perímetro cefálico',
            value: ultimoRegistro?.perimetroCefalicoCm != null ? `${ultimoRegistro.perimetroCefalicoCm.toFixed(1)} cm` : 'Sin registro',
            detail: ultimoRegistro ? renderVariacionBadge(ultimoRegistro.variacionPerimetroCm, 'cm') : undefined,
          },
        ]}
      />

      {/* Tabla Longitudinal de Crecimiento */}
      <Panel
        title={`Mediciones por consulta (${registrosProcesados.length})`}
        subtitle="Tabla comparativa ordenada cronológicamente con variaciones absolutas entre controles sucesivos"

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
                  <th className="py-3 px-4 font-semibold text-right">IMC Calculado</th>
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


    </div>
  );
};

export default PediatricGrowthView;
