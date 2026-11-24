import type { DependenciasDelKardex } from '../../kardex/dependencias-del-kardex.js';
import type { AlmacenDeLotes } from '../../puertos/almacen-de-lotes.js';
import type { ConsultasDeSaldosIniciales } from '../../puertos/consultas-de-saldos-iniciales.js';

/** Lo que usan los casos de uso de los saldos iniciales: el kardex completo, sus consultas y los lotes. */
export interface DependenciasDeSaldosIniciales extends DependenciasDelKardex {
  saldos: ConsultasDeSaldosIniciales;
  lotes: AlmacenDeLotes;
}
