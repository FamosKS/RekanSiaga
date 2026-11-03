import { Alert } from './Alert'
import { Button } from './Button'
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <Alert tone="danger"><p>{message}</p>{onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Coba kembali</Button>}</Alert>
}
