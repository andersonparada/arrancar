import { contadorDeCaracteres } from '@/modulos/core/utilidades/contador-de-caracteres';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  CargoDeContrasena,
  DatosDeContrasena,
  DocumentosDisponibles,
  NotaDisponible,
} from '../../servicios/tipos-de-contrasenas';
import { textoDeCentavos } from '../dinero';
import { centavosOCero, repartirEnVivo, type ResultadoDelReparto } from './reparto-de-contrasena';

export const MAXIMO_DE_OBSERVACIONES = 500;
export const MAXIMO_DE_DOCUMENTOS = 100;

/** Lo que se ve y se escribe al crear una contraseña; `cargos` y `notas` guardan los ids marcados. */
export interface EdicionDeContrasena {
  proveedorId: string;
  fecha: string;
  fechaDePago: string;
  /** El usuario escribió la fecha prometida: ya no se recalcula al marcar documentos. */
  fechaDePagoEscrita: boolean;
  observaciones: string;
  cargos: string[];
  notas: string[];
}

export const edicionDeContrasenaVacia = (hoy: string): EdicionDeContrasena => ({
  proveedorId: '',
  fecha: hoy,
  fechaDePago: hoy,
  fechaDePagoEscrita: false,
  observaciones: '',
  cargos: [],
  notas: [],
});

/** «A-123» o «123»: como se lee el documento en el papel. */
export const etiquetaDeDocumento = (documento: { serie: string | null; numero: string }): string =>
  documento.serie ? `${documento.serie}-${documento.numero}` : documento.numero;

export interface DocumentosMarcados {
  cargos: CargoDeContrasena[];
  notas: NotaDisponible[];
}

/** Los documentos marcados, tal como los ofreció el servidor. */
export function documentosMarcados(
  edicion: EdicionDeContrasena,
  disponibles: DocumentosDisponibles,
): DocumentosMarcados {
  return {
    cargos: disponibles.cargos.filter((cargo) => edicion.cargos.includes(cargo.documentoId)),
    notas: disponibles.notas.filter((nota) => edicion.notas.includes(nota.documentoId)),
  };
}

/** Alterna un id dentro de una lista de marcados, sin repetirlo. */
export const alternarMarca = (marcados: readonly string[], id: string): string[] =>
  marcados.includes(id) ? marcados.filter((marcado) => marcado !== id) : [...marcados, id];

/**
 * La fecha prometida que se propone: la mayor fecha de vencimiento de los cargos marcados; si es anterior a la fecha de
 * la contraseña, esta. Sin cargos marcados (o sin vencimientos), la que propuso el servidor.
 */
export function fechaDePagoSugerida(cargos: readonly CargoDeContrasena[], fecha: string, delServidor: string): string {
  const vencimientos = cargos.map((cargo) => cargo.vencimiento).filter((valor): valor is string => !!valor);
  if (vencimientos.length === 0) return delServidor >= fecha ? delServidor : fecha;
  const mayor = vencimientos.reduce((a, b) => (b > a ? b : a));
  return mayor >= fecha ? mayor : fecha;
}

export interface TotalesDeLaContrasena {
  total: string;
  retenciones: string;
  notasAplicadas: string;
  saldo: string;
}

const sumaDe = (montos: readonly string[]): number => montos.reduce((suma, monto) => suma + centavosOCero(monto), 0);

/** Totales de lo marcado, con el reparto de las notas ya descontado del saldo. */
export function totalesDeLaContrasena(
  marcados: DocumentosMarcados,
  reparto: ResultadoDelReparto,
): TotalesDeLaContrasena {
  const aplicado = reparto.aplicaciones.reduce((suma, aplicacion) => suma + aplicacion.centavos, 0);
  return {
    total: textoDeCentavos(sumaDe(marcados.cargos.map((cargo) => cargo.total))),
    retenciones: textoDeCentavos(sumaDe(marcados.cargos.map((cargo) => cargo.retenciones))),
    notasAplicadas: textoDeCentavos(aplicado),
    saldo: textoDeCentavos(Object.values(reparto.saldoPorCargo).reduce((suma, saldo) => suma + saldo, 0)),
  };
}

/** Una nota que compensaría un cargo que llega al umbral de bancarización. */
export function notasQueTocanBancarizacion(
  marcados: DocumentosMarcados,
  reparto: ResultadoDelReparto,
): NotaDisponible[] {
  const marcadas = new Set(
    marcados.cargos.filter((cargo) => cargo.sobreUmbralDeBancarizacion).map((c) => c.documentoId),
  );
  const ids = new Set(
    reparto.aplicaciones.filter((aplicacion) => marcadas.has(aplicacion.cargoId)).map((a) => a.notaId),
  );
  return marcados.notas.filter((nota) => ids.has(nota.documentoId));
}

function erroresDeLasFechas(edicion: EdicionDeContrasena, marcados: DocumentosMarcados, hoy: string) {
  const errores: Record<string, string> = {};
  const emision = [...marcados.cargos, ...marcados.notas].map((documento) => documento.fechaEmision);
  const masReciente = emision.reduce((mayor, fecha) => (fecha > mayor ? fecha : mayor), '');
  if (!edicion.fecha) errores.fecha = 'Escriba la fecha de la contraseña.';
  else if (edicion.fecha > hoy) errores.fecha = 'La fecha de la contraseña no puede ser futura.';
  else if (masReciente && edicion.fecha < masReciente) {
    errores.fecha =
      'La contraseña no puede ser anterior a la emisión de sus documentos. Use la fecha del más reciente o una posterior.';
  }
  if (!edicion.fechaDePago) errores.fechaDePago = 'Escriba la fecha en que prometió pagar.';
  else if (edicion.fecha && edicion.fechaDePago < edicion.fecha) {
    errores.fechaDePago = 'La fecha de pago no puede ser anterior a la fecha de la contraseña.';
  }
  return errores;
}

/** Errores por campo antes de molestar al servidor (la regla de la fecha de inicio la revisa el servidor). */
export function erroresDeContrasena(
  edicion: EdicionDeContrasena,
  disponibles: DocumentosDisponibles,
  hoy: string,
): Record<string, string> {
  const marcados = documentosMarcados(edicion, disponibles);
  const errores = erroresDeLasFechas(edicion, marcados, hoy);
  if (!edicion.proveedorId) errores.proveedorId = 'Escoja el proveedor.';
  if (marcados.cargos.length === 0) errores.documentos = 'Marque al menos una factura por pagar.';
  else if (marcados.cargos.length + marcados.notas.length > MAXIMO_DE_DOCUMENTOS) {
    errores.documentos = `Una contraseña lleva hasta ${MAXIMO_DE_DOCUMENTOS} documentos. Quite algunos y haga otra contraseña con el resto.`;
  } else if (
    centavosOCero(totalesDeLaContrasena(marcados, repartirEnVivo(marcados.cargos, marcados.notas)).saldo) <= 0
  ) {
    errores.documentos =
      'Las notas cubren todo lo marcado y no hay nada que pagar. Aplique las notas desde Notas de crédito.';
  }
  const observaciones = contadorDeCaracteres(edicion.observaciones, MAXIMO_DE_OBSERVACIONES).error;
  if (observaciones) errores.observaciones = observaciones;
  return errores;
}

/** El cuerpo de la solicitud; solo se llama con la edición ya validada. */
export function datosDeContrasena(edicion: EdicionDeContrasena): DatosDeContrasena {
  return {
    proveedorId: edicion.proveedorId,
    fecha: edicion.fecha,
    fechaDePago: edicion.fechaDePago,
    observaciones: edicion.observaciones.trim() || null,
    documentos: [...edicion.cargos, ...edicion.notas],
  };
}

/** Lo que va a pasar, para leerlo antes de confirmar. */
export function resumenDeContrasena(marcados: DocumentosMarcados, totales: TotalesDeLaContrasena): string {
  const cuantos = marcados.cargos.length + marcados.notas.length;
  const documentos = cuantos === 1 ? '1 documento' : `${cuantos} documentos`;
  const notas =
    centavosOCero(totales.notasAplicadas) > 0 ? `, con ${formatearMonto(totales.notasAplicadas)} de notas a favor` : '';
  return `Se creará una contraseña con ${documentos}${notas}. Se prometerá pagar ${formatearMonto(totales.saldo)}.`;
}
