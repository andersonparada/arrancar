import '../../core/contratos/empresas.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { mediador } from '../../core/mediador/contexto.js';
import {
  ListarSaldosIniciales,
  ObtenerSaldoInicial,
} from '../aplicacion/casos-uso/saldos-iniciales/consultas-de-saldos-iniciales.js';
import { CorregirSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/corregir-saldo-inicial.js';
import type { DependenciasDeSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/dependencias-de-saldos-iniciales.js';
import { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import { GuardarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/guardar-saldo-inicial.js';
import { GuardarSaldoInicialPorCodigo } from '../aplicacion/casos-uso/saldos-iniciales/guardar-saldo-inicial-por-codigo.js';
import { RevisarCierreDeCargaEnActivosFijos } from '../aplicacion/casos-uso/saldos-iniciales/revisar-cierre-de-carga-en-activos-fijos.js';
import { ValidarFechaDeInicioEnActivosFijos } from '../aplicacion/casos-uso/saldos-iniciales/validar-fecha-de-inicio-en-activos-fijos.js';
import type { SaldoInicialDto } from '../aplicacion/dto/saldo-inicial.dto.js';
import { columnasDeSaldosIniciales } from '../http/saldos-iniciales.columnas.js';
import { SaldosInicialesControlador } from '../http/saldos-iniciales.controlador.js';
import { esquemaSaldoInicialDeExcel, type SaldoInicialDeExcel } from '../http/saldos-iniciales.esquemas-http.js';
import { rutasSaldosIniciales } from '../http/saldos-iniciales.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { CierresDrizzle } from '../infraestructura/persistencia/cierres.drizzle.js';
import { ConsultasClasesDrizzle } from '../infraestructura/persistencia/consultas-clases.drizzle.js';
import { ConsultasSaldosInicialesDrizzle } from '../infraestructura/persistencia/consultas-saldos-iniciales.drizzle.js';
import { RepositorioActivosDrizzle } from '../infraestructura/persistencia/repositorio-activos.drizzle.js';
import { RepositorioClasesDrizzle } from '../infraestructura/persistencia/repositorio-clases.drizzle.js';
import { RepositorioCostosDrizzle } from '../infraestructura/persistencia/repositorio-costos.drizzle.js';
import { RepositorioSaldosInicialesDrizzle } from '../infraestructura/persistencia/repositorio-saldos-iniciales.drizzle.js';
import { RepositorioTramosDrizzle } from '../infraestructura/persistencia/repositorio-tramos.drizzle.js';
import { UbicacionesEnEmpresas } from '../infraestructura/persistencia/ubicaciones-en-empresas.drizzle.js';
import { PrefijoEnConfiguracion } from '../infraestructura/prefijo-en-configuracion.js';
import { TopesEnConfiguracion } from '../infraestructura/topes-en-configuracion.js';

function dependenciasDeSaldosIniciales(): DependenciasDeSaldosIniciales {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    auditoria: compartidas.auditoria,
    correlativos: compartidas.correlativos,
    reloj: compartidas.reloj,
    repositorio: new RepositorioActivosDrizzle(),
    clases: new RepositorioClasesDrizzle(),
    ubicaciones: new UbicacionesEnEmpresas(),
    cargaInicial: new CargaInicialEnMediador(),
    prefijo: new PrefijoEnConfiguracion(),
    saldos: new RepositorioSaldosInicialesDrizzle(),
    consultas: new ConsultasSaldosInicialesDrizzle(),
    costos: new RepositorioCostosDrizzle(),
    tramos: new RepositorioTramosDrizzle(),
    cierres: new CierresDrizzle(),
    topes: new TopesEnConfiguracion(),
  };
}

/** Las clases, localidades y departamentos que se pueden escribir por nombre (las localidades, también por código). */
function opcionesDeReferencias() {
  const ubicaciones = new UbicacionesEnEmpresas();
  return {
    clases: opcionesDe(new ConsultasClasesDrizzle(), 'nombre'),
    localidades: async () => (await ubicaciones.activas()).localidades,
    departamentos: async () => (await ubicaciones.activas()).departamentos,
  };
}

/** Exportar e importar en Excel: cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeSaldos(dependencias: DependenciasDeSaldosIniciales, listar: ListarSaldosIniciales) {
  const porCodigo = new GuardarSaldoInicialPorCodigo({
    unidadDeTrabajo: dependencias.unidadDeTrabajo,
    repositorio: dependencias.repositorio,
    guardar: new GuardarSaldoInicial(dependencias),
  });
  return crearIntercambio<SaldoInicialDto, SaldoInicialDeExcel>({
    nombre: 'Saldos iniciales de activos fijos',
    columnas: columnasDeSaldosIniciales(opcionesDeReferencias()),
    validar: validadorDeZod(esquemaSaldoInicialDeExcel),
    listar: async (operador) => (await listar.ejecutar(operador)).saldos,
    crear: (operador, solicitud) => porCodigo.ejecutar(operador, solicitud),
    notasDeInstrucciones: [
      'Cada fila es un activo que la empresa ya tenía al día anterior a su fecha de inicio. Las fechas deben ser anteriores a ella.',
      'El padre (componentes) se escribe por su código y debe estar en una fila anterior o ya cargado.',
      'Sin costo fiscal, base fiscal, porcentaje fiscal ni valor residual, se proponen los de la clase. Terrenos y obras en construcción van con depreciación acumulada en 0.',
    ],
  });
}

/** Activos fijos responde la revisión que Empresas pide antes de cerrar la carga y escucha el cambio de la fecha de inicio. */
function registrarEnElMediador(dependencias: DependenciasDeSaldosIniciales): void {
  const revisar = new RevisarCierreDeCargaEnActivosFijos(dependencias);
  mediador.responder('activos-fijos', 'empresas.revisar_cierre_de_carga', (datos, operador) =>
    revisar.ejecutar(operador, datos),
  );
  const validarFecha = new ValidarFechaDeInicioEnActivosFijos(dependencias);
  mediador.escuchar('activos-fijos', 'empresas.fecha_de_inicio_por_cambiar', (aviso, operador) =>
    validarFecha.ejecutar(operador, aviso),
  );
}

/** Raíz de composición de los saldos iniciales: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeSaldosIniciales() {
  const dependencias = dependenciasDeSaldosIniciales();
  registrarEnElMediador(dependencias);
  const listar = new ListarSaldosIniciales(dependencias);
  return rutasSaldosIniciales(
    new SaldosInicialesControlador({
      listar,
      obtener: new ObtenerSaldoInicial(dependencias),
      guardar: new GuardarSaldoInicial(dependencias),
      corregir: new CorregirSaldoInicial(dependencias),
      eliminar: new EliminarSaldoInicial(dependencias),
    }),
    intercambioDeSaldos(dependencias, listar),
  );
}
