import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import type { Combustible } from '../../servicios/combustibles.api';
import { apiVigenciasDeCombustible, type VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';
import {
  datosDeVigenciaDeCombustible,
  edicionDe,
  edicionNuevaDe,
  type EdicionDeVigenciaDeCombustible,
} from './edicion-de-vigencia-de-combustible';
import { avisoDeCierre, tasaVigente, tasasDeUnCombustible } from './reglas-de-vigencia-de-combustible';
import { usarEliminacionDeVigenciaDeCombustible } from './usar-eliminacion-de-vigencia-de-combustible';

const SIN_REGISTROS: VigenciaDeCombustible[] = [];

const guardarVigencia = (edicion: EdicionDeVigenciaDeCombustible) =>
  edicion.id
    ? apiVigenciasDeCombustible.actualizar(edicion.id, datosDeVigenciaDeCombustible(edicion))
    : apiVigenciasDeCombustible.crear(datosDeVigenciaDeCombustible(edicion));

/** La ventana de una tasa: abrirla, guardar lo escrito y avisar, y recargar la historia. */
function usarVentanaDeTasa(cargar: () => Promise<void>, combustible: Ref<Combustible | null>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeVigenciaDeCombustible>({ ...edicionDe(), abierta: false });

  function abrir(vigencia?: VigenciaDeCombustible): void {
    if (!combustible.value) return;
    edicion.value = vigencia ? edicionDe(vigencia) : edicionNuevaDe(combustible.value.id);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNueva = edicion.value.id === null;
    if (!(await enviar(() => guardarVigencia(edicion.value)))) return;
    avisos.exito(esNueva ? 'Tasa registrada.' : 'Tasa actualizada.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Trae todas las tasas una vez; sin permiso de verlas no pide nada. */
function usarCargaDeTasas() {
  const puedeVer = usarSesion().puede('libro-de-compras.vigencias-de-combustible.ver');
  const { datos, cargando, cargar } = usarCarga(
    () => (puedeVer ? apiVigenciasDeCombustible.listar() : Promise.resolve(SIN_REGISTROS)),
    SIN_REGISTROS,
    'No se pudieron cargar las tasas de combustible.',
  );
  return { puedeVer, vigencias: datos, cargando, cargar };
}

/**
 * Las tasas de IDP de los combustibles: la ventana de tasas muestra la historia del combustible elegido,
 * con registrar, corregir y eliminar; `vigenteDe` da la tasa actual de cada tarjeta.
 */
export function usarTasasDeCombustible() {
  const { puedeVer, vigencias, cargando, cargar } = usarCargaDeTasas();
  const combustible = ref<Combustible | null>(null);
  const tasas = computed(() => (combustible.value ? tasasDeUnCombustible(vigencias.value, combustible.value.id) : []));
  const ventana = usarVentanaDeTasa(cargar, combustible);
  const aviso = computed(() => avisoDeCierre(tasaVigente(tasas.value), ventana.edicion.value));

  return {
    puedeVer,
    cargando,
    combustible,
    tasas,
    aviso,
    ventana,
    vigenteDe: (combustibleId: string) => tasaVigente(tasasDeUnCombustible(vigencias.value, combustibleId)),
    abrirTasas: (elegido: Combustible): void => {
      combustible.value = elegido;
    },
    /** Cierra la historia, salvo que encima esté abierta la ventana de una tasa (Escape llega a las dos). */
    cerrar: (): void => {
      if (!ventana.edicion.value.abierta) combustible.value = null;
    },
    intercambio: usarIntercambio(apiVigenciasDeCombustible.intercambio, cargar),
    ...usarEliminacionDeVigenciaDeCombustible(cargar),
  };
}
