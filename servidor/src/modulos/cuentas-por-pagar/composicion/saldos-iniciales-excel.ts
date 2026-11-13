import type { AvisoDeFila } from '../../core/intercambio/aplicacion/resultado-de-importacion.js';
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

/** `AAAA-MM-DD` como `dd/mm/aaaa`. */
const fechaLegible = (fecha: string): string => fecha.split('-').reverse().join('/');

/** Si la fila no trae vencimiento y el sistema propuso uno, el ensayo lo muestra en la columna «Vencimiento». */
export function avisoDelVencimientoPropuesto(solicitud: SaldoInicialSolicitado, creado: unknown): AvisoDeFila | null {
  const { vencimiento } = creado as SaldoInicialDto;
  if (solicitud.vencimiento || !vencimiento) return null;
  return {
    campo: 'vencimiento',
    mensaje: `Se propone el vencimiento ${fechaLegible(vencimiento)} (según los días de crédito del proveedor o un mes desde la emisión); se puede cambiar después.`,
  };
}

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
    avisarDeFila: avisoDelVencimientoPropuesto,
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}
