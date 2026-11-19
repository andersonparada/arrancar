import { configuracion } from '../../configuracion/contexto.js';
import { fechaLocalEn } from '../../compartido/dominio/fecha-local.js';
import { ZONA_HORARIA_DE_LA_EMPRESA } from '../../compartido/infraestructura/politica-de-zona-horaria.configuracion.js';
import type { HoyDeLaInstalacion } from '../aplicacion/tipos-de-cambio.js';

/**
 * Hoy en la zona horaria de la instalación (`core.regional.zona_horaria` en su nivel de instalación): los tipos de
 * cambio son de toda la instalación y el servicio se usa también sin empresa, como en la tarea de carga.
 */
export class RelojDeLaInstalacion implements HoyDeLaInstalacion {
  constructor(private readonly ahora: () => Date = () => new Date()) {}

  async hoy(): Promise<string> {
    const zona = await configuracion.lector.obtener<string>(ZONA_HORARIA_DE_LA_EMPRESA, {
      cuentaId: null,
      empresaId: null,
    });
    return fechaLocalEn(this.ahora(), zona);
  }
}
