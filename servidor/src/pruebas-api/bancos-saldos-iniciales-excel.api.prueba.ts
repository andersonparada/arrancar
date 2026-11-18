/**
 * BS-2: los dos Excel de los saldos iniciales (saldos por cuenta y partidas de apertura), el cambio de la fecha de
 * inicio y las rutas heredadas que el cliente actual todavía usa.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  empresaConInicio,
  fichaDe,
  filasDeExcel,
  guardarSaldo,
  importarExcel,
  libroConFilas,
  partidasDe,
  RUTA_DE_APERTURA,
} from './soporte/apertura-por-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA_SALDOS = RUTA_DE_APERTURA;
const RUTA_PARTIDAS = `${RUTA_DE_APERTURA}/partidas`;
let cuenta: CuentaDePrueba;
const usuario = () => cuenta.propietario;

/** El nombre de una cuenta nueva, para escribirlo en la columna Cuenta. */
async function cuentaNueva(): Promise<{ id: string; nombre: string }> {
  const id = await crearCuentaSinSaldo(usuario());
  const nombre = (await usuario().get(`/api/bancos/cuentas-bancarias/${id}`)).cuerpo.nombre as string;
  return { id, nombre };
}

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Excel apertura', usuario: 'propietarioexcelapertura' });
});

describe('Excel de los saldos por cuenta', () => {
  it('la plantilla trae las cuatro columnas y la hoja de instrucciones', async () => {
    const plantilla = (await usuario().get(`${RUTA_SALDOS}/plantilla`)).cuerpo as Buffer;

    const [encabezados] = await filasDeExcel(plantilla);

    expect((encabezados as string[]).map((t) => String(t).replace('*', '').trim())).toEqual([
      'Cuenta',
      'Saldo según estado de cuenta',
      'Saldo de la cuenta contable en los libros anteriores',
      'Observaciones',
    ]);
  });

  it('el ensayo no guarda, la importación crea solo las cuentas sin saldo y marca las demás por fila', async () => {
    const [nueva, otra, conSaldo] = [await cuentaNueva(), await cuentaNueva(), await cuentaNueva()];
    await guardarSaldo(usuario(), conSaldo.id, '5.00');
    const filas = [
      {
        Cuenta: nueva.nombre,
        'Saldo según estado de cuenta': 1200.5,
        'Saldo de la cuenta contable en los libros anteriores': 1200.5,
      },
      { Cuenta: otra.nombre, 'Saldo según estado de cuenta': -80, Observaciones: 'Sobregirada' },
      { Cuenta: conSaldo.nombre, 'Saldo según estado de cuenta': 10 },
      { Cuenta: 'Cuenta que no existe', 'Saldo según estado de cuenta': 10 },
    ];
    const libro = await libroConFilas(usuario(), RUTA_SALDOS, filas);

    const ensayo = (await importarExcel(usuario(), RUTA_SALDOS, { contenido: libro, ensayo: true })).cuerpo;
    const conProblemas = (await importarExcel(usuario(), RUTA_SALDOS, { contenido: libro, ensayo: false })).cuerpo;
    const limpio = await libroConFilas(usuario(), RUTA_SALDOS, filas.slice(0, 2));
    const real = (await importarExcel(usuario(), RUTA_SALDOS, { contenido: limpio, ensayo: false })).cuerpo;

    expect(ensayo.errores.map((e: { fila: number; columna: string | null }) => [e.fila, e.columna])).toEqual([
      [4, null],
      [5, 'Cuenta'],
    ]);
    expect(ensayo.errores[0].mensaje).toContain('Ya existe un saldo inicial');
    expect(ensayo.errores[1].mensaje).toContain('No existe "Cuenta que no existe"');
    expect(conProblemas.guardado).toBe(false);
    expect(real).toMatchObject({ guardado: true, filas: 2 });
    expect(await fichaDe(usuario(), nueva.id)).toMatchObject({ saldoSegunEstadoDeCuenta: '1200.50', cuadra: true });
    expect(await fichaDe(usuario(), otra.id)).toMatchObject({ saldoSegunEstadoDeCuenta: '-80.00' });
  });

  it('el exportado trae el cuadre y, al pie, Bancos y Sobregiros por separado', async () => {
    const exportado = await usuario().get(`${RUTA_SALDOS}/exportar`);

    const filas = await filasDeExcel(exportado.cuerpo as Buffer);

    expect(exportado.estado).toBe(200);
    expect((filas[0] as string[]).slice(4)).toEqual([
      'Fecha de corte',
      'Depósitos en tránsito',
      'Cheques en circulación',
      'Débitos en tránsito',
      'Errores del banco',
      'Saldo en libros al corte',
      'Diferencia con los libros anteriores',
      'Tiene evidencia',
    ]);
    const pie = filas.slice(-2).map((fila) => String(fila[0]));
    expect(pie).toEqual(['TOTAL BANCOS', 'TOTAL SOBREGIROS BANCARIOS']);
  });
});

describe('Excel de las partidas de apertura', () => {
  const CONCEPTO = 'General de prueba';
  const fila = (clase: string, cambios: Record<string, unknown> = {}) => ({
    Clase: clase,
    Fecha: '20/12/2025',
    Monto: 100,
    ...cambios,
  });

  it('las seis clases se importan, con los avisos en el ensayo, y quedan en la ficha', async () => {
    const { id, nombre } = await cuentaNueva();
    await guardarSaldo(usuario(), id, '5000.00');
    await conceptoGeneral(usuario());
    const filas = [
      fila('Cheque en circulación', {
        Cuenta: nombre,
        'Número de cheque': 501,
        'Beneficiario u origen': 'Proveedor',
        Fecha: '15/04/2025',
      }),
      fila('Depósito en tránsito', { Cuenta: nombre, Fecha: '01/11/2025', 'Beneficiario u origen': 'Cliente Uno' }),
      fila('Débito en tránsito', { Cuenta: nombre }),
      fila('Error del banco que suma', { Cuenta: nombre, Referencia: 'Cargo duplicado' }),
      fila('Error del banco que resta', { Cuenta: nombre, Referencia: 'Abono de más' }),
      fila('Cheque posfechado', {
        Cuenta: nombre,
        'Número de cheque': 502,
        'Beneficiario u origen': 'Proveedor 2',
        Fecha: '10/02/2026',
        Concepto: CONCEPTO,
      }),
    ].map((valores) => ({ ...valores, Cuenta: nombre }));
    const libro = await libroConFilas(usuario(), RUTA_PARTIDAS, filas);

    const ensayo = (await importarExcel(usuario(), RUTA_PARTIDAS, { contenido: libro, ensayo: true })).cuerpo;
    const enFicha = await fichaDe(usuario(), id);
    const real = (await importarExcel(usuario(), RUTA_PARTIDAS, { contenido: libro, ensayo: false })).cuerpo;
    const guardada = await fichaDe(usuario(), id);

    expect(ensayo).toMatchObject({ guardado: false, filas: 6, errores: [] });
    expect(ensayo.avisos.map((a: { fila: number }) => a.fila)).toEqual([2, 3]);
    expect(ensayo.avisos[0].mensaje).toContain('art. 508');
    expect(partidasDe(enFicha, 'deposito_en_transito')).toHaveLength(0);
    expect(real).toMatchObject({ guardado: true, filas: 6 });
    expect(guardada).toMatchObject({ totalErroresDelBanco: '0.00', totalPosfechados: '100.00' });
    expect(
      partidasDe(guardada, 'error_del_banco')
        .map((p: { tipo: string }) => p.tipo)
        .sort(),
    ).toEqual(['credito', 'debito']);
    expect(partidasDe(guardada, 'cheque_posfechado')[0]).toMatchObject({
      conceptoNombre: CONCEPTO,
      numeroDeCheque: 502,
    });
  });

  it('todo o nada: con una fila mala no se guarda ninguna y cada problema trae su fila y columna', async () => {
    const { id, nombre } = await cuentaNueva();
    await guardarSaldo(usuario(), id, '100.00');
    const libro = await libroConFilas(usuario(), RUTA_PARTIDAS, [
      fila('Depósito en tránsito', { Cuenta: nombre }),
      fila('Depósito en tránsito', { Cuenta: nombre, Fecha: '05/01/2026' }),
      fila('Cheque en circulación', { Cuenta: nombre, 'Beneficiario u origen': 'Sin número' }),
      fila('Cheque posfechado', {
        Cuenta: nombre,
        'Número de cheque': 9,
        'Beneficiario u origen': 'X',
        Fecha: '10/02/2026',
      }),
      fila('Error del banco que suma', { Cuenta: nombre }),
    ]);

    const resultado = (await importarExcel(usuario(), RUTA_PARTIDAS, { contenido: libro, ensayo: false })).cuerpo;

    expect(resultado.guardado).toBe(false);
    expect(resultado.errores.map((e: { fila: number; columna: string | null }) => [e.fila, e.columna])).toEqual([
      [3, 'Fecha'],
      [4, 'Número de cheque'],
      [5, null],
      [6, 'Observaciones'],
    ]);
    expect((await fichaDe(usuario(), id)).partidas).toHaveLength(1);
  });

  it('el exportado trae las partidas con su clase, y los permisos mandan (403)', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'SoloVeApertura',
      apellidos: 'Ver apertura',
      permisos: ['bancos.saldos-iniciales.ver'],
    });
    const importador = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'SoloImportaApertura',
      apellidos: 'Importa apertura',
      permisos: ['bancos.saldos-iniciales.importar'],
    });

    const exportado = await filasDeExcel((await usuario().get(`${RUTA_PARTIDAS}/exportar`)).cuerpo as Buffer);

    expect(exportado.slice(1).map((f) => f[1])).toEqual(
      expect.arrayContaining(['Cheque posfechado', 'Error del banco que suma', 'Error del banco que resta']),
    );
    expect((await lector.get(`${RUTA_PARTIDAS}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA_PARTIDAS}/plantilla`)).estado).toBe(403);
    expect((await importador.get(`${RUTA_PARTIDAS}/plantilla`)).estado).toBe(200);
    expect((await importador.get(`${RUTA_SALDOS}/exportar`)).estado).toBe(403);
  });
});

describe('cambiar la fecha de inicio', () => {
  const ruta = (empresaId: string) => `/api/empresas/${empresaId}/carga-inicial`;

  it('con saldos del estado de cuenta cargados se rechaza (422) y la fecha no cambia', async () => {
    const aparte = await empresaConInicio(entorno, { nombre: 'Fecha con saldos', usuario: 'propietariofechasaldos' });
    await guardarSaldo(aparte.propietario, await crearCuentaSinSaldo(aparte.propietario), '10.00');
    await guardarSaldo(aparte.propietario, await crearCuentaSinSaldo(aparte.propietario), '20.00');

    const cambio = await aparte.propietario.put(ruta(aparte.empresaId), { fechaDeInicio: '2026-02-01' });
    const igual = await aparte.propietario.put(ruta(aparte.empresaId), { fechaDeInicio: '2026-01-01' });

    expect(cambio.estado).toBe(422);
    expect(cambio.cuerpo.error.codigo).toBe('fecha_de_inicio_con_saldos_de_bancos');
    expect(cambio.cuerpo.error.mensaje).toContain('2 cuentas bancarias tienen saldo inicial al 31/12/2025');
    expect(igual.estado).toBe(200);
    expect((await aparte.propietario.get(ruta(aparte.empresaId))).cuerpo.fechaDeInicio).toBe('2026-01-01');
  });

  it('con un saldo global de antes posterior a la fecha de inicio nueva se rechaza; con la misma fecha o una posterior pasa', async () => {
    const aparte = await empresaConInicio(entorno, {
      nombre: 'Fecha con global',
      usuario: 'propietariofechaglobal',
      fechaDeInicio: '2026-06-01',
    });
    const cuentaId = await crearCuentaSinSaldo(aparte.propietario);
    await aparte.propietario.post(RUTA_DE_APERTURA, {
      cuentaBancariaId: cuentaId,
      tipo: 'credito',
      fecha: '2026-03-01',
      monto: '10.00',
      referencia: null,
      observaciones: null,
    });

    const anterior = await aparte.propietario.put(ruta(aparte.empresaId), { fechaDeInicio: '2026-02-01' });
    const igual = await aparte.propietario.put(ruta(aparte.empresaId), { fechaDeInicio: '2026-03-01' });
    const posterior = await aparte.propietario.put(ruta(aparte.empresaId), { fechaDeInicio: '2026-09-01' });

    expect(anterior.estado).toBe(422);
    expect(anterior.cuerpo.error.codigo).toBe('fecha_de_inicio_con_saldos_de_bancos');
    expect(anterior.cuerpo.error.mensaje).toContain('posterior a la fecha de inicio nueva');
    expect([igual.estado, posterior.estado]).toEqual([200, 200]);
  });
});
