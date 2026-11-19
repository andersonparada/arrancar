import type { PoliticaDeZonaHoraria } from '../../../../core/compartido/aplicacion/reloj.js';
import type { LibroDeExcel } from '../../../../core/intercambio/aplicacion/puertos/libro-de-excel.js';
import type { EjecutorEnEmpresa } from '../../ejecutor-en-empresa.js';
import type { ConsultasDeDatosDeEmpresa } from '../../puertos/consultas-de-datos-de-empresa.js';
import type { HistorialDeLaCarga } from '../../puertos/historial-de-la-carga.js';

/** Lo que necesitan los casos de uso que muestran y exportan lo que quedó guardado de la carga inicial. */
export interface DependenciasDelHistorialDeCarga {
  ejecutorEnEmpresa: EjecutorEnEmpresa;
  historial: HistorialDeLaCarga;
  consultas: ConsultasDeDatosDeEmpresa;
  excel: Pick<LibroDeExcel, 'escribirVarias'>;
  zonaHoraria: PoliticaDeZonaHoraria;
}
