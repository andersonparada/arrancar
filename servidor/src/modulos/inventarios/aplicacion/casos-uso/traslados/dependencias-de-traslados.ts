import type { DependenciasDelKardex } from '../../kardex/dependencias-del-kardex.js';
import type { ConsultasDeTraslados } from '../../puertos/consultas-de-traslados.js';
import type { LectorDeTransito } from '../../puertos/entorno-del-kardex.js';

/** Lo del kardex más lo propio de los traslados: si pasan por tránsito y la boleta. */
export interface DependenciasDeTraslados extends DependenciasDelKardex {
  transito: LectorDeTransito;
  traslados: ConsultasDeTraslados;
}
