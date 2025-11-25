import { Component, createSignal, For } from 'solid-js';
import Dashboard from './components/Dashboard';
import Drivers from './components/Drivers';
import Orders from './components/Orders';
import Zones from './components/Zones';
import Shifts from './components/Shifts';
import Alerts from './components/Alerts';

type Page = 'dashboard' | 'drivers' | 'orders' | 'zones' | 'shifts' | 'alerts';

const App: Component = () => {
  const [currentPage, setCurrentPage] = createSignal<Page>('dashboard');

  const navItems: { id: Page; label: string }[] = [
    { id: 'dashboard', label: 'Панель управления' },
    { id: 'drivers', label: 'Водители' },
    { id: 'orders', label: 'Заказы' },
    { id: 'zones', label: 'Зоны' },
    { id: 'shifts', label: 'Смены' },
    { id: 'alerts', label: 'Алерты' },
  ];

  return (
    <div style={{ display: 'flex', 'min-height': '100vh' }}>
      <nav style={{ width: '250px', background: '#1e293b', color: 'white', padding: '1.5rem' }}>
        <h1 style={{ margin: '0 0 2rem 0', 'font-size': '1.5rem', 'font-weight': '600' }}>
          Логистика
        </h1>
        <ul style={{ 'list-style': 'none', padding: '0', margin: '0' }}>
          <For each={navItems}>
            {(item) => (
              <li>
                <button
                  onClick={() => setCurrentPage(item.id)}
                  style={{
                    width: '100%',
                    'text-align': 'left',
                    padding: '0.75rem 1rem',
                    margin: '0.25rem 0',
                    border: 'none',
                    background: currentPage() === item.id ? '#3b82f6' : 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    'border-radius': '0.5rem',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e: MouseEvent) => {
                    if (currentPage() !== item.id) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#334155';
                    }
                  }}
                  onMouseOut={(e: MouseEvent) => {
                    if (currentPage() !== item.id) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }
                  }}
                >
                  {item.label}
                </button>
              </li>
            )}
          </For>
        </ul>
      </nav>

      <main class="page" style={{ flex: '1' }}>
        {currentPage() === 'dashboard' && <Dashboard />}
        {currentPage() === 'drivers' && <Drivers />}
        {currentPage() === 'orders' && <Orders />}
        {currentPage() === 'zones' && <Zones />}
        {currentPage() === 'shifts' && <Shifts />}
        {currentPage() === 'alerts' && <Alerts />}
      </main>
    </div>
  );
};

export default App;

