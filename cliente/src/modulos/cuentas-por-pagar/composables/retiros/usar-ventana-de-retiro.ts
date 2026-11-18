import { computed, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiUsuarios, type Usuario } from '@/modulos/core/servicios/usuarios.api';
import { apiPagos, type MediosDePago } from '../../servicios/pagos.api';
import { apiRetiros, type Retiro } from '../../servicios/retiros.api';
import { fechaDeHoy } from '../dinero';
import { opcionesDeChequeras, opcionesDeCuentas } from '../pagos/opciones-del-pago';
import {
  edicionDeRetiroVacia,
  erroresDelRetiro,
  resumenDelRetiro,
  solicitudDeRetiro,
  type EdicionDeRetiro,
} from './edicion-de-retiro';
import { medioPorOmision, nombreDelUsuario, opcionesDeCustodios } from './opciones-del-retiro';

/** Lo que la ventana recibe con `v-model`: lo escrito y si está abierta. */
export type EdicionDeLaVentanaDeRetiro = EdicionDeRetiro & { abierta: boolean };

const cerrada = (): EdicionDeLaVentanaDeRetiro => ({ ...edicionDeRetiroVacia(fechaDeHoy()), abierta: false });

/** Las cuentas y chequeras de Bancos y los usuarios que pueden ser custodios; lo que el usuario no puede ver queda vacío. */
function usarCatalogosDelRetiro() {
  const sesion = usarSesion();
  const medios = ref<MediosDePago | null>(null);
  const usuarios = ref<Usuario[]>([]);
  const cargando = ref(false);

  async function traer(fecha: string): Promise<void> {
    cargando.value = true;
    try {
      medios.value = await apiPagos.medios(fecha);
      if (sesion.puede('usuarios.ver') && usuarios.value.length === 0) usuarios.value = await apiUsuarios.listar();
    } catch (error) {
      usarAvisos().error(error instanceof Error ? error.message : 'No se pudieron cargar las cuentas de Bancos.');
    } finally {
      cargando.value = false;
    }
  }
  return {
    medios,
    cargando,
    traer,
    custodios: computed(() => opcionesDeCustodios(usuarios.value, sesion.empresa?.id ?? null)),
    puedeElegirUsuario: computed(() => sesion.puede('usuarios.ver') && usuarios.value.length > 0),
    usuarioPorId: (id: string) => usuarios.value.find((usuario) => usuario.id === id) ?? null,
  };
}

type Catalogos = ReturnType<typeof usarCatalogosDelRetiro>;

/** Lo que se le cuenta al usuario antes de confirmar: de dónde sale el dinero y quién lo lleva. */
function resumenAntesDeConfirmar(edicion: EdicionDeRetiro, catalogos: Catalogos): string {
  const usuario = edicion.custodioUsuarioId ? catalogos.usuarioPorId(edicion.custodioUsuarioId) : null;
  const nombre = usuario ? nombreDelUsuario(usuario) : edicion.custodio.trim();
  const opciones =
    edicion.forma === 'cheque'
      ? opcionesDeChequeras(catalogos.medios.value)
      : opcionesDeCuentas(catalogos.medios.value);
  const medio = opciones.find(({ valor }) => valor === edicion.medio)?.texto.split(' · ')[0];
  return resumenDelRetiro(edicion, nombre, medio ?? 'la cuenta elegida');
}

/** Los errores de lo escrito; si el custodio es un usuario, su nombre decide a nombre de quién va el cheque. */
function erroresAntesDeEnviar(edicion: EdicionDeRetiro, catalogos: Catalogos): Record<string, string> {
  const usuario = edicion.custodioUsuarioId ? catalogos.usuarioPorId(edicion.custodioUsuarioId) : null;
  return erroresDelRetiro(edicion, fechaDeHoy(), usuario ? nombreDelUsuario(usuario) : '');
}

/** El estado de la ventana: se abre con la fecha de hoy y, al cambiar de forma, la chequera de una no sirve de cuenta en la otra. */
function usarEstadoDeLaVentana(catalogos: Catalogos) {
  const edicion = ref<EdicionDeLaVentanaDeRetiro>(cerrada());
  const resultado = ref<Retiro | null>(null);
  async function abrir(): Promise<void> {
    edicion.value = { ...cerrada(), abierta: true };
    resultado.value = null;
    await catalogos.traer(edicion.value.fecha);
    edicion.value.medio = medioPorOmision(edicion.value.forma, catalogos.medios.value);
  }
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  watch(
    () => edicion.value.forma,
    (forma) => {
      edicion.value.medio = medioPorOmision(forma, catalogos.medios.value);
    },
  );
  return { edicion, resultado, abrir, cerrar };
}

/**
 * La ventana «Retirar efectivo»: trae las cuentas al abrir, valida, confirma con el resumen y registra. Al terminar deja el
 * retiro creado (con los avisos de bancarización y de Bancos) para que la ventana los muestre antes de seguir.
 */
export function usarVentanaDeRetiro(alRegistrar: () => Promise<void>) {
  const { enviando, errores, enviar } = usarFormulario();
  const catalogos = usarCatalogosDelRetiro();
  const { edicion, resultado, abrir, cerrar } = usarEstadoDeLaVentana(catalogos);

  async function guardar(): Promise<void> {
    errores.value = erroresAntesDeEnviar(edicion.value, catalogos);
    if (Object.keys(errores.value).length > 0) return;
    const confirmado = await usarAvisos().confirmar({
      titulo: 'Confirmar el retiro',
      mensaje: resumenAntesDeConfirmar(edicion.value, catalogos),
      textoConfirmar: 'Registrar el retiro',
    });
    if (!confirmado) return;
    const solicitud = solicitudDeRetiro(edicion.value);
    const guardado = await enviar(async () => {
      resultado.value = await apiRetiros.registrar(solicitud);
    });
    if (guardado) await alRegistrar();
  }

  const abrirLimpio = async (): Promise<void> => {
    errores.value = {};
    await abrir();
  };

  return { edicion, enviando, errores, resultado, abrir: abrirLimpio, cerrar, guardar, ...catalogos };
}
