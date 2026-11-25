import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type {
  ConfiguracionDeVentas,
  LectorDeConfiguracionDeVentas,
} from '../aplicacion/puertos/puertos-de-documentos.js';
import { aCentesimasDeConfiguracion } from '../dominio/aritmetica-fiscal.js';

/** La tasa de IVA y la fecha de derogación son las de Libro de compras (la ley es una sola y soporte la cambia en un lugar). */
const TASA_DE_IVA = 'libro-de-compras.iva.tasa';
const FECHA_DE_DEROGACION = 'libro-de-compras.regimenes.fecha_de_derogacion';
const CONSUMIDOR_FINAL = 'libro-de-ventas.destino.consumidor_final';

/** Las variables que usa el registro, leídas con su valor para la empresa (empresa, cuenta, instalación o por omisión). */
export class ConfiguracionDeVentasEnConfiguracion implements LectorDeConfiguracionDeVentas {
  async paraEmpresa({ cuentaId, empresaId }: Operador): Promise<ConfiguracionDeVentas> {
    const destino = { cuentaId, empresaId };
    const { lector } = configuracion;
    return {
      tasaDeIva: aCentesimasDeConfiguracion(await lector.obtener<number>(TASA_DE_IVA, destino)),
      fechaDeDerogacion: await lector.obtener<string>(FECHA_DE_DEROGACION, destino),
      consumidorFinal: await lector.obtener<ConfiguracionDeVentas['consumidorFinal']>(CONSUMIDOR_FINAL, destino),
    };
  }
}
