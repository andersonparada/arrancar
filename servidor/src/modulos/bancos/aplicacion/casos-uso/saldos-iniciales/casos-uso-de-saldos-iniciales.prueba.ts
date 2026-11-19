import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { FechaDeInicioConSaldosDeBancos } from '../../../dominio/errores-de-apertura.js';
import { FichaDeSaldoInicial } from '../../ficha-de-saldo-inicial.js';
import { ListarSaldosIniciales } from './listar-saldos-iniciales.js';
import { ConsultasEnMemoria, cuenta, parte } from './soporte-de-pruebas-de-saldos-iniciales.js';
import { ObtenerSaldoInicial } from './obtener-saldo-inicial.js';
import { RevisarCierreDeCargaEnBancos } from './revisar-cierre-de-carga-en-bancos.js';
import { ValidarFechaDeInicioEnBancos } from './validar-fecha-de-inicio-en-bancos.js';

const operador = operadorDePrueba();

let consultas: ConsultasEnMemoria;
let estado: { fechaDeInicio: string | null; cerrada: boolean };
let permiteSobregiro: boolean;
let meses: number;

const armar = () => {
  const ficha = new FichaDeSaldoInicial({
    consultas,
    cargaInicial: { obtener: async () => estado },
    politicaDeSobregiro: { permiteSobregiro: async () => permiteSobregiro },
    politicaDeVencimiento: { mesesDeVencimiento: async () => meses },
  });
  const dependencias = { unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(), ficha };
  return {
    ficha,
    listar: new ListarSaldosIniciales(dependencias),
    obtener: new ObtenerSaldoInicial(dependencias),
    revisar: new RevisarCierreDeCargaEnBancos(dependencias),
  };
};

beforeEach(() => {
  consultas = new ConsultasEnMemoria();
  estado = { fechaDeInicio: '2026-01-01', cerrada: false };
  permiteSobregiro = false;
  meses = 7;
});

describe('ListarSaldosIniciales', () => {
  it('arma el cuadre de cada cuenta, las que no tienen saldo salen aparte y Bancos y Sobregiros no se compensan', async () => {
    consultas.cuentasDeLaEmpresa = [cuenta('a'), cuenta('b'), cuenta('c', { cabeceraId: null })];
    consultas.partidasDeLaEmpresa = [
      parte('a', { parte: 'saldo_del_banco', monto: '1000.00' }),
      parte('a', { parte: 'cheque_en_circulacion', monto: '250.00', tipo: 'cheque', numeroDeCheque: 5 }),
      parte('b', { parte: 'saldo_del_banco', monto: '300.00', tipo: 'debito' }),
    ];

    const lista = await armar().listar.ejecutar(operador);

    expect(lista).toMatchObject({
      fechaDeInicio: '2026-01-01',
      fechaDeCorte: '2025-12-31',
      cargaCerrada: false,
      totalBancos: '750.00',
      totalSobregiros: '300.00',
    });
    expect(lista.cuentas.map((c) => [c.cuentaBancariaId, c.forma, c.saldoEnLibrosAlCorte])).toEqual([
      ['a', 'con_partidas', '750.00'],
      ['b', 'con_partidas', '-300.00'],
      ['c', 'sin_saldo', '0.00'],
    ]);
    expect(lista.hallazgos.map((h) => [h.cuentaBancariaId, h.codigo])).toEqual([
      ['a', 'sin_dato_de_libros'],
      ['a', 'sin_evidencia'],
      ['b', 'sin_dato_de_libros'],
      ['b', 'sin_evidencia'],
      ['b', 'sobregiro_sin_permiso'],
    ]);
  });

  it('sin fecha de inicio no hay corte; con la carga cerrada nada se puede editar ni eliminar', async () => {
    consultas.cuentasDeLaEmpresa = [cuenta('a')];
    consultas.partidasDeLaEmpresa = [parte('a', { parte: 'saldo_del_banco', monto: '10.00' })];
    estado = { fechaDeInicio: null, cerrada: false };
    const sinFecha = await armar().listar.ejecutar(operador);
    estado = { fechaDeInicio: '2026-01-01', cerrada: true };
    const cerrada = await armar().listar.ejecutar(operador);

    expect(sinFecha).toMatchObject({ fechaDeInicio: null, fechaDeCorte: null });
    expect(sinFecha.cuentas[0]).toMatchObject({ puedeEditar: false });
    expect(cerrada.cargaCerrada).toBe(true);
    expect(cerrada.cuentas[0]).toMatchObject({ puedeEditar: false, puedeEliminar: false });
  });
});

describe('ObtenerSaldoInicial', () => {
  it('la ficha trae las partidas con sus avisos y sus acciones; el posfechado fuera del cuadre', async () => {
    consultas.cuentasDeLaEmpresa = [cuenta('a', { saldoSegunLibrosAnteriores: '9.00' })];
    consultas.partidasDeLaEmpresa = [
      parte('a', { parte: 'saldo_del_banco', monto: '100.00' }),
      parte('a', {
        parte: 'cheque_en_circulacion',
        monto: '91.00',
        tipo: 'cheque',
        numeroDeCheque: 7,
        fecha: '2025-05-01',
      }),
      parte('a', {
        parte: 'cheque_posfechado',
        monto: '40.00',
        tipo: 'cheque',
        numeroDeCheque: 8,
        fecha: '2026-02-01',
        conceptoId: 'c1',
        conceptoNombre: 'Pagos',
      }),
      parte('a', {
        parte: 'deposito_en_transito',
        monto: '5.00',
        conciliacionId: 'conc',
        conciliadaEn: { anio: 2026, mes: 1 },
      }),
    ];

    const ficha = await armar().obtener.ejecutar(operador, 'a');
    const deLa = (numero: number) => ficha.partidas.find((p) => p.numeroDeCheque === numero)!;

    expect(ficha).toMatchObject({
      saldoEnLibrosAlCorte: '14.00',
      totalPosfechados: '40.00',
      diferencia: '5.00',
      cuadra: false,
    });
    expect(deLa(7)).toMatchObject({
      avisos: ['antiguo'],
      puedeCorregir: true,
      puedeEliminar: true,
      puedeAnular: true,
    });
    expect(deLa(8)).toMatchObject({ conceptoNombre: 'Pagos', avisos: [] });
    const marcada = ficha.partidas.find((p) => p.parte === 'deposito_en_transito')!;
    expect(marcada).toMatchObject({
      conciliadaEn: { anio: 2026, mes: 1 },
      puedeCorregir: false,
      puedeEliminar: false,
      puedeAnular: false,
    });
    expect(deLa(8)).toMatchObject({ puedeAnular: false });
    expect(ficha.partidas.find((p) => p.parte === 'saldo_del_banco')).toMatchObject({
      puedeCorregir: false,
      puedeAnular: false,
    });
  });

  it('puedeAnular: las cuatro partidas vigentes y sin marcar, también con la carga cerrada; no el posfechado ni la ya revertida', async () => {
    estado.cerrada = true;
    consultas.cuentasDeLaEmpresa = [cuenta('a')];
    consultas.partidasDeLaEmpresa = [
      parte('a', { parte: 'saldo_del_banco', monto: '100.00' }),
      parte('a', { parte: 'deposito_en_transito', monto: '1.00' }),
      parte('a', { parte: 'debito_en_transito', monto: '2.00', tipo: 'debito' }),
      parte('a', { parte: 'error_del_banco', monto: '3.00' }),
      parte('a', { parte: 'cheque_en_circulacion', monto: '4.00', tipo: 'cheque', numeroDeCheque: 1 }),
      parte('a', { parte: 'cheque_posfechado', monto: '5.00', tipo: 'cheque', numeroDeCheque: 2, fecha: '2026-02-01' }),
      parte('a', { parte: 'deposito_en_transito', monto: '6.00', revertida: true }),
    ];

    const ficha = await armar().obtener.ejecutar(operador, 'a');

    expect(ficha.partidas.map((p) => [p.parte, p.puedeAnular])).toEqual([
      ['saldo_del_banco', false],
      ['deposito_en_transito', true],
      ['debito_en_transito', true],
      ['error_del_banco', true],
      ['cheque_en_circulacion', true],
      ['cheque_posfechado', false],
      ['deposito_en_transito', false],
    ]);
  });

  it('el aviso de antigüedad usa la variable de meses', async () => {
    consultas.cuentasDeLaEmpresa = [cuenta('a')];
    consultas.partidasDeLaEmpresa = [
      parte('a', {
        parte: 'cheque_en_circulacion',
        monto: '1.00',
        tipo: 'cheque',
        numeroDeCheque: 1,
        fecha: '2025-06-30',
      }),
    ];

    const conSiete = await armar().obtener.ejecutar(operador, 'a');
    meses = 6;
    const conSeis = await armar().obtener.ejecutar(operador, 'a');

    expect(conSiete.partidas[0]!.avisos).toEqual([]);
    expect(conSeis.partidas[0]!.avisos).toEqual(['antiguo']);
  });

  it('una cuenta que no existe se avisa (404)', async () => {
    await expect(armar().obtener.ejecutar(operador, 'nada')).rejects.toThrow(RecursoNoEncontrado);
  });

  it('un saldo global se muestra como global y avisa en la revisión de cierre', async () => {
    consultas.cuentasDeLaEmpresa = [cuenta('g')];
    consultas.partidasDeLaEmpresa = [parte('g', { parte: 'saldo_global', monto: '70.00', fecha: '2025-10-01' })];

    const ficha = await armar().obtener.ejecutar(operador, 'g');
    const revision = await armar().revisar.ejecutar(operador);

    expect(ficha).toMatchObject({ forma: 'global', saldoSegunEstadoDeCuenta: null, saldoEnLibrosAlCorte: '70.00' });
    expect(revision.map((h) => [h.codigo, h.pideMotivo])).toEqual([['saldo_global', false]]);
  });
});

describe('ValidarFechaDeInicioEnBancos', () => {
  const validar = () =>
    new ValidarFechaDeInicioEnBancos({ unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(), consultas });
  const aviso = (fechaDeInicio: string) => ({ empresaId: operador.empresaId, fechaDeInicio });

  it('sin saldos iniciales deja cambiar la fecha', async () => {
    await expect(validar().ejecutar(operador, aviso('2026-03-01'))).resolves.toBeUndefined();
  });

  it('con saldo del estado de cuenta rechaza, con cuántas cuentas y de qué fecha', async () => {
    consultas.partidasDeLaEmpresa = [
      parte('a', { parte: 'saldo_del_banco', monto: '1.00' }),
      parte('b', { parte: 'saldo_del_banco', monto: '1.00' }),
    ];

    const error = await validar()
      .ejecutar(operador, aviso('2026-03-01'))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FechaDeInicioConSaldosDeBancos);
    expect((error as Error).message).toContain('2 cuentas bancarias tienen saldo inicial al 31/12/2025');
  });

  it('una cuenta con su cabecera y el saldo en cero (sin movimiento) también rechaza', async () => {
    consultas.cuentasDeLaEmpresa = [cuenta('cero')];

    const error = await validar()
      .ejecutar(operador, aviso('2026-03-01'))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FechaDeInicioConSaldosDeBancos);
    expect((error as Error).message).toContain('1 cuentas bancarias tienen saldo inicial:');
  });

  it('un saldo global rechaza si quedaría posterior a la fecha nueva; con la misma fecha o una posterior, pasa', async () => {
    consultas.partidasDeLaEmpresa = [parte('g', { parte: 'saldo_global', monto: '1.00', fecha: '2026-03-01' })];

    await expect(validar().ejecutar(operador, aviso('2026-02-28'))).rejects.toThrow(FechaDeInicioConSaldosDeBancos);
    await expect(validar().ejecutar(operador, aviso('2026-03-01'))).resolves.toBeUndefined();
    await expect(validar().ejecutar(operador, aviso('2026-03-02'))).resolves.toBeUndefined();
  });
});
