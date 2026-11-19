import type { LectorDeConfiguracion } from '../../configuracion/aplicacion/lector-de-configuracion.js';
import { DESTINO_INSTALACION } from '../../configuracion/dominio/destino.js';
import { MESES_DE_AUDITORIA } from '../../bitacora/aplicacion/casos-uso/depurar-auditoria.js';
import type { TopesDeCorreo } from '../dominio/cupos-de-correo.js';
import type { ParametrosDeCorreo } from '../aplicacion/puertos/parametros-de-correo.js';
import { CLAVES_DE_CORREO } from '../configuracion.js';

const NOMBRE_DE_LA_APLICACION = 'core.interfaz.nombre_aplicacion';

/** Lee de la configuración de la instalación (sin empresa ni cuenta: sirve al trabajador y a la depuración). */
export class ParametrosEnConfiguracion implements ParametrosDeCorreo {
  constructor(private readonly lector: Pick<LectorDeConfiguracion, 'obtener'>) {}

  private leer(clave: string): Promise<number> {
    return this.lector.obtener<number>(clave, DESTINO_INSTALACION);
  }

  async topes(): Promise<TopesDeCorreo> {
    const [porHoraPorCuenta, porDiaPorCuenta, porDiaPorDestinatario, porHoraDeLaInstalacion] = await Promise.all([
      this.leer(CLAVES_DE_CORREO.topePorHoraPorCuenta),
      this.leer(CLAVES_DE_CORREO.topePorDiaPorCuenta),
      this.leer(CLAVES_DE_CORREO.topePorDiaPorDestinatario),
      this.leer(CLAVES_DE_CORREO.topePorHoraDeLaInstalacion),
    ]);
    return { porHoraPorCuenta, porDiaPorCuenta, porDiaPorDestinatario, porHoraDeLaInstalacion };
  }

  nombreDeLaAplicacion(): Promise<string> {
    return this.lector.obtener<string>(NOMBRE_DE_LA_APLICACION, DESTINO_INSTALACION);
  }

  async conservacion(): Promise<{ diasDelContenido: number; mesesDeLosMetadatos: number }> {
    const [diasDelContenido, mesesDeLosMetadatos] = await Promise.all([
      this.leer(CLAVES_DE_CORREO.diasDeConservacionDelContenido),
      this.leer(MESES_DE_AUDITORIA),
    ]);
    return { diasDelContenido, mesesDeLosMetadatos };
  }
}
