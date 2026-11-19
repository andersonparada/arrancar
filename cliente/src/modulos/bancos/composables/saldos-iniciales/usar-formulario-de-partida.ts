import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type {
  ParteQueSeAgrega,
  PartidaDeApertura,
  PartidaGuardada,
  SaldoInicialDeCuenta,
} from '../../servicios/tipos-de-saldos-iniciales';
import { mensajesDeAvisosAlGuardar } from './avisos-de-partida';
import { datosDePartida, edicionDePartida, edicionNuevaDePartida, type EdicionDePartida } from './edicion-de-partida';
import { usarConceptosDelPosfechado } from './usar-conceptos-del-posfechado';

/** Manda la partida: agrega si es nueva y corrige si ya tiene movimiento. */
function enviarLaPartida(cuentaBancariaId: string, edicion: EdicionDePartida): Promise<PartidaGuardada> {
  const { movimientoId, parte } = edicion;
  const datos = datosDePartida(edicion);
  return movimientoId
    ? apiSaldosIniciales.corregirPartida(cuentaBancariaId, movimientoId, datos)
    : apiSaldosIniciales.agregarPartida(cuentaBancariaId, parte, datos);
}

type Avisos = ReturnType<typeof usarAvisos>;

/** El éxito y los avisos que no bloquean (con el texto de ley del cliente en cheque antiguo y depósito viejo). */
function avisarLoGuardado(
  avisos: Avisos,
  guardada: PartidaGuardada,
  contexto: { esNueva: boolean; corte: string | null },
) {
  avisos.exito(contexto.esNueva ? 'Partida agregada.' : 'Partida corregida.');
  const textos = { corte: contexto.corte, dar: formatearFecha };
  mensajesDeAvisosAlGuardar(guardada.avisos, guardada.partida, textos).forEach((mensaje) => avisos.info(mensaje));
}

/** La ventana: su edición y cómo se abre para agregar o corregir; `alAbrir` limpia errores y pide lo que haga falta. */
function usarVentanaDePartida(saldo: Ref<SaldoInicialDeCuenta | null>, alAbrir: (abierta: EdicionDePartida) => void) {
  const edicion = ref<EdicionDePartida>({ ...edicionNuevaDePartida('cheque_en_circulacion', null), abierta: false });
  const abrir = (nueva: EdicionDePartida): void => {
    edicion.value = nueva;
    alAbrir(nueva);
  };
  return {
    edicion,
    agregar: (parte: ParteQueSeAgrega): void => abrir(edicionNuevaDePartida(parte, saldo.value?.fechaDeCorte ?? null)),
    corregir: (partida: PartidaDeApertura): void => abrir(edicionDePartida(partida)),
    cerrar: (): void => void (edicion.value.abierta = false),
  };
}

type Ventana = ReturnType<typeof usarVentanaDePartida>;
type Enviar = ReturnType<typeof usarFormulario>['enviar'];

interface ContextoDelGuardado {
  cuentaBancariaId: string;
  saldo: Ref<SaldoInicialDeCuenta | null>;
  alGuardar: () => Promise<void>;
}

/** Guardar la partida de la ventana: la manda, avisa lo que haya que avisar, la cierra y recarga la ficha. */
function usarGuardadoDePartida(contexto: ContextoDelGuardado, ventana: Ventana, enviar: Enviar) {
  const avisos = usarAvisos();

  async function guardar(): Promise<void> {
    const resultado = ref<PartidaGuardada | null>(null);
    const { edicion } = ventana;
    const enviada = await enviar(
      async () => void (resultado.value = await enviarLaPartida(contexto.cuentaBancariaId, edicion.value)),
    );
    if (!enviada || !resultado.value) return;
    const corte = contexto.saldo.value?.fechaDeCorte ?? null;
    avisarLoGuardado(avisos, resultado.value, { esNueva: edicion.value.movimientoId === null, corte });
    ventana.cerrar();
    await contexto.alGuardar();
  }

  return { guardar };
}

/** La ventana de agregar o corregir una partida de apertura (cualquiera de las cinco partes). */
export function usarFormularioDePartida(
  cuentaBancariaId: string,
  saldo: Ref<SaldoInicialDeCuenta | null>,
  alGuardar: () => Promise<void>,
) {
  const conceptos = usarConceptosDelPosfechado();
  const { enviando, errores, enviar } = usarFormulario();
  const ventana = usarVentanaDePartida(saldo, (nueva) => {
    errores.value = {};
    if (nueva.parte === 'cheque_posfechado') void conceptos.cargar();
  });
  const { guardar } = usarGuardadoDePartida({ cuentaBancariaId, saldo, alGuardar }, ventana, enviar);
  return { ...ventana, enviando, errores, guardar, opcionesDeConcepto: conceptos.opciones };
}
