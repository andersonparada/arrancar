import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AnularTraslado } from '../aplicacion/casos-uso/traslados/anular-traslado.js';
import { ObtenerBoleta } from '../aplicacion/casos-uso/traslados/obtener-boleta.js';
import { TrasladarActivos } from '../aplicacion/casos-uso/traslados/trasladar-activos.js';
import { TrasladosControlador } from '../http/traslados.controlador.js';
import { rutasTraslados } from '../http/traslados.rutas.js';
import { CierresDrizzle } from '../infraestructura/persistencia/cierres.drizzle.js';
import { ConsultasActivosDrizzle } from '../infraestructura/persistencia/consultas-activos.drizzle.js';
import { ConsultasTrasladosDrizzle } from '../infraestructura/persistencia/consultas-traslados.drizzle.js';
import { RepositorioActivosDrizzle } from '../infraestructura/persistencia/repositorio-activos.drizzle.js';
import { RepositorioClasesDrizzle } from '../infraestructura/persistencia/repositorio-clases.drizzle.js';
import { RepositorioTrasladosDrizzle } from '../infraestructura/persistencia/repositorio-traslados.drizzle.js';
import { UbicacionesEnEmpresas } from '../infraestructura/persistencia/ubicaciones-en-empresas.drizzle.js';

function dependenciasDeTraslados() {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    auditoria: compartidas.auditoria,
    correlativos: compartidas.correlativos,
    reloj: compartidas.reloj,
    publicadorEventos: compartidas.publicadorEventos,
    repositorio: new RepositorioActivosDrizzle(),
    consultas: new ConsultasActivosDrizzle(),
    clases: new RepositorioClasesDrizzle(),
    ubicaciones: new UbicacionesEnEmpresas(),
    cierres: new CierresDrizzle(),
    traslados: new RepositorioTrasladosDrizzle(),
    consultasDeTraslados: new ConsultasTrasladosDrizzle(),
  };
}

/** Raíz de composición de los traslados y sus boletas. */
export function rutasDeTraslados() {
  const dependencias = dependenciasDeTraslados();
  return rutasTraslados(
    new TrasladosControlador({
      trasladar: new TrasladarActivos(dependencias),
      anular: new AnularTraslado(dependencias),
      obtenerBoleta: new ObtenerBoleta(dependencias),
    }),
  );
}
