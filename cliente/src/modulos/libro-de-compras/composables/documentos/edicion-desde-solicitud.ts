import { textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { LineaDeSolicitudDeDte, SolicitudDeDte } from '../../servicios/dte-recibidos.api';
import { edicionVacia, type EdicionDeDocumento } from './edicion-de-documento';
import { lineaVacia, type LineaEnEdicion } from './lineas-del-documento';
import { CODIGO_DE_RECIBO, TIPOS_SAT } from './tipos-de-documento-sat';

/** El código del selector: el de la SAT si lo trae; si solo trae la familia, el primero de ella (o `RECIBO`). */
function codigoDeLaSolicitud({ tipoDte, tipo }: Pick<SolicitudDeDte, 'tipoDte' | 'tipo'>): string {
  if (tipoDte) return tipoDte;
  if (tipo === 'recibo') return CODIGO_DE_RECIBO;
  return TIPOS_SAT.find((sat) => sat.familia === tipo)?.codigo ?? 'FACT';
}

/** Una línea propuesta por el servidor, tal como se escribe en el formulario; el concepto que falta queda por elegir. */
export function lineaDesdeSolicitud(linea: LineaDeSolicitudDeDte): LineaEnEdicion {
  const idp = Number(linea.idpEscrito ?? 0) > 0;
  return {
    ...lineaVacia(),
    conceptoId: linea.conceptoId,
    descripcion: textoDeEdicion(linea.descripcion),
    tipo: linea.tipo ?? 'bien',
    esActivoFijo: linea.esActivoFijo ?? false,
    esCombustible: linea.combustibleId !== null,
    combustibleId: linea.combustibleId,
    galones: textoDeEdicion(linea.galones),
    total: textoDeEdicion(linea.total),
    exento: textoDeEdicion(linea.exento),
    otrosImpuestos: textoDeEdicion(linea.otrosImpuestos),
    escribeIdp: idp,
    idpEscrito: idp ? textoDeEdicion(linea.idpEscrito) : '',
  };
}

/**
 * El formulario de registro lleno con la solicitud que el servidor propone para una fila de la bandeja de la SAT.
 * Lo que la solicitud no trae (proveedor, destino, concepto) queda vacío para que el usuario lo elija.
 */
export function edicionDesdeSolicitud(solicitud: SolicitudDeDte, hoy: Date): EdicionDeDocumento {
  return {
    ...edicionVacia(hoy),
    tipoDte: codigoDeLaSolicitud(solicitud),
    proveedorId: solicitud.proveedorId,
    destino: solicitud.destino,
    documentoAfectadoId: solicitud.documentoAfectadoId,
    claseDeCargo: solicitud.claseDeCargo ?? null,
    numero: solicitud.numero,
    serie: textoDeEdicion(solicitud.serie),
    fechaEmision: solicitud.fechaEmision.slice(0, 10),
    fechaRecepcion: textoDeEdicion(solicitud.fechaRecepcion),
    periodo: textoDeEdicion(solicitud.periodo).slice(0, 7),
    muestraEnReportesSat: solicitud.motivoFueraDelLibro === null,
    motivoFueraDelLibro: solicitud.motivoFueraDelLibro,
    nitEmisor: textoDeEdicion(solicitud.nitEmisor),
    autorizacionFel: textoDeEdicion(solicitud.autorizacionFel),
    nitReceptor: textoDeEdicion(solicitud.nitReceptor),
    noVinculado: solicitud.noVinculado,
    ivaDeLaFel: textoDeEdicion(solicitud.ivaDeLaFel),
    observaciones: textoDeEdicion(solicitud.observaciones),
    lineas: solicitud.lineas.length ? solicitud.lineas.map(lineaDesdeSolicitud) : [lineaVacia()],
  };
}

/** Lo que el servidor avisó de la fila y lo que el usuario debe completar antes de registrar. */
export function avisosDeLaPrecarga(solicitud: SolicitudDeDte, avisos: string[]): string[] {
  const propios: string[] = [];
  if (!solicitud.proveedorId) {
    propios.push(
      `El proveedor con NIT ${solicitud.nitEmisor ?? 'del DTE'} aún no está registrado: elíjalo en la lista o créelo en Proveedores.`,
    );
  }
  if (!solicitud.destino) propios.push('Elija el destino del documento.');
  if (solicitud.lineas.some(({ conceptoId }) => !conceptoId)) propios.push('Elija el concepto de cada línea.');
  return [...avisos, ...propios];
}
