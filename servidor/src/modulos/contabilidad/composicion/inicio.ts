import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { GuardarInicio } from '../aplicacion/casos-uso/inicio/guardar-inicio.js';
import { ObtenerInicio } from '../aplicacion/casos-uso/inicio/obtener-inicio.js';
import { InicioControlador } from '../http/inicio.controlador.js';
import { rutasInicio } from '../http/inicio.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { RepositorioCuentasDrizzle } from '../infraestructura/persistencia/repositorio-cuentas.drizzle.js';
import { RepositorioIniciosDrizzle } from '../infraestructura/persistencia/repositorio-inicios.drizzle.js';

/** Raíz de composición del inicio de la contabilidad. */
export function rutasDeInicio() {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  const dependencias = {
    unidadDeTrabajo,
    auditoria,
    repositorio: new RepositorioIniciosDrizzle(),
    cuentas: new RepositorioCuentasDrizzle(),
    cargaInicial: new CargaInicialEnMediador(),
  };
  return rutasInicio(
    new InicioControlador({ obtener: new ObtenerInicio(dependencias), guardar: new GuardarInicio(dependencias) }),
  );
}
