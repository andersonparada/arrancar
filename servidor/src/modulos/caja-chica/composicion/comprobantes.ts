import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/caja-chica.contratos.js';
import '../../core/contratos/libro-de-compras.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { PublicadorEventosTrasConfirmar } from '../../core/compartido/infraestructura/publicador-eventos-tras-confirmar.js';
import { mediador } from '../../core/mediador/contexto.js';
import { AnularComprobante } from '../aplicacion/casos-uso/comprobantes/anular-comprobante.js';
import { AsignarDocumentos } from '../aplicacion/casos-uso/comprobantes/asignar-documentos.js';
import { AnularPorAviso, EliminarPorAviso } from '../aplicacion/casos-uso/comprobantes/atender-avisos-del-libro.js';
import {
  ListarBandeja,
  ListarComprobantesDelFondo,
} from '../aplicacion/casos-uso/comprobantes/consultas-de-comprobantes.js';
import type { DependenciasDeComprobantes } from '../aplicacion/casos-uso/comprobantes/dependencias-de-comprobantes.js';
import { DevolverALaBandeja } from '../aplicacion/casos-uso/comprobantes/devolver-a-la-bandeja.js';
import { RecibirDocumento } from '../aplicacion/casos-uso/comprobantes/recibir-documento.js';
import { RegistrarValeDeGasto } from '../aplicacion/casos-uso/comprobantes/registrar-vale-de-gasto.js';
import { ResponderPagadoAlProveedor } from '../aplicacion/casos-uso/comprobantes/responder-pagado-al-proveedor.js';
import { ComprobantesControlador } from '../http/comprobantes.controlador.js';
import { rutasDeComprobantes } from '../http/comprobantes.rutas.js';
import {
  BancarizacionDelLibroEnMediador,
  ConceptosDeGastoDrizzle,
  ConfiguracionDeComprobantesEnConfiguracion,
  PagosDeCajaChicaEnFuncion,
} from '../infraestructura/apoyos-de-comprobantes.js';
import { ConsultasDeComprobantesDrizzle } from '../infraestructura/persistencia/consultas-de-comprobantes.drizzle.js';
import { ConsultasDeFondosDrizzle } from '../infraestructura/persistencia/consultas-de-fondos.drizzle.js';
import { RepositorioDeComprobantesDrizzle } from '../infraestructura/persistencia/repositorio-de-comprobantes.drizzle.js';
import { RepositorioDeFondosDrizzle } from '../infraestructura/persistencia/repositorio-de-fondos.drizzle.js';

const MODULO = 'caja-chica';

/**
 * Raíz de composición de los comprobantes: la bandeja, asignar, devolver, vales de gasto y anular, más lo que Caja chica
 * atiende del mediador: la orden `recibir_documento`, los avisos de baja del libro y la pregunta de la bancarización.
 */
export function rutasDeComprobantesComponidas(): FastifyPluginAsync {
  const dependencias = dependenciasDeComprobantes();
  atenderAlMediador(dependencias);
  return rutasDeComprobantes(
    new ComprobantesControlador({
      bandeja: new ListarBandeja(dependencias),
      delFondo: new ListarComprobantesDelFondo(dependencias),
      asignar: new AsignarDocumentos(dependencias),
      devolver: new DevolverALaBandeja(dependencias),
      registrarVale: new RegistrarValeDeGasto(dependencias),
      anular: new AnularComprobante(dependencias),
    }),
  );
}

/** Lo que llega de otros módulos corre en su transacción, sin permisos propios (el permiso lo exigió la ruta de origen). */
function atenderAlMediador(dependencias: DependenciasDeComprobantes): void {
  const recibir = new RecibirDocumento(dependencias);
  const anularPorAviso = new AnularPorAviso(dependencias);
  const eliminarPorAviso = new EliminarPorAviso(dependencias);
  const responder = new ResponderPagadoAlProveedor(new PagosDeCajaChicaEnFuncion());
  mediador.atender(MODULO, 'caja-chica.recibir_documento', (documento, operador) =>
    recibir.ejecutar(operador, documento),
  );
  mediador.escuchar(MODULO, 'libro-de-compras.documento_por_anular', (aviso, operador) =>
    anularPorAviso.ejecutar(operador, aviso),
  );
  mediador.escuchar(MODULO, 'libro-de-compras.documento_por_eliminar', (aviso, operador) =>
    eliminarPorAviso.ejecutar(operador, aviso),
  );
  mediador.responder(MODULO, 'libro-de-compras.pagado_al_proveedor_en_el_mes', (datos) => responder.ejecutar(datos));
}

export function dependenciasDeComprobantes(): DependenciasDeComprobantes {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    fondos: new RepositorioDeFondosDrizzle(),
    consultasDeFondos: new ConsultasDeFondosDrizzle(),
    comprobantes: new RepositorioDeComprobantesDrizzle(),
    consultas: new ConsultasDeComprobantesDrizzle(),
    configuracion: new ConfiguracionDeComprobantesEnConfiguracion(),
    conceptos: new ConceptosDeGastoDrizzle(),
    bancarizacion: new BancarizacionDelLibroEnMediador(),
    correlativos: compartidas.correlativos,
    auditoria: compartidas.auditoria,
    publicadorEventos: new PublicadorEventosTrasConfirmar(compartidas.publicadorEventos),
    reloj: compartidas.reloj,
  };
}
