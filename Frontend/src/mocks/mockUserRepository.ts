import { UserRepository } from '../services/contracts';
import {
  UsuarioInstitucional,
  CrearUsuarioDTO,
  EstadoCuenta,
  InstitucionId,
  RolId
} from '../services/types';
import { DEMO_ACCOUNTS } from './demoAccounts';

const LOCAL_STORAGE_USERS_KEY = 'clinica_usuarios_dataset_v1';

export class MockUserRepository implements UserRepository {
  private usuarios: UsuarioInstitucional[] = [];

  constructor() {
    this.cargarUsuarios();
  }

  private cargarUsuarios(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (raw) {
        this.usuarios = JSON.parse(raw);
        return;
      }
    } catch {
      // fallback
    }

    // Inicializar desde DEMO_ACCOUNTS + cuentas sintéticas en varios estados
    this.usuarios = DEMO_ACCOUNTS.map((c, index) => ({
      id: `usr-${index + 1}`,
      institucionId: c.institucionId,
      nombreCompleto: c.nombre,
      email: c.email,
      rolId: c.rolId,
      rolEtiqueta: c.rolEtiqueta,
      estado: c.estado,
      authUid: `firebase-uid-${c.id}`,
      profesionalVinculado: c.nombre.includes('Dr') || c.nombre.includes('Dra') ? c.nombre : undefined,
      fechaCreacion: '2026-01-15T08:00:00Z',
      ultimoAcceso: '2026-10-18T14:20:00Z'
    }));

    // Agregar algunos usuarios en estado PENDIENTE e INACTIVO para probar la máquina de estados de V15
    this.usuarios.push(
      {
        id: 'usr-hosp-pend-01',
        institucionId: 'HOSPITAL_GENERAL',
        nombreCompleto: 'Dr. Alejandro Soto Gómez',
        email: 'alejandro.soto@hospital-general.salud.gt',
        rolId: 'MEDICO',
        rolEtiqueta: 'Médico Residente',
        estado: 'PENDIENTE',
        authUid: 'firebase-uid-usr-pend-01',
        profesionalVinculado: 'Dr. Alejandro Soto Gómez (Col. 14209)',
        fechaCreacion: '2026-10-10T11:00:00Z'
      },
      {
        id: 'usr-hosp-inact-01',
        institucionId: 'HOSPITAL_GENERAL',
        nombreCompleto: 'Licda. Karen Marroquín',
        email: 'karen.marroquin@hospital-general.salud.gt',
        rolId: 'SECRETARIA',
        rolEtiqueta: 'Secretaría de Admisión (Baja Temporal)',
        estado: 'INACTIVO',
        authUid: 'firebase-uid-usr-inact-01',
        fechaCreacion: '2025-06-20T09:30:00Z',
        ultimoAcceso: '2026-09-01T12:00:00Z'
      }
    );

    this.guardarEnStorage();
  }

  private guardarEnStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(this.usuarios));
    } catch {
      // ignore
    }
  }

  async listarUsuarios(institucionId: InstitucionId): Promise<UsuarioInstitucional[]> {
    await new Promise((res) => setTimeout(res, 40));
    return this.usuarios.filter((u) => u.institucionId === institucionId);
  }

  async crearUsuario(institucionId: InstitucionId, dto: CrearUsuarioDTO): Promise<UsuarioInstitucional> {
    await new Promise((res) => setTimeout(res, 50));

    // Validación de duplicidad de correo
    const existe = this.usuarios.find(
      (u) => u.institucionId === institucionId && u.email.toLowerCase() === dto.email.toLowerCase()
    );
    if (existe) {
      throw new Error(`Ya existe un usuario institucional registrado con el correo ${dto.email}.`);
    }

    const rolEtiquetas: Record<RolId, string> = {
      MEDICO: 'Médico Especialista',
      SECRETARIA: 'Secretaría de Admisión',
      ADMIN_INSTITUCIONAL: 'Administrador Institucional',
      ODONTOLOGO: 'Odontólogo Especialista',
      ANALISTA_LABORATORIO: 'Analista de Laboratorio',
      VALIDADOR_LABORATORIO: 'Validador Clínico',
      MEDICO_LABORATORIO: 'Médico de Laboratorio',
      PEDIATRA: 'Pediatra Especialista'
    };

    const nuevoId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nuevo: UsuarioInstitucional = {
      id: nuevoId,
      institucionId,
      nombreCompleto: dto.nombreCompleto.trim(),
      email: dto.email.trim().toLowerCase(),
      rolId: dto.rolId,
      rolEtiqueta: rolEtiquetas[dto.rolId] || 'Personal Institucional',
      estado: dto.estado,
      authUid: `auth-uid-${Math.random().toString(36).substring(2, 10)}`,
      profesionalVinculado: dto.profesionalVinculado?.trim() || undefined,
      fechaCreacion: new Date().toISOString()
    };

    this.usuarios.unshift(nuevo);
    this.guardarEnStorage();
    return nuevo;
  }

  async cambiarEstado(
    institucionId: InstitucionId,
    usuarioId: string,
    nuevoEstado: EstadoCuenta
  ): Promise<UsuarioInstitucional> {
    await new Promise((res) => setTimeout(res, 40));
    const index = this.usuarios.findIndex(
      (u) => u.id === usuarioId && u.institucionId === institucionId
    );
    if (index === -1) {
      throw new Error(`Usuario ${usuarioId} no encontrado en la institución.`);
    }

    this.usuarios[index] = {
      ...this.usuarios[index],
      estado: nuevoEstado
    };

    this.guardarEnStorage();
    return this.usuarios[index];
  }
}
