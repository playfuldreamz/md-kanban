import { useBoard } from './hooks/useBoard';
import BoardShell from './components/BoardShell';

export default function App() {
  const board = useBoard();
  return <BoardShell {...board} />;
}
