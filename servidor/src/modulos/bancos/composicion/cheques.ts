import { ConceptosDeMovimientos } from '../aplicacion/conceptos-de-movimientos.js';
import { RepositorioConceptosDrizzle } from '../infraestructura/persistencia/repositorio-conceptos.drizzle.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AnularCheque } from '../aplicacion/casos-uso/cheques/anular-cheque.js';
import { BlanquearCheque } from '../aplicacion/casos-uso/cheques/blanquear-cheque.js';
import { EmitirCheque } from '../aplicacion/casos-uso/cheques/emitir-cheque.js';
import { ListarChequesDeLaEmpresa } from '../aplicacion/casos-uso/cheques/listar-cheques-de-la-empresa.js';
import { SiguienteChequeDisponible } from '../aplicacion/casos-uso/cheques/siguiente-cheque-disponible.js';
import { ReclasificarMovimientos } from '../aplicacion/casos-uso/movimientos/reclasificar-movimientos.js';
import { casosDeSugerencias } from './sugerencias.js';
import { ReglasDeLaCuenta } from '../aplicacion/reglas-de-la-cuenta.js';
import { ChequesControlador } from '../http/cheques.controlador.js';
import { rutasCheques } from '../http/cheques.rutas.js';
import { ConsultasChequesDrizzle } from '../infraestructura/persistencia/consultas-cheques.drizzle.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioChequerasDrizzle } from '../infraestructura/persistencia/repositorio-chequeras.drizzle.js';
import { RepositorioChequesDrizzle } from '../infraestructura/persistencia/repositorio-cheques.drizzle.js';
import { RepositorioMovimientosDrizzle } from '../infraestructura/persistencia/repositorio-movimientos.drizzle.js';
import { piezasDeOrigen } from './piezas-de-origen.js';
import { PoliticaDeSobregiroEnConfiguracion } from '../infraestructura/politica-de-sobregiro.configuracion.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';

/** Las dependencias de los casos de uso de cheques; también las usa la anulación en lote de caducos. */
export function dependenciasDeCheques() {
  const { unidadDeTrabajo, auditoria, correlativos, reloj, publicadorEventos } = dependenciasCompartidas();
  const consultasMovimientos = new ConsultasMovimientosDrizzle();
  const politicaDeSobregiro = new PoliticaDeSobregiroEnConfiguracion();
  const conceptos = new ConceptosDeMovimientos(new RepositorioConceptosDrizzle());
  return {
    unidadDeTrabajo,
    auditoria,
    correlativos,
    reloj,
    publicadorEventos,
    conceptos,
    ...piezasDeOrigen(conceptos),
    repositorio: new RepositorioChequesDrizzle(),
    repositorioChequeras: new RepositorioChequerasDrizzle(),
    repositorioMovimientos: new RepositorioMovimientosDrizzle(),
    consultas: new ConsultasChequesDrizzle(),
    consultasMovimientos,
    reglas: new ReglasDeLaCuenta({
      consultas: consultasMovimientos,
      politicaDeSobregiro,
      cargaInicial: new CargaInicialEnMediador(),
    }),
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
    reclasificar: new ReclasificarMovimientos(
      {
        unidadDeTrabajo: dependencias.unidadDeTrabajo,
        repositorio: dependencias.repositorioMovimientos,
        consultas: dependencias.consultasMovimientos,
        auditoria: dependencias.auditoria,
        conceptos: dependencias.conceptos,
        modulosDeOrigen: dependencias.modulosDeOrigen,
        revisor: dependencias.revisor,
      },
      'cheques',
    ),
    sugerirAlCapturar: casosDeSugerencias(dependencias).sugerirAlCapturar,
  };
  return rutasCheques(new ChequesControlador(casos));
}
