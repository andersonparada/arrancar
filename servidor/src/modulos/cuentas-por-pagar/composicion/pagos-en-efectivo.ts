import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/bancos.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import type { DependenciasDeEfectivo } from '../aplicacion/casos-uso/efectivo/dependencias-de-efectivo.js';
import { RegistrarPagosEnEfectivo } from '../aplicacion/casos-uso/efectivo/registrar-pagos-en-efectivo.js';
import { PagosEnEfectivoControlador } from '../http/pagos-en-efectivo.controlador.js';
import { rutasDePagosEnEfectivo } from '../http/pagos-en-efectivo.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { PagosEnBancosEnMediador } from '../infraestructura/pagos-en-bancos-en-mediador.js';
import { BancarizacionDelLibroEnMediador } from '../infraestructura/bancarizacion-del-libro-en-mediador.js';
import { BloqueoDeBancarizacionDrizzle } from '../infraestructura/persistencia/bloqueo-de-bancarizacion.drizzle.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { ConsultasDePagosDrizzle } from '../infraestructura/persistencia/consultas-de-pagos.drizzle.js';
import { ConsultasDeChequesDeAperturaDrizzle } from '../infraestructura/persistencia/cheques-de-apertura-sin-ligar.drizzle.js';
import { ConsultasDeRetirosDrizzle } from '../infraestructura/persistencia/consultas-de-retiros.drizzle.js';
import { FechasDeEntradaDrizzle } from '../infraestructura/persistencia/fechas-de-entrada.drizzle.js';
import {
  DatosFiscalesDeLaEmpresaDrizzle,
  NombreDelNitDrizzle,
  RetencionesDelLibroDrizzle,
} from '../infraestructura/persistencia/lecturas-del-libro.drizzle.js';
import { MovimientosDePagosDrizzle } from '../infraestructura/persistencia/movimientos-de-pagos.drizzle.js';
import { NotasParaLigarDrizzle } from '../infraestructura/persistencia/notas-para-ligar.drizzle.js';
import { RepositorioDeAjustesDrizzle } from '../infraestructura/persistencia/repositorio-de-ajustes.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from '../infraestructura/persistencia/repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeContrasenasDrizzle } from '../infraestructura/persistencia/repositorio-de-contrasenas.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { RepositorioDePagosDrizzle } from '../infraestructura/persistencia/repositorio-de-pagos.drizzle.js';
import { RepositorioDeRetirosDrizzle } from '../infraestructura/persistencia/repositorio-de-retiros.drizzle.js';
import { TopeDeDiferenciaDelPagoEnConfiguracion } from '../infraestructura/tope-de-diferencia-del-pago-en-configuracion.js';
import { UmbralDeBancarizacionEnConfiguracion } from '../infraestructura/umbral-de-bancarizacion-en-configuracion.js';

/** Raíz de composición de los pagos en efectivo: repartir el efectivo de un retiro entre uno o varios proveedores. */
export function rutasDePagosEnEfectivoComponidas(): FastifyPluginAsync {
  return rutasDePagosEnEfectivo(
    new PagosEnEfectivoControlador({ repartir: new RegistrarPagosEnEfectivo(dependencias()) }),
  );
}

function dependencias(): DependenciasDeEfectivo {
  const { unidadDeTrabajo, reloj, correlativos, auditoria, publicadorEventos } = dependenciasCompartidas();
  const movimientos = new MovimientosDePagosDrizzle();
  return {
    ...{ unidadDeTrabajo, reloj, correlativos, auditoria, publicadorEventos },
    ...delPago(movimientos),
    retiros: new RepositorioDeRetirosDrizzle(),
    consultasDeRetiros: new ConsultasDeRetirosDrizzle(),
    movimientos,
    bloqueoDeBancarizacion: new BloqueoDeBancarizacionDrizzle(),
    bancarizacionDelLibro: new BancarizacionDelLibroEnMediador(),
  };
}

/** Lo de registrar un pago: cargos, contraseñas, lo que se lee del libro y la configuración. */
function delPago(movimientos: MovimientosDePagosDrizzle) {
  return {
    documentos: new RepositorioDeDocumentosDrizzle(new RepositorioDeAplicacionesDrizzle()),
    consultas: new ConsultasDeDocumentosDrizzle(),
    contrasenas: new RepositorioDeContrasenasDrizzle(),
    pagos: new RepositorioDePagosDrizzle(),
    consultasDePagos: new ConsultasDePagosDrizzle(),
    ajustes: new RepositorioDeAjustesDrizzle(),
    bancos: new PagosEnBancosEnMediador(movimientos),
    notas: new NotasParaLigarDrizzle(),
    retenciones: new RetencionesDelLibroDrizzle(),
    nombreDelNit: new NombreDelNitDrizzle(),
    fiscal: new DatosFiscalesDeLaEmpresaDrizzle(),
    umbral: new UmbralDeBancarizacionEnConfiguracion(),
    topeDeDiferencia: new TopeDeDiferenciaDelPagoEnConfiguracion(),
    cargaInicial: new CargaInicialEnMediador(),
    fechasDeEntrada: new FechasDeEntradaDrizzle(),
    chequesDeApertura: new ConsultasDeChequesDeAperturaDrizzle(),
  };
}
