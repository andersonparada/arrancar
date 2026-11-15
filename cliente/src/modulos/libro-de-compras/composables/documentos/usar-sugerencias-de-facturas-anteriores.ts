import { ref, watch } from 'vue';
import { apiFacturasAnteriores, type SugerenciasDeFacturasAnteriores } from '../../servicios/facturas-anteriores.api';
import type { EdicionDeDocumento } from './edicion-de-documento';
import { llevaFacturaAfectada } from './tipos-de-documento-sat';

const SIN_SUGERENCIAS: SugerenciasDeFacturasAnteriores = { fechaDeInicio: null, usadas: [], deLaBandeja: [] };

/**
 * Las facturas del sistema anterior que se proponen al registrar una nota: las que ya citan otras notas del proveedor
 * y los DTE de su bandeja. Si no se pueden traer (sin permiso, sin fecha de inicio) no se ofrece la opción y el
 * formulario sigue con las facturas del libro.
 */
export function usarSugerenciasDeFacturasAnteriores(edicion: EdicionDeDocumento) {
  const sugerencias = ref<SugerenciasDeFacturasAnteriores>(SIN_SUGERENCIAS);
  let numeroDePeticion = 0;

  async function traer(): Promise<void> {
    const peticion = ++numeroDePeticion;
    const { proveedorId } = edicion;
    // La fecha de inicio es de la empresa: no parpadea la opción mientras llegan las del nuevo proveedor.
    sugerencias.value = { ...sugerencias.value, usadas: [], deLaBandeja: [] };
    if (!proveedorId || !llevaFacturaAfectada(edicion.tipoDte)) return;
    const traidas = await apiFacturasAnteriores.sugerencias(proveedorId).catch(() => SIN_SUGERENCIAS);
    if (peticion === numeroDePeticion) sugerencias.value = traidas;
  }

  watch(() => [edicion.proveedorId, llevaFacturaAfectada(edicion.tipoDte)], traer, { immediate: true });

  return { sugerencias };
}
