import type { UnwrapNestedRefs } from 'vue';
import { useRouter } from 'vue-router';
import type { Fondo } from '../../servicios/tipos-de-fondos';
import { usarAsignacion } from './usar-asignacion';
import { usarBajaDeComprobante } from './usar-baja-de-comprobante';
import { usarValeDeGasto } from './usar-vale-de-gasto';

/**
 * Lo que se hace con los comprobantes desde la ficha de un fondo: agregar una factura (Ingreso de facturas del libro, que
 * vuelve a esta ficha), tomar las de la bandeja, asignar una con retención, hacer un vale y devolver o anular.
 */
export function usarAccionesDeComprobantes(fondo: () => Fondo | null, recargar: () => Promise<unknown>) {
  const router = useRouter();
  const id = (): string => fondo()?.id ?? '';

  /** Ingreso de facturas con la referencia del fondo: el documento queda en este fondo y vuelve aquí al registrarlo. */
  function agregarFactura(): void {
    const actual = fondo();
    if (!actual) return;
    void router.push({
      name: 'libro-de-compras.documentos.nuevo',
      query: {
        destino: 'caja-chica',
        referencia: actual.id,
        etiqueta: `Fondo ${actual.nombre}`,
        volver: `/caja-chica/fondos/${actual.id}`,
      },
    });
  }

  return {
    asignacion: usarAsignacion(recargar),
    vale: usarValeDeGasto(id, recargar),
    baja: usarBajaDeComprobante(recargar),
    agregarFactura,
    desdeLaBandeja: () => void router.push({ name: 'caja-chica.bandeja', query: { fondo: id() } }),
  };
}

/** Lo que devuelve `usarAccionesDeComprobantes` envuelto en `reactive`, como lo recibe la ventana. */
export type AccionesDeComprobantesEnVista = UnwrapNestedRefs<ReturnType<typeof usarAccionesDeComprobantes>>;
