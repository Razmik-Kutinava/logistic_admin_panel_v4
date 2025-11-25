import { Component, Show, createResource, createSignal, For } from 'solid-js';
import { getZones, createZone, deleteZone, CreateZonePayload } from '../lib/api';

const Zones: Component = () => {
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [form, setForm] = createSignal<CreateZonePayload>({
    name: '',
    color: '#3b82f6',
    description: '',
    streets: [],
  });

  const [zones, { refetch }] = createResource(getZones);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    try {
      await createZone(form());
      setIsFormOpen(false);
      setForm({
        name: '',
        color: '#3b82f6',
        description: '',
        streets: [],
      });
      refetch();
    } catch (err) {
      alert('Ошибка создания зоны');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить зону?')) {
      await deleteZone(id);
      refetch();
    }
  };

  return (
    <div>
      <header class="header">
        <div>
          <h1>Зоны</h1>
          <p>Управление зонами доставки</p>
        </div>
        <button class="primary" onClick={() => setIsFormOpen(true)}>
          + Создать зону
        </button>
      </header>

      <section class="card">
        <Show when={!zones.loading} fallback={<p>Загрузка...</p>}>
          <Show when={zones()?.length} fallback={<p>Нет зон</p>}>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
              <For each={zones()}>
                {(zone) => (
                  <div class="card" style={`border-left: 4px solid ${zone.color || '#3b82f6'}`}>
                    <h3>{zone.name}</h3>
                    <p>{zone.description || 'Нет описания'}</p>
                    <div class="metrics-grid">
                      <div class="metric">
                        <span>Водителей</span>
                        <strong>{zone._count?.assignments || 0}</strong>
                      </div>
                      <div class="metric">
                        <span>Заказов</span>
                        <strong>{zone._count?.orders || 0}</strong>
                      </div>
                      <div class="metric">
                        <span>Улиц</span>
                        <strong>{zone.streets?.length || 0}</strong>
                      </div>
                    </div>
                    <button class="danger" style="margin-top: 1rem; width: 100%;" onClick={() => handleDelete(zone.id)}>
                      Удалить
                    </button>
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
          <h2>Новая зона</h2>
          <form class="form" onSubmit={handleSubmit}>
            <label>
              Название
              <input
                type="text"
                required
                value={form().name}
                onInput={(e) => setForm({ ...form(), name: e.currentTarget.value })}
              />
            </label>
            <label>
              Цвет
              <input
                type="color"
                value={form().color}
                onInput={(e) => setForm({ ...form(), color: e.currentTarget.value })}
              />
            </label>
            <label>
              Описание
              <textarea
                rows={3}
                value={form().description}
                onInput={(e) => setForm({ ...form(), description: e.currentTarget.value })}
              />
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

export default Zones;
