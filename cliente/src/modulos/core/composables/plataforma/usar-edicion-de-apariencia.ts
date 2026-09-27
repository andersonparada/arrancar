import { computed, reactive } from 'vue';
import { usarApariencia } from '../../almacenes/apariencia';
import { usarAvisos } from '../../almacenes/avisos';
import { apiApariencia, type DatosApariencia } from '../../servicios/apariencia.api';
import { contraste } from '../../utilidades/colores';
import { CONTRASTE_MINIMO_DEL_ACENTO, type Colores } from './paletas';
import { usarCambioDeApariencia } from './usar-cambio-de-apariencia';

const datosDe = ({ nombreAplicacion, colorPrincipal, colorAcento }: DatosApariencia): DatosApariencia => ({
  nombreAplicacion,
  colorPrincipal,
  colorAcento,
});

const CAMPOS = ['nombreAplicacion', 'colorPrincipal', 'colorAcento'] as const;

/** Nombre y colores de la instalación: se editan en borrador y se ven en la vista previa antes de guardar. */
export function usarEdicionDeApariencia() {
  const apariencia = usarApariencia();
  const avisos = usarAvisos();
  const { enviando, errores, aplicar } = usarCambioDeApariencia();
  const borrador = reactive(datosDe(apariencia.apariencia));

  const hayCambios = computed(() => CAMPOS.some((campo) => borrador[campo] !== apariencia.apariencia[campo]));
  const acentoPocoVisible = computed(
    () => contraste(borrador.colorPrincipal, borrador.colorAcento) < CONTRASTE_MINIMO_DEL_ACENTO,
  );
  const elegirColores = ({ principal, acento }: Colores) =>
    Object.assign(borrador, { colorPrincipal: principal, colorAcento: acento });

  async function guardar(): Promise<void> {
    if (await aplicar(() => apiApariencia.guardar({ ...borrador })))
      avisos.exito('Apariencia guardada para toda la instalación.');
  }

  async function restablecer(): Promise<void> {
    const mensaje = 'Se volverá al nombre y los colores originales. El logo no cambia.';
    if (!(await avisos.confirmar({ titulo: 'Restablecer apariencia', mensaje, textoConfirmar: 'Restablecer' }))) return;
    const original = await aplicar(() => apiApariencia.restablecer());
    if (original) Object.assign(borrador, datosDe(original));
  }

  return { borrador, hayCambios, acentoPocoVisible, enviando, errores, elegirColores, guardar, restablecer };
}
