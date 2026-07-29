import { useState, useEffect } from 'react';
import { useBoard } from './hooks/useBoard';
import BoardShell from './components/BoardShell';
import ConvertDialog from './components/ConvertDialog';

export default function App() {
  const board = useBoard();
  const [showConvert, setShowConvert] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (board.needsConversion && !dismissed) {
      setShowConvert(true);
    }
  }, [board.needsConversion, dismissed]);

  return (
    <>
      <BoardShell {...board} addColumn={board.addColumn!} deleteColumn={board.deleteColumn!} />
      <ConvertDialog
        open={showConvert}
        columnNames={board.board.columns.map(c => c.name)}
        onConfirm={() => {
          board.convertBoard();
          setShowConvert(false);
        }}
        onDismiss={() => {
          setShowConvert(false);
          setDismissed(true);
        }}
      />
    </>
  );
}
