import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { ConfiguracionDeParcelas } from '../aplicacion/puertos/configuracion-y-avisos.js';
import type { FactoresDeSuperficie } from '../dominio/superficie.js';

/** Lee de la configuración por niveles (empresa, instalación) lo que Parcelas necesita. */
export class ConfiguracionDeParcelasEnConfiguracion implements ConfiguracionDeParcelas {
  async factores(operador: Operador): Promise<FactoresDeSuperficie> {
    const [metrosPorVara, varasCuadradasPorManzana, varasCuadradasPorCaballeria] = await Promise.all([
      this.leer<number>(operador, 'parcelas.unidades.metros_por_vara'),
      this.leer<number>(operador, 'parcelas.unidades.varas_cuadradas_por_manzana'),
      this.leer<number>(operador, 'parcelas.unidades.varas_cuadradas_por_caballeria'),
    ]);
    return { metrosPorVara, varasCuadradasPorManzana, varasCuadradasPorCaballeria };
  }

  nivelesMaximos(operador: Operador): Promise<number> {
    return this.leer<number>(operador, 'parcelas.jerarquia.niveles_maximos');
  }

  varasPorLadoDeCuerda(operador: Operador): Promise<number> {
    return this.leer<number>(operador, 'parcelas.unidades.varas_por_lado_de_cuerda');
  }

  private leer<Valor>({ cuentaId, empresaId }: Operador, clave: string): Promise<Valor> {
    return configuracion.lector.obtener<Valor>(clave, { cuentaId, empresaId });
  }
}
