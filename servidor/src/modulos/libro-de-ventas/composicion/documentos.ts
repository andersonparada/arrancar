import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import '../../core/contratos/libro-de-ventas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { ModulosActivosDeLaCuentaEnRegistro } from '../../core/mediador/infraestructura/modulos-activos-de-la-cuenta-en-registro.js';
import { AnularDocumentoDeVenta } from '../aplicacion/casos-uso/documentos/anular-documento-de-venta.js';
import {
  ListarDocumentosDeVenta,
  ObtenerDocumentoDeVenta,
} from '../aplicacion/casos-uso/documentos/consultar-documentos-de-venta.js';
import { EliminarDocumentoDeVenta } from '../aplicacion/casos-uso/documentos/eliminar-documento-de-venta.js';
import { MarcarDocumentoDeVentaProcesado } from '../aplicacion/casos-uso/documentos/marcar-documento-de-venta-procesado.js';
import { RegistrarDocumentoDeVenta } from '../aplicacion/casos-uso/documentos/registrar-documento-de-venta.js';
import { DocumentosControlador } from '../http/documentos.controlador.js';
import { rutasDeDocumentos } from '../http/documentos.rutas.js';
import { CalendarioDeFeriados } from '../infraestructura/calendario-de-feriados.js';
import { ConfiguracionDeVentasEnConfiguracion } from '../infraestructura/configuracion-de-ventas-en-configuracion.js';
import { CatalogosParaDocumentosDrizzle } from '../infraestructura/persistencia/catalogos-para-documentos.drizzle.js';
import { ConsultasDeDocumentosDeVentaDrizzle } from '../infraestructura/persistencia/consultas-de-documentos-de-venta.drizzle.js';
import { ControlDePeriodosParaVentasDrizzle } from '../infraestructura/persistencia/control-de-periodos-para-ventas.drizzle.js';
import { HistorialFiscalParaVentasDrizzle } from '../infraestructura/persistencia/historial-fiscal-para-ventas.drizzle.js';
import { RepositorioDeDocumentosDeVentaDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos-de-venta.drizzle.js';
import { DatosDeLaEmpresaEnMediador, DestinosDeVentaEnMediador } from '../infraestructura/vecinos-en-mediador.js';

/** Todo lo que usan el registro y las bajas de documentos: las implementaciones concretas se eligen aquí. */
function dependenciasDeDocumentos() {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    publicadorEventos: compartidas.publicadorEventos,
    auditoria: compartidas.auditoria,
    reloj: compartidas.reloj,
    repositorio: new RepositorioDeDocumentosDeVentaDrizzle(),
    consultas: new ConsultasDeDocumentosDeVentaDrizzle(),
    catalogos: new CatalogosParaDocumentosDrizzle(),
    historial: new HistorialFiscalParaVentasDrizzle(),
    control: new ControlDePeriodosParaVentasDrizzle(),
    configuracion: new ConfiguracionDeVentasEnConfiguracion(),
    empresa: new DatosDeLaEmpresaEnMediador(),
    destinos: new DestinosDeVentaEnMediador(new ModulosActivosDeLaCuentaEnRegistro()),
    calendario: new CalendarioDeFeriados(),
  };
}

/** La cartera marca lo procesado con una orden; Libro de ventas la atiende con el mismo caso de uso que cualquier otra baja. */
function atenderMarcarProcesado(marcar: MarcarDocumentoDeVentaProcesado): void {
  mediador.atender('libro-de-ventas', 'libro-de-ventas.marcar_procesado', (datos, operador) =>
    marcar.ejecutar(operador, datos),
  );
}

/** Raíz de composición de los documentos de venta: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeDocumentosComponidas() {
  const dependencias = dependenciasDeDocumentos();
  atenderMarcarProcesado(new MarcarDocumentoDeVentaProcesado(dependencias));
  return rutasDeDocumentos(
    new DocumentosControlador({
      registrar: new RegistrarDocumentoDeVenta(dependencias),
      listar: new ListarDocumentosDeVenta(dependencias),
      obtener: new ObtenerDocumentoDeVenta(dependencias),
      anular: new AnularDocumentoDeVenta(dependencias),
      eliminar: new EliminarDocumentoDeVenta(dependencias),
    }),
  );
}
