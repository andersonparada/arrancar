import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ModulosActivosDeLaCuentaEnRegistro } from '../../core/mediador/infraestructura/modulos-activos-de-la-cuenta-en-registro.js';
import { ListarDestinos, ObtenerDestinoSugerido } from '../aplicacion/casos-uso/documentos/consultas-del-formulario.js';
import { PrevisualizarDocumento } from '../aplicacion/casos-uso/documentos/previsualizar-documento.js';
import { RegistrarDocumento } from '../aplicacion/casos-uso/documentos/registrar-documento.js';
import { DocumentosControlador } from '../http/documentos.controlador.js';
import { rutasDeDocumentos } from '../http/documentos.rutas.js';
import { ConfiguracionFiscalEnConfiguracion } from '../infraestructura/configuracion-fiscal-en-configuracion.js';
import { ControlDePeriodosSinBloqueo } from '../infraestructura/control-de-periodos-sin-bloqueo.js';
import { DestinosDeDocumentosEnMediador } from '../infraestructura/destinos-de-documentos-en-mediador.js';
import { CatalogosParaDocumentosDrizzle } from '../infraestructura/persistencia/catalogos-para-documentos.drizzle.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { ProveedoresParaDocumentosDrizzle } from '../infraestructura/persistencia/proveedores-para-documentos.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import {
  RepositorioDeDatosFiscalesDeEmpresaDrizzle,
  RepositorioDeDatosFiscalesDeProveedorDrizzle,
} from '../infraestructura/persistencia/repositorios-de-datos-fiscales.drizzle.js';
import { CompletadorDeNitEnMediador, DatosDeLaEmpresaEnMediador } from '../infraestructura/vecinos-en-mediador.js';

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
    catalogos: new CatalogosParaDocumentosDrizzle(),
    consultas: new ConsultasDeDocumentosDrizzle(),
    destinos: new DestinosDeDocumentosEnMediador(new ModulosActivosDeLaCuentaEnRegistro()),
    control: new ControlDePeriodosSinBloqueo(),
    repositorio: new RepositorioDeDocumentosDrizzle(),
    completadorDeNit: new CompletadorDeNitEnMediador(),
  };
}

/** Raíz de composición del registro de documentos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeDocumentosComponidas() {
  const dependencias = dependenciasDeDocumentos();
  return rutasDeDocumentos(
    new DocumentosControlador({
      previsualizar: new PrevisualizarDocumento(dependencias),
      registrar: new RegistrarDocumento(dependencias),
      destinoSugerido: new ObtenerDestinoSugerido(dependencias),
      destinos: new ListarDestinos(dependencias),
    }),
  );
}
