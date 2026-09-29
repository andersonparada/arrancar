import { formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Departamento } from '../../servicios/departamentos.api';

/** Lo que muestra la tarjeta del departamento además de código interno, ya con formato. */
export const detallesDeDepartamento = (registro: Departamento): DetalleDeRegistro[] => [
  { etiqueta: 'Nombre', valor: formatearTexto(registro.nombre) },
  { etiqueta: 'Localidad', valor: registro.localidadNombre ?? 'Sin localidad' },
];
