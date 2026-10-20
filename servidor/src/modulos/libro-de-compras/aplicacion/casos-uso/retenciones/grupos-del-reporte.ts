import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { CalendarioLaboral, FuenteDeCalendario } from '../../../dominio/calendario-laboral.js';
import { estadoDelEntero } from '../../../dominio/retenciones/estado-del-entero.js';
import { NOMBRE_DEL_GRUPO, plazoDelGrupo, type GrupoDeEntero } from '../../../dominio/retenciones/grupo-de-entero.js';
import {
  pagadoDe,
  resumenVacio,
  type Cantidad,
  type EnteroGuardado,
  type ResumenDeRegla,
  type ResumenDelGrupo,
} from '../../../dominio/retenciones/retencion-del-reporte.js';
import {
  dtoDeEntero,
  type CantidadDto,
  type GrupoDelReporteDto,
  type ReglaDelGrupoDto,
} from '../../dto/retenciones.dto.js';
import type { LectorDeConfiguracionFiscal } from '../../puertos/puertos-de-documentos.js';

/** Lo que se necesita saber del día, los plazos de la empresa y los feriados. */
export interface ContextoDePlazos {
  hoy: string;
  diasHabilesIva: number;
  diasHabilesIsr: number;
  calendario: CalendarioLaboral;
}

export interface DependenciasDePlazos {
  reloj: Reloj;
  configuracion: LectorDeConfiguracionFiscal;
  calendario: FuenteDeCalendario;
}

/** Reúne el contexto de plazos con los feriados de los años dados y el siguiente a cada uno. */
export async function cargarContextoDePlazos(
  dependencias: DependenciasDePlazos,
  operador: Operador,
  anios: readonly number[],
): Promise<ContextoDePlazos> {
  const conSiguiente = [...new Set(anios.flatMap((anio) => [anio, anio + 1]))];
  const configuracion = await dependencias.configuracion.paraEmpresa(operador);
  return {
    hoy: await dependencias.reloj.hoy(operador),
    diasHabilesIva: configuracion.diasHabilesIva,
    diasHabilesIsr: configuracion.diasHabilesIsr,
    calendario: await dependencias.calendario.paraAnios(conSiguiente),
  };
}

function avisoDeVencido(grupo: GrupoDeEntero, limite: string): string {
  const [anio, mes, dia] = limite.split('-');
  return `El plazo para enterar ${NOMBRE_DEL_GRUPO[grupo]} venció el ${dia}/${mes}/${anio}.`;
}

export interface EntradaDelGrupo {
  mes: string;
  grupo: GrupoDeEntero;
  /** Lo retenido del mes y grupo; sin él, el grupo no tuvo retenciones. */
  resumen: ResumenDelGrupo | undefined;
  pagos: readonly EnteroGuardado[];
}

const dtoDeCantidad = (parte: Cantidad): CantidadDto => ({ cantidad: parte.cantidad, monto: deCentavos(parte.monto) });

const dtoDeRegla = (regla: ResumenDeRegla): ReglaDelGrupoDto => ({
  ...regla,
  base: deCentavos(regla.base),
  retenido: deCentavos(regla.retenido),
});

/** El grupo de un mes con su plazo, su estado de pago y el aviso de plazo vencido (apagado si ya se pagó algo). */
export function armarGrupo(contexto: ContextoDePlazos, entrada: EntradaDelGrupo): GrupoDelReporteDto {
  const { mes, grupo, pagos } = entrada;
  const resumen = entrada.resumen ?? resumenVacio(mes, grupo);
  const plazo = plazoDelGrupo({ mes, grupo, ...contexto });
  const pagado = pagadoDe(pagos, mes, grupo);
  const estado = estadoDelEntero({ retenido: resumen.retenido, pagado, hoy: contexto.hoy, limite: plazo });
  return {
    grupo,
    nombre: NOMBRE_DEL_GRUPO[grupo],
    mes,
    plazo,
    retenido: deCentavos(resumen.retenido),
    pagado: deCentavos(pagado),
    diferencia: deCentavos(resumen.retenido - pagado),
    estado,
    aviso: estado === 'vencido' ? avisoDeVencido(grupo, plazo) : null,
    reglas: resumen.reglas.map(dtoDeRegla),
    conConstancia: dtoDeCantidad(resumen.conConstancia),
    sinConstancia: dtoDeCantidad(resumen.sinConstancia),
    pagos: pagos.filter((pago) => pago.mes === mes && pago.grupo === grupo).map(dtoDeEntero),
  };
}
