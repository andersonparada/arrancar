import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CifrasDeVentasEnLaFoto } from '../../../dominio/periodos/foto-del-periodo.js';
import {
  calcularRemanentesDeRetenciones,
  type FormularioConRemanente,
  type RemanentesDeRetenciones,
} from '../../../dominio/periodos/remanentes-de-retenciones.js';
import type { CifrasDeVentas } from '../../puertos/cifras-de-ventas.js';
import type { RepositorioDePeriodos } from '../../puertos/puertos-de-periodos.js';
import { remanenteAnteriorDelPeriodo } from '../periodos/remanentes-del-periodo.js';

/** Lo que la pantalla de datos para el SAT-2237 y el SAT-2046 muestra de ventas. */
export interface VentasDelFormulario {
  ventas: CifrasDeVentasEnLaFoto[];
  remanentes: RemanentesDeRetenciones | null;
}

export interface DependenciasDeVentasDelFormulario {
  periodos: RepositorioDePeriodos;
  cifrasDeVentas: CifrasDeVentas;
}

export interface PedidoDeVentasDelFormulario {
  /** `AAAA-MM-01`. */
  periodo: string;
  formulario: FormularioConRemanente | null;
  creditoCentavos: number;
}

/**
 * Las cifras de ventas del período y el remanente de retenciones que dejarían hoy, con el remanente anterior de la foto
 * del mes previo (o el de la última declaración del mismo período). Sin módulo de ventas activo: vacío y sin remanente.
 */
export async function ventasDelFormulario(
  dependencias: DependenciasDeVentasDelFormulario,
  operador: Operador,
  pedido: PedidoDeVentasDelFormulario,
): Promise<VentasDelFormulario> {
  const ventas = await dependencias.cifrasDeVentas.delPeriodo(operador, pedido.periodo);
  const { formulario, creditoCentavos } = pedido;
  if (ventas.length === 0 || formulario === null) return { ventas, remanentes: null };
  const anteriorCentavos = await remanenteAnteriorDelPeriodo(dependencias.periodos, {
    periodo: pedido.periodo,
    formulario,
  });
  const entrada = { formulario, ventas, creditoCentavos, anteriorCentavos };
  return { ventas, remanentes: calcularRemanentesDeRetenciones(entrada) };
}
