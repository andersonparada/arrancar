import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCheques } from '../../servicios/cheques.api';
import type { FilaDelReporte } from '../../servicios/movimientos.api';
import { apiNotas } from '../../servicios/notas.api';
import { opcionesParaClasificar } from '../conceptos/opciones-de-concepto';
import { usarCatalogoDeConceptos } from '../conceptos/usar-catalogo-de-conceptos';
import { sePuedeReclasificar, sinElConceptoActual } from './reclasificacion-de-fila';

/** Los conceptos que sirven a la fila (sin el que ya tiene) y el nombre del elegido. */
function usarOpciones(fila: Ref<FilaDelReporte | null>, conceptoId: Ref<string | null>) {
  const sesion = usarSesion();
  const { conceptos } = usarCatalogoDeConceptos();
  const opciones = computed(() => {
    if (!fila.value) return [];
    const base = opcionesParaClasificar(conceptos.value, [fila.value.tipo], sesion.moduloActivo('cuentas-por-pagar'));
    return sinElConceptoActual(base, fila.value.conceptoId);
  });
  const nombreElegido = computed(() => opciones.value.find((o) => o.valor === conceptoId.value)?.texto ?? null);
  return { opciones, nombreElegido };
}

const puedeElUsuario = (permiso: string): boolean => usarSesion().puede(permiso);

/**
 * «Reclasificar» una fila del reporte de Movimientos: cambia solo el concepto de una nota (`bancos.notas.editar`) o
 * de un cheque (`bancos.cheques.reclasificar`). Ofrece los conceptos que sirven a esa fila (con «Pago a
 * proveedores» en cheques solo si Cuentas por pagar no está activo), sin el que ya tiene. Al terminar recarga.
 */
export function usarReclasificacionDeFila(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const fila = ref<FilaDelReporte | null>(null);
  const conceptoId = ref<string | null>(null);
  const { opciones, nombreElegido } = usarOpciones(fila, conceptoId);

  async function confirmar(): Promise<void> {
    const actual = fila.value;
    const concepto = conceptoId.value;
    if (!actual || !concepto) return;
    const api = actual.tipo === 'cheque' ? apiCheques : apiNotas;
    if (!(await enviar(() => api.reclasificar({ movimientoIds: [actual.id], conceptoId: concepto })))) return;
    avisos.exito(`Concepto cambiado a «${nombreElegido.value}».`);
    fila.value = null;
    await alTerminar();
  }

  function abrir(elegida: FilaDelReporte): void {
    fila.value = elegida;
    conceptoId.value = null;
    errores.value = {};
  }

  const cerrar = () => (fila.value = null);
  const puede = (candidata: FilaDelReporte) => sePuedeReclasificar(candidata, puedeElUsuario);

  return { fila, conceptoId, opciones, nombreElegido, enviando, errores, abrir, confirmar, cerrar, puede };
}
