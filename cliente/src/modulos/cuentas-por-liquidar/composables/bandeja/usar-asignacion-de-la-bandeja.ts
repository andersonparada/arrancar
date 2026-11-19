import { computed, ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { apiAnticipos, type AnticipoResumen } from '../../servicios/anticipos.api';
import { apiGastos, type GastoDeBandeja } from '../../servicios/gastos.api';
import {
  asignacionVacia,
  documentosPorAsignar,
  erroresDeLaAsignacion,
  hayConRetencion,
  resumenDeLaAsignacion,
  type EdicionDeAsignacion,
} from './bandeja';

export type EdicionDeLaVentanaDeAsignacion = EdicionDeAsignacion & { abierta: boolean };

/** Los anticipos abiertos por beneficiario (y número), con lo que les falta por justificar. */
function opcionesDeAnticipos(anticipos: readonly AnticipoResumen[]): OpcionBuscable<string>[] {
  return [...anticipos]
    .sort(
      (a, b) =>
        a.beneficiario.localeCompare(b.beneficiario, 'es', { sensitivity: 'base' }) || a.numero.localeCompare(b.numero),
    )
    .map((anticipo) => ({
      valor: anticipo.id,
      texto: `${anticipo.beneficiario} · anticipo ${anticipo.numero} · por justificar ${formatearMonto(anticipo.porJustificar)}`,
    }));
}

/** Los anticipos abiertos a donde pueden ir los documentos; si no se pueden traer, se avisa. */
function usarAnticiposAbiertos() {
  const anticipos = ref<AnticipoResumen[]>([]);
  async function traer(): Promise<void> {
    try {
      anticipos.value = (await apiAnticipos.listar({ estado: 'abierto', pagina: 1, limite: 200 })).elementos;
    } catch (error) {
      usarAvisos().error(error instanceof Error ? error.message : 'No se pudieron cargar los anticipos abiertos.');
    }
  }
  return { anticipos, traer };
}

/** El nombre del anticipo elegido, para el resumen de confirmación. */
function nombreDelAnticipo(anticipos: readonly AnticipoResumen[], id: string): string {
  const anticipo = anticipos.find((candidato) => candidato.id === id);
  return anticipo ? `el anticipo ${anticipo.numero} de ${anticipo.beneficiario}` : 'el anticipo';
}

interface DatosDelEnvio {
  edicion: Ref<EdicionDeLaVentanaDeAsignacion>;
  seleccion: Readonly<Ref<GastoDeBandeja[]>>;
  abiertos: ReturnType<typeof usarAnticiposAbiertos>;
}

/** El resumen de lo que va a pasar, para que el usuario lo acepte antes de asignar. */
function aceptaLaAsignacion({ edicion, seleccion, abiertos }: DatosDelEnvio): Promise<boolean> {
  const nombre = nombreDelAnticipo(abiertos.anticipos.value, edicion.value.anticipoId);
  return usarAvisos().confirmar({
    titulo: 'Confirmar la asignación',
    mensaje: resumenDeLaAsignacion(seleccion.value, nombre),
    textoConfirmar: 'Asignar',
  });
}

/** Valida, confirma con el resumen y asigna; al terminar avisa (con lo que dijo el servidor) y llama a `alTerminar`. */
function usarEnvioDeLaAsignacion(datos: DatosDelEnvio, alTerminar: (id: string) => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const { edicion, seleccion } = datos;

  async function confirmar(): Promise<void> {
    errores.value = erroresDeLaAsignacion(edicion.value, seleccion.value);
    if (Object.keys(errores.value).length > 0 || !(await aceptaLaAsignacion(datos))) return;
    const { anticipoId } = edicion.value;
    const cuerpo = documentosPorAsignar(seleccion.value, edicion.value);
    let delServidor: string[] = [];
    if (!(await enviar(async () => (delServidor = (await apiGastos.asignar(anticipoId, cuerpo)).avisos)))) return;
    avisos.exito('Documentos asignados al anticipo.');
    delServidor.forEach((aviso) => avisos.info(aviso));
    await alTerminar(anticipoId);
  }
  return { enviando, errores, confirmar };
}

/** La ventana: lo escrito (con el anticipo de la ruta ya elegido) y los anticipos abiertos que se traen al abrirla. */
function usarEstadoDeLaAsignacion(anticipoDeLaRuta: string) {
  const edicion = ref<EdicionDeLaVentanaDeAsignacion>({ ...asignacionVacia(), abierta: false });
  const abiertos = usarAnticiposAbiertos();
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  async function abrir(): Promise<void> {
    edicion.value = { ...asignacionVacia(anticipoDeLaRuta), abierta: true };
    await abiertos.traer();
  }
  return { edicion, abiertos, abrir, cerrar };
}

/**
 * La ventana «Asignar a un anticipo» de lo marcado en la bandeja: escoge el anticipo abierto, pide el motivo si hay documentos
 * con retención, confirma con el resumen y asigna. Si se llegó desde la ficha de un anticipo, vuelve a ella al terminar.
 */
export function usarAsignacionDeLaBandeja(
  seleccion: Readonly<Ref<GastoDeBandeja[]>>,
  alAsignar: () => Promise<void>,
  anticipoDeLaRuta: string,
) {
  const router = useRouter();
  const { edicion, abiertos, abrir, cerrar } = usarEstadoDeLaAsignacion(anticipoDeLaRuta);
  const envio = usarEnvioDeLaAsignacion({ edicion, seleccion, abiertos }, async (id) => {
    cerrar();
    if (anticipoDeLaRuta) await router.push({ name: 'cuentas-por-liquidar.anticipos.ficha', params: { id } });
    else await alAsignar();
  });
  return {
    ...envio,
    edicion,
    cerrar,
    abrir: async (): Promise<void> => {
      envio.errores.value = {};
      await abrir();
    },
    opciones: computed(() => opcionesDeAnticipos(abiertos.anticipos.value)),
    conRetencion: computed(() => hayConRetencion(seleccion.value)),
  };
}
