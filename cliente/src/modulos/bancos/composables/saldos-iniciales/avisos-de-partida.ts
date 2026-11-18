import { textoDeChequeAntiguo, textoDeDepositoViejo } from '../../textos-de-apertura';
import type { AvisoDeApertura, PartidaDeApertura } from '../../servicios/tipos-de-saldos-iniciales';

const MS_POR_DIA = 86_400_000;

const partesDe = (fecha: string): [number, number, number] => {
  const [anio = 0, mes = 0, dia = 0] = fecha.slice(0, 10).split('-').map(Number);
  return [anio, mes, dia];
};

/** Los días entre dos fechas `AAAA-MM-DD`. */
export function diasEntre(desde: string, hasta: string): number {
  const [anioD, mesD, diaD] = partesDe(desde);
  const [anioH, mesH, diaH] = partesDe(hasta);
  return Math.round((Date.UTC(anioH, mesH - 1, diaH) - Date.UTC(anioD, mesD - 1, diaD)) / MS_POR_DIA);
}

/** Los meses cumplidos entre dos fechas: del 15 de enero al 15 de julio son 6; al 14 de julio, 5. */
export function mesesEntre(desde: string, hasta: string): number {
  const [anioD, mesD, diaD] = partesDe(desde);
  const [anioH, mesH, diaH] = partesDe(hasta);
  const meses = (anioH - anioD) * 12 + (mesH - mesD);
  return diaH < diaD ? meses - 1 : meses;
}

/** Cómo se escribe una fecha para el usuario (la de la empresa); se inyecta para que esto no dependa de la sesión. */
type DarFormato = (fecha: string) => string;

/**
 * El texto largo de un aviso de la ficha (el de la insignia «Antiguo» o «Revisar»), con lo que dicen la partida y la
 * fecha de corte; así el texto de ley es el de `textos-de-apertura.ts` y no el que llegue del servidor.
 */
export function textoDelAvisoDeLaFicha(
  aviso: PartidaDeApertura['avisos'][number],
  partida: PartidaDeApertura,
  contexto: { corte: string; dar: DarFormato },
): string {
  const { corte, dar } = contexto;
  if (aviso === 'antiguo') {
    const meses = mesesEntre(partida.fecha, corte);
    return textoDeChequeAntiguo({
      numero: partida.numeroDeCheque ?? 0,
      fecha: dar(partida.fecha),
      corte: dar(corte),
      meses,
    });
  }
  return textoDeDepositoViejo({ fecha: dar(partida.fecha), dias: diasEntre(partida.fecha, corte) });
}

const CODIGOS_CON_TEXTO_PROPIO = { cheque_antiguo: 'antiguo', deposito_viejo: 'deposito_viejo' } as const;

/**
 * Los avisos que devolvió el servidor al guardar una partida, con el texto de ley del cliente cuando es el de cheque
 * antiguo o depósito viejo (el servidor pone solo su propio mensaje); los demás avisos van tal cual.
 */
export function mensajesDeAvisosAlGuardar(
  avisos: readonly AvisoDeApertura[],
  partida: PartidaDeApertura,
  contexto: { corte: string | null; dar: DarFormato },
): string[] {
  const { corte, dar } = contexto;
  return avisos.map((aviso) => {
    const propio = CODIGOS_CON_TEXTO_PROPIO[aviso.codigo as keyof typeof CODIGOS_CON_TEXTO_PROPIO];
    if (!propio || corte === null) return aviso.mensaje;
    return textoDelAvisoDeLaFicha(propio, partida, { corte, dar });
  });
}
