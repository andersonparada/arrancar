import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosVigenciaDeCombustible, VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';

/** Lo que muestra cada campo de la ventana mientras se edita una vigencia de combustible. */
export interface EdicionDeVigenciaDeCombustible {
  abierta: boolean;
  id: string | null;
  combustibleId: string | null;
  idpPorGalon: string | number;
  porcentajeDeEtanol: string | number;
  vigenteDesde: string;
  vigenteHasta: string;
}

const VIGENCIA_DE_COMBUSTIBLE_NUEVO: Omit<EdicionDeVigenciaDeCombustible, 'abierta' | 'id'> = {
  combustibleId: null,
  idpPorGalon: '',
  porcentajeDeEtanol: '',
  vigenteDesde: '',
  vigenteHasta: '',
};

/** La ventana abierta con los datos de la vigencia de combustible, o vacía si es nuevo. */
export function edicionDe(vigenciaDeCombustible?: VigenciaDeCombustible): EdicionDeVigenciaDeCombustible {
  if (!vigenciaDeCombustible) return { abierta: true, id: null, ...VIGENCIA_DE_COMBUSTIBLE_NUEVO };
  return {
    abierta: true,
    id: vigenciaDeCombustible.id,
    combustibleId: vigenciaDeCombustible.combustibleId,
    idpPorGalon: textoDeEdicion(vigenciaDeCombustible.idpPorGalon),
    porcentajeDeEtanol: textoDeEdicion(vigenciaDeCombustible.porcentajeDeEtanol),
    vigenteDesde: textoDeEdicion(vigenciaDeCombustible.vigenteDesde),
    vigenteHasta: textoDeEdicion(vigenciaDeCombustible.vigenteHasta),
  };
}

/** La ventana de una tasa nueva del combustible dado. */
export const edicionNuevaDe = (combustibleId: string): EdicionDeVigenciaDeCombustible => ({
  ...edicionDe(),
  combustibleId,
});

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeVigenciaDeCombustible = (edicion: EdicionDeVigenciaDeCombustible): DatosVigenciaDeCombustible => ({
  combustibleId: edicion.combustibleId ?? '',
  idpPorGalon: textoDeEdicion(edicion.idpPorGalon),
  porcentajeDeEtanol: textoDeEdicion(edicion.porcentajeDeEtanol),
  vigenteDesde: edicion.vigenteDesde,
  vigenteHasta: textoONulo(edicion.vigenteHasta),
});
