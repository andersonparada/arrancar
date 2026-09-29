import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DatosDeIdentificacionDto } from '../../dto/datos-de-empresa.dto.js';
import type { DependenciasDeDatosDeEmpresa } from './dependencias.js';

/** Respuesta de la orden `empresas.obtener_carga_inicial`. */
export interface CargaInicialParaModulos {
  fechaDeInicio: string | null;
  cerrada: boolean;
}

/**
 * Atiende las órdenes que otros módulos envían por el mediador. Corren dentro de la transacción de
 * quien pregunta, así que la empresa debe ser la de su operador; el permiso lo exige la ruta que origina.
 */
export class AtenderOrdenesDeDatosDeEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  /** Toma un bloqueo compartido sobre la carga inicial: quien intente cerrarla espera a que termine el que pregunta. */
  obtenerCargaInicial(operador: Operador, empresaId: string): Promise<CargaInicialParaModulos> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId }, async () => {
      const { fechaDeInicio, cerrada } = await consultas.cargaInicialBloqueandoElCierre(empresaId);
      return { fechaDeInicio, cerrada };
    });
  }

  obtenerDatosDeEmpresa(operador: Operador, empresaId: string): Promise<DatosDeIdentificacionDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId }, () => consultas.datosDeIdentificacion(empresaId));
  }
}

type Dependencias = Pick<DependenciasDeDatosDeEmpresa, 'unidadDeTrabajo' | 'consultas'>;
