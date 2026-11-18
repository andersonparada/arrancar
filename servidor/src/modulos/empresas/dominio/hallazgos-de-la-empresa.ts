import type { HallazgoDeCierre } from '../../core/contratos/empresas.contratos.js';

/** `aaaa-mm-dd` a `dd/mm/aaaa`. */
export function fechaParaMostrar(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

interface DatosDeLaRevisionPropia {
  /** `aaaa-mm-dd`. */
  fechaDeInicio: string;
  tieneBalanceDeApertura: boolean;
}

function noEsDiaUno(fechaDeInicio: string): HallazgoDeCierre | null {
  if (fechaDeInicio.endsWith('-01')) return null;
  return {
    codigo: 'fecha_de_inicio_no_es_dia_1',
    nivel: 'aviso',
    mensaje:
      `La fecha de inicio (${fechaParaMostrar(fechaDeInicio)}) no es el primer día de un mes. Lo recomendable es iniciar ` +
      'el día 1, con el balance al último día del mes anterior, y mejor el 1 de enero, porque el período del ISR es anual.',
    registro: null,
  };
}

function sinBalance(tieneBalanceDeApertura: boolean): HallazgoDeCierre | null {
  if (tieneBalanceDeApertura) return null;
  return {
    codigo: 'sin_balance_de_apertura',
    nivel: 'aviso',
    mensaje:
      'No adjuntó el balance de apertura firmado por el comerciante y el contador (Código de Comercio, art. 374). ' +
      'Puede adjuntarlo después de cerrar.',
    registro: null,
  };
}

/** Lo que Empresas encuentra por sí sola al revisar la carga: la fecha de inicio y el balance de apertura. Solo avisan. */
export function hallazgosDeLaEmpresa({
  fechaDeInicio,
  tieneBalanceDeApertura,
}: DatosDeLaRevisionPropia): HallazgoDeCierre[] {
  return [noEsDiaUno(fechaDeInicio), sinBalance(tieneBalanceDeApertura)].filter(
    (hallazgo): hallazgo is HallazgoDeCierre => hallazgo !== null,
  );
}
