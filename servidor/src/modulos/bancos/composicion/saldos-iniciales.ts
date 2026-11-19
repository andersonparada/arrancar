import '../../core/contratos/empresas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AgregarPartidaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/agregar-partida-de-apertura.js';
import { AnularCheque } from '../aplicacion/casos-uso/cheques/anular-cheque.js';
import { AnularMovimiento } from '../aplicacion/casos-uso/movimientos/anular-movimiento.js';
import { AbrirEvidenciaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/abrir-evidencia-de-apertura.js';
import { QuitarEvidenciaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/quitar-evidencia-de-apertura.js';
import { SubirEvidenciaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/subir-evidencia-de-apertura.js';
import { AnularPartidaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/anular-partida-de-apertura.js';
import { CorregirPartidaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/corregir-partida-de-apertura.js';
import { EliminarPartidaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-partida-de-apertura.js';
import { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import { GuardarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/guardar-saldo-inicial.js';
import { ListarPartidasDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/listar-partidas-de-apertura.js';
import { ListarSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import { ObtenerSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/obtener-saldo-inicial.js';
import { ResponderRevisionDeCierreDeCarga } from '../aplicacion/casos-uso/saldos-iniciales/responder-revision-de-cierre-de-carga.js';
import { RevisarCierreDeCargaEnBancos } from '../aplicacion/casos-uso/saldos-iniciales/revisar-cierre-de-carga-en-bancos.js';
import { ArmadorDePartidas } from '../aplicacion/armador-de-partidas.js';
import { AvisoDeFondosDePosfechados } from '../aplicacion/aviso-de-fondos-de-posfechados.js';
import { ChequesDeApertura } from '../aplicacion/cheques-de-apertura.js';
import { ConceptosDeMovimientos } from '../aplicacion/conceptos-de-movimientos.js';
import { FichaDeSaldoInicial } from '../aplicacion/ficha-de-saldo-inicial.js';
import { ReglasDeLaCuenta } from '../aplicacion/reglas-de-la-cuenta.js';
import { SaldosGlobalesControlador } from '../http/saldos-globales.controlador.js';
import { SaldosInicialesControlador } from '../http/saldos-iniciales.controlador.js';
import { rutasSaldosIniciales } from '../http/saldos-iniciales.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { ChequerasDeAperturaDrizzle } from '../infraestructura/persistencia/chequeras-de-apertura.drizzle.js';
import { ConsultasConciliacionesDrizzle } from '../infraestructura/persistencia/consultas-conciliaciones.drizzle.js';
import { ConsultasDeSaldosInicialesDrizzle } from '../infraestructura/persistencia/consultas-de-saldos-iniciales.drizzle.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioChequesDrizzle } from '../infraestructura/persistencia/repositorio-cheques.drizzle.js';
import { RepositorioConceptosDrizzle } from '../infraestructura/persistencia/repositorio-conceptos.drizzle.js';
import { RepositorioDeSaldosInicialesDrizzle } from '../infraestructura/persistencia/repositorio-de-saldos-iniciales.drizzle.js';
import { RepositorioMovimientosDrizzle } from '../infraestructura/persistencia/repositorio-movimientos.drizzle.js';
import { PoliticaDeSobregiroEnConfiguracion } from '../infraestructura/politica-de-sobregiro.configuracion.js';
import { PoliticaDeVencimientoDeChequesEnConfiguracion } from '../infraestructura/politica-de-vencimiento-de-cheques.configuracion.js';
import { dependenciasDeCheques } from './cheques.js';
import { dependenciasDeNotas } from './notas.js';
import { piezasDeOrigen } from './piezas-de-origen.js';
import { saldosGlobalesHeredados } from './saldos-globales-heredados.js';
import { intercambioDePartidas, intercambioDeSaldosIniciales } from './saldos-iniciales-excel.js';

/** La lectura de la ficha: la carga inicial, las consultas y las dos políticas de la empresa. */
function fichaDeSaldoInicial(consultas: ConsultasDeSaldosInicialesDrizzle, cargaInicial: CargaInicialEnMediador) {
  return new FichaDeSaldoInicial({
    consultas,
    cargaInicial,
    politicaDeSobregiro: new PoliticaDeSobregiroEnConfiguracion(),
    politicaDeVencimiento: new PoliticaDeVencimientoDeChequesEnConfiguracion(),
  });
}

const chequesDeApertura = () =>
  new ChequesDeApertura({ chequeras: new ChequerasDeAperturaDrizzle(), cheques: new RepositorioChequesDrizzle() });

function dependenciasDeSaldosIniciales() {
  const { unidadDeTrabajo, auditoria, reloj, documentos } = dependenciasCompartidas();
  const consultas = new ConsultasDeSaldosInicialesDrizzle();
  const consultasMovimientos = new ConsultasMovimientosDrizzle();
  const cargaInicial = new CargaInicialEnMediador();
  const conceptos = new ConceptosDeMovimientos(new RepositorioConceptosDrizzle());
  const { cuentasPorPagar } = piezasDeOrigen(conceptos);
  const politicaDeSobregiro = new PoliticaDeSobregiroEnConfiguracion();
  return {
    unidadDeTrabajo,
    auditoria,
    documentos,
    cargaInicial,
    consultas,
    cabeceras: new RepositorioDeSaldosInicialesDrizzle(),
    consultasConciliaciones: new ConsultasConciliacionesDrizzle(),
    repositorioMovimientos: new RepositorioMovimientosDrizzle(),
    reglas: new ReglasDeLaCuenta({ consultas: consultasMovimientos, politicaDeSobregiro, cargaInicial }),
    ficha: fichaDeSaldoInicial(consultas, cargaInicial),
    armador: new ArmadorDePartidas({ conceptos, cuentasPorPagar }),
    chequesDeApertura: chequesDeApertura(),
    fondos: new AvisoDeFondosDePosfechados({ consultas: consultasMovimientos, reloj }),
  };
}

type Dependencias = ReturnType<typeof dependenciasDeSaldosIniciales>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarSaldosIniciales(dependencias),
  obtener: new ObtenerSaldoInicial(dependencias),
  guardar: new GuardarSaldoInicial(dependencias),
  eliminar: new EliminarSaldoInicial(dependencias),
  agregarPartida: new AgregarPartidaDeApertura(dependencias, dependencias.fondos),
  corregirPartida: new CorregirPartidaDeApertura(dependencias),
  eliminarPartida: new EliminarPartidaDeApertura(dependencias),
  anularPartida: new AnularPartidaDeApertura(dependencias, {
    anularCheque: new AnularCheque(dependenciasDeCheques()),
    anularMovimiento: new AnularMovimiento(dependenciasDeNotas()),
    publicadorEventos: dependenciasCompartidas().publicadorEventos,
  }),
  revisarCierre: new RevisarCierreDeCargaEnBancos(dependencias),
  listarPartidas: new ListarPartidasDeApertura(dependencias),
  subirEvidencia: new SubirEvidenciaDeApertura(dependencias),
  quitarEvidencia: new QuitarEvidenciaDeApertura(dependencias),
  abrirEvidencia: new AbrirEvidenciaDeApertura(dependencias),
});

/** Raíz de composición de los saldos iniciales con partidas: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeSaldosIniciales() {
  const casos = casosDeUso(dependenciasDeSaldosIniciales());
  const revision = new ResponderRevisionDeCierreDeCarga(casos.listar);
  mediador.responder('bancos', 'empresas.revisar_cierre_de_carga', (_datos, operador) => revision.ejecutar(operador));
  const heredado = new SaldosGlobalesControlador(saldosGlobalesHeredados());
  return rutasSaldosIniciales(new SaldosInicialesControlador(casos), heredado, {
    saldos: intercambioDeSaldosIniciales(casos),
    partidas: intercambioDePartidas(casos),
  });
}
