import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCuentas } from '../servicios/cuentas.api';
import { apiInicio, type InicioContable } from '../servicios/inicio.api';
import {
  avisoDeMascara,
  avisoDelContador,
  cambiaElInicio,
  datosDelInicio,
  formularioDelInicio,
  inicioVacio,
  type FormularioDeInicio,
} from './edicion-de-inicio';
import { marcarFalloDeCarga } from './marcar-fallo-de-carga';

interface Datos {
  inicio: InicioContable | null;
  hayCuentas: boolean;
}

/** Si la empresa ya tiene cuentas, la máscara de sus códigos ya no se cambia. */
async function tieneCuentas(puede: boolean): Promise<boolean> {
  if (!puede) return false;
  return (await apiCuentas.listar().catch(() => [])).length > 0;
}

/** Trae el inicio y deja el formulario con lo guardado (o con lo propuesto si todavía no se inició). */
function usarDatosDelInicio(formulario: Ref<FormularioDeInicio>) {
  const fallo = ref(false);
  const sesion = usarSesion();
  const traer = async (): Promise<Datos> => {
    const inicio = await apiInicio.obtener();
    if (inicio) formulario.value = formularioDelInicio(inicio);
    return { inicio, hayCuentas: await tieneCuentas(sesion.puede('contabilidad.cuentas.ver')) };
  };
  const carga = usarCarga<Datos>(
    marcarFalloDeCarga(traer, fallo),
    { inicio: null, hayCuentas: false },
    'No se pudo traer el inicio de la contabilidad.',
  );
  return { ...carga, fallo };
}

const confirmarCambio = (avisos: ReturnType<typeof usarAvisos>): Promise<boolean> =>
  avisos.confirmar({
    titulo: 'Cambiar el inicio de la contabilidad',
    mensaje:
      'Cambiar la fecha o el caso de inicio afecta cómo se arma la apertura y queda anotado en la auditoría. ¿Guardar el cambio?',
    textoConfirmar: 'Guardar el cambio',
  });

/** El inicio de la contabilidad: traerlo, editarlo y guardarlo con las confirmaciones que pide cambiarlo. */
export function usarInicio() {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const formulario = ref<FormularioDeInicio>(inicioVacio());
  const carga = usarDatosDelInicio(formulario);
  const { datos, cargar } = carga;

  const avisoMascara = computed(() => avisoDeMascara(formulario.value.mascara));
  const avisoContador = computed(() => avisoDelContador(formulario.value));
  const puedeGuardar = computed(() => !avisoMascara.value && !avisoContador.value);

  async function guardar(): Promise<void> {
    if (cambiaElInicio(datos.value.inicio, formulario.value) && !(await confirmarCambio(avisos))) return;
    const eraNueva = datos.value.inicio === null;
    if (!(await enviar(() => apiInicio.guardar(datosDelInicio(formulario.value))))) return;
    avisos.exito(eraNueva ? 'La contabilidad quedó iniciada.' : 'Cambios guardados.');
    await cargar();
  }

  return { formulario, ...carga, enviando, errores, avisoMascara, avisoContador, puedeGuardar, guardar };
}
