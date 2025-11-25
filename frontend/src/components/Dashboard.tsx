import { Component, Show, createResource, For } from 'solid-js';
import { getDashboardMetrics, getOrdersTimeline, getDriverPerformance } from '../lib/api';

const Dashboard: Component = () => {
  const [metrics] = createResource(getDashboardMetrics);
  const [ordersTimeline] = createResource(() => getOrdersTimeline(7));
  const [driverPerf] = createResource(getDriverPerformance);

  return (
    <div>
      <header class="header">
        <div>
          <h1>Панель управления</h1>
          <p>Обзор всех показателей системы</p>
        </div>
      </header>

      <Show when={!metrics.loading && metrics()} fallback={<p>Загрузка метрик...</p>}>
        {(m) => (
          <>
            <section class="metrics-card card">
              <h2>Водители</h2>
              <div class="metrics-grid">
                <div class="metric">
                  <span>Всего</span>
                  <strong>{m().drivers.total}</strong>
                </div>
                <div class="metric">
                  <span>Активных</span>
                  <strong>{m().drivers.active}</strong>
                </div>
                <div class="metric">
                  <span>На смене</span>
                  <strong>{m().drivers.onShift}</strong>
                </div>
                <div class="metric">
                  <span>Неактивных</span>
                  <strong>{m().drivers.inactive}</strong>
                </div>
              </div>
            </section>

            <section class="metrics-card card">
              <h2>Заказы</h2>
              <div class="metrics-grid">
                <div class="metric">
                  <span>Всего</span>
                  <strong>{m().orders.total}</strong>
                </div>
                <div class="metric">
                  <span>В ожидании</span>
                  <strong>{m().orders.pending}</strong>
                </div>
                <div class="metric">
                  <span>В процессе</span>
                  <strong>{m().orders.inProgress}</strong>
                </div>
                <div class="metric">
                  <span>Завершено</span>
                  <strong>{m().orders.completed}</strong>
                </div>
                <div class="metric">
                  <span>Отменено</span>
                  <strong>{m().orders.cancelled}</strong>
                </div>
              </div>
            </section>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
              <section class="card">
                <h2>Смены</h2>
                <div class="metrics-grid">
                  <div class="metric">
                    <span>Активные</span>
                    <strong>{m().shifts.active}</strong>
                  </div>
                  <div class="metric">
                    <span>Сегодня</span>
                    <strong>{m().shifts.totalToday}</strong>
                  </div>
                </div>
              </section>

              <section class="card">
                <h2>Маршруты</h2>
                <div class="metrics-grid">
                  <div class="metric">
                    <span>Активные</span>
                    <strong>{m().routes.active}</strong>
                  </div>
                  <div class="metric">
                    <span>Завершено</span>
                    <strong>{m().routes.completed}</strong>
                  </div>
                </div>
              </section>

              <section class="card">
                <h2>Зоны</h2>
                <div class="metrics-grid">
                  <div class="metric">
                    <span>Всего</span>
                    <strong>{m().zones.total}</strong>
                  </div>
                  <div class="metric">
                    <span>С водителями</span>
                    <strong>{m().zones.withDrivers}</strong>
                  </div>
                </div>
              </section>

              <section class="card">
                <h2>Алерты</h2>
                <div class="metrics-grid">
                  <div class="metric">
                    <span>Не решено</span>
                    <strong style="color: #ef4444;">{m().alerts.unresolved}</strong>
                  </div>
                  <div class="metric">
                    <span>Всего</span>
                    <strong>{m().alerts.total}</strong>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </Show>

      <Show when={ordersTimeline()}>
        <section class="card">
          <h2>Статистика заказов за 7 дней</h2>
          <div class="metrics-grid">
            <For each={ordersTimeline()}>
              {(item) => (
                <div class="metric">
                  <span>{item.status}</span>
                  <strong>{item.count}</strong>
                </div>
              )}
            </For>
          </div>
        </section>
      </Show>

      <Show when={driverPerf()}>
        <section class="card">
          <h2>Производительность водителей (топ 10)</h2>
          <div class="table">
            <div class="table-header">
              <span>Водитель</span>
              <span>Смены</span>
              <span>Заказы</span>
              <span>Дистанция (км)</span>
            </div>
            <For each={driverPerf()}>
              {(perf) => (
                <div class="table-row">
                  <span>{perf.name}</span>
                  <span>{perf.shiftsCompleted}</span>
                  <span>{perf.ordersCompleted}</span>
                  <span>{perf.totalDistance?.toFixed(1) ?? 0}</span>
                </div>
              )}
            </For>
          </div>
        </section>
      </Show>
    </div>
  );
};

export default Dashboard;
