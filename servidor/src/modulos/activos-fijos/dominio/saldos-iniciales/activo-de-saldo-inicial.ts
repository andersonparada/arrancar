import type { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Activo, type DatosDeUso, type UbicacionDeActivo } from '../activo.js';
import { ActivoInvalido } from '../errores-de-activo.js';
import type { IncisoFiscal } from '../incisos-fiscales.js';
import type { DatosDeActivo } from '../reglas-de-activo.js';

/** El activo que se carga como saldo inicial: lo descriptivo, dónde está y, si ya se usa, con qué parámetros. */
export interface EntradaDeActivoDeSaldoInicial {
  /** Del balance, con origen `saldo_inicial`. */
  datos: DatosDeActivo;
  ubicacion: UbicacionDeActivo;
  /** `null` si la obra no se terminó: queda en construcción. */
  uso: DatosDeUso | null;
}

/**
 * Un activo de saldo inicial: nace en uso (o en construcción si la obra no terminó) con los parámetros de depreciación
 * ya fijados. Sus fechas reales de adquisición y de uso son anteriores a la fecha de inicio de la empresa.
 * @throws ActivoInvalido u otro error de datos si no cumple las reglas; FechaDeUsoInvalida si el uso es anterior a la adquisición.
 */
export function crearActivoDeSaldoInicial(
  empresaId: Identificador<'Empresa'>,
  { datos, ubicacion, uso }: EntradaDeActivoDeSaldoInicial,
  inciso: IncisoFiscal,
): Activo {
  const activo = Activo.crear(empresaId, { datos, ubicacion }, inciso);
  if (uso) activo.ponerEnUso(uso);
  return activo;
}

/**
 * Corrige un activo de saldo inicial: se rehace con los datos nuevos conservando su identidad y lo que el saldo no toca
 * (alta conjunta, responsable con usuario, foto y la marca de ocioso si sigue en uso).
 * @throws ActivoInvalido si el activo no es de saldo inicial o los datos no cumplen las reglas.
 */
export function corregirActivoDeSaldoInicial(
  actual: Activo,
  entrada: EntradaDeActivoDeSaldoInicial,
  inciso: IncisoFiscal,
): Activo {
  const anterior = actual.instantanea();
  if (anterior.origen !== 'saldo_inicial') throw new ActivoInvalido('El activo no viene de un saldo inicial.');
  const nuevo = crearActivoDeSaldoInicial(anterior.empresaId, entrada, inciso).instantanea();
  const ocio = entrada.uso
    ? { ocioso: anterior.ocioso, ociosoDesde: anterior.ociosoDesde, motivoDeOcio: anterior.motivoDeOcio }
    : {};
  return Activo.reconstruir({
    ...nuevo,
    ...ocio,
    id: anterior.id,
    altaConjuntaId: anterior.altaConjuntaId,
    responsableUsuarioId: anterior.responsableUsuarioId,
    fotoArchivoId: anterior.fotoArchivoId,
  });
}
