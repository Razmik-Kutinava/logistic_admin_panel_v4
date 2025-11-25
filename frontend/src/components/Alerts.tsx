import { Component, Show, createResource, createSignal, For } from 'solid-js';
import { getAlerts, createAlert, updateAlertStatus, AlertType, AlertStatus } from '../lib/api';

const Alerts: Component = () => {
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [alertType, setAlertType] = createSignal<AlertType>('custom');

  const [alerts, { refetch }] = createResource(() => getAlerts());

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    try {
      await createAlert({ type: alertType(), status: 'pending' });
      setIsFormOpen(false);
      refetch();
    } catch (err) {
      alert('Ошибка создания алерта');
    }
  };

  const handleUpdateStatus = async (id: string, status: AlertStatus) => {
    try {
      await updateAlertStatus(id, status);
      refetch();
    } catch (err) {
      alert('Ошибка обновления статуса');
    }
  };

  return (
    <div>
      <header class="header">
        <div>
          <h1>Алерты</h1>
          <p>Системные оповещения и предупреждения</p>
        </div>
        <button class="primary" onClick={() => setIsFormOpen(true)}>
          + Создать алерт
        </button>
      </header>

      <section class="card">
        <Show when={!alerts.loading} fallback={<p>Загрузка...</p>}>
          <Show when={alerts()?.length} fallback={<p>Нет алертов</p>}>
            <div class="table">
              <div class="table-header">
                <span>Тип</span>
                <span>Статус</span>
                <span>Создан</span>
                <span></span>
              </div>
              <For each={alerts()}>
                {(alert) => (
                  <div class="table-row">
                    <span>{alert.type}</span>
                    <span class={`badge badge-${alert.status}`}>{alert.status}</span>
                    <span>
                      <small>{new Date(alert.createdAt).toLocaleString()}</small>
                    </span>
                    <span style="display: flex; gap: 0.5rem;">
                      <Show when={alert.status === 'pending'}>
                        <button class="secondary" onClick={() => handleUpdateStatus(alert.id, 'acknowledged')}>
                          Принять
                        </button>
                      </Show>
                      <Show when={alert.status !== 'resolved'}>
                        <button class="primary" onClick={() => handleUpdateStatus(alert.id, 'resolved')}>
                          Решить
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
          <h2>Новый алерт</h2>
          <form class="form" onSubmit={handleSubmit}>
            <label>
              Тип
              <select value={alertType()} onChange={(e) => setAlertType(e.currentTarget.value as AlertType)}>
                <option value="custom">Custom</option>
                <option value="driver_late">Driver Late</option>
                <option value="order_delayed">Order Delayed</option>
                <option value="zone_understaffed">Zone Understaffed</option>
                <option value="system_error">System Error</option>
              </select>
            </label>
            <div class="form-actions">
              <button type="button" class="secondary" onClick={() => setIsFormOpen(false)}>
                Отмена
              </button>
              <button class="primary" type="submit">
                Создать
              </button>
            </div>
          </form>
        </div>
      </Show>
    </div>
  );
};

export default Alerts;
