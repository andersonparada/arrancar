import { describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { dependenciasEnMemoria } from '../../../pruebas/dobles-de-anticipos.js';
import { EntregarAnticipo } from './entregar-anticipo.js';
import type { PeticionDeAnticipo } from './peticion-de-anticipo.js';

const operador = operadorDePrueba();

const cheque = (cambios: Partial<PeticionDeAnticipo> = {}): PeticionDeAnticipo =>
  ({
    forma: 'cheque',
    chequeraId: 'chequera-1',
    beneficiarioId: 'tercero-1',
    esEmpleado: true,
    clase: 'viatico',
    descripcion: ' Viaje a Cobán ',
    monto: '1500.50',
    puedeConVencidos: false,
    ...cambios,
  }) as PeticionDeAnticipo;

function preparar() {
  const piezas = dependenciasEnMemoria();
  return { ...piezas, entregar: new EntregarAnticipo(piezas.dependencias) };
}

describe('entregar un anticipo con cheque', () => {
  it('ordena a Bancos el cheque a nombre del beneficiario, no negociable, con el anticipo como origen', async () => {
    const { entregar, bancos, anticipos } = preparar();

    const anticipo = await entregar.ejecutar(operador, cheque());

    expect(bancos.cheque).toMatchObject({
      chequeraId: 'chequera-1',
      beneficiario: 'Ana López',
      noNegociable: true,
      montoCentavos: 150_050,
      fecha: '2026-11-18',
      conceptos: [{ claveDeSistema: 'anticipo_por_liquidar', montoCentavos: 150_050 }],
      origen: { modulo: 'cuentas-por-liquidar', documentoId: anticipo.id },
    });
    expect(anticipos.guardados.get(anticipo.id)).toMatchObject({ descripcion: 'Viaje a Cobán', estado: 'abierto' });
    expect(anticipo).toMatchObject({ numero: '1', monto: '1500.50', porJustificar: '1500.50', estado: 'abierto' });
  });

  it('la fecha límite por omisión es la entrega más los días de la configuración', async () => {
    const { entregar, politica } = preparar();
    politica.dias = 30;

    const anticipo = await entregar.ejecutar(operador, cheque());

    expect(anticipo.fechaLimite).toBe('2026-12-18');
  });

  it('se puede escribir la fecha límite y la fecha de entrega', async () => {
    const { entregar } = preparar();

    const anticipo = await entregar.ejecutar(operador, cheque({ fecha: '2026-11-10', fechaLimite: '2026-11-12' }));

    expect(anticipo).toMatchObject({ fecha: '2026-11-10', fechaLimite: '2026-11-12', vencido: true, diasVencido: 6 });
  });

  it('publica anticipo_entregado al confirmar', async () => {
    const { entregar, publicadorEventos } = preparar();

    await entregar.ejecutar(operador, cheque());

    expect(publicadorEventos.nombres()).toEqual(['cuentas-por-liquidar.anticipo_entregado']);
    expect(publicadorEventos.publicados[0]!.datos).toMatchObject({ montoCentavos: 150_050, beneficiario: 'Ana López' });
  });
});

describe('entregar un anticipo con nota de débito', () => {
  it('registra la nota con la transferencia como referencia y suma los avisos de Bancos', async () => {
    const { entregar, bancos } = preparar();

    const anticipo = await entregar.ejecutar(operador, {
      ...cheque(),
      forma: 'nota_de_debito',
      cuentaBancariaId: 'cuenta-9',
      referencia: 'TRF-55',
    } as PeticionDeAnticipo);

    expect(bancos.nota).toMatchObject({
      cuentaBancariaId: 'cuenta-9',
      referencia: 'TRF-55',
      beneficiario: 'Ana López',
    });
    expect(anticipo.avisos).toContain('La cuenta quedará sin fondos.');
  });
});

describe('lo que se rechaza sin ordenar nada a Bancos', () => {
  it.each([
    ['fecha futura', { fecha: '2026-11-19' }, 'fecha_del_anticipo_invalida'],
    ['monto en cero', { monto: '0.00' }, 'monto_del_anticipo_invalido'],
    ['fecha límite anterior a la entrega', { fechaLimite: '2026-11-17' }, 'fecha_limite_invalida'],
  ])('%s', async (_nombre, cambios, codigo) => {
    const { entregar, bancos, anticipos } = preparar();

    await expect(entregar.ejecutar(operador, cheque(cambios))).rejects.toMatchObject({ codigo });
    expect(bancos.cheque).toBeNull();
    expect(anticipos.guardados.size).toBe(0);
  });

  it('un beneficiario que no es un tercero activo de la cuenta', async () => {
    const { entregar, referencias } = preparar();
    referencias.tercero = null;

    await expect(entregar.ejecutar(operador, cheque())).rejects.toMatchObject({ codigo: 'beneficiario_no_disponible' });
  });

  it('un tercero llamado «al portador»: el cheque nunca va al portador', async () => {
    const { entregar, referencias } = preparar();
    referencias.tercero = 'Al Portador';

    await expect(entregar.ejecutar(operador, cheque())).rejects.toMatchObject({
      codigo: 'beneficiario_del_anticipo_invalido',
    });
  });

  it('un usuario que no entra a la empresa y una localidad que no es de ella', async () => {
    const { entregar, referencias } = preparar();
    referencias.usuarioValido = false;
    await expect(entregar.ejecutar(operador, cheque({ beneficiarioUsuarioId: 'usuario-1' }))).rejects.toMatchObject({
      codigo: 'beneficiario_usuario_invalido',
    });

    referencias.usuarioValido = true;
    referencias.localidadValida = false;
    await expect(entregar.ejecutar(operador, cheque({ localidadId: 'loc-1' }))).rejects.toMatchObject({
      codigo: 'localidad_del_anticipo_invalida',
    });
  });

  it('si Bancos rechaza, no se guarda el anticipo ni se publica nada', async () => {
    const { entregar, bancos, anticipos, publicadorEventos } = preparar();
    bancos.rechazo = new Error('Saldo insuficiente');

    await expect(entregar.ejecutar(operador, cheque())).rejects.toThrow('Saldo insuficiente');
    expect(anticipos.guardados.size).toBe(0);
    expect(publicadorEventos.publicados).toEqual([]);
  });
});

describe('el beneficiario que no es empleado (C8)', () => {
  it('avisa que las facturas deben venir a nombre y NIT de la empresa', async () => {
    const { entregar } = preparar();

    const anticipo = await entregar.ejecutar(operador, cheque({ esEmpleado: false }));

    expect(anticipo.avisos).toContain('Las facturas deben venir a nombre y NIT de la empresa.');
    const deEmpleado = await entregar.ejecutar(operador, cheque());
    expect(deEmpleado.avisos).not.toContain('Las facturas deben venir a nombre y NIT de la empresa.');
  });
});

describe('el beneficiario con anticipos vencidos (CL-r)', () => {
  const conVencidos = (piezas: ReturnType<typeof preparar>) => {
    piezas.consultas.vencidos = [{ numero: 3, anioDeNumero: 0 }];
  };

  it('con el bloqueo apagado solo avisa', async () => {
    const piezas = preparar();
    conVencidos(piezas);

    const anticipo = await piezas.entregar.ejecutar(operador, cheque());

    expect(anticipo.avisos).toContain('Ana López tiene vencido el anticipo 3 sin liquidar.');
    expect(anticipo.motivoConVencidos).toBeNull();
  });

  it('con el bloqueo encendido rechaza sin el permiso de excepción', async () => {
    const piezas = preparar();
    conVencidos(piezas);
    piezas.politica.bloquear = true;

    await expect(piezas.entregar.ejecutar(operador, cheque())).rejects.toMatchObject({
      codigo: 'beneficiario_con_vencidos',
    });
    expect(piezas.bancos.cheque).toBeNull();
  });

  it('con el permiso pide el motivo y lo guarda en el anticipo', async () => {
    const piezas = preparar();
    conVencidos(piezas);
    piezas.politica.bloquear = true;

    await expect(piezas.entregar.ejecutar(operador, cheque({ puedeConVencidos: true }))).rejects.toMatchObject({
      codigo: 'motivo_con_vencidos_obligatorio',
    });
    const anticipo = await piezas.entregar.ejecutar(
      operador,
      cheque({ puedeConVencidos: true, motivoConVencidos: 'Viaje urgente' }),
    );

    expect(anticipo.motivoConVencidos).toBe('Viaje urgente');
  });
});
