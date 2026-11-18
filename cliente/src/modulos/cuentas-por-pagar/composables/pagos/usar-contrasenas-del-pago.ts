import { watch } from 'vue';
import { contrasenasIniciales, proponerMontos, type EdicionDePago } from './edicion-de-pago';
import type { usarCargosParaPagar } from './usar-datos-del-pago';

export interface PuntoDeInicio {
  proveedorId?: string;
  contrasenaId?: string;
}

/** El proveedor y la fecha que hay ahora en el formulario. */
const vigente = (edicion: EdicionDePago) => ({ proveedorId: edicion.proveedorId, fecha: edicion.fecha });

type Cargos = ReturnType<typeof usarCargosParaPagar>;

/** Al elegir proveedor: trae lo que se le puede pagar y deja incluida la contraseña de la que se vino (o todas). */
function usarEleccionDelProveedor(edicion: EdicionDePago, cargos: Cargos, inicio: PuntoDeInicio) {
  let abierta = inicio.contrasenaId ?? null;

  async function elegirProveedor(proveedorId: string): Promise<void> {
    Object.assign(edicion, { contrasenasIncluidas: [], montos: {}, diferencias: [], movimientoId: '' });
    const mesPedido = edicion.fecha.slice(0, 7);
    const datos = await cargos.traer(proveedorId, {
      contrasenaId: abierta ?? undefined,
      fecha: edicion.fecha || undefined,
    });
    if (!datos) return;
    // Si la fecha cambió de mes mientras cargaba, la suma que llegó es de otro mes: se vuelve a pedir.
    if (edicion.fecha.slice(0, 7) !== mesPedido) void cargos.actualizarSumaDelMes(() => vigente(edicion));
    edicion.contrasenasIncluidas = contrasenasIniciales(datos, abierta);
    edicion.montos = proponerMontos(datos.cargos, edicion.contrasenasIncluidas, {});
    abierta = null;
  }

  watch(() => edicion.proveedorId, elegirProveedor);
  if (inicio.proveedorId) edicion.proveedorId = inicio.proveedorId;
  return elegirProveedor;
}

/** Qué contraseñas entran en el pago: las del punto de inicio, y las que el usuario agregue o quite (M2). */
export function usarContrasenasDelPago(edicion: EdicionDePago, cargos: Cargos, inicio: PuntoDeInicio) {
  const elegirProveedor = usarEleccionDelProveedor(edicion, cargos, inicio);

  function agregarContrasena(id: string): void {
    if (!cargos.datos.value || edicion.contrasenasIncluidas.includes(id)) return;
    edicion.contrasenasIncluidas = [...edicion.contrasenasIncluidas, id];
    edicion.montos = proponerMontos(cargos.datos.value.cargos, [id], edicion.montos);
  }

  const quitarContrasena = (id: string): void => {
    edicion.contrasenasIncluidas = edicion.contrasenasIncluidas.filter((otra) => otra !== id);
  };

  // La suma pagada en el mes cambia con el mes de la fecha del pago.
  watch(
    () => edicion.fecha.slice(0, 7),
    () => cargos.actualizarSumaDelMes(() => vigente(edicion)),
  );
  return { elegirProveedor, agregarContrasena, quitarContrasena };
}
