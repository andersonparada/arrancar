import type { DependenciasCompartidas } from '../../core/compartido/aplicacion/dependencias-compartidas.js';
import '../../core/contratos/empresas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { AlcanceDelOperador } from '../aplicacion/alcance-del-operador.js';
import { AtenderOrdenesDeDatosDeEmpresa } from '../aplicacion/casos-uso/datos-de-empresa/atender-ordenes-de-datos-de-empresa.js';
import { CerrarCargaInicial } from '../aplicacion/casos-uso/datos-de-empresa/cerrar-carga-inicial.js';
import type { DependenciasDeDatosDeEmpresa } from '../aplicacion/casos-uso/datos-de-empresa/dependencias.js';
import { EstablecerFechaDeInicio } from '../aplicacion/casos-uso/datos-de-empresa/establecer-fecha-de-inicio.js';
import { GuardarDatosFiscales } from '../aplicacion/casos-uso/datos-de-empresa/guardar-datos-fiscales.js';
import { ObtenerCargaInicial } from '../aplicacion/casos-uso/datos-de-empresa/obtener-carga-inicial.js';
import { ObtenerDatosFiscales } from '../aplicacion/casos-uso/datos-de-empresa/obtener-datos-fiscales.js';
import { ReabrirCargaInicial } from '../aplicacion/casos-uso/datos-de-empresa/reabrir-carga-inicial.js';
import { EjecutorEnEmpresa } from '../aplicacion/ejecutor-en-empresa.js';
import type { ConsultasEmpresas } from '../aplicacion/puertos/consultas-empresas.js';
import { DatosDeEmpresaControlador } from '../http/datos-de-empresa.controlador.js';
import { rutasDeDatosDeEmpresa } from '../http/datos-de-empresa.rutas.js';
import { ConsultasDeDatosDeEmpresaDrizzle } from '../infraestructura/persistencia/consultas-de-datos-de-empresa.drizzle.js';
import { RepositorioDeCargasInicialesDrizzle } from '../infraestructura/persistencia/repositorio-de-cargas-iniciales.drizzle.js';
import { RepositorioDeDatosFiscalesDrizzle } from '../infraestructura/persistencia/repositorio-de-datos-fiscales.drizzle.js';

interface EmpresasDeLaCuenta {
  consultas: ConsultasEmpresas;
  alcance: AlcanceDelOperador;
}

function dependenciasDe(
  { unidadDeTrabajo, auditoria }: DependenciasCompartidas,
  { consultas, alcance }: EmpresasDeLaCuenta,
): DependenciasDeDatosDeEmpresa {
  return {
    unidadDeTrabajo,
    ejecutorEnEmpresa: new EjecutorEnEmpresa({ unidadDeTrabajo, consultas, alcance }),
    repositorioFiscales: new RepositorioDeDatosFiscalesDrizzle(),
    repositorioCargas: new RepositorioDeCargasInicialesDrizzle(),
    consultas: new ConsultasDeDatosDeEmpresaDrizzle(),
    auditoria,
  };
}

/** Atiende por el mediador lo que otros módulos preguntan de la empresa; el permiso lo exige la ruta que origina. */
function atenderOrdenes(dependencias: DependenciasDeDatosDeEmpresa): void {
  const ordenes = new AtenderOrdenesDeDatosDeEmpresa(dependencias);
  mediador.atender('empresas', 'empresas.obtener_carga_inicial', (datos, operador) =>
    ordenes.obtenerCargaInicial(operador, datos.empresaId),
  );
  mediador.atender('empresas', 'empresas.obtener_datos_de_empresa', (datos, operador) =>
    ordenes.obtenerDatosDeEmpresa(operador, datos.empresaId),
  );
}

/** Raíz de composición de los datos fiscales y la carga inicial: devuelve sus rutas y registra sus órdenes. */
export function rutasDeDatosDeEmpresaComponidas(compartidas: DependenciasCompartidas, empresas: EmpresasDeLaCuenta) {
  const dependencias = dependenciasDe(compartidas, empresas);
  atenderOrdenes(dependencias);
  return rutasDeDatosDeEmpresa(
    new DatosDeEmpresaControlador({
      obtenerDatosFiscales: new ObtenerDatosFiscales(dependencias),
      guardarDatosFiscales: new GuardarDatosFiscales(dependencias),
      obtenerCargaInicial: new ObtenerCargaInicial(dependencias),
      establecerFechaDeInicio: new EstablecerFechaDeInicio(dependencias),
      cerrarCargaInicial: new CerrarCargaInicial(dependencias),
      reabrirCargaInicial: new ReabrirCargaInicial(dependencias),
    }),
  );
}
