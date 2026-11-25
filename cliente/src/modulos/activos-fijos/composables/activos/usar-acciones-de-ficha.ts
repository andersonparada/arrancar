import type { Ref } from 'vue';
import type { ActivoFicha, Traslado } from '../../servicios/activos.api';
import { usarBajaDeActivo } from '../bajas/usar-baja-de-activo';
import { usarMejorasDeActivo } from '../mejoras/usar-mejoras-de-activo';
import { usarRevisionesDeActivo } from '../mejoras/usar-revisiones-de-activo';
import { usarAnulacionDeTraslado } from '../traslados/usar-anulacion-de-traslado';
import { usarTrasladoDeActivos } from '../traslados/usar-traslado-de-activo';

/**
 * Las acciones de la ficha que cambian el activo: mejoras y costos posteriores, revisión de la estimación,
 * cambio de matrícula, traslado, anulación de la boleta y baja o venta. `cargar` vuelve a traer la ficha después de cada una.
 */
export function usarAccionesDeFicha(activoId: string, registro: Ref<ActivoFicha | null>, cargar: () => Promise<void>) {
  const esEdificio = () => registro.value?.incisoFiscal === 'edificios';
  const costo = () => registro.value?.costo ?? '0.00';
  const mejoras = usarMejorasDeActivo({ activoId, esEdificio, costo }, cargar);
  const revisiones = usarRevisionesDeActivo(() => registro.value, cargar);
  const traslado = usarTrasladoDeActivos(cargar);
  const anulacionDeTraslado = usarAnulacionDeTraslado(cargar);
  const baja = usarBajaDeActivo(() => registro.value, cargar);

  function trasladar(): Promise<void> {
    const activo = registro.value;
    return activo ? traslado.abrir([activo]) : Promise.resolve();
  }

  function anularTraslado({ grupoId, numero, anioDeNumero, fecha }: Traslado): void {
    if (grupoId !== null && numero !== null && anioDeNumero !== null)
      anulacionDeTraslado.pedir({ grupoId, numero, anioDeNumero, fecha });
  }

  return { esEdificio, mejoras, revisiones, traslado, anulacionDeTraslado, baja, trasladar, anularTraslado };
}

export type AccionesDeFicha = ReturnType<typeof usarAccionesDeFicha>;
