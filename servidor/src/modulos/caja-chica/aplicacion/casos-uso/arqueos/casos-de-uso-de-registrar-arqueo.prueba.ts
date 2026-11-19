import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { FONDO_ID } from '../comprobantes/dobles-de-comprobantes.soporte.js';
import { sembrarComprobante } from '../reposiciones/dobles-de-reposiciones.soporte.js';
import { armarEscenarioDeArqueos, cienesDeQuetzal } from './dobles-de-arqueos.soporte.js';
import { RegistrarArqueo, type PeticionDeArqueo } from './registrar-arqueo.js';

const operador = operadorDePrueba();
let m: Awaited<ReturnType<typeof armarEscenarioDeArqueos>>;

const pedido = (cambios: Partial<PeticionDeArqueo> = {}): PeticionDeArqueo => ({
  fondoId: FONDO_ID,
  conteo: cienesDeQuetzal(100),
  comprobantesCompletos: true,
  ...cambios,
});

const arquear = (cambios: Partial<PeticionDeArqueo> = {}, quien = operador) =>
  new RegistrarArqueo(m.dependenciasDeArqueos).ejecutar(quien, pedido(cambios));

const faltante = { motivoDeDiferencia: 'Se perdió un billete', destinoDelFaltante: 'perdida' } as const;

beforeEach(async () => {
  m = await armarEscenarioDeArqueos();
});

describe('RegistrarArqueo: sin diferencia', () => {
  it('guarda el arqueo con lo que decía el sistema, sin comprobante ni auditoría, y publica el evento', async () => {
    const dto = await arquear({ observaciones: 'Todo en orden' });

    expect(dto).toMatchObject({
      numero: 1,
      efectivoContado: '10000.00',
      efectivoEsperado: '10000.00',
      montoDelFondo: '10000.00',
      pendienteDeReponer: '0.00',
      diferencia: '0.00',
      comprobante: null,
      destinoDelFaltante: null,
      loHizoElCustodio: false,
      conteo: [{ denominacion: '100.00', cantidad: 100, subtotal: '10000.00' }],
    });
    expect(m.auditoria.entradas).toEqual([]);
    expect(m.publicador.nombres()).toEqual(['caja-chica.arqueo_registrado']);
    expect(m.arqueos.filas.get(dto.id)).toMatchObject({ estado: 'vigente', observaciones: 'Todo en orden' });
  });

  it('el esperado descuenta lo pendiente de reponer y los cheques sin cambiar compensan', async () => {
    await sembrarComprobante(m, { montoCentavos: 20_000 });

    const dto = await arquear({ conteo: cienesDeQuetzal(98), valoresPorCambiarCentavos: 0 });
    const conCheque = await arquear({ conteo: cienesDeQuetzal(97), valoresPorCambiarCentavos: 10_000 });

    expect(dto).toMatchObject({ efectivoEsperado: '9800.00', diferencia: '0.00', pendienteDeReponer: '200.00' });
    expect(conCheque).toMatchObject({ valoresPorCambiar: '100.00', diferencia: '0.00', numero: 2 });
  });

  it('rechaza el motivo y el destino cuando no hay diferencia', async () => {
    await expect(arquear({ motivoDeDiferencia: 'x' })).rejects.toMatchObject({
      codigo: 'dato_de_diferencia_que_no_aplica',
    });
    expect(m.arqueos.filas.size).toBe(0);
  });
});

describe('RegistrarArqueo: con faltante', () => {
  it('crea el comprobante faltante con su destino y audita «ajustar» con el fondo como estaba', async () => {
    const dto = await arquear({ conteo: cienesDeQuetzal(99), ...faltante });

    expect(dto).toMatchObject({ diferencia: '-100.00', destinoDelFaltante: 'perdida' });
    expect(dto.comprobante).toMatchObject({ clase: 'faltante', monto: '100.00', resta: false, estado: 'vigente' });
    expect(m.comprobantes.pendienteDe(FONDO_ID)).toBe(10_000);
    expect(m.auditoria.entradas).toMatchObject([
      {
        recurso: 'caja-chica.arqueos',
        accion: 'ajustar',
        registroId: dto.id,
        motivo: 'Se perdió un billete',
        anterior: { id: FONDO_ID, pendienteDeReponer: '0.00', efectivoEsperado: '10000.00' },
      },
    ]);
    expect(m.publicador.publicados[0]!.datos).toMatchObject({
      diferenciaCentavos: -10_000,
      destinoDelFaltante: 'perdida',
      comprobanteId: dto.comprobante!.id,
    });
  });

  it('exige el motivo y el destino del faltante', async () => {
    const conteo = cienesDeQuetzal(99);

    await expect(arquear({ conteo })).rejects.toMatchObject({ codigo: 'motivo_de_diferencia_obligatorio' });
    await expect(arquear({ conteo, motivoDeDiferencia: 'Faltó' })).rejects.toMatchObject({
      codigo: 'destino_del_faltante_obligatorio',
    });
    expect(m.comprobantes.filas.size).toBe(0);
    expect(m.arqueos.filas.size).toBe(0);
  });

  it('el destino cobrar al custodio queda en el comprobante', async () => {
    const dto = await arquear({ conteo: cienesDeQuetzal(99), ...faltante, destinoDelFaltante: 'cobrar_al_custodio' });

    expect(dto.comprobante).toMatchObject({ destinoDelFaltante: 'cobrar_al_custodio' });
  });
});

describe('RegistrarArqueo: con sobrante', () => {
  it('crea el comprobante sobrante, que resta de lo pendiente, y no admite destino', async () => {
    const dto = await arquear({ conteo: cienesDeQuetzal(101), motivoDeDiferencia: 'Sobró un billete' });

    expect(dto).toMatchObject({ diferencia: '100.00', destinoDelFaltante: null });
    expect(dto.comprobante).toMatchObject({ clase: 'sobrante', monto: '100.00', resta: true });
    expect(m.comprobantes.pendienteDe(FONDO_ID)).toBe(-10_000);
    expect(m.auditoria.acciones()).toEqual(['caja-chica.arqueos:ajustar']);
    await expect(
      arquear({ conteo: cienesDeQuetzal(101), motivoDeDiferencia: 'Sobró', destinoDelFaltante: 'perdida' }),
    ).rejects.toMatchObject({ codigo: 'dato_de_diferencia_que_no_aplica' });
  });
});

describe('RegistrarArqueo: fecha y conteo', () => {
  it('rechaza un arqueo futuro, uno anterior a la apertura y un conteo con denominación inexistente', async () => {
    const futuro = await arquear({ realizadoEn: '2026-11-19T10:00:00-06:00' }).catch((error) => error);
    const antiguo = await arquear({ realizadoEn: '2026-10-31T10:00:00-06:00' }).catch((error) => error);
    const raro = await arquear({ conteo: [{ denominacionCentavos: 3_000, cantidad: 1 }] }).catch((error) => error);

    expect(futuro.codigo).toBe('fecha_del_arqueo_invalida');
    expect(antiguo.codigo).toBe('fecha_del_arqueo_invalida');
    expect(raro.codigo).toBe('conteo_invalido');
  });

  it('acepta un conteo de un día anterior y lo fecha con ese día', async () => {
    const dto = await arquear({ realizadoEn: '2026-11-10T09:00:00-06:00', conteo: cienesDeQuetzal(99), ...faltante });

    expect(dto.realizadoEn).toBe('2026-11-10T15:00:00.000Z');
    expect(dto.comprobante).toMatchObject({ fecha: '2026-11-10' });
  });

  it('una hora con «Z» se fecha con el día de la empresa: de tarde en Guatemala ya es mañana en UTC', async () => {
    const deHoy = await arquear({ realizadoEn: '2026-11-18T02:00:00Z' });
    const dePasado = await arquear({ realizadoEn: '2026-11-11T02:00:00Z', conteo: cienesDeQuetzal(99), ...faltante });

    expect(deHoy.numero).toBe(1);
    expect(dePasado.comprobante).toMatchObject({ fecha: '2026-11-10' });
  });

  it('numera cada arqueo con el siguiente número', async () => {
    const primero = await arquear();
    const segundo = await arquear();

    expect([primero.numero, segundo.numero]).toEqual([1, 2]);
  });
});

describe('RegistrarArqueo: separación de funciones', () => {
  it('avisa cuando arquea el custodio y deja constancia', async () => {
    m = await armarEscenarioDeArqueos(operador.usuarioId);

    const dto = await arquear();

    expect(dto.loHizoElCustodio).toBe(true);
    expect(dto.avisos).toEqual([expect.stringContaining('custodio')]);
  });

  it('con «bloquear» el custodio no arquea su fondo', async () => {
    m = await armarEscenarioDeArqueos(operador.usuarioId);
    m.control.separacion = 'bloquear';

    await expect(arquear()).rejects.toMatchObject({ codigo: 'separacion_de_funciones_en_el_arqueo' });
    expect(m.arqueos.filas.size).toBe(0);
  });
});
