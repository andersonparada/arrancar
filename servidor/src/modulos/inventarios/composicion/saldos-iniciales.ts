import '../../core/contratos/empresas.contratos.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { mediador } from '../../core/mediador/contexto.js';
import { CorregirSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/corregir-saldo-inicial.js';
import type { DependenciasDeSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/dependencias-de-saldos-iniciales.js';
import { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import { ListarSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import { RegistrarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/registrar-saldo-inicial.js';
import { RevisarCierreDeCargaEnInventarios } from '../aplicacion/casos-uso/saldos-iniciales/revisar-cierre-de-carga-en-inventarios.js';
import { ValidarFechaDeInicioEnInventarios } from '../aplicacion/casos-uso/saldos-iniciales/validar-fecha-de-inicio-en-inventarios.js';
import type { SaldoInicialDto } from '../aplicacion/dto/saldo-inicial.dto.js';
import { columnasDeSaldosIniciales } from '../http/saldos-iniciales.columnas.js';
import { SaldosInicialesControlador } from '../http/saldos-iniciales.controlador.js';
import { esquemaSaldoInicialDeExcel, type SaldoInicialDeExcel } from '../http/saldos-iniciales.esquemas-http.js';
import { rutasSaldosIniciales } from '../http/saldos-iniciales.rutas.js';
import { AlmacenDeLotesDrizzle } from '../infraestructura/persistencia/almacen-de-lotes.drizzle.js';
import { ConsultasArticulosDrizzle } from '../infraestructura/persistencia/consultas-articulos.drizzle.js';
import { ConsultasBodegasDrizzle } from '../infraestructura/persistencia/consultas-bodegas.drizzle.js';
import { ConsultasDeSaldosInicialesDrizzle } from '../infraestructura/persistencia/consultas-de-saldos-iniciales.drizzle.js';
import { ConsultasUnidadesDrizzle } from '../infraestructura/persistencia/consultas-unidades.drizzle.js';
import { dependenciasDelKardex } from './movimientos.js';

function dependenciasDeSaldosIniciales(): DependenciasDeSaldosIniciales {
  return {
    ...dependenciasDelKardex(),
    saldos: new ConsultasDeSaldosInicialesDrizzle(),
    lotes: new AlmacenDeLotesDrizzle(),
  };
}

/** Exportar e importar en Excel: cada fila importada pasa por el mismo caso de uso que el formulario. */
function intercambioDeSaldos(registrar: RegistrarSaldoInicial, listar: ListarSaldosIniciales) {
  return crearIntercambio<SaldoInicialDto, SaldoInicialDeExcel>({
    nombre: 'Saldos iniciales de inventario',
    columnas: columnasDeSaldosIniciales({
      articulos: opcionesDe(new ConsultasArticulosDrizzle(), 'codigo'),
      bodegas: opcionesDe(new ConsultasBodegasDrizzle(), 'codigo'),
      unidades: opcionesDe(new ConsultasUnidadesDrizzle(), 'nombre'),
    }),
    validar: validadorDeZod(esquemaSaldoInicialDeExcel),
    listar: async (operador) => (await listar.ejecutar(operador)).saldos,
    crear: (operador, solicitud) => registrar.ejecutar(operador, { loteId: null, ...solicitud }),
    notasDeInstrucciones: [
      'Cada fila es lo que la empresa tenía de un artículo en una bodega al día anterior a su fecha de inicio. El costo es el total de la fila.',
      'El lote se escribe por su código y, si todavía no existe, se crea con el vencimiento de la fila. Con PEPS, repita el artículo en varias filas con la fecha de cada compra real.',
      'Sin unidad se toma la base del artículo. Sin fecha de la capa se toma el día anterior al inicio.',
    ],
  });
}

/** Inventarios responde la revisión que Empresas pide antes de cerrar la carga y escucha el cambio de la fecha de inicio. */
function registrarEnElMediador(dependencias: DependenciasDeSaldosIniciales): void {
  const revisar = new RevisarCierreDeCargaEnInventarios(dependencias);
  mediador.responder('inventarios', 'empresas.revisar_cierre_de_carga', (datos, operador) =>
    revisar.ejecutar(operador, datos),
  );
  const validarFecha = new ValidarFechaDeInicioEnInventarios(dependencias);
  mediador.escuchar('inventarios', 'empresas.fecha_de_inicio_por_cambiar', (aviso, operador) =>
    validarFecha.ejecutar(operador, aviso),
  );
}

/** Raíz de composición de los saldos iniciales: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeSaldosIniciales() {
  const dependencias = dependenciasDeSaldosIniciales();
  registrarEnElMediador(dependencias);
  const listar = new ListarSaldosIniciales(dependencias);
  const registrar = new RegistrarSaldoInicial(dependencias);
  return rutasSaldosIniciales(
    new SaldosInicialesControlador({
      listar,
      registrar,
      corregir: new CorregirSaldoInicial(dependencias),
      eliminar: new EliminarSaldoInicial(dependencias),
    }),
    intercambioDeSaldos(registrar, listar),
  );
}
