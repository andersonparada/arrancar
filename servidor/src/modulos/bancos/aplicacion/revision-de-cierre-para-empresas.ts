import type {
  CifraDelCuadre,
  HallazgoDeCierre as HallazgoParaEmpresas,
  RevisionDeCierreDeModulo,
} from '../../core/contratos/empresas.contratos.js';
import type { HallazgoDeCierre } from '../dominio/hallazgos-de-cierre.js';
import type { SaldoInicialResumenDto, SaldosInicialesDto } from './dto/saldo-inicial.dto.js';

/** Con más cuentas que estas solo se guardan los totales: las cifras de un módulo no pasan de 200 (tres por cuenta). */
const MAXIMO_DE_CUENTAS_CON_DETALLE = 60;

const cantidad = (clave: string, etiqueta: string, valor: number): CifraDelCuadre => ({
  clave,
  etiqueta,
  tipo: 'cantidad',
  valor: String(valor),
  registro: null,
});

interface DatosDeUnMonto {
  clave: string;
  etiqueta: string;
  valor: string;
  /** La cuenta a la que pertenece; sin ella es un total de Bancos. */
  cuenta?: SaldoInicialResumenDto;
}

const monto = ({ clave, etiqueta, valor, cuenta }: DatosDeUnMonto): CifraDelCuadre => ({
  clave,
  etiqueta,
  tipo: 'monto',
  valor,
  registro: cuenta ? { id: cuenta.cuentaBancariaId, nombre: cuenta.cuentaNombre } : null,
});

function hallazgoParaEmpresas(hallazgo: HallazgoDeCierre): HallazgoParaEmpresas {
  return {
    codigo: hallazgo.codigo,
    nivel: hallazgo.pideMotivo ? 'pide_motivo' : 'aviso',
    mensaje: hallazgo.mensaje,
    registro: { id: hallazgo.cuentaBancariaId, nombre: hallazgo.cuentaNombre },
  };
}

function cifrasDeLaCuenta(cuenta: SaldoInicialResumenDto): CifraDelCuadre[] {
  const { saldoEnLibrosAlCorte, saldoSegunLibrosAnteriores, diferencia } = cuenta;
  return [
    monto({
      clave: 'saldo_en_libros_al_corte',
      etiqueta: 'Saldo en libros al corte',
      valor: saldoEnLibrosAlCorte,
      cuenta,
    }),
    ...(saldoSegunLibrosAnteriores === null
      ? []
      : [
          monto({
            clave: 'saldo_segun_libros_anteriores',
            etiqueta: 'Saldo según libros anteriores',
            valor: saldoSegunLibrosAnteriores,
            cuenta,
          }),
        ]),
    ...(diferencia === null ? [] : [monto({ clave: 'diferencia', etiqueta: 'Diferencia', valor: diferencia, cuenta })]),
  ];
}

function sinSaldosIniciales(activas: number): HallazgoParaEmpresas {
  const cuentas =
    activas === 1 ? '1 cuenta bancaria activa y no tiene' : `${activas} cuentas bancarias activas y ninguna tiene`;
  return {
    codigo: 'sin_saldos_iniciales',
    nivel: 'aviso',
    mensaje: `Hay ${cuentas} saldo inicial.`,
    registro: null,
  };
}

const resumenDe = (conSaldo: number, corte: string | null) => {
  if (conSaldo === 0 || corte === null) return null;
  const [anio, mes, dia] = corte.split('-');
  return `${conSaldo} ${conSaldo === 1 ? 'cuenta con saldo inicial' : 'cuentas con saldo inicial'} al ${dia}/${mes}/${anio}`;
};

/**
 * Lo que Bancos le dice a Empresas antes de cerrar la carga inicial: los hallazgos de la revisión de saldos iniciales
 * (los que piden motivo y los que avisan), un aviso si hay cuentas activas pero ninguna con saldo inicial, y las cifras
 * del cuadre (totales sin compensar y, por cuenta, saldo en libros, saldo de libros anteriores y diferencia).
 * @returns `null` si Bancos no tiene nada que decir: ninguna cuenta activa ni con saldo inicial.
 */
export function revisionDeCierreDeBancos(saldos: SaldosInicialesDto): RevisionDeCierreDeModulo | null {
  const conSaldo = saldos.cuentas.filter((cuenta) => cuenta.forma !== 'sin_saldo');
  const activas = saldos.cuentas.filter((cuenta) => cuenta.activa).length;
  if (activas === 0 && conSaldo.length === 0) return null;
  const detalle = conSaldo.length <= MAXIMO_DE_CUENTAS_CON_DETALLE ? conSaldo.flatMap(cifrasDeLaCuenta) : [];
  return {
    nombreDelModulo: 'Bancos',
    resumen: resumenDe(conSaldo.length, saldos.fechaDeCorte),
    ruta: '/bancos/cuentas-bancarias',
    hallazgos: [
      ...saldos.hallazgos.map(hallazgoParaEmpresas),
      ...(conSaldo.length === 0 && activas > 0 ? [sinSaldosIniciales(activas)] : []),
    ],
    cifras: [
      cantidad('cuentas_con_saldo_inicial', 'Cuentas con saldo inicial', conSaldo.length),
      monto({ clave: 'total_bancos', etiqueta: 'Total bancos', valor: saldos.totalBancos }),
      monto({ clave: 'total_sobregiros', etiqueta: 'Total sobregiros', valor: saldos.totalSobregiros }),
      ...detalle,
    ],
  };
}
