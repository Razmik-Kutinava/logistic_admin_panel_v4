import { Component, Show, createResource, createSignal, For } from 'solid-js';
import { getOrders, createOrder, deleteOrder, assignOrderToDriver, CreateOrderPayload, OrderStatus } from '../lib/api';

const Orders: Component = () => {
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [form, setForm] = createSignal<CreateOrderPayload>({
    externalId: '',
    customerName: '',
    status: 'pending',
    zoneId: '',
  });

  const [orders, { refetch }] = createResource(() => getOrders());

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    try {
      await createOrder(form());
      setIsFormOpen(false);
      setForm({
        externalId: '',
        customerName: '',
        status: 'pending',
        zoneId: '',
      });
      refetch();
    } catch (err) {
      alert('Ошибка создания заказа');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить заказ?')) {
      await deleteOrder(id);
      refetch();
    }
  };

  const handleAssign = async (orderId: string) => {
    const driverId = prompt('Введите ID водителя:');
    if (driverId) {
      try {
        await assignOrderToDriver(orderId, driverId);
        refetch();
      } catch (err) {
        alert('Ошибка назначения водителя');
      }
    }
  };

  return (
    <div>
      <header class="header">
        <div>
          <h1>Заказы</h1>
          <p>Управление заказами и доставкой</p>
        </div>
        <button class="primary" onClick={() => setIsFormOpen(true)}>
          + Создать заказ
        </button>
      </header>

      <section class="card">
        <Show when={!orders.loading} fallback={<p>Загрузка...</p>}>
          <Show when={orders()?.length} fallback={<p>Нет заказов</p>}>
            <div class="table">
              <div class="table-header">
                <span>ID</span>
                <span>Клиент</span>
                <span>Статус</span>
                <span>Точки</span>
                <span>Создан</span>
                <span></span>
              </div>
              <For each={orders()}>
                {(order) => (
                  <div class="table-row">
                    <span>
                      <small>{order.externalId || order.id.slice(0, 8)}</small>
                    </span>
                    <span>{order.customerName || '—'}</span>
                    <span class={`badge badge-${order.status}`}>{order.status}</span>
                    <span>{order.points?.length || 0}</span>
                    <span>
                      <small>{new Date(order.createdAt).toLocaleString()}</small>
                    </span>
                    <span style="display: flex; gap: 0.5rem;">
                      <button class="secondary" onClick={() => handleAssign(order.id)}>
                        Назначить
                      </button>
                      <button class="danger" onClick={() => handleDelete(order.id)}>
                        Удалить
                      </button>
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
          <h2>Новый заказ</h2>
          <form class="form" onSubmit={handleSubmit}>
            <label>
              Внешний ID
              <input
                type="text"
                value={form().externalId}
                onInput={(e) => setForm({ ...form(), externalId: e.currentTarget.value })}
              />
            </label>
            <label>
              Имя клиента
              <input
                type="text"
                value={form().customerName}
                onInput={(e) => setForm({ ...form(), customerName: e.currentTarget.value })}
              />
            </label>
            <label>
              Статус
              <select
                value={form().status}
                onChange={(e) => setForm({ ...form(), status: e.currentTarget.value as OrderStatus })}
              >
                <option value="pending">Ожидание</option>
                <option value="assigned">Назначен</option>
                <option value="in_progress">В процессе</option>
                <option value="completed">Завершен</option>
                <option value="cancelled">Отменен</option>
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

export default Orders;
