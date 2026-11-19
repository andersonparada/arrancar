import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiOpciones, type Beneficiario } from '../../servicios/opciones.api';
import {
  beneficiarioNuevoVacio,
  datosDelBeneficiarioNuevo,
  erroresDelBeneficiarioNuevo,
  type EdicionDeBeneficiarioNuevo,
} from './opciones-del-beneficiario';

/** Si el servidor dice que se parece a otro tercero, pregunta; con la confirmación guarda de todas formas. */
async function crearConConfirmacion(edicion: EdicionDeBeneficiarioNuevo): Promise<Beneficiario | null> {
  const datos = datosDelBeneficiarioNuevo(edicion);
  try {
    return await apiOpciones.crearBeneficiario(datos, false);
  } catch (error) {
    if (!(error instanceof ErrorApi) || error.codigo !== 'conflicto') throw error;
    const seguir = await usarAvisos().confirmar({
      titulo: 'Posible duplicado',
      mensaje: error.message,
      textoConfirmar: 'Guardar de todas formas',
    });
    return seguir ? apiOpciones.crearBeneficiario(datos, true) : null;
  }
}

/** El alta rápida de un beneficiario (un tercero) sin salir de la ventana del anticipo. */
export function usarBeneficiarioNuevo(alCrear: (nuevo: Beneficiario) => void) {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref({ ...beneficiarioNuevoVacio(), abierta: false });

  const abrir = (): void => {
    edicion.value = { ...beneficiarioNuevoVacio(), abierta: true };
    errores.value = {};
  };
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };

  async function guardar(): Promise<void> {
    errores.value = erroresDelBeneficiarioNuevo(edicion.value);
    if (Object.keys(errores.value).length > 0) return;
    let creado: Beneficiario | null = null;
    const bien = await enviar(async () => {
      creado = await crearConConfirmacion(edicion.value);
    });
    if (!bien || !creado) return;
    alCrear(creado);
    cerrar();
    usarAvisos().exito('Registrado. Complete su NIT y demás datos en Terceros cuando pueda.');
  }

  return { edicion, enviando, errores, abrir, cerrar, guardar };
}
