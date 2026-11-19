import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { FONDO_ID, HOY } from '../comprobantes/dobles-de-comprobantes.soporte.js';
import {
  armarEscenarioDeReposiciones,
  sembrarComprobante,
  type EscenarioDeReposiciones,
} from './dobles-de-reposiciones.soporte.js';
import { RegistrarReposicion, type PeticionDeReposicion } from './registrar-reposicion.js';

const operador = operadorDePrueba();
let m: EscenarioDeReposiciones;

const enCheque = (ids: string[], cambios: Partial<PeticionDeReposicion> = {}) =>
  ({
    fondoId: FONDO_ID,
    comprobanteIds: ids,
    forma: 'cheque',
    chequeraId: 'chequera-1',
    ...cambios,
  }) as PeticionDeReposicion;

const reponer = (pedido: PeticionDeReposicion, quien = operador) =>
  new RegistrarReposicion(m.dependenciasDeReposiciones).ejecutar(quien, pedido);

beforeEach(async () => {
  m = await armarEscenarioDeReposiciones();
});

describe('RegistrarReposicion: lo que guarda y ordena a Bancos', () => {
  it('con un cheque: numera, reparte por concepto, procesa los documentos del libro y publica reposicion_registrada', async () => {
    const gasto = await sembrarComprobante(m, { montoCentavos: 10_000, documentoDeCompraId: 'documento-1' });
    const activo = await sembrarComprobante(m, { montoCentavos: 50_000, conActivoFijo: true });
    const faltante = await sembrarComprobante(m, { clase: 'faltante', montoCentavos: 2_500 });

    const dto = await reponer(enCheque([gasto.id, activo.id, faltante.id]));

    expect(dto).toMatchObject({
      numero: 1,
      forma: 'cheque',
      monto: '625.00',
      custodio: 'Juan Pérez',
      estado: 'vigente',
      laHizoElCustodio: false,
      desglose: { operacion: '100.00', activo: '500.00', faltante: '25.00' },
    });
    expect(dto.lineas.map(({ monto }) => monto)).toEqual(['100.00', '500.00', '25.00']);
    expect(dto.avisos).toEqual(['Aviso de Bancos']);
    expect(m.bancos.cheques).toHaveLength(1);
    expect(m.bancos.cheques[0]).toMatchObject({
      origen: { modulo: 'caja-chica', documentoId: dto.id },
      chequeraId: 'chequera-1',
      fecha: HOY,
      montoCentavos: 62_500,
      beneficiario: 'Juan Pérez',
      noNegociable: true,
      conceptos: [
        { claveDeSistema: 'reintegro_de_caja_chica', montoCentavos: 10_000 },
        { claveDeSistema: 'reintegro_de_caja_chica_de_activo', montoCentavos: 50_000 },
        { claveDeSistema: 'faltante_de_efectivo', montoCentavos: 2_500 },
      ],
    });
    expect(m.libro.procesados.get('documento-1')).toBe(true);
    expect(m.libro.procesados.size).toBe(1);
    expect(m.comprobantes.pendienteDe(FONDO_ID)).toBe(0);
    expect(m.publicador.publicados[0]).toMatchObject({
      nombre: 'caja-chica.reposicion_registrada',
      datos: {
        reposicionId: dto.id,
        numero: 1,
        montoCentavos: 62_500,
        desglose: { operacionCentavos: 10_000, activoCentavos: 50_000, faltanteCentavos: 2_500 },
      },
    });
    expect(m.auditoria.entradas).toEqual([]);
  });

  it('con una nota de débito: la orden va a la cuenta y sin conceptos en cero', async () => {
    const gasto = await sembrarComprobante(m, { montoCentavos: 30_000 });

    const dto = await reponer({
      fondoId: FONDO_ID,
      comprobanteIds: [gasto.id],
      forma: 'nota_de_debito',
      cuentaBancariaId: 'cuenta-1',
      referencia: 'Boleta 55',
    });

    expect(dto.forma).toBe('nota_de_debito');
    expect(m.bancos.notas).toMatchObject([
      {
        tipo: 'debito',
        cuentaBancariaId: 'cuenta-1',
        referencia: 'Boleta 55',
        beneficiario: 'Juan Pérez',
        conceptos: [{ claveDeSistema: 'reintegro_de_caja_chica', montoCentavos: 30_000 }],
      },
    ]);
  });

  it('las notas de crédito y los sobrantes restan; si pasan de operación, se rebajan de la línea de activo', async () => {
    const gasto = await sembrarComprobante(m, { montoCentavos: 2_000 });
    const nota = await sembrarComprobante(m, { montoCentavos: 5_000, resta: true, esNotaDeCredito: true });
    const sobrante = await sembrarComprobante(m, { clase: 'sobrante', montoCentavos: 500, resta: true });
    const activo = await sembrarComprobante(m, { montoCentavos: 20_000, conActivoFijo: true });

    const dto = await reponer(enCheque([gasto.id, nota.id, sobrante.id, activo.id]));

    expect(dto.monto).toBe('165.00');
    expect(dto.desglose).toEqual({ operacion: '0.00', activo: '165.00', faltante: '0.00' });
    expect(m.bancos.cheques[0]!.conceptos).toEqual([
      { claveDeSistema: 'reintegro_de_caja_chica_de_activo', montoCentavos: 16_500 },
    ]);
  });

  it('numera de corrido y deja el cheque a nombre de otro si se pide', async () => {
    const uno = await sembrarComprobante(m);
    const dos = await sembrarComprobante(m);

    const primera = await reponer(enCheque([uno.id]));
    const segunda = await reponer(enCheque([dos.id], { beneficiario: 'Ana López', noNegociable: false }));

    expect([primera.numero, segunda.numero]).toEqual([1, 2]);
    expect(m.bancos.cheques[1]).toMatchObject({ beneficiario: 'Ana López', noNegociable: false });
  });
});

describe('RegistrarReposicion: lo que rechaza (y no deja nada guardado ni ordenado)', () => {
  const sinRastro = () => {
    expect(m.reposiciones.filas.size).toBe(0);
    expect(m.bancos.cheques).toHaveLength(0);
    expect(m.libro.procesados.size).toBe(0);
  };

  it('sin comprobantes, uno que no es del fondo o que no se ve', async () => {
    const mio = await sembrarComprobante(m);

    await expect(reponer(enCheque([]))).rejects.toMatchObject({ codigo: 'reposicion_sin_comprobantes' });
    await expect(reponer(enCheque([mio.id, 'no-existe']))).rejects.toMatchObject({
      codigo: 'comprobante_no_es_del_fondo',
    });
    sinRastro();
  });

  it('un comprobante anulado o que ya está en otra reposición', async () => {
    const anulado = await sembrarComprobante(m, { estado: 'anulado' });
    const repuesto = await sembrarComprobante(m);
    await reponer(enCheque([repuesto.id]));
    m.bancos.cheques.length = 0;

    await expect(reponer(enCheque([anulado.id]))).rejects.toMatchObject({ codigo: 'comprobante_ya_anulado' });
    await expect(reponer(enCheque([repuesto.id]))).rejects.toMatchObject({
      codigo: 'comprobante_repuesto',
      message: 'Está en la reposición 1: anúlela primero.',
    });
    expect(m.bancos.cheques).toHaveLength(0);
  });

  it('un total que no pasa de cero', async () => {
    const nota = await sembrarComprobante(m, { montoCentavos: 5_000, resta: true, esNotaDeCredito: true });

    await expect(reponer(enCheque([nota.id]))).rejects.toMatchObject({ codigo: 'reposicion_sin_monto' });
    sinRastro();
  });

  it('una fecha futura o anterior a un comprobante', async () => {
    const gasto = await sembrarComprobante(m, { fecha: '2026-11-10' });

    await expect(reponer(enCheque([gasto.id], { fecha: '2026-11-19' }))).rejects.toMatchObject({
      codigo: 'fecha_de_la_reposicion_invalida',
    });
    await expect(reponer(enCheque([gasto.id], { fecha: '2026-11-05' }))).rejects.toMatchObject({
      codigo: 'fecha_de_la_reposicion_invalida',
    });
    sinRastro();
  });

  it('un cheque al portador y un fondo cerrado', async () => {
    const gasto = await sembrarComprobante(m);

    await expect(reponer(enCheque([gasto.id], { beneficiario: 'Al portador' }))).rejects.toMatchObject({
      codigo: 'beneficiario_invalido',
    });
    m.fondos.fondos.set(FONDO_ID, { ...m.fondos.fondos.get(FONDO_ID)!, estado: 'cerrado' });
    await expect(reponer(enCheque([gasto.id]))).rejects.toMatchObject({ codigo: 'fondo_no_disponible' });
    sinRastro();
  });

  it('lo que Bancos rechaza: la reposición no se guarda y los documentos no se procesan', async () => {
    const gasto = await sembrarComprobante(m, { documentoDeCompraId: 'documento-1' });
    m.bancos.fallar = true;

    await expect(reponer(enCheque([gasto.id]))).rejects.toThrow('Saldo insuficiente');

    sinRastro();
    expect(m.comprobantes.pendienteDe(FONDO_ID)).toBe(10_000);
  });
});

describe('RegistrarReposicion: la separación de funciones', () => {
  beforeEach(async () => {
    m = await armarEscenarioDeReposiciones(operador.usuarioId);
  });

  it('con «avisar» el custodio repone, queda marcado y recibe el aviso', async () => {
    const gasto = await sembrarComprobante(m);

    const dto = await reponer(enCheque([gasto.id]));

    expect(dto.laHizoElCustodio).toBe(true);
    expect(dto.avisos).toContainEqual(expect.stringContaining('custodio de este fondo'));
  });

  it('con «bloquear» el custodio no repone y no se ordena nada', async () => {
    m.control.separacion = 'bloquear';
    const gasto = await sembrarComprobante(m);

    await expect(reponer(enCheque([gasto.id]))).rejects.toMatchObject({ codigo: 'separacion_de_funciones' });

    expect(m.bancos.cheques).toHaveLength(0);
    expect(m.reposiciones.filas.size).toBe(0);
  });

  it('otra persona repone sin aviso aunque esté en «bloquear»', async () => {
    m.control.separacion = 'bloquear';
    const gasto = await sembrarComprobante(m);

    const dto = await reponer(enCheque([gasto.id]), operadorDePrueba());

    expect(dto.laHizoElCustodio).toBe(false);
    expect(dto.avisos).toEqual(['Aviso de Bancos']);
  });
});
