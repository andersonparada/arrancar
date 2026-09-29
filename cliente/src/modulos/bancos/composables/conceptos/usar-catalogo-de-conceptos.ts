import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiConceptos, type Concepto } from '../../servicios/conceptos.api';

/**
 * Los conceptos de la empresa, para elegirlos al registrar una nota o un cheque, en el filtro del reporte y en la
 * bandeja «Sin clasificar». Se traen una vez al abrir la pantalla; el orden y qué opciones caben lo deciden
 * `opcionesDeConcepto` y `opcionesDeFiltroDeConcepto`.
 */
export function usarCatalogoDeConceptos() {
  const { datos: conceptos, cargando } = usarCarga(
    () => apiConceptos.listar(),
    [] as Concepto[],
    'No se pudieron cargar los conceptos.',
  );
  return { conceptos, cargando };
}
