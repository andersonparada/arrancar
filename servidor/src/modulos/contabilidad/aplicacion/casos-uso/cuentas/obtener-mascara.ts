import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DependenciasDeCuentas } from './dependencias-de-cuentas.js';

/** Lo que la pantalla de la nomenclatura necesita saber del inicio, sin pedir el permiso del inicio. */
export interface MascaraDeLaEmpresa {
  /** `null` mientras la empresa no haya iniciado su contabilidad. */
  mascara: string | null;
}

/** La máscara de los códigos de cuenta de la empresa, o `null` si todavía no inició su contabilidad. */
export class ObtenerMascara {
  constructor(private readonly dependencias: Pick<DependenciasDeCuentas, 'unidadDeTrabajo' | 'inicios'>) {}

  ejecutar(operador: Operador): Promise<MascaraDeLaEmpresa> {
    const { unidadDeTrabajo, inicios } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const inicio = await inicios.obtener();
      return { mascara: inicio ? inicio.mascara.texto : null };
    });
  }
}
