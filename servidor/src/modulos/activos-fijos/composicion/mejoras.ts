import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AnularMejora } from '../aplicacion/casos-uso/mejoras/anular-mejora.js';
import { CambiarValorFiscalDelInmueble } from '../aplicacion/casos-uso/mejoras/cambiar-valor-fiscal.js';
import { ListarMejorasDeActivo } from '../aplicacion/casos-uso/mejoras/listar-mejoras-de-activo.js';
import { RegistrarMejora } from '../aplicacion/casos-uso/mejoras/registrar-mejora.js';
import { RevisarEstimacion } from '../aplicacion/casos-uso/mejoras/revisar-estimacion.js';
import { MejorasControlador } from '../http/mejoras.controlador.js';
import { rutasMejoras } from '../http/mejoras.rutas.js';
import { CierresDrizzle } from '../infraestructura/persistencia/cierres.drizzle.js';
import { ConsultasActivosDrizzle } from '../infraestructura/persistencia/consultas-activos.drizzle.js';
import { ConsultasMejorasDrizzle } from '../infraestructura/persistencia/consultas-mejoras.drizzle.js';
import { HistorialDeDepreciacionDrizzle } from '../infraestructura/persistencia/historial-de-depreciacion.drizzle.js';
import { LineasDelLibroDrizzle } from '../infraestructura/persistencia/lineas-del-libro.drizzle.js';
import { RepositorioActivosDrizzle } from '../infraestructura/persistencia/repositorio-activos.drizzle.js';
import { RepositorioClasesDrizzle } from '../infraestructura/persistencia/repositorio-clases.drizzle.js';
import { RepositorioCostosDrizzle } from '../infraestructura/persistencia/repositorio-costos.drizzle.js';
import { RepositorioMejorasDrizzle } from '../infraestructura/persistencia/repositorio-mejoras.drizzle.js';
import { RepositorioSaldosInicialesDrizzle } from '../infraestructura/persistencia/repositorio-saldos-iniciales.drizzle.js';
import { RepositorioTramosDrizzle } from '../infraestructura/persistencia/repositorio-tramos.drizzle.js';
import { PrimerMesEnConfiguracion } from '../infraestructura/primer-mes-en-configuracion.js';

function dependenciasDeMejoras() {
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
    costos: new RepositorioCostosDrizzle(),
    tramos: new RepositorioTramosDrizzle(),
    historial: new HistorialDeDepreciacionDrizzle(),
    saldos: new RepositorioSaldosInicialesDrizzle(),
    cierres: new CierresDrizzle(),
    primerMes: new PrimerMesEnConfiguracion(),
    mejoras: new RepositorioMejorasDrizzle(),
    consultasDeMejoras: new ConsultasMejorasDrizzle(),
    lineas: new LineasDelLibroDrizzle(),
  };
}

/** Raíz de composición de las mejoras, los costos posteriores y las revisiones de la depreciación hacia adelante. */
export function rutasDeMejoras() {
  const dependencias = dependenciasDeMejoras();
  return rutasMejoras(
    new MejorasControlador({
      listar: new ListarMejorasDeActivo(dependencias),
      registrar: new RegistrarMejora(dependencias),
      anular: new AnularMejora(dependencias),
      revisarEstimacion: new RevisarEstimacion(dependencias),
      cambiarValorFiscal: new CambiarValorFiscalDelInmueble(dependencias),
    }),
  );
}
