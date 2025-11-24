import { Component, For, Show, createResource, createSignal } from 'solid-js';
import {
  Driver,
  DriverStatus,
  createDriver,
  deleteDriver,
  getDrivers,
  getMetrics,
} from './lib/api';

const STATUSES: { label: string; value: DriverStatus }[] = [
  { label: 'Активный', value: 'active' },
  { label: 'Неактивный', value: 'inactive' },
  { label: 'В рейсе', value: 'on_shift' },
];

const initialFormState = {
  name: '',
  phone: '',
  email: '',
  status: 'active' as DriverStatus,
  licenseNumber: '',
  dateOfBirth: '',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  notificationsEnabled: true,
  autoAcceptOrders: false,
  preferredLanguage: 'ru',
  documentType: '',
  documentNumber: '',
  documentIssuedAt: '',
  documentExpiresAt: '',
  documentFileUrl: '',
  statusReason: '',
};

const App: Component = () => {
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [form, setForm] = createSignal(initialFormState);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [message, setMessage] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [deleteError, setDeleteError] = createSignal<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = createSignal<string | null>(null);

  const [drivers, { refetch }] = createResource(getDrivers);
  const [metrics, { refetch: refetchMetrics }] = createResource(getMetrics);

  const resetForm = () => setForm(initialFormState);

  const handleSubmit = async (evt: Event) => {
    evt.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      await createDriver(form());
      setMessage('Водитель успешно создан');
      setIsFormOpen(false);
      resetForm();
      await Promise.all([refetch(), refetchMetrics()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать водителя');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatus = (status: DriverStatus) => {
    switch (status) {
      case 'active':
        return 'Активный';
      case 'inactive':
        return 'Неактивный';
      case 'on_shift':
        return 'В рейсе';
      default:
        return status;
    }
  };

  return (
    <main class="page">
      <header class="header">
        <div>
          <h1>Водители</h1>
          <p>Управление водителями и создание новых профилей</p>
        </div>
        <button class="primary" onClick={() => setIsFormOpen(true)}>
          + Добавить водителя
        </button>
      </header>

      <section class="metrics-card">
        <h2>Панель доменов</h2>
        <Show when={!metrics.loading} fallback={<p>Загрузка метрик...</p>}>
          <div class="metrics-grid">
            <div class="metric">
              <span>Водители</span>
              <strong>{metrics()?.drivers ?? 0}</strong>
            </div>
            <div class="metric">
              <span>Зоны</span>
              <strong>{metrics()?.zones ?? 0}</strong>
            </div>
            <div class="metric">
              <span>Заказы</span>
              <strong>{metrics()?.orders ?? 0}</strong>
            </div>
            <div class="metric">
              <span>Маршруты</span>
              <strong>{metrics()?.routes ?? 0}</strong>
            </div>
            <div class="metric">
              <span>Смены</span>
              <strong>{metrics()?.shifts ?? 0}</strong>
            </div>
            <div class="metric">
              <span>Устройства</span>
              <strong>{metrics()?.devices ?? 0}</strong>
            </div>
            <div class="metric">
              <span>Документы</span>
              <strong>{metrics()?.documents ?? 0}</strong>
            </div>
            <div class="metric">
              <span>Алерты</span>
              <strong>{metrics()?.alerts ?? 0}</strong>
            </div>
            <div class="metric">
              <span>System Logs</span>
              <strong>{metrics()?.logs.systemLogs ?? 0}</strong>
            </div>
            <div class="metric">
              <span>API Logs</span>
              <strong>{metrics()?.logs.apiLogs ?? 0}</strong>
            </div>
            <div class="metric">
              <span>App Errors</span>
              <strong>{metrics()?.logs.appErrors ?? 0}</strong>
            </div>
          </div>
        </Show>
      </section>

      <section class="card">
        <Show when={!drivers.loading} fallback={<p>Загрузка...</p>}>
          <Show
            when={drivers()?.length}
            fallback={<p>Пока нет водителей. Создайте первого.</p>}
          >
            <div class="table">
              <div class="table-header">
                <span>Имя</span>
                <span>Телефон</span>
                <span>Email</span>
                <span>Статус</span>
                <span />
              </div>
              <For each={drivers() as Driver[]}>
                {(driver) => (
                  <div class="table-row">
                    <span>{driver.name}</span>
                    <span>{driver.phone}</span>
                    <span>{driver.email}</span>
                    <span class={`badge badge-${driver.status}`}>
                      {renderStatus(driver.status)}
                    </span>
                    <button
                      class="danger"
                      disabled={deleteLoadingId() === driver.id}
                      onClick={async () => {
                        setDeleteError(null);
                        setDeleteLoadingId(driver.id);
                        try {
                          await deleteDriver(driver.id);
                          await Promise.all([refetch(), refetchMetrics()]);
                        } catch (err) {
                          setDeleteError(
                            err instanceof Error
                              ? err.message
                              : 'Ошибка при удалении',
                          );
                        } finally {
                          setDeleteLoadingId(null);
                        }
                      }}
                    >
                      {deleteLoadingId() === driver.id ? 'Удаление...' : 'Удалить'}
                    </button>
                  </div>
                )}
              </For>
            </div>
            <Show when={deleteError()}>
              <p class="message error">{deleteError()}</p>
            </Show>
          </Show>
        </Show>
      </section>

      <Show when={isFormOpen()}>
        <div class="modal-backdrop" onClick={() => setIsFormOpen(false)} />
        <div class="modal">
          <h2>Новый водитель</h2>
          <form class="form" onSubmit={handleSubmit}>
            <label>
              Имя
              <input
                type="text"
                required
                value={form().name}
                onInput={(e) => setForm({ ...form(), name: e.currentTarget.value })}
              />
            </label>

            <label>
              Телефон
              <input
                type="tel"
                required
                value={form().phone}
                onInput={(e) => setForm({ ...form(), phone: e.currentTarget.value })}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                required
                value={form().email}
                onInput={(e) => setForm({ ...form(), email: e.currentTarget.value })}
              />
            </label>

            <label>
              Номер лицензии
              <input
                type="text"
                required
                value={form().licenseNumber}
                onInput={(e) =>
                  setForm({ ...form(), licenseNumber: e.currentTarget.value })
                }
              />
            </label>

            <label>
              Дата рождения
              <input
                type="date"
                value={form().dateOfBirth}
                onInput={(e) =>
                  setForm({ ...form(), dateOfBirth: e.currentTarget.value })
                }
              />
            </label>

            <label>
              Адрес
              <textarea
                rows={2}
                value={form().address}
                onInput={(e) =>
                  setForm({ ...form(), address: e.currentTarget.value })
                }
              />
            </label>

            <label>
              Контакт для ЧС
              <div class="inline-inputs">
                <input
                  type="text"
                  placeholder="Имя"
                  value={form().emergencyContactName}
                  onInput={(e) =>
                    setForm({ ...form(), emergencyContactName: e.currentTarget.value })
                  }
                />
                <input
                  type="tel"
                  placeholder="Телефон"
                  value={form().emergencyContactPhone}
                  onInput={(e) =>
                    setForm({
                      ...form(),
                      emergencyContactPhone: e.currentTarget.value,
                    })
                  }
                />
              </div>
            </label>

            <label>
              Статус
              <select
                value={form().status}
                onChange={(e) =>
                  setForm({ ...form(), status: e.currentTarget.value as DriverStatus })
                }
              >
                <For each={STATUSES}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </select>
            </label>

            <label class="checkbox">
              <input
                type="checkbox"
                checked={form().notificationsEnabled}
                onInput={(e) =>
                  setForm({
                    ...form(),
                    notificationsEnabled: e.currentTarget.checked,
                  })
                }
              />
              Уведомления включены
            </label>

            <label class="checkbox">
              <input
                type="checkbox"
                checked={form().autoAcceptOrders}
                onInput={(e) =>
                  setForm({
                    ...form(),
                    autoAcceptOrders: e.currentTarget.checked,
                  })
                }
              />
              Авто принятие заказов
            </label>

            <label>
              Язык интерфейса
              <input
                type="text"
                value={form().preferredLanguage}
                onInput={(e) =>
                  setForm({
                    ...form(),
                    preferredLanguage: e.currentTarget.value,
                  })
                }
              />
            </label>

            <label>
              Тип документа
              <input
                type="text"
                value={form().documentType}
                onInput={(e) =>
                  setForm({ ...form(), documentType: e.currentTarget.value })
                }
              />
            </label>

            <label>
              Номер документа
              <input
                type="text"
                value={form().documentNumber}
                onInput={(e) =>
                  setForm({ ...form(), documentNumber: e.currentTarget.value })
                }
              />
            </label>

            <div class="inline-inputs">
              <label>
                Дата выдачи
                <input
                  type="date"
                  value={form().documentIssuedAt}
                  onInput={(e) =>
                    setForm({ ...form(), documentIssuedAt: e.currentTarget.value })
                  }
                />
              </label>
              <label>
                Дата окончания
                <input
                  type="date"
                  value={form().documentExpiresAt}
                  onInput={(e) =>
                    setForm({ ...form(), documentExpiresAt: e.currentTarget.value })
                  }
                />
              </label>
            </div>

            <label>
              Ссылка на файл
              <input
                type="url"
                value={form().documentFileUrl}
                onInput={(e) =>
                  setForm({ ...form(), documentFileUrl: e.currentTarget.value })
                }
              />
            </label>

            <label>
              Комментарий к статусу
              <input
                type="text"
                value={form().statusReason}
                onInput={(e) =>
                  setForm({ ...form(), statusReason: e.currentTarget.value })
                }
              />
            </label>

            <Show when={message()}>
              <p class="message success">{message()}</p>
            </Show>
            <Show when={error()}>
              <p class="message error">{error()}</p>
            </Show>

            <div class="form-actions">
              <button
                type="button"
                class="secondary"
                onClick={() => {
                  setIsFormOpen(false);
                  setError(null);
                  setMessage(null);
                }}
                disabled={isSubmitting()}
              >
                Отмена
              </button>
              <button class="primary" type="submit" disabled={isSubmitting()}>
                {isSubmitting() ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </Show>
    </main>
  );
};

export default App;

