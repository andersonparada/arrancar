import { seccionesParaEnviar } from '@/modulos/core/secciones/secciones-aportadas';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { DatosEmpresa, Empresa } from '../servicios/empresas.api';
import { DATOS_DE_EMPRESA_VACIOS, type CamposDeDatosDeEmpresa } from './datos-de-empresa';

export interface EdicionDeEmpresa extends CamposDeDatosDeEmpresa {
  abierta: boolean;
  empresaId: string | null;
  nombre: string;
  nit: string;
  direccion: string;
  telefono: string;
  correo: string;
  /** El NIT con el que se abrió la ventana (sin guion); vacío si la empresa no tenía. */
  nitOriginal: string;
  /** Por qué se quita o cambia el NIT; solo se envía en ese caso. */
  motivoDelNit: string;
  activa: boolean;
  /** Lo que los módulos activos aportan al formulario; cada sección lo llena sola. */
  secciones: Record<string, unknown>;
}

const EMPRESA_NUEVA = {
  ...DATOS_DE_EMPRESA_VACIOS,
  empresaId: null,
  nombre: '',
  nit: '',
  direccion: '',
  telefono: '',
  correo: '',
  nitOriginal: '',
  motivoDelNit: '',
  activa: true,
  secciones: {},
};

/** El NIT sin guiones ni espacios y en mayúscula, como lo guarda el servidor. */
export const normalizarNit = (nit: string | null | undefined): string =>
  (nit ?? '').replace(/[\s-]/g, '').toUpperCase();

/** Quitar o reemplazar un NIT que ya existía (agregarlo la primera vez no pide motivo). */
export const cambiaElNitExistente = (edicion: EdicionDeEmpresa): boolean =>
  edicion.nitOriginal !== '' && normalizarNit(edicion.nit) !== edicion.nitOriginal;

/** Con NIT y sin `empresas.nit.corregir`, el campo no se puede tocar. */
export const nitBloqueado = (edicion: EdicionDeEmpresa, puedeCorregir: boolean): boolean =>
  edicion.nitOriginal !== '' && !puedeCorregir;

const CODIGO_SIN_MOTIVO = 'motivo_del_cambio_de_nit_requerido';

/** El servidor pide el motivo sin señalar campo: se marca el del motivo para que el aviso quede junto a él. */
export function senalarElMotivo(error: unknown): unknown {
  if (!(error instanceof ErrorApi) || error.codigo !== CODIGO_SIN_MOTIVO) return error;
  return new ErrorApi(error.estado, {
    codigo: error.codigo,
    mensaje: error.message,
    detalles: { campo: 'motivoDelNit' },
  });
}

const datosDe = (empresa: Empresa) => ({
  ...DATOS_DE_EMPRESA_VACIOS,
  empresaId: empresa.id,
  nombre: empresa.nombre,
  nit: empresa.nit ?? '',
  direccion: empresa.direccion ?? '',
  telefono: empresa.telefono ?? '',
  correo: empresa.correo ?? '',
  nitOriginal: normalizarNit(empresa.nit),
  motivoDelNit: '',
  activa: empresa.activa,
  secciones: {},
});

/** La ventana abierta con los datos de la empresa, o vacía si es nueva. */
export const edicionDe = (empresa?: Empresa): EdicionDeEmpresa => ({
  ...(empresa ? datosDe(empresa) : EMPRESA_NUEVA),
  abierta: true,
});

/** Lo que queda vacío se guarda como nada. */
export const datosDeLaEmpresa = (edicion: EdicionDeEmpresa): DatosEmpresa => ({
  nombre: edicion.nombre,
  nit: edicion.nit || null,
  direccion: edicion.direccion || null,
  telefono: edicion.telefono || null,
  correo: edicion.correo || null,
  activa: edicion.activa,
  motivoDelNit: cambiaElNitExistente(edicion) ? edicion.motivoDelNit.trim() : null,
  secciones: seccionesParaEnviar(edicion.secciones),
});
