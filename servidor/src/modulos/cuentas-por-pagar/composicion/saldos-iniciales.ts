import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { CorregirSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/corregir-saldo-inicial.js';
import { CrearSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/crear-saldo-inicial.js';
import { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import { ListarSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import { ObtenerSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/obtener-saldo-inicial.js';
import { rutasDeExcelDeSaldosIniciales } from '../http/saldos-iniciales.excel.rutas.js';
import { SaldosInicialesControlador } from '../http/saldos-iniciales.controlador.js';
import { rutasDeSaldosIniciales } from '../http/saldos-iniciales.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { CondicionesDeProveedoresDrizzle } from '../infraestructura/persistencia/condiciones-de-proveedores.drizzle.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { ProveedoresParaSaldosDrizzle } from '../infraestructura/persistencia/proveedores-para-saldos.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from '../infraestructura/persistencia/repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { RepositorioDeSaldosInicialesDrizzle } from '../infraestructura/persistencia/repositorio-de-saldos-iniciales.drizzle.js';
import { PlazoPorOmisionEnConfiguracion } from '../infraestructura/plazo-por-omision-en-configuracion.js';
import { intercambioDeSaldosIniciales } from './saldos-iniciales-excel.js';

function dependenciasDeSaldosIniciales() {
  const { unidadDeTrabajo, reloj, auditoria } = dependenciasCompartidas();
  return {
    unidadDeTrabajo,
    reloj,
    auditoria,
    documentos: new RepositorioDeDocumentosDrizzle(new RepositorioDeAplicacionesDrizzle()),
    saldosIniciales: new RepositorioDeSaldosInicialesDrizzle(),
    consultas: new ConsultasDeDocumentosDrizzle(),
    cargaInicial: new CargaInicialEnMediador(),
    proveedores: new ProveedoresParaSaldosDrizzle(),
    condiciones: new CondicionesDeProveedoresDrizzle(),
    plazo: new PlazoPorOmisionEnConfiguracion(),
  };
}

type Dependencias = ReturnType<typeof dependenciasDeSaldosIniciales>;

const casosDeUso = (dependencias: Dependencias) => ({
  crear: new CrearSaldoInicial(dependencias),
  corregir: new CorregirSaldoInicial(dependencias),
  eliminar: new EliminarSaldoInicial(dependencias),
  listar: new ListarSaldosIniciales(dependencias),
  obtener: new ObtenerSaldoInicial(dependencias),
});

/** Raíz de composición de los saldos iniciales: cargar, corregir, eliminar, consultar y el Excel (el cuadre, después). */
export function rutasDeSaldosInicialesComponidas(): FastifyPluginAsync {
  const casos = casosDeUso(dependenciasDeSaldosIniciales());
  const rutas = rutasDeSaldosIniciales(new SaldosInicialesControlador(casos));
  const excel = rutasDeExcelDeSaldosIniciales(intercambioDeSaldosIniciales(casos));
  return async (app) => {
    await app.register(rutas);
    await app.register(excel);
  };
}
