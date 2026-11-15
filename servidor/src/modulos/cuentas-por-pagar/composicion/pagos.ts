import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ListarProveedoresPorPagar, ObtenerMediosDePago } from '../aplicacion/casos-uso/pagos/consultas-de-pagos.js';
import { ListarCargosParaPagar } from '../aplicacion/casos-uso/pagos/listar-cargos-para-pagar.js';
import { RegistrarPago } from '../aplicacion/casos-uso/pagos/registrar-pago.js';
import { PagosControlador, type CasosDeUsoDePagos } from '../http/pagos.controlador.js';
import { rutasDePagos } from '../http/pagos.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
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

/** Raíz de composición de los pagos con cheque y con nota de débito y de lo que consulta la ventana de pago. */
export function rutasDePagosComponidas(): FastifyPluginAsync {
  return rutasDePagos(new PagosControlador(casosDeUso()));
}

function casosDeUso(): CasosDeUsoDePagos {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  const bancos = new PagosEnBancosEnMediador();
  const paraConsultar = piezasParaConsultar();
  return {
    registrar: new RegistrarPago(piezasParaRegistrar(paraConsultar, bancos)),
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
