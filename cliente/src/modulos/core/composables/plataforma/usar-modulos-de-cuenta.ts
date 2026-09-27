import { reactive } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiPlataforma, type CuentaPlataforma, type EstadoModulo } from '../../servicios/plataforma.api';
import { usarFormulario } from '../usar-formulario';

const cambiarModulo = (cuentaId: string, modulo: EstadoModulo, activar: boolean) =>
  activar
    ? apiPlataforma.activarModulo(cuentaId, modulo.clave)
    : apiPlataforma.desactivarModulo(cuentaId, modulo.clave);

/** La ventana que activa o desactiva los módulos contratados de una cuenta. */
export function usarModulosDeCuenta() {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();
  const gestion = reactive({ abierta: false, cuenta: null as CuentaPlataforma | null, modulos: [] as EstadoModulo[] });

  async function abrir(cuenta: CuentaPlataforma): Promise<void> {
    try {
      Object.assign(gestion, { abierta: true, cuenta, modulos: await apiPlataforma.modulosDeCuenta(cuenta.id) });
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los módulos.');
    }
  }

  /** El servidor responde con todos los módulos: activar uno puede cambiar otros. */
  async function cambiar(modulo: EstadoModulo, activar: boolean): Promise<void> {
    const cuenta = gestion.cuenta;
    if (cuenta) await enviar(async () => (gestion.modulos = await cambiarModulo(cuenta.id, modulo, activar)));
  }

  return { gestion, enviando, abrir, cambiar };
}
