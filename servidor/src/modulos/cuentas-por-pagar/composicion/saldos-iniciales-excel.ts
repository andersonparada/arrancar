import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { CrearSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/crear-saldo-inicial.js';
import type { ListarSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import type { SaldoInicialDto } from '../aplicacion/dto/saldo-inicial.dto.js';
import {
  columnasDeSaldosIniciales,
  esquemaDeSaldoInicialEnExcel,
  NOTAS_DE_SALDOS_INICIALES,
} from '../http/saldos-iniciales.columnas.js';
import type { SaldoInicialSolicitado } from '../http/saldos-iniciales.esquemas-http.js';
import { OpcionesDeProveedoresDrizzle } from '../infraestructura/persistencia/opciones-de-proveedores.drizzle.js';

const POR_PAGINA = 200;

/** El Excel de los saldos iniciales: cada fila pasa por `CrearSaldoInicial`, igual que el formulario. */
export function intercambioDeSaldosIniciales(casos: { listar: ListarSaldosIniciales; crear: CrearSaldoInicial }) {
  return crearIntercambio<SaldoInicialDto, SaldoInicialSolicitado>({
    nombre: 'Saldos iniciales',
    columnas: columnasDeSaldosIniciales({ proveedorId: () => new OpcionesDeProveedoresDrizzle().listar() }),
    notasDeInstrucciones: NOTAS_DE_SALDOS_INICIALES,
    validar: validadorDeZod(esquemaDeSaldoInicialEnExcel),
    listar: async (operador) => {
      const todos: SaldoInicialDto[] = [];
      for (let pagina = 1; ; pagina++) {
        const { elementos, total } = await casos.listar.ejecutar(operador, {}, { pagina, limite: POR_PAGINA });
        todos.push(...elementos);
        if (todos.length >= total || elementos.length === 0) return todos;
      }
    },
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}
