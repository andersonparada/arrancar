import { textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type {
  ClaseDeCosto,
  ClaseDeCostoElegible,
  Costo,
  DatosDeCostoManual,
  OrigenDeCosto,
} from '../../servicios/costos.api';
import { centavosDeTexto, textoDeCentavos } from '../bandeja/montos-de-bandeja';

export const OPCIONES_DE_CLASE_DE_COSTO_MANUAL: Record<ClaseDeCostoElegible, string> = {
  adquisicion: 'Adquisición, aporte o donación',
  importacion: 'Importación',
  flete: 'Flete',
  instalacion: 'Instalación',
  construccion: 'Construcción',
  honorarios: 'Honorarios',
  desmantelamiento: 'Desmantelamiento',
  otro: 'Otro',
};

const CLASES_DE_COSTO: Record<ClaseDeCosto, string> = {
  ...OPCIONES_DE_CLASE_DE_COSTO_MANUAL,
  nota_de_credito: 'Nota de crédito',
  nota_de_debito: 'Nota de débito',
};

const ORIGENES: Record<OrigenDeCosto, string> = {
  linea_de_compra: 'Línea del libro de compras',
  manual: 'Escrito a mano',
  saldo_inicial: 'Saldo inicial',
};

export const nombreDeClaseDeCosto = (clase: ClaseDeCosto): string => CLASES_DE_COSTO[clase];

/** Lo que se escribe al registrar un costo a mano. */
export interface EdicionDeCosto {
  claseDeCosto: ClaseDeCostoElegible;
  fecha: string;
  monto: string | number;
  documentoDeSoporte: string;
  descripcion: string;
  aplicaAlLibroFiscal: boolean;
  motivoFueraDelLibroFiscal: string;
  noEsEdificacion: boolean;
}

/** El formulario vacío; `hoy` (`AAAA-MM-DD`) es la fecha que se propone. */
export const edicionDeCostoNueva = (hoy: string): EdicionDeCosto => ({
  claseDeCosto: 'adquisicion',
  fecha: hoy,
  monto: '',
  documentoDeSoporte: '',
  descripcion: '',
  aplicaAlLibroFiscal: true,
  motivoFueraDelLibroFiscal: '',
  noEsEdificacion: false,
});

/** Lo que falla antes de mandar, por campo y con cómo corregirlo; el servidor revisa igual. */
export function erroresDeCosto(edicion: EdicionDeCosto): Record<string, string> {
  const errores: Record<string, string> = {};
  const centavos = centavosDeTexto(edicion.monto);
  if (centavos === null || centavos <= 0) errores.monto = 'Escriba un monto mayor que cero, con hasta dos decimales.';
  if (!edicion.documentoDeSoporte.trim())
    errores.documentoDeSoporte = 'Escriba el documento que respalda el costo (por ejemplo: DUCA 26-0000123).';
  if (!edicion.aplicaAlLibroFiscal && !edicion.motivoFueraDelLibroFiscal.trim())
    errores.motivoFueraDelLibroFiscal = 'Diga por qué este costo no entra al libro fiscal.';
  return errores;
}

/** Lo que se manda al servidor: lo vacío como `null`, y el motivo solo si queda fuera del libro fiscal. */
export function datosDeCosto(edicion: EdicionDeCosto, esEdificio: boolean): DatosDeCostoManual {
  return {
    claseDeCosto: edicion.claseDeCosto,
    fecha: edicion.fecha,
    monto: String(edicion.monto).trim(),
    documentoDeSoporte: edicion.documentoDeSoporte.trim(),
    descripcion: textoONulo(edicion.descripcion),
    aplicaAlLibroFiscal: edicion.aplicaAlLibroFiscal,
    motivoFueraDelLibroFiscal: edicion.aplicaAlLibroFiscal ? null : textoONulo(edicion.motivoFueraDelLibroFiscal),
    noEsEdificacion: esEdificio && edicion.noEsEdificacion,
  };
}

/** De dónde viene el costo: el documento y proveedor del libro, o el soporte escrito. */
export function procedenciaDeCosto(costo: Costo): string {
  if (costo.origen === 'linea_de_compra')
    return [costo.documento, costo.proveedorNombre].filter(Boolean).join(' · ') || ORIGENES.linea_de_compra;
  return [ORIGENES[costo.origen], costo.documentoDeSoporte].filter(Boolean).join(' · ');
}

/** Los datos de un costo para su tarjeta, ya con formato. */
export function detallesDeCosto(costo: Costo): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Clase', valor: nombreDeClaseDeCosto(costo.claseDeCosto) },
    { etiqueta: 'Fecha', valor: formatearFecha(costo.fecha) },
    { etiqueta: 'Procedencia', valor: procedenciaDeCosto(costo), largo: true },
  ];
  if (costo.mejoraId)
    detalles.push({ etiqueta: 'Agrupado en', valor: 'Una mejora o costo posterior (pestaña Mejoras)', largo: true });
  if (costo.descripcion) detalles.push({ etiqueta: 'Descripción', valor: costo.descripcion, largo: true });
  if (!costo.aplicaAlLibroFiscal)
    detalles.push({ etiqueta: 'Fuera del libro fiscal', valor: costo.motivoFueraDelLibroFiscal ?? '', largo: true });
  if (costo.estado === 'anulado')
    detalles.push({ etiqueta: 'Anulado', valor: costo.motivoDeAnulacion ?? '', largo: true });
  return detalles;
}

/** El monto con su moneda; el de una nota de crédito sale negativo. */
export const montoDeCosto = (costo: Costo): string => formatearMonto(costo.monto);

/** El costo del activo después de anular `costo`, para decirlo antes de confirmar. */
export function totalTrasAnular(total: string, costo: Pick<Costo, 'monto'>): string {
  return textoDeCentavos((centavosDeTexto(total) ?? 0) - (centavosDeTexto(costo.monto) ?? 0));
}

/** Lo que pasará al anular un costo, para la confirmación: qué se anula, cómo queda el costo y qué ocurre con la línea. */
export function mensajeDeAnulacionDeCosto(costo: Costo, total: string): string {
  const base = `Se anula el costo de ${formatearMonto(costo.monto)} (${nombreDeClaseDeCosto(costo.claseDeCosto)}). `;
  const queda = `El costo del activo pasa de ${formatearMonto(total)} a ${formatearMonto(totalTrasAnular(total, costo))}. `;
  const linea =
    costo.origen === 'linea_de_compra'
      ? 'Esa parte de la línea del libro vuelve a quedar pendiente en «Por capitalizar». '
      : '';
  return `${base}${queda}${linea}El costo anulado queda en el historial con su motivo.`;
}
