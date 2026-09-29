import { computed, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCheques } from '../../servicios/cheques.api';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiSugerencias } from '../../servicios/sugerencias.api';
import { usarSugerenciaAlCapturar } from '../sugerencias/usar-sugerencia-al-capturar';
import { opcionesDeConceptoDeCheque } from '../conceptos/opciones-de-concepto';
import { usarCatalogoDeConceptos } from '../conceptos/usar-catalogo-de-conceptos';
import { datosDeEmisionDeCheque, edicionDeCheque, type EdicionDeCheque } from './edicion-de-cheque';
import { usarSeleccionDeCheque } from './usar-seleccion-de-cheque';

/** Los conceptos del cheque (con «Pago a proveedores» solo sin Cuentas por pagar) y el que propone el servidor. */
function usarConceptosDeCheque(edicion: Ref<EdicionDeCheque>) {
  const sesion = usarSesion();
  const { conceptos } = usarCatalogoDeConceptos();
  const opcionesDeConceptos = computed(() =>
    opcionesDeConceptoDeCheque(conceptos.value, sesion.moduloActivo('cuentas-por-pagar')),
  );
  const { sugerencia } = usarSugerenciaAlCapturar({
    edicion,
    opciones: opcionesDeConceptos,
    pregunta: (datos) => apiSugerencias.paraCheque(datos),
    habilitada: () => edicion.value.abierta && sesion.puede('bancos.cheques.emitir'),
  });
  return { opcionesDeConceptos, sugerencia };
}

/** Enviar la emisión: avisar, cerrar la ventana y recargar; los errores se reparten por campo. */
function usarEmision(edicion: Ref<EdicionDeCheque>, alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  async function guardar(): Promise<void> {
    const { chequeId } = edicion.value;
    if (!chequeId) return;
    if (!(await enviar(() => apiCheques.emitir(chequeId, datosDeEmisionDeCheque(edicion.value))))) return;
    avisos.exito('Cheque emitido.');
    edicion.value.abierta = false;
    await alGuardar();
  }

  return { enviando, errores, guardar };
}

/** La ventana de emitir un cheque desde Cheques: elegir cuenta, número y concepto, y guardarlo. */
export function usarFormularioDeCheque(alGuardar: () => Promise<void>) {
  const edicion = ref<EdicionDeCheque>({ ...edicionDeCheque(), abierta: false });
  const cuentaElegida = computed(() => edicion.value.cuentaBancariaId);
  const { opciones: opcionesDeCheque, sugerido } = usarSeleccionDeCheque(cuentaElegida);
  const { opcionesDeConceptos, sugerencia } = usarConceptosDeCheque(edicion);
  const emision = usarEmision(edicion, alGuardar);

  watch(sugerido, (chequeId) => (edicion.value.chequeId = chequeId));

  function nueva(): void {
    edicion.value = edicionDeCheque();
    emision.errores.value = {};
  }

  return { edicion, ...emision, opcionesDeCheque, opcionesDeConcepto: opcionesDeConceptos, sugerencia, nueva };
}
