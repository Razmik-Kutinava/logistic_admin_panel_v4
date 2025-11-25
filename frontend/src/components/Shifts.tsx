import { Component, Show, createResource, createSignal, For } from 'solid-js';
import { getShifts, createShift, endShift, getDrivers } from '../lib/api';

const Shifts: Component = () => {
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [driverId, setDriverId] = createSignal('');

  const [shifts, { refetch }] = createResource(() => getShifts());
  const [drivers] = createResource(getDrivers);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    try {
      await createShift(driverId());
      setIsFormOpen(false);
      setDriverId('');
      refetch();
    } catch (err) {
      alert('Ошибка создания смены: ' + (err as Error).message);
    }
  };

  const handleEndShift = async (id: string) => {
    const distance = prompt('Пройдено километров:');
    const orders = prompt('Завершено заказов:');
    try {
      await endShift(id, {
        distanceKm: distance ? parseFloat(distance) : undefined,
        ordersCompleted: orders ? parseInt(orders) : undefined,
      });
      refetch();
    } catch (err) {
      alert('Ошибка завершения смены');
    }
  };

  return (
    <div>
      <header class="header">
        <div>
          <h1>Смены</h1>
          <p>Управление сменами водителей</p>
        </div>
        <button class="primary" onClick={() => setIsFormOpen(true)}>
          + Начать смену
        </button>
      </header>

      <section class="card">
        <Show when={!shifts.loading} fallback={<p>Загрузка...</p>}>
          <Show when={shifts()?.length} fallback={<p>Нет смен</p>}>
            <div class="table">
              <div class="table-header">
                <span>Водитель</span>
                <span>Начало</span>
                <span>Конец</span>
                <span>Статус</span>
                <span>Заказы</span>
                <span>Дистанция (км)</span>
                <span></span>
              </div>
              <For each={shifts()}>
                {(shift) => (
                  <div class="table-row">
                    <span>
                      {shift.driver?.name || shift.driverId.slice(0, 8)}
                      <br />
                      <small>{shift.driver?.phone}</small>
                    </span>
                    <span>
                      <small>{new Date(shift.startTime).toLocaleString()}</small>
                    </span>
                    <span>
                      <small>{shift.endTime ? new Date(shift.endTime).toLocaleString() : '—'}</small>
                    </span>
                    <span class={`badge badge-${shift.status}`}>{shift.status}</span>
                    <span>{shift.ordersCompleted}</span>
                    <span>{shift.distanceKm?.toFixed(1) || 0}</span>
                    <span>
                      <Show when={shift.status === 'active'}>
                        <button class="danger" onClick={() => handleEndShift(shift.id)}>
                          Завершить
                        </button>
                      </Show>
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </section>

      <Show when={isFormOpen()}>
        <div class="modal-backdrop" onClick={() => setIsFormOpen(false)} />
        <div class="modal">
          <h2>Начать смену</h2>
          <form class="form" onSubmit={handleSubmit}>
            <label>
              Водитель
              <select required value={driverId()} onChange={(e) => setDriverId(e.currentTarget.value)}>
                <option value="">Выберите водителя</option>
                <For each={drivers()}>
                  {(driver) => <option value={driver.id}>{driver.name} ({driver.phone})</option>}
                </For>
              </select>
            </label>
            <div class="form-actions">
              <button type="button" class="secondary" onClick={() => setIsFormOpen(false)}>
                Отмена
              </button>
              <button class="primary" type="submit">
                Начать
              </button>
            </div>
          </form>
        </div>
      </Show>
    </div>
  );
};

export default Shifts;
