import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { ConfiguracionFiscal, LectorDeConfiguracionFiscal } from '../aplicacion/puertos/puertos-de-documentos.js';
import { aCentesimasDeConfiguracion } from '../dominio/aritmetica-fiscal.js';
import { configuracionDeRetenciones } from '../dominio/configuracion-de-retenciones.js';

const TASA_DE_IVA = 'libro-de-compras.iva.tasa';
const DIAS_DEL_IVA = 'libro-de-compras.plazos.dias_habiles_entero_iva';
const DIAS_DEL_ISR = 'libro-de-compras.plazos.dias_habiles_entero_isr';

/** Las variables del módulo con su valor para la empresa (empresa, cuenta, instalación o por omisión), en una lectura. */
export class ConfiguracionFiscalEnConfiguracion implements LectorDeConfiguracionFiscal {
  async paraEmpresa({ cuentaId, empresaId }: ContextoEmpresa): Promise<ConfiguracionFiscal> {
    const variables = await configuracion.lector.listar({ destino: { cuentaId, empresaId } });
    const valores = new Map(variables.map((variable) => [variable.clave, variable.efectivo as number | boolean]));
    const valor = (clave: string): number | boolean => valores.get(clave) ?? 0;
    return {
      tasaDeIva: aCentesimasDeConfiguracion(Number(valor(TASA_DE_IVA))),
      retenciones: configuracionDeRetenciones(valor),
      diasHabilesIva: Number(valor(DIAS_DEL_IVA)),
      diasHabilesIsr: Number(valor(DIAS_DEL_ISR)),
    };
  }
}
