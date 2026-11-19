import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { CerrarMes } from '../aplicacion/casos-uso/depreciacion/cerrar-mes.js';
import type { DependenciasDeCierre } from '../aplicacion/casos-uso/depreciacion/dependencias-de-cierre.js';
import { ListarCierres } from '../aplicacion/casos-uso/depreciacion/listar-cierres.js';
import { ReabrirMes } from '../aplicacion/casos-uso/depreciacion/reabrir-mes.js';
import { RevisarCierre } from '../aplicacion/casos-uso/depreciacion/revisar-cierre.js';
import { DepreciacionControlador } from '../http/depreciacion.controlador.js';
import { rutasDepreciacion } from '../http/depreciacion.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { MesesDeConstruccionEnConfiguracion } from '../infraestructura/meses-de-construccion-en-configuracion.js';
import { PrimerMesEnConfiguracion } from '../infraestructura/primer-mes-en-configuracion.js';
import { CierresDrizzle } from '../infraestructura/persistencia/cierres.drizzle.js';
import { ConsultasBandejaDrizzle } from '../infraestructura/persistencia/consultas-bandeja.drizzle.js';
import { ConsultasDeCierreDrizzle } from '../infraestructura/persistencia/consultas-de-cierre.drizzle.js';
import { RepositorioCierresDrizzle } from '../infraestructura/persistencia/repositorio-cierres.drizzle.js';

function dependenciasDeCierre(): DependenciasDeCierre {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    auditoria: compartidas.auditoria,
    reloj: compartidas.reloj,
    publicadorEventos: compartidas.publicadorEventos,
    cierres: new CierresDrizzle(),
    repositorioCierres: new RepositorioCierresDrizzle(),
    consultas: new ConsultasDeCierreDrizzle(),
    bandeja: new ConsultasBandejaDrizzle(),
    cargaInicial: new CargaInicialEnMediador(),
    primerMes: new PrimerMesEnConfiguracion(),
    mesesDeConstruccion: new MesesDeConstruccionEnConfiguracion(),
  };
}

/** Raíz de composición del cierre mensual de depreciación: el único lugar donde se eligen las implementaciones. */
export function rutasDeDepreciacion() {
  const dependencias = dependenciasDeCierre();
  return rutasDepreciacion(
    new DepreciacionControlador({
      listar: new ListarCierres(dependencias),
      revisar: new RevisarCierre(dependencias),
      cerrar: new CerrarMes(dependencias),
      reabrir: new ReabrirMes(dependencias),
    }),
  );
}
