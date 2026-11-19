import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiRetiros, type RepartoRegistrado, type Retiro } from '../../servicios/retiros.api';
import { fechaDeHoy } from '../dinero';
import { claveDeProveedor, erroresDelReparto, repartirErroresDelReparto, separarBloqueos } from './errores-del-reparto';
import { solicitudDelReparto, type ProveedorDelReparto } from './reparto-de-efectivo';
import { resumenDelReparto } from './resumen-del-reparto';

export const PERMISO_SIN_BANCARIZAR = 'cuentas-por-pagar.pagos.efectivo-sin-bancarizar';

type Errores = Record<string, string>;

/** Abre las secciones de los proveedores que tienen algo que corregir, para que el error no quede escondido. */
function abrirLosQueTienenError(proveedores: readonly ProveedorDelReparto[], errores: Errores): void {
  for (const proveedor of proveedores) {
    const suyos = Object.keys(errores).some(
      (campo) =>
        campo.startsWith(claveDeProveedor(proveedor.proveedorId, '')) ||
        (proveedor.datos?.cargos ?? []).some((cargo) => campo === `monto.${cargo.id}`),
    );
    if (suyos) proveedor.abierto = true;
  }
}

/**
 * Los errores del servidor vuelven a su proveedor y a su documento; un bloqueo de bancarización se queda con su texto en el
 * proveedor y, si el usuario tiene el permiso, le pide el motivo. Devuelve los errores que quedan por campo.
 */
function repartirErroresDelServidor(errores: Errores, proveedores: ProveedorDelReparto[], puede: boolean): Errores {
  const { errores: restantes, bloqueos } = separarBloqueos(
    repartirErroresDelReparto(errores, proveedores),
    proveedores,
  );
  for (const proveedor of proveedores) {
    const bloqueo = bloqueos[proveedor.proveedorId];
    if (bloqueo) Object.assign(proveedor, { bloqueo, pedirMotivo: puede, abierto: true });
  }
  abrirLosQueTienenError(proveedores, restantes);
  return restantes;
}

/** Valida y pide confirmar con el resumen de lo que va a pasar; devuelve `true` si todo está bien y el usuario acepta. */
async function validarYConfirmar(retiro: Retiro, proveedores: ProveedorDelReparto[], errores: Ref<Errores>) {
  errores.value = erroresDelReparto(proveedores, {
    disponible: retiro.disponible,
    fechaDelRetiro: retiro.fecha,
    hoy: fechaDeHoy(),
  });
  if (Object.keys(errores.value).length > 0) {
    abrirLosQueTienenError(proveedores, errores.value);
    return false;
  }
  return usarAvisos().confirmar({
    titulo: 'Confirmar el reparto',
    mensaje: resumenDelReparto(retiro, proveedores),
    textoConfirmar: 'Registrar los pagos',
  });
}

/**
 * Registrar todos los pagos del reparto de una vez: valida, confirma con el resumen y envía; el servidor guarda todos o
 * ninguno. Si bloquea un pago por bancarización, ese proveedor muestra el bloqueo y, con permiso, pide el motivo.
 */
export function usarRegistroDelReparto(retiro: Readonly<Ref<Retiro | null>>, proveedores: ProveedorDelReparto[]) {
  const sesion = usarSesion();
  const { enviando, errores, enviar } = usarFormulario();
  const resultado = ref<RepartoRegistrado | null>(null);

  async function registrar(): Promise<boolean> {
    const actual = retiro.value;
    if (!actual || !(await validarYConfirmar(actual, proveedores, errores))) return false;
    const solicitud = solicitudDelReparto(proveedores);
    const guardado = await enviar(async () => {
      resultado.value = await apiRetiros.repartir(actual.id, solicitud);
    });
    if (!guardado) {
      errores.value = repartirErroresDelServidor(errores.value, proveedores, sesion.puede(PERMISO_SIN_BANCARIZAR));
    }
    return guardado;
  }

  return { enviando, errores, resultado, registrar };
}
