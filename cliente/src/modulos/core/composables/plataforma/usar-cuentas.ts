import { computed } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiPlataforma, type CuentaPlataforma } from '../../servicios/plataforma.api';
import { usarCarga } from '../usar-carga';
import { usarFormulario } from '../usar-formulario';

const cuentasYModulos = () => Promise.all([apiPlataforma.listarCuentas(), apiPlataforma.catalogoModulos()]);

/** Suspender deja a toda la cuenta sin entrar: se confirma. Reactivar no. */
const confirmarSuspension = (avisos: ReturnType<typeof usarAvisos>, cuenta: CuentaPlataforma) =>
  avisos.confirmar({
    titulo: 'Suspender cuenta',
    mensaje: `Nadie de "${cuenta.nombre}" podrá entrar hasta que se reactive. Los datos se conservan.`,
    textoConfirmar: 'Suspender',
    peligroso: true,
  });

/** Las cuentas suscriptoras, el catálogo de módulos y suspender o reactivar una cuenta. */
export function usarCuentas() {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();
  const { datos, cargar } = usarCarga(cuentasYModulos, [[], []], 'No se pudieron cargar las cuentas.');

  async function cambiarEstado(cuenta: CuentaPlataforma): Promise<void> {
    const activa = !cuenta.activa;
    if (!activa && !(await confirmarSuspension(avisos, cuenta))) return;
    if (await enviar(() => apiPlataforma.actualizarCuenta(cuenta.id, { activa }))) await cargar();
  }

  return { cuentas: computed(() => datos.value[0]), catalogo: computed(() => datos.value[1]), cargar, cambiarEstado };
}
