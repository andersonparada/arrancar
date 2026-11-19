import type { Arqueo, DestinoDelFaltante } from './arqueos.js';
import {
  ArqueoConComprobanteRepuesto,
  ArqueoYaAnulado,
  DatoDeDiferenciaQueNoAplica,
  DestinoDelFaltanteObligatorio,
  FechaDelArqueoInvalida,
  MotivoDeDiferenciaObligatorio,
  SeparacionDeFuncionesEnElArqueo,
} from './errores-de-arqueos.js';
import type { Fondo } from './fondos.js';
import type { SeparacionDeFuncionesConfigurada } from './reglas-de-reposiciones.js';

export const AVISO_DE_ARQUEO_DEL_CUSTODIO =
  'Usted es el custodio de este fondo y también lo arqueó: lo recomendable es que lo arquee otra persona.';

const MILISEGUNDOS_POR_DIA = 86_400_000;
const TOLERANCIA_DEL_RELOJ = 60_000;

/** Lo que se sabe para fechar el arqueo. */
export interface ContextoDeLaFechaDelArqueo {
  hoy: string;
  ahora: Date;
  fondo: Pick<Fondo, 'fechaDeApertura'>;
}

/**
 * El conteo no es futuro ni de un día anterior a la apertura del fondo.
 * @throws FechaDelArqueoInvalida
 */
export function exigirFechaDelArqueo(
  por: { fecha: string; realizadoEn: Date },
  contexto: ContextoDeLaFechaDelArqueo,
): void {
  const { fecha, realizadoEn } = por;
  if (fecha > contexto.hoy || realizadoEn.getTime() > contexto.ahora.getTime() + TOLERANCIA_DEL_RELOJ) {
    throw new FechaDelArqueoInvalida('El arqueo no puede ser futuro.');
  }
  if (fecha < contexto.fondo.fechaDeApertura) {
    throw new FechaDelArqueoInvalida('El arqueo no puede ser anterior a la apertura del fondo.');
  }
}

/** La diferencia: lo contado más los cheques sin cambiar, menos lo esperado (negativa = faltante). */
export function diferenciaDelArqueo(por: {
  contadoCentavos: number;
  valoresPorCambiarCentavos: number;
  esperadoCentavos: number;
}): number {
  return por.contadoCentavos + por.valoresPorCambiarCentavos - por.esperadoCentavos;
}

/** Lo que se escribió al registrar y lo que dio la diferencia. */
export interface ExplicacionDeLaDiferencia {
  diferenciaCentavos: number;
  motivo: string | null | undefined;
  destino: DestinoDelFaltante | null | undefined;
}

/** Sin diferencia no se guarda motivo ni destino. */
function exigirSinExplicacion(motivo: string, destino: DestinoDelFaltante | null): void {
  if (motivo !== '') throw new DatoDeDiferenciaQueNoAplica('motivoDeDiferencia');
  if (destino !== null) throw new DatoDeDiferenciaQueNoAplica('destinoDelFaltante');
}

/** Con faltante el destino es obligatorio; con sobrante no aplica. */
function exigirDestinoSegunLaDiferencia(diferenciaCentavos: number, destino: DestinoDelFaltante | null): void {
  if (diferenciaCentavos < 0 && destino === null) throw new DestinoDelFaltanteObligatorio();
  if (diferenciaCentavos > 0 && destino !== null) throw new DatoDeDiferenciaQueNoAplica('destinoDelFaltante');
}

/**
 * Con diferencia el motivo es obligatorio; con faltante, también el destino. Sin diferencia no se guarda ninguno.
 * @throws MotivoDeDiferenciaObligatorio, DestinoDelFaltanteObligatorio, DatoDeDiferenciaQueNoAplica
 */
export function exigirDiferenciaExplicada(dato: ExplicacionDeLaDiferencia): {
  motivo: string | null;
  destino: DestinoDelFaltante | null;
} {
  const motivo = dato.motivo?.trim() ?? '';
  const destino = dato.destino ?? null;
  if (dato.diferenciaCentavos === 0) {
    exigirSinExplicacion(motivo, destino);
    return { motivo: null, destino: null };
  }
  if (motivo === '') throw new MotivoDeDiferenciaObligatorio();
  exigirDestinoSegunLaDiferencia(dato.diferenciaCentavos, destino);
  return { motivo, destino };
}

/**
 * Si quien arquea es el custodio vigente: con «bloquear» se rechaza; con «avisar» se devuelve el aviso.
 * @throws SeparacionDeFuncionesEnElArqueo
 */
export function revisarLaSeparacionEnElArqueo(
  esElCustodio: boolean,
  configurada: SeparacionDeFuncionesConfigurada,
): string | null {
  if (!esElCustodio) return null;
  if (configurada === 'bloquear') throw new SeparacionDeFuncionesEnElArqueo();
  return AVISO_DE_ARQUEO_DEL_CUSTODIO;
}

/**
 * Un arqueo se anula si está vigente y su faltante o sobrante no está en una reposición vigente.
 * @throws ArqueoYaAnulado, ArqueoConComprobanteRepuesto
 */
export function exigirArqueoAnulable(arqueo: Pick<Arqueo, 'estado' | 'numero'>, reposicionNumero: number | null): void {
  if (arqueo.estado === 'anulado') throw new ArqueoYaAnulado(arqueo.numero);
  if (reposicionNumero !== null) throw new ArqueoConComprobanteRepuesto(arqueo.numero, reposicionNumero);
}

const diasEntre = (desde: string, hasta: string): number =>
  Math.floor((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / MILISEGUNDOS_POR_DIA);

/**
 * El aviso «sin arqueo»: pasaron más de `diasParaAvisar` días desde el último arqueo vigente (o desde la apertura, si
 * nunca se arqueó). Con 0 no se avisa; un fondo cerrado tampoco.
 */
export function avisoDeArqueoVencido(por: {
  fondo: Pick<Fondo, 'fechaDeApertura' | 'estado'>;
  ultimoArqueo: string | null;
  hoy: string;
  diasParaAvisar: number;
}): string | null {
  const { fondo, ultimoArqueo, hoy, diasParaAvisar } = por;
  if (diasParaAvisar === 0 || fondo.estado === 'cerrado') return null;
  const dias = diasEntre(ultimoArqueo?.slice(0, 10) ?? fondo.fechaDeApertura, hoy);
  if (dias <= diasParaAvisar) return null;
  return ultimoArqueo === null
    ? `El fondo lleva ${dias} días sin arquearse.`
    : `Hace ${dias} días que no se arquea este fondo.`;
}
