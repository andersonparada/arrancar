import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AgregarDocumentosAContrasena } from '../aplicacion/casos-uso/contrasenas/agregar-documentos-a-contrasena.js';
import { CrearContrasena } from '../aplicacion/casos-uso/contrasenas/crear-contrasena.js';
import { DocumentosDisponibles } from '../aplicacion/casos-uso/contrasenas/documentos-disponibles.js';
import { EditarContrasena } from '../aplicacion/casos-uso/contrasenas/editar-contrasena.js';
import { ListarContrasenas } from '../aplicacion/casos-uso/contrasenas/listar-contrasenas.js';
import { ObtenerContrasena } from '../aplicacion/casos-uso/contrasenas/obtener-contrasena.js';
import { QuitarDocumentoDeContrasena } from '../aplicacion/casos-uso/contrasenas/quitar-documento-de-contrasena.js';
import { ContrasenasControlador, type CasosDeUsoDeContrasenas } from '../http/contrasenas.controlador.js';
import { rutasDeContrasenas } from '../http/contrasenas.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { ConsultasDeContrasenasDrizzle } from '../infraestructura/persistencia/consultas-de-contrasenas.drizzle.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { FechasDeEntradaDrizzle } from '../infraestructura/persistencia/fechas-de-entrada.drizzle.js';
import { ProveedoresDeContrasenasDrizzle } from '../infraestructura/persistencia/proveedores-de-contrasenas.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from '../infraestructura/persistencia/repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeContrasenasDrizzle } from '../infraestructura/persistencia/repositorio-de-contrasenas.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { UmbralDeBancarizacionEnConfiguracion } from '../infraestructura/umbral-de-bancarizacion-en-configuracion.js';

/** Raíz de composición de las contraseñas de pago: lista, ficha, documentos disponibles, crear y editar. */
export function rutasDeContrasenasComponidas(): FastifyPluginAsync {
  return rutasDeContrasenas(new ContrasenasControlador(casosDeUso()));
}

function casosDeUso(): CasosDeUsoDeContrasenas {
  const { unidadDeTrabajo, reloj, correlativos, auditoria } = dependenciasCompartidas();
  const paraConsultar = {
    unidadDeTrabajo,
    reloj,
    contrasenas: new ConsultasDeContrasenasDrizzle(),
    umbral: new UmbralDeBancarizacionEnConfiguracion(),
  };
  const paraArmar = { ...paraConsultar, ...piezasParaArmar() };
  const paraCrear = { ...paraArmar, correlativos, proveedores: new ProveedoresDeContrasenasDrizzle() };
  const paraEditar = { ...paraArmar, auditoria };
  return {
    listar: new ListarContrasenas(paraConsultar),
    obtener: new ObtenerContrasena(paraConsultar),
    disponibles: new DocumentosDisponibles(paraConsultar),
    crear: new CrearContrasena(paraCrear),
    editar: new EditarContrasena(paraEditar),
    agregarDocumentos: new AgregarDocumentosAContrasena(paraEditar),
    quitarDocumento: new QuitarDocumentoDeContrasena(paraEditar),
  };
}

/** Lo que usan crear, agregar y quitar para bloquear documentos y repartir las notas. */
function piezasParaArmar() {
  return {
    documentos: new RepositorioDeDocumentosDrizzle(new RepositorioDeAplicacionesDrizzle()),
    consultas: new ConsultasDeDocumentosDrizzle(),
    repositorio: new RepositorioDeContrasenasDrizzle(),
    cargaInicial: new CargaInicialEnMediador(),
    fechasDeEntrada: new FechasDeEntradaDrizzle(),
  };
}
