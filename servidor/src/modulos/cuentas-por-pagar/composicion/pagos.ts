import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/bancos.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import {
  ListarNotasParaLigar,
  ListarProveedoresPorPagar,
  ObtenerMediosDePago,
} from '../aplicacion/casos-uso/pagos/consultas-de-pagos.js';
import { ListarCargosParaPagar } from '../aplicacion/casos-uso/pagos/listar-cargos-para-pagar.js';
import { LigarNotaDeDebito } from '../aplicacion/casos-uso/pagos/ligar-nota-de-debito.js';
import { RegistrarPago } from '../aplicacion/casos-uso/pagos/registrar-pago.js';
import { mediador } from '../../core/mediador/contexto.js';
import { AplicarACuentaDeApertura } from '../aplicacion/casos-uso/pagos/aplicar-a-cuenta-de-apertura.js';
import { AnularPago } from '../aplicacion/casos-uso/pagos/anular-pago.js';
import { AtenderMovimientoPorCambiar } from '../aplicacion/casos-uso/pagos/atender-movimiento-por-cambiar.js';
import type { DependenciasDeCambiarPagos } from '../aplicacion/casos-uso/pagos/dependencias-de-pagos.js';
import { ReaplicarPago } from '../aplicacion/casos-uso/pagos/reaplicar-pago.js';
import { SaldarDiferenciaDelPago } from '../aplicacion/casos-uso/pagos/saldar-diferencia-del-pago.js';
import { REGLAS_PARA_ANULAR_PAGO, REGLAS_PARA_REAPLICAR_PAGO } from '../dominio/reglas-de-anulacion-de-pagos.js';
import { PagosControlador, type CasosDeUsoDePagos } from '../http/pagos.controlador.js';
import { rutasDePagos } from '../http/pagos.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { MovimientosDePagosDrizzle } from '../infraestructura/persistencia/movimientos-de-pagos.drizzle.js';
import { NotasParaLigarDrizzle } from '../infraestructura/persistencia/notas-para-ligar.drizzle.js';
import { PagosEnBancosEnMediador } from '../infraestructura/pagos-en-bancos-en-mediador.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { ConsultasDePagosDrizzle } from '../infraestructura/persistencia/consultas-de-pagos.drizzle.js';
import { FechasDeEntradaDrizzle } from '../infraestructura/persistencia/fechas-de-entrada.drizzle.js';
import {
  DatosFiscalesDeLaEmpresaDrizzle,
  NombreDelNitDrizzle,
  RetencionesDelLibroDrizzle,
} from '../infraestructura/persistencia/lecturas-del-libro.drizzle.js';
import { RepositorioDeAjustesDrizzle } from '../infraestructura/persistencia/repositorio-de-ajustes.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from '../infraestructura/persistencia/repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeContrasenasDrizzle } from '../infraestructura/persistencia/repositorio-de-contrasenas.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { RepositorioDePagosDrizzle } from '../infraestructura/persistencia/repositorio-de-pagos.drizzle.js';
import { TopeDeDiferenciaDelPagoEnConfiguracion } from '../infraestructura/tope-de-diferencia-del-pago-en-configuracion.js';
import { UmbralDeBancarizacionEnConfiguracion } from '../infraestructura/umbral-de-bancarizacion-en-configuracion.js';

/**
 * Raíz de composición de los pagos con cheque y con nota de débito, de anularlos, reaplicarlos y saldar sus diferencias, y
 * de lo que consulta la ventana de pago. También atiende el aviso de Bancos antes de cambiar un movimiento de un pago.
 */
export function rutasDePagosComponidas(): FastifyPluginAsync {
  return rutasDePagos(new PagosControlador(casosDeUso()));
}

function casosDeUso(): CasosDeUsoDePagos {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  const movimientos = new MovimientosDePagosDrizzle();
  const bancos = new PagosEnBancosEnMediador(movimientos);
  const paraConsultar = piezasParaConsultar();
  const paraCambiar = piezasParaCambiar(piezasParaRegistrar(paraConsultar, bancos), movimientos);
  const atender = new AtenderMovimientoPorCambiar(paraCambiar);
  mediador.escuchar('cuentas-por-pagar', 'bancos.movimiento_por_cambiar', (aviso, operador) =>
    atender.ejecutar(operador, aviso),
  );
  return {
    anular: new AnularPago(paraCambiar),
    reaplicar: new ReaplicarPago(paraCambiar),
    saldarDiferencia: new SaldarDiferenciaDelPago(paraCambiar),
    registrar: new RegistrarPago(piezasParaRegistrar(paraConsultar, bancos)),
    ligar: new LigarNotaDeDebito(piezasParaRegistrar(paraConsultar, bancos)),
    aplicarAApertura: new AplicarACuentaDeApertura(piezasParaRegistrar(paraConsultar, bancos)),
    notasParaLigar: new ListarNotasParaLigar(paraConsultar),
    paraPagar: new ListarCargosParaPagar(paraConsultar),
    proveedoresPorPagar: new ListarProveedoresPorPagar(paraConsultar),
    medios: new ObtenerMediosDePago({ unidadDeTrabajo, bancos, reloj }),
  };
}

function piezasParaConsultar() {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  return {
    unidadDeTrabajo,
    reloj,
    consultas: new ConsultasDeDocumentosDrizzle(),
    consultasDePagos: new ConsultasDePagosDrizzle(),
    retenciones: new RetencionesDelLibroDrizzle(),
    notas: new NotasParaLigarDrizzle(),
    nombreDelNit: new NombreDelNitDrizzle(),
    pagos: new RepositorioDePagosDrizzle(),
    umbral: new UmbralDeBancarizacionEnConfiguracion(),
    topeDeDiferencia: new TopeDeDiferenciaDelPagoEnConfiguracion(),
    cargaInicial: new CargaInicialEnMediador(),
    fechasDeEntrada: new FechasDeEntradaDrizzle(),
  };
}

function piezasParaRegistrar(paraConsultar: ReturnType<typeof piezasParaConsultar>, bancos: PagosEnBancosEnMediador) {
  const { correlativos, auditoria, publicadorEventos } = dependenciasCompartidas();
  return {
    ...paraConsultar,
    documentos: new RepositorioDeDocumentosDrizzle(new RepositorioDeAplicacionesDrizzle()),
    contrasenas: new RepositorioDeContrasenasDrizzle(),
    ajustes: new RepositorioDeAjustesDrizzle(),
    fiscal: new DatosFiscalesDeLaEmpresaDrizzle(),
    bancos,
    correlativos,
    auditoria,
    publicadorEventos,
  };
}

function piezasParaCambiar(
  paraRegistrar: ReturnType<typeof piezasParaRegistrar>,
  movimientos: MovimientosDePagosDrizzle,
): DependenciasDeCambiarPagos {
  return {
    ...paraRegistrar,
    movimientos,
    reglasParaAnular: REGLAS_PARA_ANULAR_PAGO,
    reglasParaReaplicar: REGLAS_PARA_REAPLICAR_PAGO,
  };
}
