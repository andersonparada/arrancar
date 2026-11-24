import { computed, ref, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiParcelas, type FichaDeParcela, type InmuebleDeParcela } from '../../servicios/parcelas.api';
import { erroresDeMedicion, medicionNueva, type EdicionDeMedicion } from '../mediciones/edicion-de-medicion';
import { usarAjustesDeSuperficie } from '../superficie/usar-ajustes-de-superficie';
import {
  cambioDeParcela,
  datosDeParcela,
  edicionDe,
  edicionDeParcela,
  type EdicionDeParcela,
} from './edicion-de-parcela';
import { usarReferenciasDeParcela } from './usar-referencias-de-parcela';

const texto = (valor: unknown): string | null => (typeof valor === 'string' && valor ? valor : null);

/** Lo que no se edita de una parcela que ya existe: cómo se llaman su localidad y su madre. */
interface UbicacionDeLaParcela {
  localidadNombre: string;
  madreCodigo: string | null;
}

/**
 * Trae la parcela que se edita (o arma la nueva, ya con la localidad y la madre que vengan en la dirección, como al
 * agregar una subparcela desde la ficha).
 */
function usarEdicionCargada(parcelaId: string | null) {
  const { query } = useRoute();
  const inicio = { localidadId: texto(query.localidad), parcelaMadreId: texto(query.madre) };
  const ligados = ref<InmuebleDeParcela[]>([]);
  const ubicacion = ref<UbicacionDeLaParcela>({ localidadNombre: '', madreCodigo: null });
  const { datos, cargando } = usarCarga<EdicionDeParcela>(
    async () => {
      if (!parcelaId) return edicionDe(inicio);
      const ficha = await apiParcelas.obtener(parcelaId);
      ligados.value = ficha.inmuebles;
      ubicacion.value = { localidadNombre: ficha.localidadNombre, madreCodigo: ficha.parcelaMadreCodigo };
      return edicionDeParcela(ficha);
    },
    edicionDe(inicio),
    'No se pudo cargar la parcela.',
  );
  return { edicion: datos, cargando, ligados, ubicacion };
}

/** Manda la parcela al servidor: crea o actualiza según haya o no id. */
const enviarParcela = (parcelaId: string | null, edicion: EdicionDeParcela, medicion: EdicionDeMedicion) =>
  parcelaId
    ? apiParcelas.actualizar(parcelaId, cambioDeParcela(edicion))
    : apiParcelas.crear(datosDeParcela(edicion, medicion));

/** Guarda lo escrito: avisa del resultado y reparte los errores del servidor por campo. */
function usarGuardadoDeParcela(
  parcelaId: string | null,
  edicion: Ref<EdicionDeParcela>,
  medicion: Ref<EdicionDeMedicion>,
) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  /** @returns La parcela guardada, o `null` si el servidor no la aceptó. */
  async function guardar(): Promise<FichaDeParcela | null> {
    let guardada: FichaDeParcela | null = null;
    const aceptada = await enviar(async () => {
      guardada = await enviarParcela(parcelaId, edicion.value, medicion.value);
    });
    if (aceptada) avisos.exito(parcelaId ? 'Parcela actualizada.' : 'Parcela registrada.');
    return guardada;
  }

  return { enviando, errores, guardar };
}

/** Registrar una parcela o editarla en página completa; sin id es nueva, y puede venir ya con su localidad y su madre. */
export function usarFormularioDeParcela(parcelaId: string | null) {
  const { ajustes } = usarAjustesDeSuperficie();
  const { edicion, cargando, ligados, ubicacion } = usarEdicionCargada(parcelaId);
  const medicion = ref(medicionNueva(ajustes.value));
  const guardado = usarGuardadoDeParcela(parcelaId, edicion, medicion);

  return {
    ...guardado,
    edicion,
    medicion,
    cargando,
    erroresDeLaMedicion: computed(() => erroresDeMedicion(guardado.errores.value)),
    referencias: usarReferenciasDeParcela(edicion, ligados),
    ubicacion,
    ajustes,
  };
}
