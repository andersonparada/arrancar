import { computed, ref, watch, type Ref } from 'vue';
import { usarApariencia } from '../../almacenes/apariencia';
import { usarAvisos } from '../../almacenes/avisos';
import {
  apiCorreoDeSoporte,
  type BandejaDeSoporte,
  type ResultadoDelEnvio,
  type ServidorDeCorreo,
} from '../../servicios/correo-de-soporte.api';
import { usarCarga } from '../usar-carga';
import { usarFormulario } from '../usar-formulario';
import {
  borradorDe,
  datosParaGuardar,
  faltaLaContrasena,
  hayCambios,
  textoDeLaPrueba,
  type BorradorDelServidor,
} from './servidor-de-correo';

const SIN_SERVIDOR: ServidorDeCorreo = {
  configurado: false,
  servidor: '',
  puerto: 587,
  seguridad: 'starttls',
  usuario: '',
  remitenteDireccion: '',
  remitenteNombre: '',
  activo: false,
  contrasenaConfigurada: false,
  llaveDisponible: true,
  ultimaPrueba: null,
};

const SIN_BANDEJA: BandejaDeSoporte = {
  conteos: { pendiente: 0, enviando: 0, enviado: 0, fallido: 0, cancelado: 0 },
  pendienteMasAntiguoDesde: null,
  fallidosRecientes: [],
};

/** Guardar el borrador: reparte los errores por campo y avisa si salió bien. */
function usarGuardadoDelServidor(guardado: Ref<ServidorDeCorreo>, borrador: Ref<BorradorDelServidor>) {
  const avisos = usarAvisos();
  const formulario = usarFormulario();

  async function guardar(): Promise<void> {
    const guardada = await formulario.enviar(async () => {
      guardado.value = await apiCorreoDeSoporte.guardarServidor(datosParaGuardar(borrador.value));
    });
    if (guardada) avisos.exito('Servidor de correo guardado.');
  }

  return { guardar, errores: formulario.errores, enviando: formulario.enviando };
}

/** El servidor de la instalación: lo guardado, el borrador que se edita y cómo se guarda. */
function usarServidorDeCorreo() {
  const { apariencia } = usarApariencia();
  const { datos: guardado, cargar: recargar } = usarCarga(
    () => apiCorreoDeSoporte.servidor(),
    SIN_SERVIDOR,
    'No se pudo cargar el servidor de correo.',
  );
  const borrador = ref<BorradorDelServidor>(borradorDe(guardado.value, apariencia.nombreAplicacion));
  watch(guardado, (nuevo) => (borrador.value = borradorDe(nuevo, apariencia.nombreAplicacion)));
  return {
    guardado,
    borrador,
    recargar,
    ...usarGuardadoDelServidor(guardado, borrador),
    hayCambiosSinGuardar: computed(() => hayCambios(borrador.value, guardado.value)),
    sinContrasena: computed(() => faltaLaContrasena(borrador.value, guardado.value)),
  };
}

/** El correo de prueba: manda uno al destino escrito (solo aquí se escribe una dirección) y dice cómo salió. */
function usarPruebaDeEnvio(recargarServidor: () => Promise<void>) {
  const avisos = usarAvisos();
  const destino = ref('');
  const probando = ref(false);
  const resultado = ref<ResultadoDelEnvio | null>(null);

  async function probar(): Promise<void> {
    probando.value = true;
    try {
      const respuesta = await apiCorreoDeSoporte.probar(destino.value);
      resultado.value = respuesta.resultado;
      const aviso = textoDeLaPrueba(respuesta.resultado);
      if (respuesta.resultado === 'enviado') avisos.exito(aviso);
      else avisos.error(aviso);
      await recargarServidor();
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo hacer la prueba.');
    } finally {
      probando.value = false;
    }
  }

  return { destino, probando, resultado, probar };
}

/** Soporte → Correo: el servidor de la instalación (en borrador), la prueba de envío y la bandeja global. */
export function usarCorreoDeSoporte() {
  const servidor = usarServidorDeCorreo();
  const {
    datos: bandeja,
    cargando,
    cargar,
  } = usarCarga(() => apiCorreoDeSoporte.bandeja(), SIN_BANDEJA, 'No se pudo cargar el estado de la bandeja.');
  return {
    ...servidor,
    bandeja,
    cargandoBandeja: cargando,
    recargarBandeja: cargar,
    ...usarPruebaDeEnvio(servidor.recargar),
  };
}
