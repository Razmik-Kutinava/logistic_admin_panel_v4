import { Component, For, Show, createResource, createSignal } from 'solid-js';
import {
  Driver,
  DriverStatus,
  createDriver,
  deleteDriver,
  getDrivers,
} from './lib/api';

const STATUSES: { label: string; value: DriverStatus }[] = [
  { label: 'Активный', value: 'active' },
  { label: 'Неактивный', value: 'inactive' },
  { label: 'В рейсе', value: 'on_shift' },
];

const App: Component = () => {
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [form, setForm] = createSignal({
    name: '',
    phone: '',
    email: '',
    status: 'active' as DriverStatus,
  });
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [message, setMessage] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [deleteError, setDeleteError] = createSignal<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = createSignal<string | null>(null);

  const [drivers, { refetch }] = createResource(getDrivers);

  const resetForm = () =>
    setForm({
      name: '',
      phone: '',
      email: '',
      status: 'active',
    });

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
      await refetch();
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
                          await refetch();
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

