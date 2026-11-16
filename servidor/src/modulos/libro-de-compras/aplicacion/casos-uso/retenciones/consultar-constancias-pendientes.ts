import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { mesDelEnteroValido } from '../../../dominio/retenciones/entero-de-retenciones.js';
import {
  GRUPO_DE_ENTERO,
  NOMBRE_DEL_GRUPO,
  mesDeLaRetencion,
  plazoDelGrupo,
  type GrupoDeEntero,
} from '../../../dominio/retenciones/grupo-de-entero.js';
import {
  diasHasta,
  plazoDeLaConstancia,
  SIN_PLAZO_PROPIO_DE_LA_CONSTANCIA,
} from '../../../dominio/retenciones/plazo-de-la-constancia.js';
import { tieneEnteroVigente, type RetencionDelReporte } from '../../../dominio/retenciones/retencion-del-reporte.js';
import type {
  ConstanciaPendienteDto,
  ConstanciasPendientesDto,
  TotalPendienteDto,
} from '../../dto/constancias-pendientes.dto.js';
import { dtoDeRetencion } from '../../dto/retenciones.dto.js';
import type { ConsultasDeEnteros, ConsultasDeRetenciones } from '../../puertos/puertos-de-retenciones.js';
import { cargarContextoDePlazos, type ContextoDePlazos, type DependenciasDePlazos } from './grupos-del-reporte.js';

export interface FiltroDeConstanciasPendientes {
  /** `AAAA-MM` o `AAAA-MM-01`: el último mes incluido; por omisión, el mes en curso. */
  hasta?: string;
  grupo?: GrupoDeEntero;
  proveedorId?: string;
}

interface Dependencias extends DependenciasDePlazos {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeRetenciones;
  enteros: ConsultasDeEnteros;
}

type PagosDelRango = Awaited<ReturnType<ConsultasDeEnteros['delRango']>>;

/** Todos los años entre dos meses, para traer los feriados de cada uno. */
function aniosDe(desde: string, hasta: string): number[] {
  const primero = Number(desde.slice(0, 4));
  return Array.from({ length: Number(hasta.slice(0, 4)) - primero + 1 }, (_, i) => primero + i);
}

function plazosDeLaConstancia(retencion: RetencionDelReporte, contexto: ContextoDePlazos) {
  const plazo = plazoDeLaConstancia({
    impuesto: retencion.impuesto,
    fechaDeLaRetencion: retencion.fecha,
    calendario: contexto.calendario,
  });
  return {
    plazoDeLaConstancia: plazo,
    diasParaLaConstancia: plazo === null ? null : diasHasta(contexto.hoy, plazo),
    constanciaVencida: plazo !== null && contexto.hoy > plazo,
    notaDelPlazo: plazo === null ? SIN_PLAZO_PROPIO_DE_LA_CONSTANCIA : null,
  };
}

function armarPendiente(
  retencion: RetencionDelReporte,
  contexto: ContextoDePlazos,
  pagos: PagosDelRango,
): ConstanciaPendienteDto {
  const mes = mesDeLaRetencion(retencion.fecha);
  const grupo = GRUPO_DE_ENTERO[retencion.regla];
  const plazo = plazoDelGrupo({ mes, grupo, ...contexto });
  return {
    mes,
    grupo,
    nombreDelGrupo: NOMBRE_DEL_GRUPO[grupo],
    plazoDelGrupo: plazo,
    diasParaElPlazo: diasHasta(contexto.hoy, plazo),
    plazoVencido: contexto.hoy > plazo,
    enterado: tieneEnteroVigente(pagos, mes, grupo),
    ...plazosDeLaConstancia(retencion, contexto),
    retencion: dtoDeRetencion(retencion),
  };
}

/** Lo pendiente de cada mes y grupo, en el orden en que aparecen las filas (ya vienen por fecha). */
function totalesPorMesYGrupo(
  filas: readonly ConstanciaPendienteDto[],
  centavos: ReadonlyMap<string, number>,
): TotalPendienteDto[] {
  const totales = new Map<string, TotalPendienteDto & { centavos: number }>();
  for (const fila of filas) {
    const clave = `${fila.mes}|${fila.grupo}`;
    const actual = totales.get(clave) ?? {
      mes: fila.mes,
      grupo: fila.grupo,
      nombreDelGrupo: fila.nombreDelGrupo,
      plazoDelGrupo: fila.plazoDelGrupo,
      cantidad: 0,
      retenido: '',
      centavos: 0,
    };
    actual.cantidad += 1;
    actual.centavos += centavos.get(fila.retencion.id) ?? 0;
    totales.set(clave, actual);
  }
  return [...totales.values()]
    .sort((a, b) => a.mes.localeCompare(b.mes) || a.grupo.localeCompare(b.grupo))
    .map(({ centavos: suma, ...total }) => ({ ...total, retenido: deCentavos(suma) }));
}

/**
 * Las constancias de retención que faltan de todos los meses (no solo el del reporte mensual), con el plazo de entero
 * de su mes y grupo, el plazo de la constancia (ISR: cinco días hábiles del mes siguiente), si el mes y grupo ya se
 * enteró y los totales por mes y grupo. Las de documentos anulados que siguen por resolver van aparte y no suman.
 */
export class ConsultarConstanciasPendientes {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws MesDelEnteroInvalido si `hasta` no es `AAAA-MM`. */
  ejecutar(operador: Operador, filtro: FiltroDeConstanciasPendientes = {}): Promise<ConstanciasPendientesDto> {
    const { unidadDeTrabajo, consultas, enteros, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const hasta = mesDelEnteroValido(filtro.hasta ?? (await reloj.hoy(operador)).slice(0, 7));
      const todas = await consultas.pendientesDeConstancia({ hasta, proveedorId: filtro.proveedorId });
      const elegidas = todas.filter((r) => !filtro.grupo || GRUPO_DE_ENTERO[r.regla] === filtro.grupo);
      const meses = elegidas.map((r) => mesDeLaRetencion(r.fecha));
      const desde = [...meses, hasta].sort()[0]!;
      const contexto = await cargarContextoDePlazos(this.dependencias, operador, aniosDe(desde, hasta));
      const pagos = await enteros.delRango(desde, hasta);
      return this.armar({ hasta, filtro, elegidas, contexto, pagos });
    });
  }

  private armar(datos: {
    hasta: string;
    filtro: FiltroDeConstanciasPendientes;
    elegidas: readonly RetencionDelReporte[];
    contexto: ContextoDePlazos;
    pagos: PagosDelRango;
  }): ConstanciasPendientesDto {
    const { elegidas, contexto, pagos } = datos;
    const vigentes = elegidas.filter((r) => r.documento.estado === 'vigente');
    const pendientes = vigentes.map((r) => armarPendiente(r, contexto, pagos));
    const anuladas = elegidas
      .filter((r) => r.documento.estado === 'anulado')
      .map((r) => armarPendiente(r, contexto, pagos));
    const centavos = new Map(elegidas.map((r) => [r.id, r.monto]));
    const suma = vigentes.reduce((acumulado, r) => acumulado + r.monto, 0);
    return {
      hasta: datos.hasta,
      hoy: contexto.hoy,
      filtros: { grupo: datos.filtro.grupo ?? null, proveedorId: datos.filtro.proveedorId ?? null },
      pendientes,
      anuladas,
      totales: totalesPorMesYGrupo(pendientes, centavos),
      total: { cantidad: vigentes.length, retenido: deCentavos(suma) },
    };
  }
}
