import { computed, reactive, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiNotas, type DatosDeDesmarcado } from '../../servicios/notas.api';
import type { Movimiento } from '../../servicios/movimientos.api';
import { liberarReservados, opcionesDeConcepto } from '../conceptos/opciones-de-concepto';
import { usarCatalogoDeConceptos } from '../conceptos/usar-catalogo-de-conceptos';
import { resumenDeMarcado } from './marca-de-nota';

/** Marcar una nota de débito para Cuentas por pagar: se confirma con el resumen y se recarga la lista. */
function usarMarcado(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();

  async function marcar(nota: Movimiento): Promise<void> {
    const aceptado = await avisos.confirmar({
      titulo: 'Marcar para Cuentas por pagar',
      mensaje: resumenDeMarcado(nota),
      textoConfirmar: 'Marcar',
    });
    if (!aceptado) return;
    try {
      await apiNotas.marcar(nota.id);
      avisos.exito('Nota marcada para Cuentas por pagar.');
      await alTerminar();
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo marcar la nota.');
    }
  }

  return { marcar };
}

/** Lo que se escribe en la ventana de desmarcar: la nota, el motivo y el concepto con que sigue (débitos, por nombre). */
function usarDatosDeDesmarcado() {
  const sesion = usarSesion();
  const { conceptos } = usarCatalogoDeConceptos();
  const registro = ref<Movimiento | null>(null);
  const motivo = ref('');
  const conceptoId = ref<string | null>(null);
  const opciones = computed(() =>
    opcionesDeConcepto(liberarReservados(conceptos.value, sesion.moduloActivo), ['debito']),
  );

  function abrir(nota: Movimiento): void {
    registro.value = nota;
    motivo.value = '';
    conceptoId.value = null;
  }

  return { registro, motivo, conceptoId, opciones, abrir };
}

type EnvioDeDesmarcado = (nota: Movimiento, cuerpo: DatosDeDesmarcado) => Promise<unknown>;

const desmarcarDesdeNotas: EnvioDeDesmarcado = (nota, cuerpo) => apiNotas.desmarcar(nota.id, cuerpo);

/** Quitar la marca: por omisión desde Notas; la conciliación pasa su propio envío. Pide el motivo y el concepto. */
export function usarDesmarcado(alTerminar: () => Promise<void>, enviarDesmarcado = desmarcarDesdeNotas) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const { abrir, ...datos } = usarDatosDeDesmarcado();

  async function confirmar(): Promise<void> {
    const nota = datos.registro.value;
    if (!nota) return;
    const cuerpo = { motivo: datos.motivo.value, conceptoId: datos.conceptoId.value ?? '' };
    if (!(await enviar(() => enviarDesmarcado(nota, cuerpo)))) return;
    avisos.exito('Se quitó la marca de la nota.');
    datos.registro.value = null;
    await alTerminar();
  }

  const abrirLimpio = (nota: Movimiento): void => {
    abrir(nota);
    errores.value = {};
  };
  const cerrar = (): void => void (datos.registro.value = null);
  return reactive({ ...datos, enviando, errores, abrir: abrirLimpio, confirmar, cerrar });
}

/** Las dos acciones de la marca de una nota: marcar (con confirmación) y desmarcar (con motivo y concepto). */
export function usarMarcasDeNota(alTerminar: () => Promise<void>) {
  return { ...usarMarcado(alTerminar), desmarcado: usarDesmarcado(alTerminar) };
}
