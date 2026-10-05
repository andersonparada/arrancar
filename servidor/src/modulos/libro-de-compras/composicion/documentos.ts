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
import { CalendarioDeLunesAViernes } from '../dominio/calendario-laboral.js';
import { ConfiguracionFiscalEnConfiguracion } from '../infraestructura/configuracion-fiscal-en-configuracion.js';
import { ControlDePeriodosSinBloqueo } from '../infraestructura/control-de-periodos-sin-bloqueo.js';
import { DestinosDeDocumentosEnMediador } from '../infraestructura/destinos-de-documentos-en-mediador.js';
import { CatalogosParaDocumentosDrizzle } from '../infraestructura/persistencia/catalogos-para-documentos.drizzle.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { ProveedoresParaDocumentosDrizzle } from '../infraestructura/persistencia/proveedores-para-documentos.drizzle.js';
import { ConsultasDeListaDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-lista-de-documentos.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { RepositorioDeDocumentosGuardadosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos-guardados.drizzle.js';
import {
  RepositorioDeDatosFiscalesDeEmpresaDrizzle,
  RepositorioDeDatosFiscalesDeProveedorDrizzle,
} from '../infraestructura/persistencia/repositorios-de-datos-fiscales.drizzle.js';
import { CompletadorDeNitEnMediador, DatosDeLaEmpresaEnMediador } from '../infraestructura/vecinos-en-mediador.js';
import { atenderOrdenesDeDocumentos } from './ordenes-de-documentos.js';

function dependenciasDeDocumentos() {
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
    calendario: new CalendarioDeLunesAViernes(),
    catalogos: new CatalogosParaDocumentosDrizzle(),
    consultas: new ConsultasDeDocumentosDrizzle(),
    destinos: new DestinosDeDocumentosEnMediador(new ModulosActivosDeLaCuentaEnRegistro()),
    control: new ControlDePeriodosSinBloqueo(),
    repositorio: new RepositorioDeDocumentosDrizzle(),
    guardados: new RepositorioDeDocumentosGuardadosDrizzle(),
    consultasDeLista: new ConsultasDeListaDeDocumentosDrizzle(),
    completadorDeNit: new CompletadorDeNitEnMediador(),
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
