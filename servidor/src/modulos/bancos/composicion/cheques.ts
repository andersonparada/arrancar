import { ConceptosDeMovimientos } from '../aplicacion/conceptos-de-movimientos.js';
import { RepositorioConceptosDrizzle } from '../infraestructura/persistencia/repositorio-conceptos.drizzle.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AnularCheque } from '../aplicacion/casos-uso/cheques/anular-cheque.js';
import { BlanquearCheque } from '../aplicacion/casos-uso/cheques/blanquear-cheque.js';
import { EmitirCheque } from '../aplicacion/casos-uso/cheques/emitir-cheque.js';
import { ListarChequesDeLaEmpresa } from '../aplicacion/casos-uso/cheques/listar-cheques-de-la-empresa.js';
import { SiguienteChequeDisponible } from '../aplicacion/casos-uso/cheques/siguiente-cheque-disponible.js';
import { ReglasDeLaCuenta } from '../aplicacion/reglas-de-la-cuenta.js';
import { ChequesControlador } from '../http/cheques.controlador.js';
import { rutasCheques } from '../http/cheques.rutas.js';
import { ConsultasChequesDrizzle } from '../infraestructura/persistencia/consultas-cheques.drizzle.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioChequerasDrizzle } from '../infraestructura/persistencia/repositorio-chequeras.drizzle.js';
import { RepositorioChequesDrizzle } from '../infraestructura/persistencia/repositorio-cheques.drizzle.js';
import { RepositorioMovimientosDrizzle } from '../infraestructura/persistencia/repositorio-movimientos.drizzle.js';
import { CuentasPorPagarActivoEnModulosActivos } from '../infraestructura/cuentas-por-pagar-activo-en-modulos-activos.js';
import { ModulosActivosDeLaCuentaEnRegistro } from '../../core/mediador/infraestructura/modulos-activos-de-la-cuenta-en-registro.js';
import { PoliticaDeSobregiroEnConfiguracion } from '../infraestructura/politica-de-sobregiro.configuracion.js';

function dependenciasDeCheques() {
  const { unidadDeTrabajo, auditoria, correlativos, reloj } = dependenciasCompartidas();
  const consultasMovimientos = new ConsultasMovimientosDrizzle();
  const politicaDeSobregiro = new PoliticaDeSobregiroEnConfiguracion();
  return {
    unidadDeTrabajo,
    auditoria,
    correlativos,
    reloj,
    cuentasPorPagar: new CuentasPorPagarActivoEnModulosActivos(new ModulosActivosDeLaCuentaEnRegistro()),
    conceptos: new ConceptosDeMovimientos(new RepositorioConceptosDrizzle()),
    repositorio: new RepositorioChequesDrizzle(),
    repositorioChequeras: new RepositorioChequerasDrizzle(),
    repositorioMovimientos: new RepositorioMovimientosDrizzle(),
    consultas: new ConsultasChequesDrizzle(),
    consultasMovimientos,
    reglas: new ReglasDeLaCuenta({ consultas: consultasMovimientos, politicaDeSobregiro }),
  };
}

/** Raíz de composición de los cheques: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeCheques() {
  const dependencias = dependenciasDeCheques();
  const casos = {
    listar: new ListarChequesDeLaEmpresa(dependencias),
    siguienteDisponible: new SiguienteChequeDisponible(dependencias),
    emitir: new EmitirCheque(dependencias),
    anular: new AnularCheque(dependencias),
    blanquear: new BlanquearCheque(dependencias),
  };
  return rutasCheques(new ChequesControlador(casos));
}
