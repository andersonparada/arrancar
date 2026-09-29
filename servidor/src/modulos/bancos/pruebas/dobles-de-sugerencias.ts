import type {
  ConsultasDeSugerencias,
  FiltroDeSugerencias,
  PendienteDeClasificar,
  RangoDeFechas,
} from '../aplicacion/puertos/consultas-de-sugerencias.js';
import type { ParametrosDeSugerencias, PoliticaDeSugerencias } from '../aplicacion/puertos/politica-de-sugerencias.js';
import type { Ejemplo } from '../dominio/sugerencias/tipos.js';

const enElRango = (fecha: string, { desde, hasta }: RangoDeFechas) => fecha >= desde && fecha <= hasta;

/** Pendientes y ejemplos en memoria; la normalización es solo minúsculas y espacios (la real es de la base). */
export class ConsultasDeSugerenciasEnMemoria implements ConsultasDeSugerencias {
  pendientesGuardados: PendienteDeClasificar[] = [];
  ejemplosGuardados: Ejemplo[] = [];

  async pendientes(filtro: FiltroDeSugerencias, limite: number): Promise<PendienteDeClasificar[]> {
    const { cuentaBancariaId, desde, hasta } = filtro;
    return this.pendientesGuardados
      .filter((p) => (!cuentaBancariaId || p.cuentaBancariaId === cuentaBancariaId) && (!desde || p.fecha >= desde))
      .filter((p) => !hasta || p.fecha <= hasta)
      .slice(0, limite);
  }

  async ejemplosPorBeneficiario(claves: string[], rango: RangoDeFechas): Promise<Ejemplo[]> {
    return this.ejemplosGuardados.filter(
      (e) =>
        e.beneficiarioParaComparar !== null && claves.includes(e.beneficiarioParaComparar) && enElRango(e.fecha, rango),
    );
  }

  async ejemplosSinBeneficiario(cuentas: string[], rango: RangoDeFechas): Promise<Ejemplo[]> {
    return this.ejemplosGuardados.filter(
      (e) => e.beneficiarioParaComparar === null && cuentas.includes(e.cuentaBancariaId) && enElRango(e.fecha, rango),
    );
  }

  async nombreParaComparar(texto: string | null): Promise<string | null> {
    return texto?.trim().toLowerCase() || null;
  }
}

export class PoliticaDeSugerenciasFija implements PoliticaDeSugerencias {
  constructor(private readonly fijos: ParametrosDeSugerencias = { vidaMediaDias: 180, confianzaMinima: 60 }) {}

  async parametros(): Promise<ParametrosDeSugerencias> {
    return this.fijos;
  }
}
