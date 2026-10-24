import React, { useState } from 'react';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { AgregarDiagnosticoModal } from './AgregarDiagnosticoModal';
import { DiagnosticoHistorial } from '../../services/types';

interface DiagnosticosTratamientosViewProps {
  pacienteId: string;
  diagnosticos: DiagnosticoHistorial[];
  onDiagnosticosActualizados: (nuevos: DiagnosticoHistorial[]) => void;
  esArchivado?: boolean;
}

export const DiagnosticosTratamientosView: React.FC<DiagnosticosTratamientosViewProps> = ({
  pacienteId,
  diagnosticos,
  onDiagnosticosActualizados,
  esArchivado = false
}) => {
  const [showAgregarModal, setShowAgregarModal] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'PRINCIPAL' | 'SECUNDARIO'>('TODOS');

  const diagnosticoPrincipal = diagnosticos.find((d) => d.esPrincipal);

  const filtrados = diagnosticos.filter((d) => {
    const coincideTexto =
      d.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      d.codigoCIE.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      d.registradoPor.toLowerCase().includes(filtroTexto.toLowerCase());

    if (!coincideTexto) return false;

    if (filtroTipo === 'PRINCIPAL') return d.esPrincipal;
    if (filtroTipo === 'SECUNDARIO') return !d.esPrincipal;
    return true;
  });

  const handleDiagnosticoAgregado = (nuevo: DiagnosticoHistorial) => {
    let listaActualizada: DiagnosticoHistorial[];
    if (nuevo.esPrincipal) {
      listaActualizada = diagnosticos.map((d) => ({
        ...d,
        esPrincipal: false
      }));
      listaActualizada.unshift(nuevo);
    } else {
      listaActualizada = [nuevo, ...diagnosticos];
    }
    onDiagnosticosActualizados(listaActualizada);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Banner de Diagnóstico Principal Obligatorio */}
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderLeft: '4px solid var(--color-primary)',
          borderRadius: 'var(--radius-panel)',
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Diagnóstico Principal Vigente
            </span>
            <Badge variant="primary">Principal</Badge>
          </div>
          {diagnosticoPrincipal ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <code
                style={{
                  backgroundColor: 'var(--color-panel)',
                  border: '1px solid var(--color-border)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '15px',
                  color: 'var(--color-primary)'
                }}
              >
                {diagnosticoPrincipal.codigoCIE}
              </code>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {diagnosticoPrincipal.nombre}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                · Registrado por {diagnosticoPrincipal.registradoPor} el {diagnosticoPrincipal.fechaRegistro}
              </span>
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              Sin diagnóstico principal asignado actualmente.
            </div>
          )}
        </div>

        {!esArchivado && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAgregarModal(true)}
            leftIcon={<PlusCircle size={15} />}
          >
            Registrar Diagnóstico CIE-10
          </Button>
        )}
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <Panel
        title="Historial Diagnóstico Codificado CIE-10 y Tratamientos"
        subtitle="Registro nosológico institucional con control de diagnóstico principal único"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-secondary)'
                }}
              />
              <input
                type="text"
                placeholder="Filtrar por CIE-10, patología o profesional..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  backgroundColor: 'var(--color-control)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={15} color="var(--color-text-secondary)" />
              <button
                type="button"
                onClick={() => setFiltroTipo('TODOS')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: filtroTipo === 'TODOS' ? 700 : 500,
                  backgroundColor: filtroTipo === 'TODOS' ? 'var(--color-selection)' : 'transparent',
                  color: filtroTipo === 'TODOS' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: '1px solid',
                  borderColor: filtroTipo === 'TODOS' ? 'var(--color-primary)' : 'var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Todos ({diagnosticos.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('PRINCIPAL')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: filtroTipo === 'PRINCIPAL' ? 700 : 500,
                  backgroundColor: filtroTipo === 'PRINCIPAL' ? 'var(--color-selection)' : 'transparent',
                  color: filtroTipo === 'PRINCIPAL' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: '1px solid',
                  borderColor: filtroTipo === 'PRINCIPAL' ? 'var(--color-primary)' : 'var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Principal
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('SECUNDARIO')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: filtroTipo === 'SECUNDARIO' ? 700 : 500,
                  backgroundColor: filtroTipo === 'SECUNDARIO' ? 'var(--color-selection)' : 'transparent',
                  color: filtroTipo === 'SECUNDARIO' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: '1px solid',
                  borderColor: filtroTipo === 'SECUNDARIO' ? 'var(--color-primary)' : 'var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Secundarios
              </button>
            </div>
          </div>

          {/* Tabla de Diagnósticos */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>CIE-10</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Descripción Nosológica</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Fecha Registro</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Profesional Responsable</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No se encontraron diagnósticos registrados con los filtros especificados.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((d) => (
                    <tr
                      key={d.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: d.esPrincipal ? 'rgba(16, 185, 129, 0.04)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {d.codigoCIE}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-strong)' }}>
                        {d.nombre}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge variant={d.esPrincipal ? 'primary' : 'neutral'}>
                          {d.esPrincipal ? 'Principal' : 'Secundario'}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                        {d.fechaRegistro}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text)' }}>
                        {d.registradoPor}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      {/* Modal para agregar diagnóstico */}
      {showAgregarModal && (
        <AgregarDiagnosticoModal
          isOpen={showAgregarModal}
          onClose={() => setShowAgregarModal(false)}
          pacienteId={pacienteId}
          diagnosticosActuales={diagnosticos}
          onDiagnosticoAgregado={handleDiagnosticoAgregado}
        />
      )}
    </div>
  );
};
