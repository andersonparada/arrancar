import { configuracion } from '../../configuracion/contexto.js';
import { fechaLocalEn } from '../../compartido/dominio/fecha-local.js';
import { ZONA_HORARIA_DE_LA_EMPRESA } from '../../compartido/infraestructura/politica-de-zona-horaria.configuracion.js';
import type { RelojDeCarga } from '../aplicacion/casos-uso/cargar-tipos-de-cambio.js';
import type { HoyDeLaInstalacion } from '../aplicacion/tipos-de-cambio.js';

/**
 * Hoy en la zona horaria de la instalación (`core.regional.zona_horaria` en su nivel de instalación): los tipos de
 * cambio son de toda la instalación y el servicio se usa también sin empresa, como en la tarea de carga.
 */
export class RelojDeLaInstalacion implements HoyDeLaInstalacion, RelojDeCarga {
  constructor(private readonly reloj: () => Date = () => new Date()) {}

  ahora(): Date {
    return this.reloj();
  }

  zona(): Promise<string> {
    return configuracion.lector.obtener<string>(ZONA_HORARIA_DE_LA_EMPRESA, { cuentaId: null, empresaId: null });
  }

  async hoy(): Promise<string> {
    return fechaLocalEn(this.ahora(), await this.zona());
  }
}
