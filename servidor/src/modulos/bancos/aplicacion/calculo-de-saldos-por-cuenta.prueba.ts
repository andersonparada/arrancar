import { describe, expect, it } from 'vitest';
import { armarReporteDeSaldos, estaAtrasada, NOTA_DE_SALDOS_POR_CUENTA } from './calculo-de-saldos-por-cuenta.js';
import type { PartidaEnTransitoDto } from './dto/saldos-por-cuenta.dto.js';
import type { LecturaDeCuenta, LecturaDeSaldos, SumaEnTransito } from './puertos/consultas-de-saldos-por-cuenta.js';

const cuenta = (cambios: Partial<LecturaDeCuenta> = {}): LecturaDeCuenta => ({
  cuentaBancariaId: 'cuenta-1',
  nombre: 'Monetaria',
  bancoNombre: 'Banco',
  numero: '001',
  activo: true,
  libros: '0.00',
  posfechados: '0.00',
  movimientosAnteriores: 0,
  ultimaConciliacion: null,
  ...cambios,
});

const suma = (categoria: SumaEnTransito['categoria'], efecto: string, cantidad = 1): SumaEnTransito => ({
  cuentaBancariaId: 'cuenta-1',
  categoria,
  cantidad,
  efecto,
});

const armar = (lectura: Partial<LecturaDeSaldos>) =>
  armarReporteDeSaldos(
    { cuentas: [], sumas: [], partidas: [], ...lectura },
    { fecha: '2026-03-15', finDelMesAnterior: '2026-02-28' },
  );

describe('saldos por cuenta: una cuenta', () => {
  it('el disponible es libros menos posfechados, sin sumar ningún sobregiro, y marca los fondos insuficientes', () => {
    const [con, sin] = armar({
      cuentas: [
        cuenta({ libros: '1000.00', posfechados: '400.00' }),
        cuenta({ cuentaBancariaId: 'cuenta-2', libros: '100.00', posfechados: '350.50' }),
      ],
    }).cuentas;

    expect(con).toMatchObject({ disponible: '600.00', fondosInsuficientes: false });
    expect(sin).toMatchObject({ disponible: '-250.50', fondosInsuficientes: true });
  });

  it('el saldo según el banco quita lo que el banco aún no ha visto: depósitos y errores a favor, y suma cheques y débitos', () => {
    const [saldo] = armar({
      cuentas: [cuenta({ libros: '9330.00' })],
      sumas: [
        suma('deposito_en_transito', '500.00'),
        suma('cheque_en_circulacion', '-1200.00', 2),
        suma('debito_en_transito', '-50.00'),
        suma('error_del_banco', '80.00'),
      ],
    }).cuentas;

    expect(saldo).toMatchObject({
      depositosEnTransito: { cantidad: 1, monto: '500.00' },
      chequesEnCirculacion: { cantidad: 2, monto: '1200.00' },
      debitosEnTransito: { cantidad: 1, monto: '50.00' },
      erroresDelBanco: { cantidad: 1, monto: '80.00' },
      saldoSegunBanco: '10000.00',
    });
  });

  it('sin partidas en tránsito el banco muestra lo mismo que los libros, y un error del banco en contra queda negativo', () => {
    const [sinPartidas] = armar({ cuentas: [cuenta({ libros: '250.00' })] }).cuentas;
    const [conError] = armar({
      cuentas: [cuenta({ libros: '250.00' })],
      sumas: [suma('error_del_banco', '-20.00')],
    }).cuentas;

    expect(sinPartidas).toMatchObject({
      saldoSegunBanco: '250.00',
      chequesEnCirculacion: { cantidad: 0, monto: '0.00' },
    });
    expect(conError).toMatchObject({ erroresDelBanco: { monto: '-20.00' }, saldoSegunBanco: '270.00' });
  });

  it('reparte las partidas entre cuentas', () => {
    const partida = (cuentaBancariaId: string): PartidaEnTransitoDto => ({
      movimientoId: `mov-${cuentaBancariaId}`,
      cuentaBancariaId,
      categoria: 'deposito_en_transito',
      tipo: 'credito',
      fecha: '2026-03-01',
      monto: '10.00',
      numeroDeCheque: null,
      referencia: null,
      beneficiario: null,
      parteDeApertura: null,
    });
    const { cuentas } = armar({
      cuentas: [cuenta(), cuenta({ cuentaBancariaId: 'cuenta-2', nombre: 'Ahorro' })],
      partidas: [partida('cuenta-2')],
    });

    expect(cuentas[0]?.partidas).toEqual([]);
    expect(cuentas[1]?.partidas.map((p) => p.movimientoId)).toEqual(['mov-cuenta-2']);
  });
});

describe('saldos por cuenta: atrasada', () => {
  const FIN_DE_FEBRERO = '2026-02-28';

  it('sin movimientos de meses anteriores no está atrasada, aunque nunca se haya conciliado', () => {
    expect(estaAtrasada(cuenta(), FIN_DE_FEBRERO)).toBe(false);
  });

  it('con movimientos y ninguna conciliación autorizada está atrasada', () => {
    expect(estaAtrasada(cuenta({ movimientosAnteriores: 3 }), FIN_DE_FEBRERO)).toBe(true);
  });

  it('está al día si la última autorizada llega al mes anterior, y atrasada si se quedó antes', () => {
    const conMes = (anio: number, mes: number) =>
      cuenta({ movimientosAnteriores: 3, ultimaConciliacion: { anio, mes } });

    expect(estaAtrasada(conMes(2026, 2), FIN_DE_FEBRERO)).toBe(false);
    expect(estaAtrasada(conMes(2026, 3), FIN_DE_FEBRERO)).toBe(false);
    expect(estaAtrasada(conMes(2026, 1), FIN_DE_FEBRERO)).toBe(true);
  });
});

describe('saldos por cuenta: totales sin compensar', () => {
  const lectura = (): Partial<LecturaDeSaldos> => ({
    cuentas: [
      cuenta({ cuentaBancariaId: 'a', libros: '1000.00', posfechados: '100.00' }),
      cuenta({ cuentaBancariaId: 'b', libros: '500.50' }),
      cuenta({ cuentaBancariaId: 'c', libros: '-300.00', posfechados: '50.00' }),
      cuenta({ cuentaBancariaId: 'd', libros: '0.00' }),
    ],
  });

  it('una cuenta negativa va a Sobregiros en valor absoluto y no resta de Bancos', () => {
    const reporte = armar(lectura());

    expect(reporte.bancos).toEqual({
      cantidadDeCuentas: 3,
      saldoEnLibros: '1500.50',
      chequesPosfechados: '100.00',
      disponible: '1400.50',
    });
    expect(reporte.sobregiros).toEqual({
      cantidadDeCuentas: 1,
      saldoEnLibros: '300.00',
      chequesPosfechados: '50.00',
      disponible: '350.00',
    });
    expect(Object.keys(reporte)).not.toContain('neto');
  });

  it('lleva la nota de fondos retenidos y sobregiro autorizado', () => {
    expect(armar({}).nota).toBe(NOTA_DE_SALDOS_POR_CUENTA);
    expect(NOTA_DE_SALDOS_POR_CUENTA).toContain('fondos retenidos');
    expect(NOTA_DE_SALDOS_POR_CUENTA).toContain('sobregiro autorizado');
  });

  it('una cuenta inactiva sin saldo ni partidas no aparece; con saldo, sí', () => {
    const reporte = armar({
      cuentas: [
        cuenta({ cuentaBancariaId: 'vieja', activo: false }),
        cuenta({ cuentaBancariaId: 'con-saldo', activo: false, libros: '10.00' }),
      ],
    });

    expect(reporte.cuentas.map((c) => c.cuentaBancariaId)).toEqual(['con-saldo']);
  });

  it('suma en centavos enteros sin errores de coma flotante', () => {
    const reporte = armar({
      cuentas: [cuenta({ libros: '0.10' }), cuenta({ cuentaBancariaId: 'otra', libros: '0.20' })],
    });

    expect(reporte.bancos.saldoEnLibros).toBe('0.30');
  });
});
