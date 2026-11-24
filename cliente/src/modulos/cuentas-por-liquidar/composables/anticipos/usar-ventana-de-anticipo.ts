import { computed, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiAnticipos, type Anticipo, type AnticipoResumen } from '../../servicios/anticipos.api';
import { fechaDeHoy, esFechaCompleta } from '../reportes/fechas-de-reportes';
import {
  edicionDeAnticipoVacia,
  erroresDelAnticipo,
  fechaLimitePropuesta,
  resumenDeLaEntrega,
  solicitudDeEntrega,
  type EdicionDeAnticipo,
} from './edicion-de-anticipo';
import { medioPorOmision, nombreDelMedio } from './opciones-de-medios';
import { usarBeneficiarioNuevo } from './usar-beneficiario-nuevo';
import { usarCatalogosDelAnticipo, vencidosDelBeneficiario } from './usar-catalogos-del-anticipo';

/** Lo que la ventana recibe con `v-model`: lo escrito y si está abierta. */
export type EdicionDeLaVentanaDeAnticipo = EdicionDeAnticipo & { abierta: boolean };

const DIAS_POR_OMISION = 15;
const cerrada = (): EdicionDeLaVentanaDeAnticipo => ({ ...edicionDeAnticipoVacia(fechaDeHoy()), abierta: false });

type Catalogos = ReturnType<typeof usarCatalogosDelAnticipo>;

/** Al cambiar de forma, la chequera de una no sirve de cuenta en la otra; al cambiar la fecha, el saldo se vuelve a pedir. */
function vigilarLaEdicion(edicion: { value: EdicionDeLaVentanaDeAnticipo }, catalogos: Catalogos) {
  const vencidos = ref<AnticipoResumen[]>([]);
  watch(
    () => edicion.value.forma,
    (forma) => {
      edicion.value.medio = medioPorOmision(forma, catalogos.medios.value);
    },
  );
  watch(
    () => edicion.value.beneficiarioId,
    async (id) => {
      vencidos.value = await vencidosDelBeneficiario(id);
    },
  );
  watch(
    () => edicion.value.fecha,
    (fecha) => {
      if (edicion.value.abierta && esFechaCompleta(fecha) && fecha <= fechaDeHoy())
        void catalogos.actualizarSaldos(fecha);
    },
  );
  return vencidos;
}

/** Lo que se le cuenta al usuario antes de confirmar: a quién, cuánto, con qué y hasta cuándo. */
function textoDeConfirmacion(edicion: EdicionDeAnticipo, catalogos: Catalogos, dias: number): string {
  return resumenDeLaEntrega(edicion, {
    beneficiario: catalogos.nombreDelBeneficiario(edicion.beneficiarioId) || 'el beneficiario',
    medio: nombreDelMedio(edicion.forma, catalogos.medios.value, edicion.medio),
    fechaLimite: edicion.fechaLimite || fechaLimitePropuesta(edicion.fecha, dias),
  });
}

type Estado = ReturnType<typeof usarEstadoDeLaEntrega>;

/** Lo escrito, el resultado y los vencidos del beneficiario; abrir trae las cuentas y cerrar solo oculta la ventana. */
function usarEstadoDeLaEntrega(catalogos: Catalogos) {
  const edicion = ref<EdicionDeLaVentanaDeAnticipo>(cerrada());
  const resultado = ref<Anticipo | null>(null);
  const vencidos = vigilarLaEdicion(edicion, catalogos);

  async function abrir(): Promise<void> {
    resultado.value = null;
    vencidos.value = [];
    edicion.value = { ...cerrada(), abierta: true };
    await catalogos.traer(edicion.value.fecha);
    edicion.value.medio = medioPorOmision(edicion.value.forma, catalogos.medios.value);
  }
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  return { edicion, resultado, vencidos, abrir, cerrar };
}

interface DatosDelEnvio {
  estado: Estado;
  catalogos: Catalogos;
  dias: () => number;
  alRegistrar: () => Promise<void>;
}

/** Valida, confirma con el resumen y entrega; el servidor decide lo demás y sus errores se reparten por campo. */
function usarEnvioDeLaEntrega({ estado, catalogos, dias, alRegistrar }: DatosDelEnvio) {
  const { enviando, errores, enviar } = usarFormulario();

  async function guardar(): Promise<void> {
    const { edicion, resultado } = estado;
    errores.value = erroresDelAnticipo(edicion.value, fechaDeHoy());
    if (Object.keys(errores.value).length > 0) return;
    const confirmado = await usarAvisos().confirmar({
      titulo: 'Confirmar la entrega del anticipo',
      mensaje: textoDeConfirmacion(edicion.value, catalogos, dias()),
      textoConfirmar: 'Entregar el anticipo',
    });
    if (!confirmado) return;
    const solicitud = solicitudDeEntrega(edicion.value);
    const guardado = await enviar(async () => {
      resultado.value = await apiAnticipos.entregar(solicitud);
    });
    if (guardado) await alRegistrar();
  }
  return { enviando, errores, guardar };
}

/**
 * La ventana «Entregar un anticipo»: trae las cuentas al abrir, avisa de los vencidos del beneficiario, valida, confirma con
 * el resumen y registra. Al terminar deja el anticipo creado (con los avisos de Bancos y de C8) para que la ventana los muestre.
 * `propiedades` es todo lo que la ventana recibe además del `v-model`.
 */
export function usarVentanaDeAnticipo(alRegistrar: () => Promise<void>) {
  const sesion = usarSesion();
  const catalogos = usarCatalogosDelAnticipo();
  const estado = usarEstadoDeLaEntrega(catalogos);
  const dias = (): number => sesion.config('cuentas-por-liquidar.anticipos.dias_para_liquidar', DIAS_POR_OMISION);
  const envio = usarEnvioDeLaEntrega({ estado, catalogos, dias, alRegistrar });
  const nuevo = usarBeneficiarioNuevo((creado) => {
    catalogos.agregarBeneficiario(creado);
    estado.edicion.value.beneficiarioId = creado.id;
  });
  const propiedades = computed(() => ({
    ...propiedadesDeLaVentana(estado, catalogos),
    fechaLimitePropuesta: fechaLimitePropuesta(estado.edicion.value.fecha, dias()),
    errores: envio.errores.value,
    enviando: envio.enviando.value,
  }));
  return {
    edicion: estado.edicion,
    propiedades,
    nuevo,
    abrir: estado.abrir,
    cerrar: estado.cerrar,
    guardar: envio.guardar,
  };
}

/** Lo que la ventana muestra de lo traído: el resultado, los vencidos y las listas con lo que se puede hacer con ellas. */
function propiedadesDeLaVentana({ resultado, vencidos }: Estado, catalogos: Catalogos) {
  return {
    resultado: resultado.value,
    vencidos: vencidos.value,
    medios: catalogos.medios.value,
    beneficiarios: catalogos.beneficiarios.value,
    usuarios: catalogos.usuarios.value,
    puedeElegirUsuario: catalogos.puedeElegirUsuario.value,
    puedeCrearTerceros: catalogos.puedeCrearTerceros.value,
    cargando: catalogos.cargando.value,
  };
}
