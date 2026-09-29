/** Nombres de las ventanas y del menú del módulo de empresas. */

export const NOMBRE_EMPRESAS = 'Empresas';

export const VENTANAS_EMPRESAS = {
  empresas: {
    titulo: 'Empresas',
    descripcion: (cuenta: string) => `Ranchos y parcelas de la cuenta ${cuenta}.`,
  },
  tiposDeLocalidad: {
    titulo: 'Tipos de localidad',
    descripcion: 'Finca, planta, oficina…: las clases de localidad que usa la empresa.',
    nuevo: 'Nuevo tipo de localidad',
    editar: 'Editar tipo de localidad',
  },
  localidades: {
    titulo: 'Localidades',
    descripcion: 'Las localidades de la empresa.',
    nuevo: 'Nueva localidad',
    editar: 'Editar localidad',
  },
  departamentos: {
    titulo: 'Departamentos',
    descripcion: 'Los departamentos de la empresa.',
    nuevo: 'Nuevo departamento',
    editar: 'Editar departamento',
  },
  // generador: ventanas
} as const;
