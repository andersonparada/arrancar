import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiSaldosIniciales, type CuadreDeSaldosIniciales } from '../../servicios/saldos-iniciales.api';

const CUADRE_VACIO: CuadreDeSaldosIniciales | null = null;

/** El cuadre de los saldos iniciales (totales generales y por proveedor); `cargar` lo refresca tras un cambio. */
export function usarCuadreDeSaldosIniciales() {
  return usarCarga(
    () => apiSaldosIniciales.cuadre(),
    CUADRE_VACIO as CuadreDeSaldosIniciales | null,
    'No se pudo cargar el cuadre.',
  );
}
