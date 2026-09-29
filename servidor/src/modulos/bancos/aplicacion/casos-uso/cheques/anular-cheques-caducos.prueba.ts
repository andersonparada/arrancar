import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RelojFijo, UnidadDeTrabajoEnMemoria } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { AnulacionEnLoteConProblemas, FechaDeAnulacionFutura } from '../../../dominio/errores-de-anulacion-en-lote.js';
import {
  ConsultasDeChequesEnCirculacionFijas,
  PoliticaDeVencimientoFija,
} from '../../../pruebas/dobles-de-cheques-en-circulacion.js';
import type { ChequeEnCirculacionCrudo } from '../../puertos/consultas-de-cheques-en-circulacion.js';
import { AnularChequesCaducos } from './anular-cheques-caducos.js';
import { CUENTA, armarEntorno, emisionDe, operador } from './soporte-de-pruebas-de-cheques.js';

let entorno: Awaited<ReturnType<typeof armarEntorno>>;
let dos: [string, string];

const crudo = (chequeId: string, numero: number): ChequeEnCirculacionCrudo => ({
  chequeId,
  movimientoId: 'm',
  cuentaBancariaId: CUENTA,
  cuentaBancariaNombre: 'Cuenta de prueba',
  serie: null,
  numero,
  fecha: '2026-02-01',
  beneficiario: 'Proveedor S.A.',
  monto: '100.00',
  mesConciliado: false,
});

const armarLote = (caducos: ChequeEnCirculacionCrudo[]) =>
  new AnularChequesCaducos({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    consultas: new ConsultasDeChequesEnCirculacionFijas(caducos),
    politicaDeVencimiento: new PoliticaDeVencimientoFija(7),
    reloj: new RelojFijo('2026-09-29'),
    anularCheque: entorno.anular,
  });

beforeEach(async () => {
  entorno = await armarEntorno();
  const cheques = await entorno.cheques.listarDeLaChequera(entorno.chequeraId);
  dos = [cheques[0]!.id, cheques[1]!.id];
  await entorno.emitir.ejecutar(operador, emisionDe(dos[0]));
  await entorno.emitir.ejecutar(operador, emisionDe(dos[1]));
});

describe('anular cheques caducos en lote', () => {
  it('anula todos con nota inversa a la fecha común, causa caducidad y auditoría por cheque', async () => {
    const lote = armarLote([crudo(dos[0], 1), crudo(dos[1], 2)]);

    const resultado = await lote.ejecutar(operador, { chequeIds: dos, motivo: 'Caducos', fecha: '2026-09-01' });

    expect(resultado).toEqual({ totalDeCheques: 2, montoTotal: '200.00', fecha: '2026-09-01' });
    const notas = await entorno.movimientos.listar({ cuentaBancariaId: CUENTA });
    const inversos = notas.filter((m) => m.revierteAId);
    expect(inversos).toHaveLength(2);
    expect(inversos.every((m) => m.fecha === '2026-09-01' && m.tipo === 'credito')).toBe(true);
    expect(await entorno.movimientos.saldoDe(CUENTA)).toBe('1000.00');
    const anulados = entorno.auditoria.entradas.filter((e) => e.accion === 'anular');
    expect(anulados).toHaveLength(2);
    expect(anulados.every((e) => e.motivo === 'Caducos')).toBe(true);
  });

  it('sin fecha usa hoy', async () => {
    const lote = armarLote([crudo(dos[0], 1)]);

    const resultado = await lote.ejecutar(operador, { chequeIds: [dos[0]], motivo: 'Caduco' });

    expect(resultado.fecha).toBe('2026-09-29');
  });

  it('un cheque que ya no es caduco frena todo y los detalles dicen cuál', async () => {
    const lote = armarLote([crudo(dos[0], 1)]);
    const ajeno = randomUUID();

    const intento = lote.ejecutar(operador, { chequeIds: [dos[0], ajeno], motivo: 'Caducos' });

    await expect(intento).rejects.toBeInstanceOf(AnulacionEnLoteConProblemas);
    await expect(intento).rejects.toMatchObject({
      detalles: [{ chequeId: ajeno, codigo: 'cheque_no_es_caduco' }],
    });
  });

  it('rechaza una fecha posterior a hoy', async () => {
    const lote = armarLote([crudo(dos[0], 1)]);

    await expect(
      lote.ejecutar(operador, { chequeIds: [dos[0]], motivo: 'Caducos', fecha: '2026-10-01' }),
    ).rejects.toBeInstanceOf(FechaDeAnulacionFutura);
  });
});
