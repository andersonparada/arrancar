import { contadorDeCaracteres } from '@/modulos/core/utilidades/contador-de-caracteres';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { NotaParaLigar, ParaPagar } from '../../servicios/tipos-de-pagos';
import { centavosDe, textoDeCentavos } from '../dinero';
import {
  cargosIncluidos,
  lineasDelPago,
  MAXIMO_DE_REFERENCIA,
  MAXIMO_DEL_MOTIVO_DEL_PAGO,
  totalDelPago,
  type EdicionDePago,
  type LineaDelPago,
} from './edicion-de-pago';
import { errorDeLaFecha, notaElegida } from './fechas-del-pago';

export interface ContextoDeErrores {
  datos: ParaPagar;
  notas: readonly NotaParaLigar[];
  hoy: string;
}

type Errores = Record<string, string>;

/** El error del monto escrito a un cargo, o `null`: vacío o cero es «no pagar este documento». */
function errorDelMonto(texto: string, saldo: string): string | null {
  if (texto.trim() === '') return null;
  const centavos = centavosDe(texto);
  if (centavos === null) return 'Escriba el monto con hasta dos decimales, por ejemplo 1250.50.';
  if (centavos > (centavosDe(saldo) ?? 0))
    return `Este documento solo debe ${formatearMonto(saldo)}: escriba ese monto o menos.`;
  return null;
}

function erroresDeLosMontos(edicion: EdicionDePago, datos: ParaPagar): Errores {
  const errores: Errores = {};
  for (const cargo of cargosIncluidos(edicion, datos)) {
    const error = errorDelMonto(edicion.montos[cargo.id] ?? '', cargo.saldo);
    if (error) errores[`monto.${cargo.id}`] = error;
  }
  return errores;
}

function errorDeLaNota(total: number, nota: NotaParaLigar | null): string | null {
  if (!nota) return 'Escoja la nota de débito que ya está registrada en Bancos.';
  const disponible = centavosDe(nota.disponible) ?? 0;
  return total > disponible
    ? `A la nota solo le quedan ${formatearMonto(nota.disponible)} por aplicar: baje el total del pago o escoja otra nota.`
    : null;
}

const MEDIOS_FALTANTES: Record<EdicionDePago['forma'], string | null> = {
  cheque: 'Escoja la chequera con la que va a pagar.',
  nota_de_debito: 'Escoja la cuenta bancaria que se va a debitar.',
  nota_ligada: null,
  cuenta_de_apertura: null,
};

function erroresDelMedio(
  edicion: EdicionDePago,
  lineas: readonly LineaDelPago[],
  contexto: ContextoDeErrores,
): Errores {
  const faltante = MEDIOS_FALTANTES[edicion.forma];
  if (faltante && !edicion.medio) return { medio: faltante };
  if (edicion.forma !== 'nota_ligada') return {};
  const error = errorDeLaNota(totalDelPago(lineas), notaElegida(edicion, contexto.notas));
  return error ? { movimientoId: error } : {};
}

function erroresDeTextos(edicion: EdicionDePago): Errores {
  const errores: Errores = {};
  if (edicion.forma === 'cuenta_de_apertura') {
    if (!edicion.motivo.trim())
      errores.motivo = 'Cuente por qué se da por pagado: ya estaba pagado antes de la fecha de inicio.';
    else if (edicion.motivo.trim().length > MAXIMO_DEL_MOTIVO_DEL_PAGO) {
      errores.motivo = `Acórtelo a ${MAXIMO_DEL_MOTIVO_DEL_PAGO} caracteres o menos.`;
    }
  }
  const referencia = contadorDeCaracteres(edicion.referencia, MAXIMO_DE_REFERENCIA).error;
  if (referencia) errores.referencia = referencia;
  return errores;
}

/** Sin nombre del NIT no se puede emitir el cheque ni la nota: se dice cómo corregirlo. */
function errorDelBeneficiario(edicion: EdicionDePago, datos: ParaPagar): Errores {
  const aNombreDelNit = edicion.forma === 'cheque' || edicion.forma === 'nota_de_debito';
  if (!aNombreDelNit || datos.beneficiario) return {};
  return { proveedorId: 'Escriba la razón social del proveedor en Terceros: el cheque va a nombre del NIT.' };
}

/** Los errores por campo antes de molestar al servidor; vacío si todo está bien. */
export function erroresDelPago(edicion: EdicionDePago, contexto: ContextoDeErrores): Errores {
  const { datos, hoy, notas } = contexto;
  if (!edicion.proveedorId) return { proveedorId: 'Escoja el proveedor al que va a pagar.' };
  const lineas = lineasDelPago(edicion, datos);
  const errores: Errores = { ...errorDelBeneficiario(edicion, datos), ...erroresDeLosMontos(edicion, datos) };
  if (lineas.length === 0 && Object.keys(errores).length === 0) {
    errores.aplicaciones = 'Escriba el monto de al menos un documento para poder pagar.';
  }
  const fecha = errorDeLaFecha(edicion, { hoy, datos, lineas, nota: notaElegida(edicion, notas) });
  if (fecha) errores.fecha = fecha;
  return { ...errores, ...erroresDelMedio(edicion, lineas, contexto), ...erroresDeTextos(edicion) };
}

const CAMPOS_DEL_MEDIO = new Set(['chequeraId', 'chequeId', 'cuentaBancariaId']);

/** Pasa los campos del servidor (`aplicaciones.2.monto`, `chequeraId`…) a los de la pantalla (`monto.<id del cargo>`, `medio`). */
export function repartirErroresDelServidor(errores: Errores, lineas: readonly LineaDelPago[]): Errores {
  const resultado: Errores = {};
  for (const [campo, mensaje] of Object.entries(errores)) {
    const linea = /^aplicaciones\.(\d+)\.(monto|cargoId)$/.exec(campo);
    if (linea) resultado[`monto.${lineas[Number(linea[1])]?.cargo.id ?? ''}`] = mensaje;
    else if (CAMPOS_DEL_MEDIO.has(campo)) resultado.medio = mensaje;
    else resultado[campo.startsWith('diferencias') ? 'diferencias' : campo] = mensaje;
  }
  return resultado;
}

/** «Q1,250.00» del total, para los textos de la pantalla. */
export const montoDeCentavos = (centavos: number): string => formatearMonto(textoDeCentavos(centavos));
