import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AnularDivision } from '../aplicacion/casos-uso/divisiones/anular-division.js';
import { DividirActivo } from '../aplicacion/casos-uso/divisiones/dividir-activo.js';
import { SepararEnUnidades } from '../aplicacion/casos-uso/divisiones/separar-en-unidades.js';
import { DivisionesControlador } from '../http/divisiones.controlador.js';
import { rutasDivisiones } from '../http/divisiones.rutas.js';
import { CierresDrizzle } from '../infraestructura/persistencia/cierres.drizzle.js';
import { ConsultasActivosDrizzle } from '../infraestructura/persistencia/consultas-activos.drizzle.js';
import { ConsultasDivisionesDrizzle } from '../infraestructura/persistencia/consultas-divisiones.drizzle.js';
import { ConsultasMejorasDrizzle } from '../infraestructura/persistencia/consultas-mejoras.drizzle.js';
import { HistorialDeDepreciacionDrizzle } from '../infraestructura/persistencia/historial-de-depreciacion.drizzle.js';
import { RepositorioActivosDrizzle } from '../infraestructura/persistencia/repositorio-activos.drizzle.js';
import { RepositorioClasesDrizzle } from '../infraestructura/persistencia/repositorio-clases.drizzle.js';
import { RepositorioCostosDrizzle } from '../infraestructura/persistencia/repositorio-costos.drizzle.js';
import { RepositorioDivisionesDrizzle } from '../infraestructura/persistencia/repositorio-divisiones.drizzle.js';
import { RepositorioSaldosInicialesDrizzle } from '../infraestructura/persistencia/repositorio-saldos-iniciales.drizzle.js';
import { RepositorioTramosDrizzle } from '../infraestructura/persistencia/repositorio-tramos.drizzle.js';
import { RepositorioTrasladosDrizzle } from '../infraestructura/persistencia/repositorio-traslados.drizzle.js';
import { PrefijoEnConfiguracion } from '../infraestructura/prefijo-en-configuracion.js';
import { PrimerMesEnConfiguracion } from '../infraestructura/primer-mes-en-configuracion.js';

function dependenciasDeDivisiones() {
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
    prefijo: new PrefijoEnConfiguracion(),
    divisiones: new RepositorioDivisionesDrizzle(),
    consultasDeDivisiones: new ConsultasDivisionesDrizzle(),
    consultasDeMejoras: new ConsultasMejorasDrizzle(),
    traslados: new RepositorioTrasladosDrizzle(),
  };
}

/** Raíz de composición de las divisiones: dividir, separar en unidades y anular. */
export function rutasDeDivisiones() {
  const dependencias = dependenciasDeDivisiones();
  return rutasDivisiones(
    new DivisionesControlador({
      dividir: new DividirActivo(dependencias),
      separar: new SepararEnUnidades(dependencias),
      anular: new AnularDivision(dependencias),
    }),
  );
}
