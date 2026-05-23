interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timeout?: number;
}

function createNotificationStore() {
  let notifications = $state<Notification[]>([]);

  function add(type: Notification['type'], title: string, message?: string, timeout = 5000) {
    const id = crypto.randomUUID();
    notifications = [...notifications, { id, type, title, message, timeout }];

    if (timeout > 0) {
      setTimeout(() => remove(id), timeout);
    }
  }

  function remove(id: string) {
    notifications = notifications.filter(n => n.id !== id);
  }

  return {
    get items() { return notifications; },
    success: (title: string, message?: string) => add('success', title, message),
    error: (title: string, message?: string) => add('error', title, message, 8000),
    warning: (title: string, message?: string) => add('warning', title, message),
    info: (title: string, message?: string) => add('info', title, message),
    remove
  };
}

export const notifications = createNotificationStore();
