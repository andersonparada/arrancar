import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ReporteDeCorrelativos } from '../aplicacion/casos-uso/correlativos/reporte-de-correlativos.js';
import { CorrelativosControlador } from '../http/correlativos.controlador.js';
import { rutasCorrelativos } from '../http/correlativos.rutas.js';
import { ConsultasDeCorrelativosDrizzle } from '../infraestructura/persistencia/consultas-de-correlativos.drizzle.js';

/** Raíz de composición del reporte de correlativos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeCorrelativos() {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  const reporte = new ReporteDeCorrelativos({ unidadDeTrabajo, consultas: new ConsultasDeCorrelativosDrizzle() });
  return rutasCorrelativos(new CorrelativosControlador({ reporte }));
}
