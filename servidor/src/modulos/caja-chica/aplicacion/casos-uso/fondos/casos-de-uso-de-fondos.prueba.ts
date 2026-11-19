import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
  operadorDePrueba,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { CambioDeMonto } from '../../../dominio/fondos.js';
import type { DatosDeLectura } from '../../puertos/puertos-de-fondos.js';
import { AbrirFondo } from './abrir-fondo.js';
import { AnuladorDeCambios } from './anulador-de-cambios.js';
import { AumentarFondo } from './aumentar-fondo.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { BancosFalso, consultas, FondosEnMemoria } from './dobles-de-fondos.soporte.js';
import { DisminuirFondo } from './disminuir-fondo.js';
import { EditarFondo } from './editar-fondo.js';

let repo: FondosEnMemoria;
let bancos: BancosFalso;
let auditoria: AuditoriaEnMemoria;
let publicador: PublicadorEventosEnMemoria;
let dependencias: DependenciasDeFondos;
const operador = operadorDePrueba();

function armar(cifras: Partial<DatosDeLectura> = {}) {
  repo = new FondosEnMemoria();
  bancos = new BancosFalso();
  auditoria = new AuditoriaEnMemoria();
  publicador = new PublicadorEventosEnMemoria();
  dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    fondos: repo,
    consultas: consultas(cifras),
    custodios: { nombreDelUsuario: async (id) => (id === 'usuario-1' ? 'Ana López' : null) },
    referencias: { exigirLocalidad: async () => {}, exigirCuentaBancaria: async () => {} },
    bancos,
    movimientos: { fechaDe: async () => null },
    auditoria,
    publicadorEventos: publicador,
    reloj: new RelojFijo('2026-11-18'),
  };
}

const cheque = {
  forma: 'cheque',
  chequeraId: 'chequera-1',
  nombre: 'Caja',
  monto: '1500.00',
  custodio: 'Juan',
} as const;

beforeEach(() => armar());

describe('AbrirFondo', () => {
  it('ordena el cheque no negociable con el concepto de sistema, guarda fondo, custodio y apertura y publica el evento', async () => {
    const fondo = await new AbrirFondo(dependencias).ejecutar(operador, { ...cheque, topePorComprobante: '300.00' });

    expect(bancos.cheques).toHaveLength(1);
    expect(bancos.cheques[0]).toMatchObject({
      montoCentavos: 150_000,
      beneficiario: 'Juan',
      noNegociable: true,
      conceptos: [{ claveDeSistema: 'fondo_de_caja_chica', montoCentavos: 150_000 }],
      origen: { modulo: 'caja-chica', documentoId: fondo.id },
    });
    expect(fondo).toMatchObject({ nombre: 'Caja', avisos: ['Aviso de Bancos'], topePorComprobante: '300.00' });
    expect(repo.cambiosDe.get(fondo.id)).toMatchObject([{ tipo: 'apertura', forma: 'cheque', montoCentavos: 150_000 }]);
    expect(repo.fondos.get(fondo.id)!.cuentaBancariaId).toBe('cuenta-1');
    expect(publicador.nombres()).toEqual(['caja-chica.fondo_abierto']);
    expect(auditoria.entradas).toEqual([]);
  });

  it('un usuario como custodio toma su nombre; uno inexistente se rechaza', async () => {
    const fondo = await new AbrirFondo(dependencias).ejecutar(operador, {
      ...cheque,
      custodio: null,
      custodioUsuarioId: 'usuario-1',
    });

    expect(fondo.custodio).toBe('Juan');
    expect(repo.custodiosDe.get(fondo.id)).toMatchObject([{ custodio: 'Ana López', custodioUsuarioId: 'usuario-1' }]);
    await expect(
      new AbrirFondo(dependencias).ejecutar(operador, { ...cheque, nombre: 'Otra', custodioUsuarioId: 'nadie' }),
    ).rejects.toMatchObject({ codigo: 'custodio_invalido' });
  });

  it('si Bancos rechaza, no se guarda nada ni se publica', async () => {
    bancos.fallar = true;

    await expect(new AbrirFondo(dependencias).ejecutar(operador, cheque)).rejects.toThrow('Saldo insuficiente');

    expect(repo.fondos.size).toBe(0);
    expect(publicador.publicados).toEqual([]);
  });

  it('rechaza el nombre repetido y el cheque al portador antes de ordenar nada', async () => {
    await new AbrirFondo(dependencias).ejecutar(operador, cheque);

    const repetido = new AbrirFondo(dependencias).ejecutar(operador, { ...cheque, nombre: 'CAJA' });
    const alPortador = new AbrirFondo(dependencias).ejecutar(operador, {
      ...cheque,
      nombre: 'Otra',
      beneficiario: 'portador',
    });

    await expect(repetido).rejects.toMatchObject({ codigo: 'nombre_de_fondo_repetido' });
    await expect(alPortador).rejects.toMatchObject({ codigo: 'beneficiario_invalido' });
    expect(bancos.cheques).toHaveLength(1);
  });
});

describe('AumentarFondo y DisminuirFondo', () => {
  async function fondoAbierto(): Promise<string> {
    return (await new AbrirFondo(dependencias).ejecutar(operador, cheque)).id;
  }

  it('aumentar con nota de débito ordena la nota con el concepto y publica el cambio de monto', async () => {
    const fondoId = await fondoAbierto();

    await new AumentarFondo(dependencias).ejecutar(operador, {
      fondoId,
      forma: 'nota_de_debito',
      cuentaBancariaId: 'cuenta-2',
      monto: '200.00',
      referencia: 'BOL-1',
    });

    expect(bancos.notas[0]).toMatchObject({
      tipo: 'debito',
      cuentaBancariaId: 'cuenta-2',
      referencia: 'BOL-1',
      beneficiario: 'Juan',
    });
    expect(publicador.nombres()).toEqual(['caja-chica.fondo_abierto', 'caja-chica.monto_del_fondo_cambiado']);
  });

  it('disminuir ordena la nota de crédito en la cuenta del fondo y audita «ajustar»', async () => {
    const fondoId = await fondoAbierto();

    await new DisminuirFondo(dependencias).ejecutar(operador, { fondoId, monto: '400.00' });

    expect(bancos.notas[0]).toMatchObject({
      tipo: 'credito',
      cuentaBancariaId: 'cuenta-1',
      conceptos: [{ claveDeSistema: 'devolucion_de_fondo_de_caja_chica', montoCentavos: 40_000 }],
    });
    expect(auditoria.acciones()).toEqual(['caja-chica.fondos:ajustar']);
  });

  it('disminuir más que el efectivo esperado o dejar el fondo en cero se rechaza sin ordenar nada', async () => {
    const fondoId = await fondoAbierto();
    armarConCifras({ pendienteCentavos: 80_000 });

    await expect(
      new DisminuirFondo(dependencias).ejecutar(operador, { fondoId, monto: '300.00' }),
    ).rejects.toMatchObject({
      codigo: 'disminucion_mayor_que_el_efectivo',
    });
    armarConCifras({});
    await expect(
      new DisminuirFondo(dependencias).ejecutar(operador, { fondoId, monto: '1000.00' }),
    ).rejects.toMatchObject({
      codigo: 'disminucion_deja_el_fondo_en_cero',
    });
    expect(bancos.notas).toHaveLength(0);
  });

  it('aumentar o disminuir con fecha anterior a la apertura se rechaza sin ordenar nada', async () => {
    const fondoId = await fondoAbierto();
    const antes = { fondoId, fecha: '2026-01-01' };

    await expect(
      new AumentarFondo(dependencias).ejecutar(operador, {
        ...antes,
        forma: 'nota_de_debito',
        cuentaBancariaId: 'cuenta-2',
        monto: '200.00',
      }),
    ).rejects.toMatchObject({ codigo: 'fecha_anterior_a_la_apertura' });
    await expect(
      new DisminuirFondo(dependencias).ejecutar(operador, { ...antes, monto: '100.00' }),
    ).rejects.toMatchObject({ codigo: 'fecha_anterior_a_la_apertura' });
    expect(bancos.notas).toHaveLength(0);
  });

  it('Bancos no puede anular un aumento si el fondo quedaría en cero o negativo por disminuciones posteriores', async () => {
    const fondoId = await fondoAbierto();
    const fondo = (await repo.buscar(fondoId))!;
    const aumento = { id: 'aumento-1', tipo: 'aumento', montoCentavos: 50_000 } as CambioDeMonto;
    const anulador = (monto: number) =>
      new AnuladorDeCambios({ ...dependencias, consultas: consultas({ montoCentavos: monto }) });

    await expect(anulador(10_000).revisar(fondo, aumento)).rejects.toMatchObject({
      codigo: 'anulacion_deja_el_fondo_sin_monto',
    });
    await expect(anulador(150_000).revisar(fondo, aumento)).resolves.toBeUndefined();
  });

  function armarConCifras(cifras: Partial<DatosDeLectura>) {
    dependencias = { ...dependencias, consultas: consultas(cifras) };
  }
});

describe('EditarFondo', () => {
  it('cambiar el tope audita «corregir»; cambiar solo el nombre no', async () => {
    const fondo = await new AbrirFondo(dependencias).ejecutar(operador, { ...cheque, topePorComprobante: '100.00' });
    const editar = new EditarFondo(dependencias);

    await editar.ejecutar(operador, { fondoId: fondo.id, nombre: 'Caja nueva' });
    expect(auditoria.entradas).toEqual([]);
    await editar.ejecutar(operador, { fondoId: fondo.id, topePorComprobante: '250.00', motivo: 'Más gasto' });

    expect(repo.fondos.get(fondo.id)).toMatchObject({ nombre: 'Caja nueva', topeCentavos: 25_000 });
    expect(auditoria.entradas).toMatchObject([{ accion: 'corregir', motivo: 'Más gasto', registroId: fondo.id }]);
  });
});
