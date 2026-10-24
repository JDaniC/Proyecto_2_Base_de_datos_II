import { UserRepository } from '../services/contracts';
import {
  UsuarioInstitucional,
  CrearUsuarioDTO,
  EstadoCuenta,
  InstitucionId,
  RolId,
  DefinicionRolInstitucional,
  DefinicionPermiso,
  PermisoId
} from '../services/types';
import { DEMO_ACCOUNTS } from './demoAccounts';

const LOCAL_STORAGE_USERS_KEY = 'clinica_usuarios_dataset_v1';
const LOCAL_STORAGE_ROLES_KEY = 'clinica_roles_dataset_v1';

const CATALOGO_PERMISOS: DefinicionPermiso[] = [
  {
    id: 'pacientes.administrar',
    categoria: 'PACIENTES',
    nombre: 'Gestión demográfica de pacientes',
    descripcion: 'Alta, búsqueda, actualización de datos de contacto y antecedentes clínicos de pacientes.',
    esCritico: false
  },
  {
    id: 'historial.leer',
    categoria: 'PACIENTES',
    nombre: 'Lectura de expediente clínico',
    descripcion: 'Acceso a la línea de tiempo, notas de evolución, signos vitales y prescripciones.',
    esCritico: false
  },
  {
    id: 'historial.archivar',
    categoria: 'PACIENTES',
    nombre: 'Archivar y reactivar expedientes',
    descripcion: 'Baja administrativa o reactivación de historiales clínicos con justificación y causa certificada.',
    esCritico: true
  },
  {
    id: 'citas.administrar',
    categoria: 'CLINICA',
    nombre: 'Agenda y gestión de citas',
    descripcion: 'Creación, reprogramación y cancelación de citas médicas y control de intervalos de atención.',
    esCritico: false
  },
  {
    id: 'consultas.registrar',
    categoria: 'CLINICA',
    nombre: 'Registro de consultas médicas',
    descripcion: 'Apertura de consultas, registro de signos vitales, evolución y versionado de rectificación.',
    esCritico: false
  },
  {
    id: 'diagnosticos.registrar',
    categoria: 'CLINICA',
    nombre: 'Codificación CIE-10 nosológica',
    descripcion: 'Asignación de diagnósticos principales y secundarios bajo el catálogo internacional CIE-10.',
    esCritico: false
  },
  {
    id: 'tratamientos.registrar',
    categoria: 'CLINICA',
    nombre: 'Planes terapéuticos y cuidados',
    descripcion: 'Registro de pautas terapéuticas, procedimientos en consultorio y recomendaciones médicas.',
    esCritico: false
  },
  {
    id: 'recetas.emitir',
    categoria: 'CLINICA',
    nombre: 'Prescripción de medicamentos',
    descripcion: 'Generación de recetas médicas estructuradas e impresión con firma digital certificada.',
    esCritico: false
  },
  {
    id: 'resultados.analizar',
    categoria: 'LABORATORIO',
    nombre: 'Consulta analítica de pruebas',
    descripcion: 'Acceso a órdenes de laboratorio, valores obtenidos y rangos biológicos de referencia.',
    esCritico: false
  },
  {
    id: 'resultados.validar',
    categoria: 'LABORATORIO',
    nombre: 'Validación clínica de resultados',
    descripcion: 'Certificación y firma pericial de resultados de laboratorio antes de entrega al paciente.',
    esCritico: true
  },
  {
    id: 'informes.emitir',
    categoria: 'LABORATORIO',
    nombre: 'Emisión de reportes e informes',
    descripcion: 'Publicación oficial de informes analíticos y diagnósticos complementarios.',
    esCritico: false
  },
  {
    id: 'cobros.administrar',
    categoria: 'ADMINISTRACION',
    nombre: 'Control de aranceles y cobros',
    descripcion: 'Gestión de facturación, copagos y registro contable de atenciones médicas.',
    esCritico: false
  },
  {
    id: 'inventario.administrar',
    categoria: 'ADMINISTRACION',
    nombre: 'Gestión de insumos y farmacia',
    descripcion: 'Control de existencias de reactivos, medicamentos y material quirúrgico.',
    esCritico: false
  },
  {
    id: 'usuarios.administrar',
    categoria: 'ADMINISTRACION',
    nombre: 'Administración de cuentas y accesos',
    descripcion: 'Aprovisionamiento de credenciales, asignación de roles y control de acceso institucional.',
    esCritico: true
  },
  {
    id: 'auditoria.leer',
    categoria: 'ADMINISTRACION',
    nombre: 'Registro de actividad',
    descripcion: 'Consulta de eventos de seguridad y cambios realizados en el sistema.',
    esCritico: true
  }
];

const ROLES_DEFAULT: DefinicionRolInstitucional[] = [
  {
    id: 'MEDICO',
    etiqueta: 'Médico Especialista',
    descripcion: 'Profesional clínico con potestad diagnóstica, prescripción de recetas y atención en consulta/hospitalización.',
    institucionesPermitidas: ['HOSPITAL_GENERAL', 'CLINICA_ODONTOLOGICA', 'CENTRO_PEDIATRICO', 'LABORATORIO_CLINICO'],
    permisos: [
      'pacientes.administrar',
      'historial.leer',
      'citas.administrar',
      'consultas.registrar',
      'diagnosticos.registrar',
      'tratamientos.registrar',
      'recetas.emitir',
      'resultados.analizar'
    ]
  },
  {
    id: 'SECRETARIA',
    etiqueta: 'Secretaría y Admisión',
    descripcion: 'Personal administrativo de recepción, alta de pacientes y agenda de citas (CA18: Sin acceso a notas clínicas ni prescripciones).',
    institucionesPermitidas: ['HOSPITAL_GENERAL', 'CLINICA_ODONTOLOGICA', 'CENTRO_PEDIATRICO', 'LABORATORIO_CLINICO'],
    permisos: [
      'pacientes.administrar',
      'citas.administrar'
    ]
  },
  {
    id: 'ADMIN_INSTITUCIONAL',
    etiqueta: 'Administrador Institucional',
    descripcion: 'Responsable técnico del aprovisionamiento de cuentas, asignación de permisos, catálogos y auditoría de seguridad.',
    institucionesPermitidas: ['HOSPITAL_GENERAL', 'CLINICA_ODONTOLOGICA', 'CENTRO_PEDIATRICO', 'LABORATORIO_CLINICO'],
    permisos: [
      'pacientes.administrar',
      'historial.archivar',
      'citas.administrar',
      'usuarios.administrar',
      'auditoria.leer',
      'inventario.administrar',
      'cobros.administrar'
    ]
  },
  {
    id: 'ODONTOLOGO',
    etiqueta: 'Odontólogo Especialista',
    descripcion: 'Profesional odontológico para odontograma, piezas dentales, procedimientos e intervenciones bucales.',
    institucionesPermitidas: ['CLINICA_ODONTOLOGICA', 'HOSPITAL_GENERAL'],
    permisos: [
      'pacientes.administrar',
      'historial.leer',
      'citas.administrar',
      'consultas.registrar',
      'diagnosticos.registrar',
      'tratamientos.registrar',
      'recetas.emitir'
    ]
  },
  {
    id: 'ANALISTA_LABORATORIO',
    etiqueta: 'Analista de Laboratorio',
    descripcion: 'Técnico laboratorista encargado del procesamiento de muestras, ingreso de mediciones analíticas y valores preliminares.',
    institucionesPermitidas: ['LABORATORIO_CLINICO', 'HOSPITAL_GENERAL'],
    permisos: [
      'historial.leer',
      'resultados.analizar'
    ]
  },
  {
    id: 'VALIDADOR_LABORATORIO',
    etiqueta: 'Validador Clínico de Laboratorio',
    descripcion: 'Especialista en bioquímica clínica responsable de certificar y validar resultados antes de emitir informes.',
    institucionesPermitidas: ['LABORATORIO_CLINICO', 'HOSPITAL_GENERAL'],
    permisos: [
      'historial.leer',
      'resultados.analizar',
      'resultados.validar',
      'informes.emitir'
    ]
  },
  {
    id: 'MEDICO_LABORATORIO',
    etiqueta: 'Médico de Laboratorio',
    descripcion: 'Patólogo o médico laboratorista con facultades de prescripción diagnóstica e interpretación clínica de análisis.',
    institucionesPermitidas: ['LABORATORIO_CLINICO', 'HOSPITAL_GENERAL'],
    permisos: [
      'pacientes.administrar',
      'historial.leer',
      'resultados.analizar',
      'resultados.validar',
      'informes.emitir'
    ]
  },
  {
    id: 'PEDIATRA',
    etiqueta: 'Pediatra Especialista',
    descripcion: 'Atención médica infanto-juvenil con curvas de crecimiento OMS, percentiles y esquema de vacunación pediátrica.',
    institucionesPermitidas: ['CENTRO_PEDIATRICO', 'HOSPITAL_GENERAL'],
    permisos: [
      'pacientes.administrar',
      'historial.leer',
      'citas.administrar',
      'consultas.registrar',
      'diagnosticos.registrar',
      'tratamientos.registrar',
      'recetas.emitir',
      'resultados.analizar'
    ]
  }
];

export class MockUserRepository implements UserRepository {
  private usuarios: UsuarioInstitucional[] = [];
  private roles: DefinicionRolInstitucional[] = [];

  constructor() {
    this.cargarUsuarios();
    this.cargarRoles();
  }

  private cargarRoles(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ROLES_KEY);
      if (raw) {
        this.roles = JSON.parse(raw);
        return;
      }
    } catch {
      // fallback
    }
    this.roles = JSON.parse(JSON.stringify(ROLES_DEFAULT));
  }

  private guardarRolesEnStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_ROLES_KEY, JSON.stringify(this.roles));
    } catch {
      // ignore
    }
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
      throw new Error('No se encontró el usuario. Actualiza la vista e inténtalo de nuevo.');
    }

    this.usuarios[index] = {
      ...this.usuarios[index],
      estado: nuevoEstado
    };

    this.guardarEnStorage();
    return this.usuarios[index];
  }

  async obtenerRolesInstitucionales(institucionId: InstitucionId): Promise<DefinicionRolInstitucional[]> {
    await new Promise((res) => setTimeout(res, 30));
    // Filtrar roles que aplican a la institución activa
    const rolesFiltrados = this.roles.filter((r) => r.institucionesPermitidas.includes(institucionId));
    // Calcular conteo dinámico de usuarios asignados
    return rolesFiltrados.map((rol) => {
      const usuariosEnRol = this.usuarios.filter(
        (u) => u.institucionId === institucionId && u.rolId === rol.id
      ).length;
      return {
        ...rol,
        totalUsuarios: usuariosEnRol
      };
    });
  }

  async obtenerCatalogoPermisos(): Promise<DefinicionPermiso[]> {
    await new Promise((res) => setTimeout(res, 20));
    return [...CATALOGO_PERMISOS];
  }

  async actualizarPermisosRol(
    institucionId: InstitucionId,
    rolId: RolId,
    permisos: PermisoId[]
  ): Promise<DefinicionRolInstitucional> {
    await new Promise((res) => setTimeout(res, 50));
    const index = this.roles.findIndex((r) => r.id === rolId);
    if (index === -1) {
      throw new Error(`Rol ${rolId} no reconocido en el sistema.`);
    }

    this.roles[index] = {
      ...this.roles[index],
      permisos: [...permisos]
    };
    this.guardarRolesEnStorage();

    const usuariosEnRol = this.usuarios.filter(
      (u) => u.institucionId === institucionId && u.rolId === rolId
    ).length;

    return {
      ...this.roles[index],
      totalUsuarios: usuariosEnRol
    };
  }
}
