import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearLibroDeExcel } from '../../core/intercambio/contexto.js';
import { activosFijosComprados } from '../aplicacion/casos-uso/analisis/activos-fijos-comprados.js';
import { combustiblesEIdp } from '../aplicacion/casos-uso/analisis/combustibles-e-idp.js';
import { comprasPorConcepto } from '../aplicacion/casos-uso/analisis/compras-por-concepto.js';
import { comprasPorProveedor } from '../aplicacion/casos-uso/analisis/compras-por-proveedor.js';
import {
  ConsultarAnalisis,
  ExportarAnalisis,
  type DependenciasDeAnalisis,
} from '../aplicacion/casos-uso/analisis/consultar-analisis.js';
import type { DefinicionDeAnalisis } from '../aplicacion/casos-uso/analisis/definicion-de-analisis.js';
import { ivaAlCostoPorMotivo } from '../aplicacion/casos-uso/analisis/iva-al-costo-por-motivo.js';
import type { AnalisisPublicado } from '../http/analisis.controlador.js';
import { rutasDeAnalisis } from '../http/analisis.rutas.js';
import { ConsultasDeAnalisisDrizzle } from '../infraestructura/persistencia/consultas-de-analisis.drizzle.js';

function publicar<Armado, Dto>(
  definicion: DefinicionDeAnalisis<Armado, Dto>,
  dependencias: DependenciasDeAnalisis,
): AnalisisPublicado {
  return {
    ruta: definicion.clave,
    consultar: new ConsultarAnalisis(dependencias, definicion),
    exportar: new ExportarAnalisis({ ...dependencias, excel: crearLibroDeExcel() }, definicion),
  };
}

/** Raíz de composición de los cinco análisis de compras. */
export function rutasDeAnalisisComponidas() {
  const dependencias = {
    unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
    consultas: new ConsultasDeAnalisisDrizzle(),
  };
  return rutasDeAnalisis([
    publicar(comprasPorProveedor, dependencias),
    publicar(comprasPorConcepto, dependencias),
    publicar(ivaAlCostoPorMotivo, dependencias),
    publicar(activosFijosComprados, dependencias),
    publicar(combustiblesEIdp, dependencias),
  ]);
}
