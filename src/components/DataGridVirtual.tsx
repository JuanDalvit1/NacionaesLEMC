import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { DataGridColumn } from './DataGrid';

const ROW_HEIGHT = 40;
const VIRTUAL_CONTAINER_HEIGHT = '70vh';

interface DataGridVirtualProps {
  data: Record<string, unknown>[];
  keys: string[];
  columns: DataGridColumn[] | undefined;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (colId: string) => void;
  onColumnReorder?: (columnIds: string[]) => void;
  formatCell: (key: string, v: unknown) => React.ReactNode;
  canReorder: boolean;
  dragOver: string | null;
  dragging: string | null;
  onDragStart: (e: React.DragEvent, colId: string) => void;
  onDragOver: (e: React.DragEvent, colId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: () => void;
}

export default function DataGridVirtual({
  data,
  keys,
  columns: columnsProp,
  sortBy,
  sortOrder,
  onSort,
  onColumnReorder: _onColumnReorder,
  formatCell,
  canReorder,
  dragOver,
  dragging,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: DataGridVirtualProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <Box
      ref={parentRef}
      sx={(theme) => ({
        overflow: 'auto',
        maxHeight: VIRTUAL_CONTAINER_HEIGHT,
        minHeight: 400,
        borderRadius: 2,
        border: '1px solid',
        borderColor: theme.palette.divider,
        boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.06)',
        bgcolor: theme.palette.background.paper,
      })}
    >
      <Table size="small" stickyHeader sx={{ minWidth: 600, fontSize: '0.8125rem', tableLayout: 'fixed' }}>
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
                    width: '1%',
                    '&:hover': onSort
                      ? { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }
                      : {},
                  })}
                  draggable={canReorder}
                  onDragStart={(e) => canReorder && onDragStart(e, key)}
                  onDragOver={(e) => canReorder && onDragOver(e, key)}
                  onDragLeave={canReorder ? onDragLeave : undefined}
                  onDrop={(e) => canReorder && onDrop(e, key)}
                  onDragEnd={canReorder ? onDragEnd : undefined}
                  onClick={() => onSort?.(key)}
                >
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                    {canReorder && (
                      <DragIndicatorIcon sx={{ fontSize: 14, color: 'action.disabled', cursor: 'grab', flexShrink: 0 }} />
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
        <TableBody sx={{ position: 'relative' }}>
          <TableRow>
            {keys.map((key) => (
              <TableCell key={key} sx={{ height: totalSize, padding: 0, border: 0, lineHeight: 0, width: '1%' }} />
            ))}
          </TableRow>
          {virtualItems.map((virtualRow) => {
            const row = data[virtualRow.index] as Record<string, unknown>;
            return (
              <TableRow
                key={virtualRow.key}
                hover
                sx={(theme) => ({
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  width: '100%',
                  boxSizing: 'border-box',
                  margin: 0,
                  '& td': {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    width: '1%',
                  },
                })}
              >
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
                    }}
                    title={String(formatCell(key, row[key]))}
                  >
                    {formatCell(key, row[key])}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
