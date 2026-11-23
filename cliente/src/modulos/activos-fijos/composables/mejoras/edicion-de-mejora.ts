import { numeroONulo, textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ClaseDeCostoElegible } from '../../servicios/costos.api';
import type { ClaseDeMejora, DatosDeMejora, Mejora } from '../../servicios/mejoras.api';
import { centavosDeTexto, textoDeCentavos } from '../bandeja/montos-de-bandeja';

export const OPCIONES_DE_CLASE_DE_MEJORA: Record<ClaseDeMejora, string> = {
  mejora: 'Mejora (alarga la vida o sube la capacidad)',
  costo_posterior: 'Costo posterior (flete atrasado, nota de crédito, ajuste)',
};

export const NOMBRES_DE_CLASE_DE_MEJORA: Record<ClaseDeMejora, string> = {
  mejora: 'Mejora',
  costo_posterior: 'Costo posterior',
};

/** Un costo de la mejora, escrito a mano; `clave` solo sirve para distinguir renglones en pantalla. */
export interface RenglonDeMejora {
  clave: number;
  claseDeCosto: ClaseDeCostoElegible;
  monto: string | number;
  documentoDeSoporte: string;
  descripcion: string;
  aplicaAlLibroFiscal: boolean;
  motivoFueraDelLibroFiscal: string;
}

/** Lo que se escribe al registrar una mejora o un costo posterior. */
export interface EdicionDeMejora {
  clase: ClaseDeMejora;
  fecha: string;
  descripcion: string;
  vidaUtilRestante: string | number;
  noEsEdificacion: boolean;
  /** Respuesta a «¿se puede separar y tiene vida propia?»; solo orienta, no se manda. */
  separable: boolean;
  renglones: RenglonDeMejora[];
}

export const renglonDeMejoraNuevo = (clave: number): RenglonDeMejora => ({
  clave,
  claseDeCosto: 'adquisicion',
  monto: '',
  documentoDeSoporte: '',
  descripcion: '',
  aplicaAlLibroFiscal: true,
  motivoFueraDelLibroFiscal: '',
});

/** El formulario vacío, con un renglón; `hoy` (`AAAA-MM-DD`) es la fecha que se propone. */
export const edicionDeMejoraNueva = (hoy: string): EdicionDeMejora => ({
  clase: 'mejora',
  fecha: hoy,
  descripcion: '',
  vidaUtilRestante: '',
  noEsEdificacion: false,
  separable: false,
  renglones: [renglonDeMejoraNuevo(1)],
});

/** La suma de los renglones con monto válido, en centavos. */
export const totalDeMejoraEnCentavos = (edicion: Pick<EdicionDeMejora, 'renglones'>): number =>
  edicion.renglones.reduce((suma, renglon) => suma + (centavosDeTexto(renglon.monto) ?? 0), 0);

/** `true` si hay que sugerir darlo de alta como componente: una mejora que se puede separar y tiene vida propia. */
export const sugiereComponente = (edicion: Pick<EdicionDeMejora, 'clase' | 'separable'>): boolean =>
  edicion.clase === 'mejora' && edicion.separable;

function errorDeMonto(clase: ClaseDeMejora, monto: string | number): string | undefined {
  const centavos = centavosDeTexto(monto);
  if (centavos === null) return 'Escriba el monto con hasta dos decimales.';
  if (clase === 'mejora' && centavos <= 0) return 'El monto de una mejora debe ser mayor que cero.';
  if (centavos === 0) return 'El monto no puede ser cero.';
  return undefined;
}

function erroresDeRenglon(clase: ClaseDeMejora, renglon: RenglonDeMejora, indice: number): Record<string, string> {
  const errores: Record<string, string> = {};
  const prefijo = `costosManuales.${indice}`;
  const monto = errorDeMonto(clase, renglon.monto);
  if (monto) errores[`${prefijo}.monto`] = monto;
  if (!renglon.documentoDeSoporte.trim())
    errores[`${prefijo}.documentoDeSoporte`] = 'Escriba el documento que respalda el costo (por ejemplo: factura 123).';
  if (!renglon.aplicaAlLibroFiscal && !renglon.motivoFueraDelLibroFiscal.trim())
    errores[`${prefijo}.motivoFueraDelLibroFiscal`] = 'Diga por qué este costo no entra al libro fiscal.';
  return errores;
}

/** Lo que falla antes de mandar, por campo y con cómo corregirlo; el servidor revisa igual. */
export function erroresDeMejora(edicion: EdicionDeMejora): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.descripcion.trim()) errores.descripcion = 'Describa qué se hizo (por ejemplo: «Cambio de techo»).';
  if (!edicion.fecha) errores.fecha = 'Elija la fecha de la mejora.';
  const vida = numeroONulo(edicion.vidaUtilRestante);
  if (vida !== null && (!Number.isInteger(vida) || vida < 1 || vida > 1200))
    errores.vidaUtilRestanteContableMeses = 'Escriba los meses que le quedan, de 1 a 1200, o déjelo vacío.';
  if (edicion.renglones.length === 0) errores.costosManuales = 'Agregue al menos un costo.';
  edicion.renglones.forEach((renglon, indice) =>
    Object.assign(errores, erroresDeRenglon(edicion.clase, renglon, indice)),
  );
  return errores;
}

/** Lo que se manda al servidor: lo vacío como `null`; la vida solo en una mejora y «no es edificación» solo en edificios. */
export function datosDeMejora(activoId: string, edicion: EdicionDeMejora, esEdificio: boolean): DatosDeMejora {
  const vida = edicion.clase === 'mejora' ? numeroONulo(edicion.vidaUtilRestante) : null;
  return {
    activoId,
    clase: edicion.clase,
    fecha: edicion.fecha,
    descripcion: edicion.descripcion.trim(),
    vidaUtilRestanteContableMeses: vida,
    noEsEdificacion: esEdificio && edicion.noEsEdificacion,
    costosManuales: edicion.renglones.map((renglon) => ({
      claseDeCosto: renglon.claseDeCosto,
      monto: String(renglon.monto).trim(),
      documentoDeSoporte: renglon.documentoDeSoporte.trim(),
      descripcion: textoONulo(renglon.descripcion),
      aplicaAlLibroFiscal: renglon.aplicaAlLibroFiscal,
      motivoFueraDelLibroFiscal: renglon.aplicaAlLibroFiscal ? null : textoONulo(renglon.motivoFueraDelLibroFiscal),
    })),
  };
}

/** Lo que pasará al registrar, para confirmar: cuánto se suma al costo y qué cambia en la depreciación. */
export function mensajeDeRegistroDeMejora(edicion: EdicionDeMejora, costoActual: string): string {
  const total = totalDeMejoraEnCentavos(edicion);
  const nuevo = textoDeCentavos((centavosDeTexto(costoActual) ?? 0) + total);
  const que = edicion.clase === 'mejora' ? 'una mejora' : 'un costo posterior';
  const vida =
    edicion.clase === 'mejora' && numeroONulo(edicion.vidaUtilRestante) !== null
      ? ` La vida útil contable que le queda pasa a ${numeroONulo(edicion.vidaUtilRestante)} meses.`
      : '';
  return (
    `Se registra ${que} de ${formatearMonto(textoDeCentavos(total))}. El costo del activo pasa de ` +
    `${formatearMonto(costoActual)} a ${formatearMonto(nuevo)}.${vida} La depreciación cambia desde el mes de la ` +
    'fecha indicada, sin tocar los meses ya cerrados.'
  );
}

/** La ruta del alta de un activo con la mejora ya escrita: el componente nace con su principal y su descripción. */
export const consultaDeComponente = (activoId: string, descripcion: string): Record<string, string> => ({
  padre: activoId,
  ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
});

/** Lo que pasará al anular una mejora, para la confirmación. */
export function mensajeDeAnulacionDeMejora(mejora: Mejora): string {
  return (
    `Se anula ${mejora.clase === 'mejora' ? 'la mejora' : 'el costo posterior'} «${mejora.descripcion}» por ` +
    `${formatearMonto(mejora.monto)} y sus costos. Solo se puede si es el último cambio de la depreciación del ` +
    'activo y ningún cierre de depreciación usó sus tramos; la depreciación vuelve a los tramos anteriores. ' +
    'Queda en el historial con su motivo.'
  );
}
