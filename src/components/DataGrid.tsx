import { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DataGridVirtual from './DataGridVirtual';

export interface DataGridColumn {
  id: string;
  header: string;
}

interface DataGridProps {
  data: Record<string, unknown>[];
  columns?: DataGridColumn[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (colId: string) => void;
  onColumnReorder?: (columnIds: string[]) => void;
  /** Ativa virtual scrolling (recomendado para 500+ linhas). */
  virtualScroll?: boolean;
  /** Ativa paginação com o tamanho especificado (ex.: 100). */
  pageSize?: number;
}

export default function DataGrid({
  data,
  columns: columnsProp,
  sortBy,
  sortOrder,
  onSort,
  onColumnReorder,
  virtualScroll = false,
  pageSize,
}: DataGridProps) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize || 100);
  const rowsPerPageOptions = isXs ? [25, 50, 100] : [50, 100, 200, 500];

  if (!data.length) {
    return (
      <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper', color: 'text.primary' }}>
        <Typography color="text.secondary" variant="body2">
          Nenhum registro encontrado.
        </Typography>
      </Paper>
    );
  }

  const keys = columnsProp
    ? columnsProp.map((c) => c.id)
    : Object.keys(data[0] as object).filter(
        (k) => !['created_at', 'updated_at', 'source_row_hash', 'row_hash', 'row_data'].includes(k)
      );

  const canReorder = !!onColumnReorder && !!columnsProp && columnsProp.length > 1;

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDragging(colId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (dragging !== colId) setDragOver(colId);
  };

  const handleDragLeave = () => setDragOver(null);

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOver(null);
    setDragging(null);
    const fromId = e.dataTransfer.getData('text/plain');
    if (!fromId || fromId === targetId || !columnsProp || !onColumnReorder) return;
    const ids = columnsProp.map((c) => c.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...ids];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, fromId);
    onColumnReorder(next);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  const formatCell = (_key: string, v: unknown): React.ReactNode => {
    if (v == null || v === '') return '-';
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
      return new Date(v).toLocaleDateString('pt-BR');
    }
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  if (virtualScroll) {
    return (
      <DataGridVirtual
        data={data}
        keys={keys}
        columns={columnsProp}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={onSort}
        onColumnReorder={onColumnReorder}
        formatCell={formatCell}
        canReorder={canReorder}
        dragOver={dragOver}
        dragging={dragging}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      />
    );
  }

  // Paginação: se pageSize for definido, pagina; senão mostra tudo
  const usePagination = !!pageSize && data.length > rowsPerPage;
  const paginatedData = usePagination
    ? data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : data;

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box
      sx={(theme) => ({
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: theme.palette.divider,
        boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.06)',
        bgcolor: theme.palette.background.paper,
      })}
    >
      <TableContainer
        sx={{
          overflowX: 'auto',
          border: 'none',
          boxShadow: 'none',
          borderRadius: 0,
        }}
      >
      <Table size="small" stickyHeader sx={{ minWidth: 600, fontSize: '0.8125rem' }}>
        <TableHead>
          <TableRow>
            {keys.map((key) => {
              const header =
                columnsProp?.find((c) => c.id === key)?.header ??
                key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              const isSorted = sortBy === key;
              const isDraggingOver = dragOver === key;
              return (
                <TableCell
                  key={key}
                  component="th"
                  sx={(theme) => ({
                    fontSize: '0.75rem',
                    py: 1,
                    px: 1.5,
                    cursor: onSort ? 'pointer' : 'default',
                    userSelect: 'none',
                    borderLeft: isDraggingOver ? 2 : 0,
                    borderColor: 'primary.main',
                    opacity: dragging === key ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    '&:hover': onSort
                      ? { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }
                      : {},
                  })}
                  draggable={canReorder}
                  onDragStart={(e) => canReorder && handleDragStart(e, key)}
                  onDragOver={(e) => canReorder && handleDragOver(e, key)}
                  onDragLeave={canReorder ? handleDragLeave : undefined}
                  onDrop={(e) => canReorder && handleDrop(e, key)}
                  onDragEnd={canReorder ? handleDragEnd : undefined}
                  onClick={() => onSort?.(key)}
                >
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      minWidth: 0,
                      width: '100%',
                    }}
                  >
                    {canReorder && (
                      <DragIndicatorIcon
                        sx={{ fontSize: 14, color: 'action.disabled', cursor: 'grab', flexShrink: 0 }}
                      />
                    )}
                    <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {header}
                    </Box>
                    {isSorted &&
                      (sortOrder === 'asc' ? (
                        <ArrowUpwardIcon sx={{ fontSize: 12, color: 'primary.main', flexShrink: 0 }} />
                      ) : (
                        <ArrowDownwardIcon sx={{ fontSize: 12, color: 'primary.main', flexShrink: 0 }} />
                      ))}
                  </Box>
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedData.map((row, i) => (
            <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
              {keys.map((key) => (
                <TableCell
                  key={key}
                  sx={{
                    py: 1,
                    px: 1.5,
                    fontSize: '0.8125rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 220,
                  }}
                  title={String(formatCell(key, row[key]))}
                >
                  {formatCell(key, row[key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </TableContainer>
      {usePagination && (
        <TablePagination
          component="div"
          count={data.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      )}
    </Box>
  );
}
