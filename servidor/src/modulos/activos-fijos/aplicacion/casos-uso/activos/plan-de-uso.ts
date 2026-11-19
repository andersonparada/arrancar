import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { PropiedadesDeActivo, DatosDeUso } from '../../../dominio/activo.js';
import type { PropiedadesDeClase } from '../../../dominio/clase.js';
import type { PropiedadesDeCosto } from '../../../dominio/costo.js';
import { baseFiscalDeUso } from './base-fiscal-de-uso.js';
import { tramosDeInicioDeUso } from '../../../dominio/depreciacion/inicio-de-uso.js';
import { periodoDe, primerMesDelTramo, type PrimerMes } from '../../../dominio/depreciacion/meses.js';
import {
  proponerParametrosDeUso,
  validarParametrosDeUso,
  type ParametrosDeUso,
} from '../../../dominio/depreciacion/parametros-de-uso.js';
import type { TramoCalculado } from '../../../dominio/depreciacion/tramo.js';
import { ActivoSinCosto, FechaDeUsoInvalida, MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import { esTerreno } from '../../../dominio/incisos-fiscales.js';
import type { SolicitudDePonerEnUso } from '../../dto/activo.dto.js';
import type { FiscalDelSaldo } from '../../puertos/repositorio-saldos-iniciales.js';

export interface EntradaDelPlan {
  activo: Readonly<PropiedadesDeActivo>;
  clase: Readonly<PropiedadesDeClase>;
  costos: readonly PropiedadesDeCosto[];
  /** Lo fiscal del saldo inicial, si el activo viene de uno (una obra cargada sin terminar). */
  saldoInicial: FiscalDelSaldo | null;
  solicitud: SolicitudDePonerEnUso;
  primerMes: PrimerMes;
  /** El máximo de ley del inciso de la clase, en %. */
  porcentajeMaximo: number;
  ultimoMesCerrado: string | null;
}

/** Lo que se guarda al poner un activo en uso: sus datos de uso y los tramos con que se depreciará. */
export interface PlanDeUso {
  datos: DatosDeUso;
  tramos: TramoCalculado[];
}

const sumaDe = (costos: readonly PropiedadesDeCosto[]): number =>
  costos.reduce((total, costo) => total + costo.montoCentavos, 0);

/** @throws FechaDeUsoInvalida si es anterior al último costo; MesCerrado si el primer mes de depreciación ya cerró. */
function exigirFechaValida(entrada: EntradaDelPlan): void {
  const { solicitud, costos, primerMes, ultimoMesCerrado } = entrada;
  const fecha = solicitud.fechaDeInicioDeUso;
  const ultimoCosto = costos
    .map((costo) => costo.fecha)
    .sort()
    .at(-1);
  if (ultimoCosto && fecha < ultimoCosto)
    throw new FechaDeUsoInvalida(`La fecha de uso no puede ser anterior al último costo del activo (${ultimoCosto}).`);
  const primero = primerMesDelTramo(fecha, primerMes);
  if (ultimoMesCerrado && primero <= periodoDe(ultimoMesCerrado)) throw new MesCerrado(primero);
}

/** Lo que el usuario escribió pesa más que lo que propone la clase. */
function parametrosElegidos(solicitud: SolicitudDePonerEnUso, propuestos: ParametrosDeUso): ParametrosDeUso {
  const { porcentajeFiscal, vidaUtilContableMeses, valorResidual } = solicitud;
  return {
    porcentajeFiscal: porcentajeFiscal ?? propuestos.porcentajeFiscal,
    vidaUtilContableMeses: vidaUtilContableMeses ?? propuestos.vidaUtilContableMeses,
    valorResidualCentavos: valorResidual ? aCentavos(valorResidual) : propuestos.valorResidualCentavos,
  };
}

/** Un terreno no se deprecia: se pone en uso sin libros ni tramos (porcentaje 0). */
function planDeTerreno(fechaDeInicioDeUso: string): PlanDeUso {
  return {
    datos: { fechaDeInicioDeUso, porcentajeFiscal: '0.00', vidaUtilContableMeses: null, valorResidual: '0.00' },
    tramos: [],
  };
}

function abrirTramos(entrada: EntradaDelPlan, parametros: ParametrosDeUso, costoCentavos: number) {
  const { activo, clase, costos, solicitud, saldoInicial: saldo } = entrada;
  const ganado = activo.valorComoGanadoComun === null ? 0 : aCentavos(activo.valorComoGanadoComun);
  return tramosDeInicioDeUso({
    fechaDeInicioDeUso: solicitud.fechaDeInicioDeUso,
    primerMes: entrada.primerMes,
    costoCentavos,
    baseFiscalCentavos: baseFiscalDeUso({ incisoFiscal: clase.incisoFiscal, costos, inmueble: activo, ganado }, saldo),
    porcentajeFiscal: parametros.porcentajeFiscal,
    vidaUtilContableMeses: parametros.vidaUtilContableMeses ?? 0,
    valorResidualCentavos: parametros.valorResidualCentavos,
  });
}

/**
 * Calcula lo que pasa al poner un activo en uso (§6.4): revisa la fecha, toma los parámetros de la clase o del usuario,
 * los valida contra el máximo de ley y abre los dos tramos `inicio_de_uso`.
 * @throws ActivoSinCosto, FechaDeUsoInvalida, MesCerrado o ParametrosDeUsoInvalidos si algo no cumple.
 */
export function planearUso(entrada: EntradaDelPlan): PlanDeUso {
  const { activo, clase, costos, solicitud } = entrada;
  exigirFechaValida(entrada);
  if (esTerreno(clase.incisoFiscal)) return planDeTerreno(solicitud.fechaDeInicioDeUso);
  const costoCentavos = sumaDe(costos);
  if (costoCentavos <= 0) throw new ActivoSinCosto();
  const ganado = activo.valorComoGanadoComun === null ? null : aCentavos(activo.valorComoGanadoComun);
  const propuestos = proponerParametrosDeUso({ clase, costoCentavos, valorComoGanadoComunCentavos: ganado });
  const parametros = parametrosElegidos(solicitud, propuestos);
  const { incisoFiscal } = clase;
  validarParametrosDeUso({ incisoFiscal, parametros, porcentajeMaximo: entrada.porcentajeMaximo, costoCentavos });
  const { contable, fiscal } = abrirTramos(entrada, parametros, costoCentavos);
  const { fechaDeInicioDeUso } = solicitud;
  const { vidaUtilContableMeses, porcentajeFiscal } = parametros;
  const valorResidual = deCentavos(parametros.valorResidualCentavos);
  return {
    datos: { fechaDeInicioDeUso, porcentajeFiscal, vidaUtilContableMeses, valorResidual },
    tramos: [contable, fiscal],
  };
}
