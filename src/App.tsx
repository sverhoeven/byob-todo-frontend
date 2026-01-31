import createClient from 'openapi-fetch';
import type { Component } from 'solid-js';
import {
  createResource,
  createSignal,
  ErrorBoundary,
  For,
  Show,
} from 'solid-js';

import type { paths } from './api';

const BackendForm: Component = () => {
  return (
    <div>
      <h2>Please specify backend URL</h2>
      <form method="get">
        <label for="backend">Backend URL:</label>
        <input
          type="text"
          id="backend"
          name="backend"
          value="http://localhost:8000"
          required
        />
        <input type="submit" value="Submit" />
      </form>
      <p>Backend instuctions</p>
      <ol>
        <li>
          Make sure you have{' '}
          <a
            href="https://docs.astral.sh/uv/"
            target="_blank"
            rel="noopener noreferrer"
          >
            uv
          </a>{' '}
          installed
        </li>
        <li>
          You can download backend script from{' '}
          <a
            href="https://github.com/sverhoeven/byod-todo-backend/blob/main/byod-todo-backend.py"
            target="_blank"
            rel="noopener noreferrer"
          >
            here
          </a>
        </li>
        <li>
          Make it executable with <code>chmod +x byod-todo-backend.py</code>
        </li>
        <li>
          You can start the backend with
          <code>./byod-todo-backend.py</code>
        </li>
      </ol>
    </div>
  );
};

type DoneFilter = 'all' | 'done' | 'notdone';

const TodoApp: Component<{ backend: string }> = (props) => {
  const client = createClient<paths>({ baseUrl: props.backend });
  const [newTitle, setTitle] = createSignal('');
  const [filter, setFilter] = createSignal<DoneFilter>('all');
  const [data, { refetch }] = createResource(filter, async (filterValue) => {
    let done: boolean | undefined;
    if (filterValue === 'done') {
      done = true;
    } else if (filterValue === 'notdone') {
      done = false;
    }
    const { data, error } = await client.GET('/', {
      params: {
        query: {
          done,
        },
      },
    });
    if (error) {
      throw error;
    }
    return data;
  });
  const addTodo = async (e: SubmitEvent) => {
    e.preventDefault();
    const { error } = await client.POST('/', {
      body: {
        title: newTitle(),
        done: false,
      },
    });
    if (error) {
      throw error;
    }
    refetch();
    setTitle('');
  };
  const toggleTodo = async (title: string, done: boolean) => {
    const { error } = await client.PUT('/{title}', {
      params: {
        path: { title },
        query: {
          done,
        },
      },
    });
    if (error) {
      throw error;
    }
    refetch();
  };
  const deleteTodo = async (title: string) => {
    const { error } = await client.DELETE('/{title}', {
      params: {
        path: { title },
      },
    });
    if (error) {
      throw error;
    }
    refetch();
  };

  return (
    <div>
      <ErrorBoundary fallback={<div>Error loading data</div>}>
        <h3>Todo App</h3>
        <fieldset style={{ border: 'none', padding: '0' }}>
          <legend>Filter</legend>
          <label>
            <input
              type="radio"
              name="filter"
              value="all"
              checked={filter() === 'all'}
              onChange={(e) => setFilter(e.currentTarget.value as DoneFilter)}
            />
            <span>All</span>
          </label>
          <label>
            <input
              type="radio"
              name="filter"
              value="done"
              checked={filter() === 'done'}
              onChange={(e) => setFilter(e.currentTarget.value as DoneFilter)}
            />
            <span>Done</span>
          </label>
          <label>
            <input
              type="radio"
              name="filter"
              value="notdone"
              checked={filter() === 'notdone'}
              onChange={(e) => setFilter(e.currentTarget.value as DoneFilter)}
            />
            <span>Not Done</span>
          </label>
        </fieldset>
        <div style={{ 'margin-top': '1rem', 'margin-bottom': '1rem' }}>
          <For each={data()} fallback={<div>Loading...</div>}>
            {(todo) => (
              <div>
                <div
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.25rem',
                    'padding-top': '0.5rem',
                  }}
                >
                  <label style={{ width: '40rem' }}>
                    <input
                      type="checkbox"
                      checked={todo.done}
                      onChange={(e) =>
                        toggleTodo(todo.title, e.currentTarget.checked)
                      }
                    />
                    {todo.title}
                  </label>
                  <button
                    type="button"
                    onClick={() => deleteTodo(todo.title)}
                    title="Delete todo"
                  >
                    X
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
        <form onSubmit={addTodo}>
          <input
            placeholder="enter todo and click +"
            required
            value={newTitle()}
            onInput={(e) => setTitle(e.currentTarget.value)}
          />{' '}
          <button title="Add todo" type="submit">
            +
          </button>
        </form>
      </ErrorBoundary>
    </div>
  );
};

const App: Component = () => {
  const backend = new URLSearchParams(location.search).get('backend');
  return (
    <Show when={backend !== null} fallback={<BackendForm />}>
      <TodoApp backend={backend!} />
    </Show>
  );
};

export default App;
