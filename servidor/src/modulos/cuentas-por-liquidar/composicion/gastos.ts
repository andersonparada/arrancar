import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/cuentas-por-liquidar.contratos.js';
import '../../core/contratos/libro-de-compras.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { mediador } from '../../core/mediador/contexto.js';
import { AsignarGastos } from '../aplicacion/casos-uso/gastos/asignar-gastos.js';
import { AtenderBajaDeDocumento } from '../aplicacion/casos-uso/gastos/atender-baja-de-documento.js';
import { ListarBandeja, ListarGastosDelAnticipo } from '../aplicacion/casos-uso/gastos/consultas-de-gastos.js';
import type { DependenciasDeGastos } from '../aplicacion/casos-uso/gastos/dependencias-de-gastos.js';
import { QuitarGasto } from '../aplicacion/casos-uso/gastos/quitar-gasto.js';
import { RecibirDocumento } from '../aplicacion/casos-uso/gastos/recibir-documento.js';
import { RegistrarGastoSinDocumento } from '../aplicacion/casos-uso/gastos/registrar-gasto-sin-documento.js';
import { ResponderPagadoAlProveedor } from '../aplicacion/casos-uso/gastos/responder-pagado-al-proveedor.js';
import { GastosControlador } from '../http/gastos.controlador.js';
import { rutasDeGastos } from '../http/gastos.rutas.js';
import { BancarizacionDelLibroEnMediador } from '../infraestructura/bancarizacion-del-libro-en-mediador.js';
import { ConsultasDeGastosDrizzle } from '../infraestructura/persistencia/consultas-de-gastos.drizzle.js';
import { DocumentosDelLibroDrizzle } from '../infraestructura/persistencia/documentos-del-libro.drizzle.js';
import { MovimientosDeBancosDrizzle } from '../infraestructura/persistencia/movimientos-de-bancos.drizzle.js';
import { ReferenciasDelGastoDrizzle } from '../infraestructura/persistencia/referencias-del-gasto.drizzle.js';
import { RepositorioDeAnticiposDrizzle } from '../infraestructura/persistencia/repositorio-de-anticipos.drizzle.js';
import { RepositorioDeGastosDrizzle } from '../infraestructura/persistencia/repositorio-de-gastos.drizzle.js';
import { PoliticaDeGastosEnConfiguracion } from '../infraestructura/politica-de-gastos-en-configuracion.js';

const MODULO = 'cuentas-por-liquidar';

/**
 * Raíz de composición de los gastos de los anticipos. También atiende lo que llega del libro: la orden `recibir_documento`,
 * los avisos de baja de un documento y la pregunta de cuánto se pagó al proveedor en el mes (bancarización compartida).
 */
export function rutasDeGastosComponidas(): FastifyPluginAsync {
  const dependencias = dependenciasDeGastos();
  atenderAlLibro(dependencias);
  return rutasDeGastos(
    new GastosControlador({
      asignar: new AsignarGastos(dependencias),
      sinDocumento: new RegistrarGastoSinDocumento(dependencias),
      quitar: new QuitarGasto(dependencias),
      bandeja: new ListarBandeja(dependencias),
      delAnticipo: new ListarGastosDelAnticipo(dependencias),
    }),
  );
}

function atenderAlLibro(dependencias: DependenciasDeGastos): void {
  const recibir = new RecibirDocumento(dependencias);
  const bajas = new AtenderBajaDeDocumento(dependencias);
  const responder = new ResponderPagadoAlProveedor(dependencias.consultas);
  mediador.atender(MODULO, 'cuentas-por-liquidar.recibir_documento', (documento, operador) =>
    recibir.ejecutar(operador, documento),
  );
  mediador.escuchar(MODULO, 'libro-de-compras.documento_por_anular', (aviso, operador) =>
    bajas.anular(operador, aviso),
  );
  mediador.escuchar(MODULO, 'libro-de-compras.documento_por_eliminar', (aviso, operador) =>
    bajas.eliminar(operador, aviso),
  );
  mediador.responder(MODULO, 'libro-de-compras.pagado_al_proveedor_en_el_mes', (datos) => responder.ejecutar(datos));
}

function dependenciasDeGastos(): DependenciasDeGastos {
  const { unidadDeTrabajo, reloj, auditoria, publicadorEventos } = dependenciasCompartidas();
  return {
    unidadDeTrabajo,
    gastos: new RepositorioDeGastosDrizzle(),
    consultas: new ConsultasDeGastosDrizzle(),
    documentos: new DocumentosDelLibroDrizzle(),
    bancarizacion: new BancarizacionDelLibroEnMediador(),
    referencias: new ReferenciasDelGastoDrizzle(),
    politica: new PoliticaDeGastosEnConfiguracion(),
    anticipos: new RepositorioDeAnticiposDrizzle(),
    movimientos: new MovimientosDeBancosDrizzle(),
    auditoria,
    publicadorEventos,
    reloj,
  };
}
