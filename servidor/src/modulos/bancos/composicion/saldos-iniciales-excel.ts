import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import type { AvisoDeFila } from '../../core/intercambio/aplicacion/resultado-de-importacion.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { AgregarPartidaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/agregar-partida-de-apertura.js';
import type { GuardarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/guardar-saldo-inicial.js';
import type { ListarPartidasDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/listar-partidas-de-apertura.js';
import type { ListarSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import type { AvisoDeApertura } from '../aplicacion/dto/saldo-inicial.dto.js';
import {
  columnasDePartidasDeApertura,
  esquemaDePartidaEnExcel,
  laClaseDe,
  NOTAS_DE_PARTIDAS_DE_APERTURA,
  type PartidaDeExcel,
} from '../http/partidas-de-apertura.columnas.js';
import {
  columnasDeSaldosIniciales,
  columnasDelCuadreAlExportar,
  esquemaDeSaldoInicialEnExcel,
  NOTAS_DE_SALDOS_INICIALES,
  type SaldoInicialDeExcel,
} from '../http/saldos-iniciales.columnas.js';
import { ConsultasConceptosDrizzle } from '../infraestructura/persistencia/consultas-conceptos.drizzle.js';
import { ConsultasCuentasBancariasDrizzle } from '../infraestructura/persistencia/consultas-cuentas-bancarias.drizzle.js';

/** Los casos de uso que usan los dos Excel de los saldos iniciales. */
export interface CasosDeExcelDeSaldosIniciales {
  listar: ListarSaldosIniciales;
  guardar: GuardarSaldoInicial;
  listarPartidas: ListarPartidasDeApertura;
  agregarPartida: AgregarPartidaDeApertura;
}

/** Cada fila exportada es un objeto plano: lo que las columnas lean de él. */
type RegistroDeExcel = object;

const CODIGOS_DE_LA_PARTIDA = ['cheque_antiguo', 'deposito_viejo', 'cheque_posfechado_sin_fondos'];

/** Los avisos de una fila: solo los de la partida (los de la cuenta se repetirían en cada fila). */
function avisoDeLaPartida({ avisos }: { avisos: AvisoDeApertura[] }): AvisoDeFila | null {
  const propios = avisos.filter((aviso) => CODIGOS_DE_LA_PARTIDA.includes(aviso.codigo));
  return propios.length === 0 ? null : { campo: 'fecha', mensaje: propios.map((aviso) => aviso.mensaje).join(' ') };
}

/** Las cuentas con saldo inicial y, al pie, Bancos y Sobregiros bancarios por separado (sin compensar). */
async function cuentasConTotales(
  casos: CasosDeExcelDeSaldosIniciales,
  operador: Parameters<ListarSaldosIniciales['ejecutar']>[0],
) {
  const { cuentas, totalBancos, totalSobregiros } = await casos.listar.ejecutar(operador);
  return [
    ...cuentas.filter((cuenta) => cuenta.forma !== 'sin_saldo'),
    { cuentaNombre: 'TOTAL BANCOS', saldoEnLibrosAlCorte: totalBancos },
    { cuentaNombre: 'TOTAL SOBREGIROS BANCARIOS', saldoEnLibrosAlCorte: totalSobregiros },
  ];
}

/** Excel de los saldos por cuenta: exporta el cuadre y los totales; al importar solo crea (cuentas sin saldo inicial). */
export function intercambioDeSaldosIniciales(casos: CasosDeExcelDeSaldosIniciales) {
  return crearIntercambio<RegistroDeExcel, SaldoInicialDeExcel>({
    nombre: 'Saldos iniciales',
    columnas: columnasDeSaldosIniciales({
      cuentaBancariaId: opcionesDe(new ConsultasCuentasBancariasDrizzle(), 'nombre'),
    }),
    columnasSoloAlExportar: columnasDelCuadreAlExportar,
    notasDeInstrucciones: NOTAS_DE_SALDOS_INICIALES,
    validar: validadorDeZod(esquemaDeSaldoInicialEnExcel),
    listar: (operador) => cuentasConTotales(casos, operador),
    avisarDeFila: (_solicitud, creado) => {
      const { avisos } = creado as { avisos: AvisoDeApertura[] };
      const mensaje = avisos.map((aviso) => aviso.mensaje).join(' ');
      return avisos.length === 0 ? null : { campo: 'saldoSegunLibrosAnteriores', mensaje };
    },
    crear: (operador, solicitud) =>
      casos.guardar.ejecutar(operador, { solicitud, puedeCrear: true, puedeEditar: false, soloCrear: true }),
  });
}

/** Excel de las partidas de apertura (las seis clases): cada fila pasa por `AgregarPartidaDeApertura`, como el formulario. */
export function intercambioDePartidas(casos: CasosDeExcelDeSaldosIniciales) {
  return crearIntercambio<RegistroDeExcel, PartidaDeExcel>({
    nombre: 'Partidas de apertura',
    columnas: columnasDePartidasDeApertura({
      cuentaBancariaId: opcionesDe(new ConsultasCuentasBancariasDrizzle(), 'nombre'),
      conceptoId: opcionesDe(new ConsultasConceptosDrizzle(), 'nombre'),
    }),
    notasDeInstrucciones: NOTAS_DE_PARTIDAS_DE_APERTURA,
    validar: validadorDeZod(esquemaDePartidaEnExcel),
    listar: async (operador) =>
      (await casos.listarPartidas.ejecutar(operador)).map((partida) => ({
        ...partida,
        clase: laClaseDe(partida.parte, partida.tipo),
      })),
    avisarDeFila: (_solicitud, creado) => avisoDeLaPartida(creado as { avisos: AvisoDeApertura[] }),
    crear: (operador, solicitud) => casos.agregarPartida.ejecutar(operador, solicitud),
  });
}
