import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from './api';

// Opens the task named in ?task=<id> (from a notification), then tidies the URL
export default function useTaskFromUrl(open) {
  const [params, setParams] = useSearchParams();
  const taskId = params.get('task');
  useEffect(() => {
    if (!taskId) return;
    api(`/tasks/${taskId}`)
      .then(open)
      .catch(() => {}) // deleted or reassigned since the notification was sent
      .finally(() => setParams({}, { replace: true }));
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps
}
