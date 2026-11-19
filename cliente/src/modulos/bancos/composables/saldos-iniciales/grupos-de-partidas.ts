import type { ParteQueSeAgrega, PartidaDeApertura } from '../../servicios/tipos-de-saldos-iniciales';
import { aCentavos, deCentavos } from '../comunes/centavos';

/** Un grupo de partidas de la ficha: sus partidas ordenadas y su total (el que entra a la fórmula, salvo el posfechado). */
export interface GrupoDePartidas {
  parte: ParteQueSeAgrega;
  titulo: string;
  agregar: string;
  partidas: PartidaDeApertura[];
  total: string;
  /** El posfechado va aparte: cuenta en su fecha, no en el cuadre. */
  fueraDeLaFormula: boolean;
}

const GRUPOS: Array<Pick<GrupoDePartidas, 'parte' | 'titulo' | 'agregar' | 'fueraDeLaFormula'>> = [
  {
    parte: 'cheque_en_circulacion',
    titulo: 'Cheques en circulación',
    agregar: 'Agregar cheque',
    fueraDeLaFormula: false,
  },
  {
    parte: 'deposito_en_transito',
    titulo: 'Depósitos en tránsito',
    agregar: 'Agregar depósito',
    fueraDeLaFormula: false,
  },
  { parte: 'debito_en_transito', titulo: 'Débitos en tránsito', agregar: 'Agregar débito', fueraDeLaFormula: false },
  { parte: 'error_del_banco', titulo: 'Errores del banco', agregar: 'Agregar error', fueraDeLaFormula: false },
  {
    parte: 'cheque_posfechado',
    titulo: 'Cheques posfechados entregados antes del corte',
    agregar: 'Agregar posfechado',
    fueraDeLaFormula: true,
  },
];

/** En el error del banco el sentido decide el signo; en las demás partes el monto es siempre positivo. */
const efectoEnCentavos = (partida: PartidaDeApertura): number => {
  const monto = aCentavos(partida.monto);
  return partida.parte === 'error_del_banco' && partida.tipo === 'debito' ? -monto : monto;
};

/** Por fecha y, a igual fecha, por número de cheque. */
const porFechaYNumero = (a: PartidaDeApertura, b: PartidaDeApertura): number =>
  a.fecha.localeCompare(b.fecha) || (a.numeroDeCheque ?? 0) - (b.numeroDeCheque ?? 0);

/**
 * Reparte las partidas en los cinco grupos de la ficha (siempre los cinco, aunque estén vacíos, para poder agregar).
 * Las anuladas a la antigua se listan pero no suman, igual que en el cuadre del servidor.
 */
export function agruparPartidas(partidas: readonly PartidaDeApertura[]): GrupoDePartidas[] {
  return GRUPOS.map((grupo) => {
    const delGrupo = partidas.filter((partida) => partida.parte === grupo.parte).sort(porFechaYNumero);
    const total = delGrupo.filter((partida) => !partida.anulada).reduce((suma, p) => suma + efectoEnCentavos(p), 0);
    return { ...grupo, partidas: delGrupo, total: deCentavos(total) };
  });
}

export interface InsigniaDePartida {
  clave: string;
  texto: string;
  tono: 'campo' | 'trigo' | 'tierra' | 'rojo';
}

const mesDosCifras = (mes: number): string => String(mes).padStart(2, '0');

/** Las insignias de una partida: Conciliado mm/aaaa, Anulado, Antiguo y Revisar (los dos últimos, avisos del servidor). */
export function insigniasDePartida(partida: PartidaDeApertura): InsigniaDePartida[] {
  const insignias: InsigniaDePartida[] = [];
  if (partida.conciliadaEn) {
    const { anio, mes } = partida.conciliadaEn;
    insignias.push({ clave: 'conciliada', texto: `Conciliado ${mesDosCifras(mes)}/${anio}`, tono: 'campo' });
  }
  if (partida.anulada || partida.revertida) insignias.push({ clave: 'anulada', texto: 'Anulado', tono: 'rojo' });
  if (partida.avisos.includes('antiguo')) insignias.push({ clave: 'antiguo', texto: 'Antiguo', tono: 'trigo' });
  if (partida.avisos.includes('deposito_viejo')) insignias.push({ clave: 'revisar', texto: 'Revisar', tono: 'trigo' });
  return insignias;
}
