import { useEffect, useMemo, useState } from 'react'
import './App.css'

type User = {
  id: number
  name: string
  username: string
}

type Task = {
  id: number
  userId: number
  title: string
  completed: boolean
}

const API_URL = 'https://jsonplaceholder.typicode.com'

function App() {
  const [users, setUsers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingError, setLoadingError] = useState('')
  const [notice, setNotice] = useState('')
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(() => new Set())

  useEffect(() => {
    const controller = new AbortController()

    async function loadData() {
      try {
        const [usersResponse, tasksResponse] = await Promise.all([
          fetch(`${API_URL}/users`, { signal: controller.signal }),
          fetch(`${API_URL}/todos`, { signal: controller.signal }),
        ])

        if (!usersResponse.ok || !tasksResponse.ok) {
          throw new Error('Não foi possível carregar os dados da API.')
        }

        const [usersData, tasksData] = await Promise.all([
          usersResponse.json() as Promise<User[]>,
          tasksResponse.json() as Promise<Task[]>,
        ])

        setUsers(usersData)
        setTasks(tasksData)
        setSelectedUserId(usersData[0]?.id ?? null)
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          setLoadingError('Não foi possível carregar as tarefas. Verifique sua conexão e tente novamente.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadData()
    return () => controller.abort()
  }, [])

  const selectedUser = users.find((user) => user.id === selectedUserId)
  const userTasks = useMemo(
    () => tasks.filter((task) => task.userId === selectedUserId),
    [tasks, selectedUserId],
  )
  const completedCount = userTasks.filter((task) => task.completed).length
  const progress = userTasks.length ? Math.round((completedCount / userTasks.length) * 100) : 0

  async function toggleTask(task: Task) {
    setNotice('')
    setPendingTaskIds((current) => new Set(current).add(task.id))
    try {
      const response = await fetch(`${API_URL}/todos/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ completed: !task.completed }),
      })
      if (!response.ok) throw new Error('Falha ao atualizar tarefa')
      setTasks((current) => current.map((item) =>
        item.id === task.id ? { ...item, completed: !task.completed } : item,
      ))
      setNotice(task.completed ? 'Tarefa reaberta.' : 'Tarefa concluída. Muito bem!')
    } catch {
      setNotice('Não foi possível atualizar a tarefa. Tente novamente.')
    } finally {
      setPendingTaskIds((current) => {
        const next = new Set(current)
        next.delete(task.id)
        return next
      })
    }
  }

  async function deleteTask(task: Task) {
    setNotice('')
    setPendingTaskIds((current) => new Set(current).add(task.id))
    try {
      const response = await fetch(`${API_URL}/todos/${task.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Falha ao excluir tarefa')
      setTasks((current) => current.filter((item) => item.id !== task.id))
      setNotice('Tarefa excluída com sucesso.')
    } catch {
      setNotice('Não foi possível excluir a tarefa. Tente novamente.')
    } finally {
      setPendingTaskIds((current) => {
        const next = new Set(current)
        next.delete(task.id)
        return next
      })
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Tarefas, início">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><path d="m6.5 12.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 12a8 8 0 1 1-4.7-7.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </span>
          <span className="brand-name">tarefas<span>.</span></span>
        </a>
        <div className="topbar-meta"><span className="live-dot" /> API conectada <span className="meta-divider" /> JSONPlaceholder</div>
      </header>

      <section className="dashboard" id="inicio">
        <div className="page-heading">
          <div>
            <p className="eyebrow">SEU ESPAÇO DE PRODUTIVIDADE</p>
            <h1>Lista de tarefas</h1>
            <p className="page-description">Acompanhe e organize as tarefas de cada usuário.</p>
          </div>
          <div className="summary-pill"><span className="summary-icon">✓</span>{tasks.length} tarefas no total</div>
        </div>

        {loadingError && (
          <div className="error-panel" role="alert">
            <span>{loadingError}</span>
            <button onClick={() => window.location.reload()}>Tentar novamente</button>
          </div>
        )}

        {!loadingError && (
          <>
            <div className="user-tabs-wrap">
              <div className="section-label"><span>USUÁRIOS</span><span className="user-count">{users.length}</span></div>
              <div className="user-tabs" role="tablist" aria-label="Tarefas por usuário">
                {isLoading
                  ? Array.from({ length: 5 }, (_, index) => <span className="tab-skeleton" key={index} />)
                  : users.map((user, index) => {
                    const count = tasks.filter((task) => task.userId === user.id).length
                    return (
                      <button
                        className={`user-tab ${selectedUserId === user.id ? 'active' : ''}`}
                        id={`tab-user-${user.id}`}
                        key={user.id}
                        type="button"
                        role="tab"
                        aria-selected={selectedUserId === user.id}
                        aria-controls="task-panel"
                        onClick={() => { setSelectedUserId(user.id); setNotice('') }}
                      >
                        <span className={`avatar avatar-${(index % 5) + 1}`}>{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                        <span className="tab-name">{user.name.split(' ')[0]}</span>
                        <span className="tab-count">{count}</span>
                      </button>
                    )
                  })}
              </div>
            </div>

            <section className="task-panel" id="task-panel" role="tabpanel" aria-labelledby={selectedUserId ? `tab-user-${selectedUserId}` : undefined}>
              <div className="panel-header">
                <div className="user-heading">
                  <span className={`avatar avatar-large avatar-${selectedUser ? ((selectedUser.id - 1) % 5) + 1 : 1}`}>
                    {selectedUser ? selectedUser.name.split(' ').map((part) => part[0]).slice(0, 2).join('') : '…'}
                  </span>
                  <div>
                    <h2>{isLoading ? 'Carregando...' : selectedUser?.name ?? 'Nenhum usuário'}</h2>
                    <p>{selectedUser ? `@${selectedUser.username}` : 'Tarefas do usuário'}</p>
                  </div>
                </div>
                {!isLoading && selectedUser && (
                  <div className="progress-summary">
                    <div className="progress-copy"><span>Progresso</span><strong>{progress}%</strong></div>
                    <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                  </div>
                )}
              </div>

              <div className="task-list-heading">
                <div><h3>Tarefas</h3><span className="task-total">{isLoading ? '—' : userTasks.length}</span></div>
                {!isLoading && <span className="completed-label">{completedCount} concluídas</span>}
              </div>

              {notice && <p className="notice" role="status">{notice}</p>}

              {isLoading ? (
                <div className="task-list" aria-label="Carregando tarefas">
                  {Array.from({ length: 5 }, (_, index) => <div className="task-skeleton" key={index}><span /><i /><b /></div>)}
                </div>
              ) : userTasks.length ? (
                <ul className="task-list">
                  {userTasks.map((task) => {
                    const isPending = pendingTaskIds.has(task.id)
                    return (
                      <li className={`task-row ${task.completed ? 'is-complete' : ''}`} key={task.id}>
                        <button
                          className="task-check"
                          type="button"
                          role="checkbox"
                          aria-checked={task.completed}
                          aria-label={`${task.completed ? 'Reabrir' : 'Concluir'} tarefa: ${task.title}`}
                          disabled={isPending}
                          onClick={() => void toggleTask(task)}
                        >
                          {task.completed && <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.2 3.2L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </button>
                        <span className="task-title">{task.title}</span>
                        {task.completed && <span className="status-tag">Concluída</span>}
                        <button
                          className="delete-button"
                          type="button"
                          aria-label={`Excluir tarefa: ${task.title}`}
                          title="Excluir tarefa"
                          disabled={isPending}
                          onClick={() => void deleteTask(task)}
                        >
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.5 6h11M8 6V4.5h4V6m2.5 0-.6 9.2a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9L5.5 6m3 3v4m3-4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="empty-state"><span className="empty-icon">✓</span><strong>Tudo em dia!</strong><p>Este usuário não tem tarefas pendentes na lista.</p></div>
              )}
              <footer className="panel-footer"><span>Exibindo tarefas de <strong>{selectedUser?.name ?? '—'}</strong></span><span>Dados fornecidos por JSONPlaceholder</span></footer>
            </section>
          </>
        )}
      </section>
      <footer className="site-footer">Feito para manter tudo em ordem <span>✳</span></footer>
    </main>
  )
}

export default App
