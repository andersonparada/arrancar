import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ModulosActivosDeLaCuentaEnRegistro } from '../../core/mediador/infraestructura/modulos-activos-de-la-cuenta-en-registro.js';
import { ListarDestinos, ObtenerDestinoSugerido } from '../aplicacion/casos-uso/documentos/consultas-del-formulario.js';
import { AnularDocumento } from '../aplicacion/casos-uso/documentos/anular-documento.js';
import { ListarDocumentos, ObtenerDocumento } from '../aplicacion/casos-uso/documentos/consultar-documentos.js';
import { EliminarDocumento } from '../aplicacion/casos-uso/documentos/eliminar-documento.js';
import { MarcarDocumentoProcesado } from '../aplicacion/casos-uso/documentos/marcar-documento-procesado.js';
import { PrevisualizarDocumento } from '../aplicacion/casos-uso/documentos/previsualizar-documento.js';
import { RegistrarDocumento } from '../aplicacion/casos-uso/documentos/registrar-documento.js';
import { DocumentosControlador } from '../http/documentos.controlador.js';
import { rutasDeDocumentos } from '../http/documentos.rutas.js';
import { CalendarioDeFeriados } from '../infraestructura/calendario-de-feriados.js';
import { ConfiguracionFiscalEnConfiguracion } from '../infraestructura/configuracion-fiscal-en-configuracion.js';
import { DestinosDeDocumentosEnMediador } from '../infraestructura/destinos-de-documentos-en-mediador.js';
import { CatalogosParaDocumentosDrizzle } from '../infraestructura/persistencia/catalogos-para-documentos.drizzle.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { ProveedoresParaDocumentosDrizzle } from '../infraestructura/persistencia/proveedores-para-documentos.drizzle.js';
import { ConsultasDeListaDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-lista-de-documentos.drizzle.js';
import { ConsultasDeEnterosDrizzle } from '../infraestructura/persistencia/enteros-de-retenciones.drizzle.js';
import { RetencionesDeUnDocumentoDrizzle } from '../infraestructura/persistencia/repositorio-de-retenciones.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { RepositorioDeDocumentosGuardadosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos-guardados.drizzle.js';
import { RepositorioDeDatosFiscalesDeEmpresaDrizzle } from '../infraestructura/persistencia/repositorio-de-datos-fiscales-de-empresa.drizzle.js';
import { RepositorioDeDatosFiscalesDeProveedorDrizzle } from '../infraestructura/persistencia/repositorios-de-datos-fiscales.drizzle.js';
import {
  CompletadorDeDpiEnMediador,
  CompletadorDeNitEnMediador,
  DatosDeLaEmpresaEnMediador,
} from '../infraestructura/vecinos-en-mediador.js';
import { EnlaceDeLaBandeja } from '../aplicacion/casos-uso/bandeja/enlace-de-la-bandeja.js';
import { RepositorioDeDteRecibidosDrizzle } from '../infraestructura/persistencia/repositorio-de-dte-recibidos.drizzle.js';
import { controlDePeriodos } from './control-de-periodos.js';
import { atenderOrdenesDeDocumentos } from './ordenes-de-documentos.js';

/** Las retenciones y los enteros que miran la baja y los avisos del documento, y la bandeja de DTE que enlaza o suelta su fila. */
const vecinosDelDocumento = () => ({
  enteros: new ConsultasDeEnterosDrizzle(),
  retenciones: new RetencionesDeUnDocumentoDrizzle(),
  bandeja: new EnlaceDeLaBandeja(new RepositorioDeDteRecibidosDrizzle()),
});

/** Lo que usan el registro y las bajas de documentos; también lo usa la bandeja de DTE para confirmar con el mismo registro. */
export function dependenciasDeDocumentos() {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    publicadorEventos: compartidas.publicadorEventos,
    auditoria: compartidas.auditoria,
    reloj: compartidas.reloj,
    empresa: new DatosDeLaEmpresaEnMediador(),
    proveedores: new ProveedoresParaDocumentosDrizzle(),
    datosFiscalesDeEmpresa: new RepositorioDeDatosFiscalesDeEmpresaDrizzle(),
    datosFiscalesDeProveedor: new RepositorioDeDatosFiscalesDeProveedorDrizzle(),
    configuracion: new ConfiguracionFiscalEnConfiguracion(),
    calendario: new CalendarioDeFeriados(),
    catalogos: new CatalogosParaDocumentosDrizzle(),
    consultas: new ConsultasDeDocumentosDrizzle(),
    destinos: new DestinosDeDocumentosEnMediador(new ModulosActivosDeLaCuentaEnRegistro()),
    control: controlDePeriodos(),
    repositorio: new RepositorioDeDocumentosDrizzle(),
    guardados: new RepositorioDeDocumentosGuardadosDrizzle(),
    consultasDeLista: new ConsultasDeListaDeDocumentosDrizzle(),
    completadorDeNit: new CompletadorDeNitEnMediador(),
    completadorDeDpi: new CompletadorDeDpiEnMediador(),
    ...vecinosDelDocumento(),
  };
}

/** Raíz de composición del registro de documentos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeDocumentosComponidas() {
  const dependencias = dependenciasDeDocumentos();
  const bajas = { ...dependencias, repositorio: dependencias.guardados };
  const anular = new AnularDocumento(bajas);
  const eliminar = new EliminarDocumento(bajas);
  atenderOrdenesDeDocumentos({ marcarProcesado: new MarcarDocumentoProcesado(bajas), anular, eliminar });
  return rutasDeDocumentos(
    new DocumentosControlador({
      previsualizar: new PrevisualizarDocumento(dependencias),
      registrar: new RegistrarDocumento(dependencias),
      destinoSugerido: new ObtenerDestinoSugerido(dependencias),
      destinos: new ListarDestinos(dependencias),
      listar: new ListarDocumentos({ ...dependencias, consultas: dependencias.consultasDeLista }),
      obtener: new ObtenerDocumento(bajas),
      anular,
      eliminar,
    }),
  );
}
