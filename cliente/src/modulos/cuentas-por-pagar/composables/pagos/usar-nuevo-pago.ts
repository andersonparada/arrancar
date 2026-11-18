import { computed, reactive, watch, type Ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { fechaDeHoy } from '../dinero';
import { edicionDePagoVacia, type EdicionDePago } from './edicion-de-pago';
import type { MediosDePago } from '../../servicios/tipos-de-pagos';
import { formasDisponibles, opcionesDeChequeras, opcionesDeCuentas } from './opciones-del-pago';
import { usarContrasenasDelPago, type PuntoDeInicio } from './usar-contrasenas-del-pago';
import { notaSigueEnLista } from './filtro-de-notas';
import { usarCatalogosDelPago } from './usar-catalogos-del-pago';
import { usarCargosParaPagar, usarProveedoresPorPagar } from './usar-datos-del-pago';
import { usarRegistroDePago } from './usar-registro-de-pago';
import { usarVistaDelPago } from './usar-vista-del-pago';

export type { PuntoDeInicio };

/** Que la forma elegida sea una que el usuario puede usar; si no, la primera de sus pestañas. */
function mantenerUnaFormaValida(edicion: EdicionDePago, formas: () => EdicionDePago['forma'][]): void {
  watch(
    formas,
    (disponibles) => {
      if (disponibles.length > 0 && !disponibles.includes(edicion.forma)) edicion.forma = disponibles[0]!;
    },
    { immediate: true },
  );
}

/** Al cambiar de forma el medio de la anterior ya no sirve (chequera ≠ cuenta); si solo hay uno disponible, se deja elegido. */
function usarMedioPorOmision(edicion: EdicionDePago, medios: Ref<MediosDePago | null>): void {
  watch(
    () => [edicion.forma, medios.value] as const,
    ([forma, disponibles], anterior) => {
      if (anterior && anterior[0] !== forma) edicion.medio = '';
      const opciones = forma === 'cheque' ? opcionesDeChequeras(disponibles) : opcionesDeCuentas(disponibles);
      const libres = opciones.filter(({ deshabilitada }) => !deshabilitada);
      if (!edicion.medio && libres.length === 1) edicion.medio = libres[0]!.valor;
    },
    { immediate: true },
  );
}

/** Las pestañas que el usuario puede usar según sus permisos y si puede saldar diferencias de centavos. */
function usarFormasDelPago(edicion: EdicionDePago, cargos: ReturnType<typeof usarCargosParaPagar>) {
  const sesion = usarSesion();
  const formas = computed(() => formasDisponibles(sesion.puede, cargos.datos.value?.cargos ?? null));
  mantenerUnaFormaValida(edicion, () => formas.value);
  // Sin ningún permiso de pago no hay pestañas, sin importar el proveedor.
  const sinPermisosDePago = computed(() => formasDisponibles(sesion.puede, null).length === 0);
  return { formas, sinPermisosDePago, puedeSaldar: computed(() => sesion.puede('cuentas-por-pagar.ajustes.crear')) };
}

/** Las cuentas y notas de Bancos, solo si el usuario puede usarlas; si el filtro saca a la nota elegida, se suelta. */
function usarCatalogosDelUsuario(edicion: EdicionDePago) {
  const sesion = usarSesion();
  const catalogos = usarCatalogosDelPago(
    () => sesion.puede('cuentas-por-pagar.pagos.emitir'),
    () => sesion.puede('cuentas-por-pagar.pagos.ligar-notas-de-debito'),
    fechaDeHoy,
  );
  watch(catalogos.notas, (notas) => {
    if (!notaSigueEnLista(edicion.movimientoId, notas)) edicion.movimientoId = '';
  });
  return catalogos;
}

/**
 * La pantalla «Nuevo pago» (M2): se paga a un proveedor, con los cargos autorizados de una o varias de sus contraseñas;
 * se escoge la forma, el medio, la fecha y cuánto a cada documento. Todo lo que se decide sale del servidor.
 */
export function usarNuevoPago(inicio: PuntoDeInicio) {
  const edicion = reactive(edicionDePagoVacia(fechaDeHoy()));
  const proveedores = usarProveedoresPorPagar(() => edicion.proveedorId);
  const catalogos = usarCatalogosDelUsuario(edicion);
  const cargos = usarCargosParaPagar();
  usarMedioPorOmision(edicion, catalogos.medios);
  const registro = usarRegistroDePago(edicion, cargos.datos, catalogos.notas);
  const contrasenas = usarContrasenasDelPago(edicion, cargos, inicio);

  /** Después de registrar, otro pago al mismo proveedor con los saldos ya al día. */
  async function pagarOtro(): Promise<void> {
    registro.resultado.value = null;
    await Promise.all([contrasenas.elegirProveedor(edicion.proveedorId), catalogos.recargarCatalogos()]);
  }

  return {
    edicion,
    ...proveedores,
    ...usarFormasDelPago(edicion, cargos),
    datos: cargos.datos,
    ...catalogos,
    ...usarVistaDelPago(edicion, cargos.datos, catalogos.notas),
    ...registro,
    ...contrasenas,
    pagarOtro,
  };
}
