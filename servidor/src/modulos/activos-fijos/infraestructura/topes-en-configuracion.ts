import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { LectorDeTopes, TopesPorInciso } from '../aplicacion/puertos/lector-de-topes.js';
import { claveDelTope, INCISOS_FISCALES, esTerreno } from '../dominio/incisos-fiscales.js';

/** Los máximos de ley de cada inciso, en una sola lectura de la configuración (los terrenos no tienen: 0). */
export class TopesEnConfiguracion implements LectorDeTopes {
  async paraEmpresa({ cuentaId, empresaId }: ContextoEmpresa): Promise<TopesPorInciso> {
    const variables = await configuracion.lector.listar({ destino: { cuentaId, empresaId } });
    const valores = new Map(variables.map((variable) => [variable.clave, Number(variable.efectivo)]));
    const tope = (inciso: (typeof INCISOS_FISCALES)[number]) => ({
      porcentajeMaximo: esTerreno(inciso) ? 0 : (valores.get(claveDelTope(inciso)) ?? 0),
    });
    return Object.fromEntries(INCISOS_FISCALES.map((inciso) => [inciso, tope(inciso)])) as TopesPorInciso;
  }
}
