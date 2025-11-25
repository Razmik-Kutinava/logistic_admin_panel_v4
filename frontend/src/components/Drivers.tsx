import { Component, For, Show, createResource, createSignal } from 'solid-js';
import {
  Driver,
  DriverStatus,
  createDriver,
  deleteDriver,
  getDrivers,
} from '../lib/api';

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

const Drivers: Component = () => {
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [form, setForm] = createSignal(initialFormState);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [message, setMessage] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [deleteError, setDeleteError] = createSignal<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = createSignal<string | null>(null);

  const [drivers, { refetch }] = createResource(getDrivers);

  const resetForm = () => setForm(initialFormState);

  const handleSubmit = async (evt: Event) => {
    evt.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        ...form(),
        phone: form().phone.trim(),
        email: form().email.trim().toLowerCase(),
        dateOfBirth: form().dateOfBirth?.trim() || undefined,
        address: form().address?.trim() || undefined,
        emergencyContactName: form().emergencyContactName?.trim() || undefined,
        emergencyContactPhone: form().emergencyContactPhone?.trim() || undefined,
        documentType: form().documentType?.trim() || undefined,
        documentNumber: form().documentNumber?.trim() || undefined,
        documentIssuedAt: form().documentIssuedAt?.trim() || undefined,
        documentExpiresAt: form().documentExpiresAt?.trim() || undefined,
        documentFileUrl: form().documentFileUrl?.trim() || undefined,
        statusReason: form().statusReason?.trim() || undefined,
      };

      await createDriver(payload);
      setMessage('Водитель успешно создан');
      setIsFormOpen(false);
      resetForm();
      await refetch();
    } catch (err) {
      console.error('Ошибка создания водителя:', err);
      let errorMessage = 'Не удалось создать водителя';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = String(err.message);
      }

      setError(errorMessage);
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
    <div>
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
        <Show
          when={!drivers.loading && !drivers.error}
          fallback={<p>{drivers.loading ? 'Загрузка...' : 'API недоступно'}</p>}
        >
          <Show
            when={drivers()?.length}
            fallback={<p>Пока нет водителей. Создайте первого.</p>}
          >
            <div class="table">
              <div class="table-header">
                <span>Имя</span>
                <span>Контакты</span>
                <span>Лицензия</span>
                <span>Документ</span>
                <span>Статус</span>
                <span />
              </div>
              <For each={drivers() as Driver[]}>
                {(driver) => (
                  <div class="table-row">
                    <span>
                      {driver.name}
                      <br />
                      <small>
                        {driver.driverProfile?.dateOfBirth
                          ? new Date(driver.driverProfile.dateOfBirth).toLocaleDateString()
                          : '—'}
                      </small>
                    </span>
                    <span>
                      {driver.phone}
                      <br />
                      <small>{driver.email}</small>
                      <br />
                      <small>
                        ЧС:{' '}
                        {driver.driverProfile?.emergencyContact?.name
                          ? `${driver.driverProfile?.emergencyContact?.name} (${
                              driver.driverProfile?.emergencyContact?.phone ?? '-'
                            })`
                          : '—'}
                      </small>
                    </span>
                    <span>
                      {driver.driverProfile?.licenseNumber ?? '—'}
                      <br />
                      <small>{driver.driverProfile?.address ?? ''}</small>
                    </span>
                    <span>
                      {driver.driverDocuments?.[0]
                        ? `${driver.driverDocuments[0].documentType} #${
                            driver.driverDocuments[0].documentNumber ?? '-'
                          }`
                        : '—'}
                      <br />
                      <small>
                        истекает:{' '}
                        {driver.driverDocuments?.[0]?.expiresAt
                          ? new Date(
                              driver.driverDocuments[0].expiresAt,
                            ).toLocaleDateString()
                          : '—'}
                      </small>
                    </span>
                    <span class={`badge badge-${driver.status}`}>
                      {renderStatus(driver.status)}
                      <br />
                      <small>
                        {driver.driverStatuses?.[0]?.reason
                          ? driver.driverStatuses[0].reason
                          : ''}
                      </small>
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
            <div class="form-section">
              <h3>Основная информация</h3>
              <div class="form-grid">
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
              </div>
            </div>

            <div class="form-section">
              <h3>Профиль и контакт</h3>
              <div class="form-grid">
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

                <label class="full-width">
                  Адрес
                  <textarea
                    rows={2}
                    value={form().address}
                    onInput={(e) =>
                      setForm({ ...form(), address: e.currentTarget.value })
                    }
                  />
                </label>

                <label class="full-width">
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
              </div>
            </div>

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
    </div>
  );
};

export default Drivers;
