import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { TipoDeMovimiento } from '../../dominio/asignacion-de-concepto.js';
import { armarCasos } from '../../dominio/sugerencias/casos-de-votacion.js';
import { sePuedeOfrecer } from '../../dominio/sugerencias/conceptos-ofrecibles.js';
import { desplazarFecha, ventanaEnDias } from '../../dominio/sugerencias/pesos.js';
import type { Ejemplo, Pendiente, ResultadoDeVotacion } from '../../dominio/sugerencias/tipos.js';
import { votar } from '../../dominio/sugerencias/votacion.js';
import type { ConsultasConceptos } from '../puertos/consultas-conceptos.js';
import type { ConsultasDeSugerencias, RangoDeFechas } from '../puertos/consultas-de-sugerencias.js';
import type { CuentasPorPagarActivo } from '../puertos/cuentas-por-pagar-activo.js';
import type { ParametrosDeSugerencias, PoliticaDeSugerencias } from '../puertos/politica-de-sugerencias.js';

export interface DependenciasDelMotor {
  consultasDeSugerencias: ConsultasDeSugerencias;
  consultasDeConceptos: ConsultasConceptos;
  politicaDeSugerencias: PoliticaDeSugerencias;
  cuentasPorPagar: CuentasPorPagarActivo;
}

export interface PendienteConTipo {
  pendiente: Pendiente;
  tipo: TipoDeMovimiento;
}

const unico = <T>(valores: T[]): T[] => [...new Set(valores)];

/** El rango de fechas que cubre la ventana de todos los pendientes. */
function rangoDe(pendientes: Pendiente[], { vidaMediaDias }: ParametrosDeSugerencias): RangoDeFechas {
  const fechas = pendientes.map((p) => p.fecha).sort();
  const ventana = Math.ceil(ventanaEnDias(vidaMediaDias));
  return { desde: desplazarFecha(fechas[0]!, -ventana), hasta: desplazarFecha(fechas[fechas.length - 1]!, ventana) };
}

/**
 * El cálculo de las sugerencias (P7, §4): trae los ejemplos de todos los pendientes de una vez, arma los casos de
 * cada uno y vota. Sirve a la bandeja y a la captura de notas y cheques. Corre dentro de la unidad de trabajo.
 */
export class MotorDeSugerencias {
  constructor(private readonly dependencias: DependenciasDelMotor) {}

  /** @returns una votación por pendiente, en el mismo orden. */
  async sugerir(operador: Operador, pendientes: PendienteConTipo[]): Promise<ResultadoDeVotacion[]> {
    if (pendientes.length === 0) return [];
    const parametros = await this.dependencias.politicaDeSugerencias.parametros(operador);
    const ejemplos = await this.ejemplosDe(
      pendientes.map((p) => p.pendiente),
      parametros,
    );
    const conceptos = await this.dependencias.consultasDeConceptos.listar();
    const conCuentasPorPagar = await this.dependencias.cuentasPorPagar.estaActivo(operador);
    return pendientes.map(({ pendiente, tipo }) => {
      const ofrecibles = conceptos.filter((c) => sePuedeOfrecer(c, tipo, conCuentasPorPagar));
      const casos = armarCasos(pendiente, ejemplos, parametros.vidaMediaDias);
      return votar(casos, ofrecibles, { confianzaMinima: parametros.confianzaMinima });
    });
  }

  private async ejemplosDe(pendientes: Pendiente[], parametros: ParametrosDeSugerencias): Promise<Ejemplo[]> {
    const { consultasDeSugerencias } = this.dependencias;
    const rango = rangoDe(pendientes, parametros);
    const claves = unico(pendientes.flatMap((p) => (p.beneficiarioParaComparar ? [p.beneficiarioParaComparar] : [])));
    const cuentas = unico(pendientes.filter((p) => !p.beneficiarioParaComparar).map((p) => p.cuentaBancariaId));
    const porBeneficiario = claves.length ? await consultasDeSugerencias.ejemplosPorBeneficiario(claves, rango) : [];
    const sinBeneficiario = cuentas.length ? await consultasDeSugerencias.ejemplosSinBeneficiario(cuentas, rango) : [];
    return [...porBeneficiario, ...sinBeneficiario];
  }
}
