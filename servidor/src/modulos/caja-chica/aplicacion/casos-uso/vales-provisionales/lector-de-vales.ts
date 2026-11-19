import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ValeProvisional } from '../../../dominio/vales-provisionales.js';
import type { ValeProvisionalDto, ValeProvisionalResumenDto } from '../../dto/vales-provisionales.dto.js';
import { fichaDelVale, resumenDelVale } from './armado-del-vale.js';
import type { DependenciasDeVales } from './dependencias-de-vales.js';

type Dependencias = Pick<DependenciasDeVales, 'vales' | 'consultasDeVales' | 'configuracionDeVales' | 'reloj'>;

/** Arma la ficha y las filas de los vales con lo que lee de la transacción en curso. */
export class LectorDeVales {
  constructor(private readonly dependencias: Dependencias) {}

  async leer(operador: Operador, vale: ValeProvisional, avisos: readonly string[] = []): Promise<ValeProvisionalDto> {
    const comprobantes = await this.dependencias.consultasDeVales.comprobantesDelVale(vale.id);
    return fichaDelVale({ vale, comprobantes }, await this.contexto(operador, avisos));
  }

  async resumir(operador: Operador, vales: readonly ValeProvisional[]): Promise<ValeProvisionalResumenDto[]> {
    const contexto = await this.contexto(operador, []);
    return vales.map((vale) => resumenDelVale(vale, contexto));
  }

  /** El vale sin bloquearlo. @throws RecursoNoEncontrado si no existe o su fondo no está al alcance. */
  async buscar(valeId: string): Promise<ValeProvisional> {
    const vale = await this.dependencias.vales.buscar(valeId);
    if (!vale) throw new RecursoNoEncontrado('El vale provisional');
    return vale;
  }

  private async contexto(operador: Operador, avisos: readonly string[]) {
    const { reloj, configuracionDeVales } = this.dependencias;
    return {
      hoy: await reloj.hoy(operador),
      diasParaAvisar: await configuracionDeVales.diasParaAvisar(operador),
      avisos,
    };
  }
}
