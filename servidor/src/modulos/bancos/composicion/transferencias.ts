import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AnularTransferencia } from '../aplicacion/casos-uso/transferencias/anular-transferencia.js';
import { EliminarTransferencia } from '../aplicacion/casos-uso/transferencias/eliminar-transferencia.js';
import { ListarTransferencias } from '../aplicacion/casos-uso/transferencias/listar-transferencias.js';
import { ObtenerTransferencia } from '../aplicacion/casos-uso/transferencias/obtener-transferencia.js';
import { RegistrarTransferencia } from '../aplicacion/casos-uso/transferencias/registrar-transferencia.js';
import { ReglasDeLaCuenta } from '../aplicacion/reglas-de-la-cuenta.js';
import { TransferenciasControlador } from '../http/transferencias.controlador.js';
import { rutasTransferencias } from '../http/transferencias.rutas.js';
import { ConsultasCuentasBancariasDrizzle } from '../infraestructura/persistencia/consultas-cuentas-bancarias.drizzle.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { ConsultasTransferenciasDrizzle } from '../infraestructura/persistencia/consultas-transferencias.drizzle.js';
import { RepositorioMovimientosDrizzle } from '../infraestructura/persistencia/repositorio-movimientos.drizzle.js';
import { RepositorioTransferenciasDrizzle } from '../infraestructura/persistencia/repositorio-transferencias.drizzle.js';
import { PoliticaDeMismaFechaEnAnulacionEnConfiguracion } from '../infraestructura/politica-de-misma-fecha-en-anulacion.configuracion.js';
import { PoliticaDeSobregiroEnConfiguracion } from '../infraestructura/politica-de-sobregiro.configuracion.js';

function dependenciasDeTransferencias() {
  const { unidadDeTrabajo, auditoria, correlativos, reloj } = dependenciasCompartidas();
  const consultasMovimientos = new ConsultasMovimientosDrizzle();
  const politicaDeSobregiro = new PoliticaDeSobregiroEnConfiguracion();
  return {
    unidadDeTrabajo,
    auditoria,
    correlativos,
    reloj,
    repositorio: new RepositorioTransferenciasDrizzle(),
    repositorioMovimientos: new RepositorioMovimientosDrizzle(),
    consultas: new ConsultasTransferenciasDrizzle(),
    consultasMovimientos,
    consultasCuentasBancarias: new ConsultasCuentasBancariasDrizzle(),
    reglas: new ReglasDeLaCuenta({ consultas: consultasMovimientos, politicaDeSobregiro }),
    politicaDeMismaFecha: new PoliticaDeMismaFechaEnAnulacionEnConfiguracion(),
  };
}

/** Raíz de composición de las transferencias: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeTransferencias() {
  const dependencias = dependenciasDeTransferencias();
  const casos = {
    registrar: new RegistrarTransferencia(dependencias),
    obtener: new ObtenerTransferencia(dependencias),
    anular: new AnularTransferencia(dependencias),
    eliminar: new EliminarTransferencia(dependencias),
    listar: new ListarTransferencias(dependencias),
  };
  return rutasTransferencias(new TransferenciasControlador(casos));
}
