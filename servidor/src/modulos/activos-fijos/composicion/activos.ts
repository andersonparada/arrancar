import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { CrearActivo } from '../aplicacion/casos-uso/activos/crear-activo.js';
import {
  ListarActivos,
  ListarUbicaciones,
  ObtenerActivo,
} from '../aplicacion/casos-uso/activos/consultas-de-activos.js';
import { EditarActivo } from '../aplicacion/casos-uso/activos/editar-activo.js';
import { EliminarActivo } from '../aplicacion/casos-uso/activos/eliminar-activo.js';
import { MarcarOcioso } from '../aplicacion/casos-uso/activos/marcar-ocioso.js';
import { PonerEnUso } from '../aplicacion/casos-uso/activos/poner-en-uso.js';
import { QuitarDeUso } from '../aplicacion/casos-uso/activos/quitar-de-uso.js';
import { ActivosControlador } from '../http/activos.controlador.js';
import { rutasActivos } from '../http/activos.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { ConsultasCostosDrizzle } from '../infraestructura/persistencia/consultas-costos.drizzle.js';
import { ConsultasActivosDrizzle } from '../infraestructura/persistencia/consultas-activos.drizzle.js';
import { RepositorioActivosDrizzle } from '../infraestructura/persistencia/repositorio-activos.drizzle.js';
import { RepositorioClasesDrizzle } from '../infraestructura/persistencia/repositorio-clases.drizzle.js';
import { UbicacionesEnEmpresas } from '../infraestructura/persistencia/ubicaciones-en-empresas.drizzle.js';
import { CierresDrizzle } from '../infraestructura/persistencia/cierres.drizzle.js';
import { RepositorioCostosDrizzle } from '../infraestructura/persistencia/repositorio-costos.drizzle.js';
import { RepositorioTramosDrizzle } from '../infraestructura/persistencia/repositorio-tramos.drizzle.js';
import { PrefijoEnConfiguracion } from '../infraestructura/prefijo-en-configuracion.js';
import { PrimerMesEnConfiguracion } from '../infraestructura/primer-mes-en-configuracion.js';
import { TopesEnConfiguracion } from '../infraestructura/topes-en-configuracion.js';

function dependenciasDeActivos() {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    auditoria: compartidas.auditoria,
    correlativos: compartidas.correlativos,
    reloj: compartidas.reloj,
    repositorio: new RepositorioActivosDrizzle(),
    consultas: new ConsultasActivosDrizzle(),
    consultasDeCostos: new ConsultasCostosDrizzle(),
    clases: new RepositorioClasesDrizzle(),
    ubicaciones: new UbicacionesEnEmpresas(),
    cargaInicial: new CargaInicialEnMediador(),
    prefijo: new PrefijoEnConfiguracion(),
  };
}

/** Lo que necesitan poner en uso y quitar de uso, además de lo de los activos. */
function dependenciasDeUso(base: ReturnType<typeof dependenciasDeActivos>) {
  return {
    ...base,
    costos: new RepositorioCostosDrizzle(),
    tramos: new RepositorioTramosDrizzle(),
    cierres: new CierresDrizzle(),
    topes: new TopesEnConfiguracion(),
    primerMes: new PrimerMesEnConfiguracion(),
  };
}

/** Raíz de composición de los activos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeActivos() {
  const dependencias = dependenciasDeActivos();
  const deUso = dependenciasDeUso(dependencias);
  return rutasActivos(
    new ActivosControlador({
      listar: new ListarActivos(dependencias),
      obtener: new ObtenerActivo(dependencias),
      crear: new CrearActivo(dependencias),
      editar: new EditarActivo(dependencias),
      marcarOcioso: new MarcarOcioso(dependencias),
      ponerEnUso: new PonerEnUso(deUso),
      quitarDeUso: new QuitarDeUso(deUso),
      eliminar: new EliminarActivo(dependencias),
      ubicaciones: new ListarUbicaciones(dependencias),
    }),
  );
}
