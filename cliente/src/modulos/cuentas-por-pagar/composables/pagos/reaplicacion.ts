import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  CargoParaPagar,
  FichaDePago,
  LineaSolicitada,
  ParaPagar,
  SolicitudDeReaplicacion,
} from '../../servicios/tipos-de-pagos';
import { tituloDeDocumento } from '../detalles-de-documento';
import { centavosDe, textoDeCentavos } from '../dinero';
import { MAXIMO_DEL_MOTIVO_DEL_PAGO } from './edicion-de-pago';

/** Un cargo al que se puede mandar el pago: de qué contraseña es, cuánto cubre hoy y hasta cuánto admite. */
export interface CandidatoDeReaplicacion {
  id: string;
  titulo: string;
  contrasenaNumero: string;
  /** Lo que este pago le entrega hoy, en centavos. */
  actual: number;
  /** Lo máximo que admite sin contar este pago, en centavos. */
  disponible: number;
}

/** Lo que se escribe en la ventana: los montos por cargo y el motivo. */
export interface EdicionDeReaplicacion {
  abierta: boolean;
  montos: Record<string, string>;
  motivo: string;
}

export const edicionDeReaplicacionVacia = (): EdicionDeReaplicacion => ({ abierta: false, montos: {}, motivo: '' });

const centavos = (texto: string): number => centavosDe(texto) ?? 0;

/** Los cargos que el pago ya cubre: lo disponible es su saldo de hoy más lo que este pago le entrega. */
function candidatosDeLasLineas(ficha: FichaDePago): CandidatoDeReaplicacion[] {
  return ficha.aplicaciones.map((linea) => ({
    id: linea.documentoId,
    titulo: tituloDeDocumento(linea),
    contrasenaNumero: linea.contrasena.numero,
    actual: centavos(linea.monto),
    disponible: centavos(linea.saldoDelDocumento) + centavos(linea.monto),
  }));
}

const candidatoDeCargo = (cargo: CargoParaPagar, numeros: Map<string, string>): CandidatoDeReaplicacion => ({
  id: cargo.id,
  titulo: tituloDeDocumento(cargo),
  contrasenaNumero: numeros.get(cargo.contrasenaId) ?? '',
  actual: 0,
  disponible: centavos(cargo.saldo),
});

/**
 * Los cargos de las contraseñas vigentes del proveedor a los que se puede mandar el pago: primero los que ya cubre y
 * después los demás autorizados con saldo (el servidor es quien decide; esto solo ordena y sugiere el tope). En la cuenta
 * de apertura solo entran saldos iniciales.
 */
export function candidatosDeReaplicacion(ficha: FichaDePago, datos: ParaPagar): CandidatoDeReaplicacion[] {
  const propios = candidatosDeLasLineas(ficha);
  const yaEstan = new Set(propios.map(({ id }) => id));
  const numeros = new Map(datos.contrasenas.map(({ id, numero }) => [id, numero]));
  const otros = datos.cargos
    .filter((cargo) => !yaEstan.has(cargo.id))
    .filter((cargo) => ficha.forma !== 'cuenta_de_apertura' || cargo.origen === 'saldo_inicial')
    .map((cargo) => candidatoDeCargo(cargo, numeros));
  return [...propios, ...otros];
}

/** Al abrir: cada cargo con lo que el pago le entrega hoy; los demás, vacíos. */
export function edicionDeReaplicacionDe(candidatos: readonly CandidatoDeReaplicacion[]): EdicionDeReaplicacion {
  const montos = Object.fromEntries(
    candidatos.map(({ id, actual }) => [id, actual > 0 ? textoDeCentavos(actual) : '']),
  );
  return { abierta: true, montos, motivo: '' };
}

/** Lo repartido hasta ahora, en centavos (lo que no es un importe válido cuenta cero). */
export const totalReaplicado = (edicion: EdicionDeReaplicacion): number =>
  Object.values(edicion.montos).reduce((suma, texto) => suma + (centavosDe(texto) ?? 0), 0);

/** Cuánto falta (positivo) o sobra (negativo) para igualar el monto del pago, en centavos. */
export const faltanteDeReaplicacion = (edicion: EdicionDeReaplicacion, ficha: Pick<FichaDePago, 'monto'>): number =>
  centavos(ficha.monto) - totalReaplicado(edicion);

/** «Faltan Q10.00 para llegar a Q100.00» / «Sobran…» / «La suma cuadra»; para decirlo mientras se escribe. */
export function textoDeLaSuma(edicion: EdicionDeReaplicacion, ficha: Pick<FichaDePago, 'monto'>): string {
  const falta = faltanteDeReaplicacion(edicion, ficha);
  const monto = formatearMonto(ficha.monto);
  if (falta === 0) return `La suma cuadra con el pago: ${monto}.`;
  const diferencia = formatearMonto(textoDeCentavos(Math.abs(falta)));
  return falta > 0 ? `Faltan ${diferencia} para llegar a ${monto}.` : `Sobran ${diferencia} sobre ${monto}.`;
}

type Errores = Record<string, string>;

function errorDelMontoReaplicado(texto: string, candidato: CandidatoDeReaplicacion): string | null {
  if (texto.trim() === '') return null;
  const valor = centavosDe(texto);
  if (valor === null) return 'Escriba el monto con hasta dos decimales, por ejemplo 1250.50.';
  if (valor > candidato.disponible)
    return `Este documento admite hasta ${formatearMonto(textoDeCentavos(candidato.disponible))} sin contar este pago.`;
  return null;
}

/** Los errores por campo antes de molestar al servidor; vacío si todo está bien. */
export function erroresDeReaplicacion(
  edicion: EdicionDeReaplicacion,
  candidatos: readonly CandidatoDeReaplicacion[],
  ficha: Pick<FichaDePago, 'monto'>,
): Errores {
  const errores: Errores = {};
  for (const candidato of candidatos) {
    const error = errorDelMontoReaplicado(edicion.montos[candidato.id] ?? '', candidato);
    if (error) errores[`monto.${candidato.id}`] = error;
  }
  if (Object.keys(errores).length === 0 && faltanteDeReaplicacion(edicion, ficha) !== 0) {
    errores.aplicaciones = `${textoDeLaSuma(edicion, ficha)} El dinero del pago no cambia: reparta exactamente ese monto.`;
  }
  const motivo = edicion.motivo.trim();
  if (!motivo) errores.motivo = 'Escriba el motivo de la reaplicación: queda en la auditoría.';
  else if (motivo.length > MAXIMO_DEL_MOTIVO_DEL_PAGO)
    errores.motivo = `Acórtelo a ${MAXIMO_DEL_MOTIVO_DEL_PAGO} caracteres o menos.`;
  return errores;
}

/** Las líneas que se mandan: solo los cargos con monto mayor que cero, en el orden de la ventana. */
export function lineasReaplicadas(
  edicion: EdicionDeReaplicacion,
  candidatos: readonly CandidatoDeReaplicacion[],
): LineaSolicitada[] {
  return candidatos
    .filter(({ id }) => (centavosDe(edicion.montos[id] ?? '') ?? 0) > 0)
    .map(({ id }) => ({ cargoId: id, monto: textoDeCentavos(centavos(edicion.montos[id] ?? '')) }));
}

export const solicitudDeReaplicar = (
  edicion: EdicionDeReaplicacion,
  candidatos: readonly CandidatoDeReaplicacion[],
): SolicitudDeReaplicacion => ({
  motivo: edicion.motivo.trim(),
  aplicaciones: lineasReaplicadas(edicion, candidatos),
});

/** Lo que se confirma antes de enviar: de qué cargos sale y a cuáles pasa el dinero. */
export function resumenDeReaplicar(
  edicion: EdicionDeReaplicacion,
  candidatos: readonly CandidatoDeReaplicacion[],
  ficha: Pick<FichaDePago, 'numero' | 'monto'>,
): string {
  const lineas = lineasReaplicadas(edicion, candidatos);
  const nombres = new Map(candidatos.map(({ id, titulo }) => [id, titulo]));
  const reparto = lineas
    .map(({ cargoId, monto }) => `${nombres.get(cargoId) ?? ''}: ${formatearMonto(monto)}`)
    .join('; ');
  return `El pago ${ficha.numero} (${formatearMonto(ficha.monto)}) quedará así: ${reparto}. La fecha, la forma y el cheque no cambian; las diferencias saldadas de este pago se anulan y se podrán volver a saldar.`;
}

/** Pasa los campos del servidor (`aplicaciones.2.monto`) a los de la ventana (`monto.<id del cargo>`). */
export function repartirErroresDeReaplicacion(errores: Errores, enviadas: readonly LineaSolicitada[]): Errores {
  const resultado: Errores = {};
  for (const [campo, mensaje] of Object.entries(errores)) {
    const linea = /^aplicaciones\.(\d+)\.(monto|cargoId)$/.exec(campo);
    if (linea) resultado[`monto.${enviadas[Number(linea[1])]?.cargoId ?? ''}`] = mensaje;
    else resultado[campo] = mensaje;
  }
  return resultado;
}
