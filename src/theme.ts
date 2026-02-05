import { createTheme } from '@mui/material/styles';

const BASE_FONT_SIZE = 14;

export function getTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#90caf9' : '#1976d2',
      },
      secondary: {
        main: isDark ? '#a5d6a7' : '#2e7d32',
      },
      background: {
        default: isDark ? '#121212' : '#f5f5f5',
        paper: isDark ? '#1e1e1e' : '#ffffff',
      },
      text: {
        primary: isDark ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)',
        secondary: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
        disabled: isDark ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.38)',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      action: {
        active: isDark ? 'rgba(255, 255, 255, 0.56)' : 'rgba(0, 0, 0, 0.54)',
        hover: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        selected: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
        disabled: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
        disabledBackground: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: BASE_FONT_SIZE,
      htmlFontSize: BASE_FONT_SIZE,
      h1: { fontSize: '1.75rem' },
      h2: { fontSize: '1.5rem' },
      h3: { fontSize: '1.35rem' },
      h4: { fontSize: '1.2rem' },
      h5: { fontSize: '1.1rem' },
      h6: { fontSize: '1rem' },
      subtitle1: { fontSize: '0.95rem' },
      subtitle2: { fontSize: '0.875rem' },
      body1: { fontSize: '0.875rem' },
      body2: { fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem' },
      button: { fontSize: '0.8125rem' },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { fontSize: BASE_FONT_SIZE },
          body: { fontSize: '0.875rem' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            borderRadius: 0,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.24)'
              : '0 4px 24px rgba(0,0,0,0.06)',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none',
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.2)'
              : '0 4px 24px rgba(0,0,0,0.06)',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            borderCollapse: 'separate',
            borderSpacing: 0,
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            overflow: 'hidden',
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.06)',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:last-child td': { borderBottom: 0 },
            '&:hover td': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            color: isDark ? 'rgba(255, 255, 255, 0.87)' : undefined,
            padding: '12px 16px',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            '& .MuiTableCell-root': {
              color: 'inherit',
              fontWeight: 600,
              padding: '12px 16px',
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
            },
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: {
            borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            padding: '8px 16px',
          },
          toolbar: {
            minHeight: 44,
            paddingRight: 0,
          },
          selectLabel: { fontSize: '0.875rem' },
          displayedRows: { fontSize: '0.875rem' },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            '&.MuiOutlinedInput-root': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : undefined,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: {
            borderColor: isDark ? 'rgba(255,255,255,0.23)' : undefined,
          },
          root: {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(255,255,255,0.4)' : undefined,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#90caf9' : undefined,
              borderWidth: isDark ? '2px' : undefined,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            color: 'inherit',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: 'inherit',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: 8,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '10px 16px',
            alignItems: 'center',
            '& .MuiAlert-icon': { alignItems: 'center' },
            '& .MuiAlert-message': { alignSelf: 'center' },
          },
          standardError: {
            border: '1px solid',
            borderColor: isDark ? 'rgba(244, 67, 54, 0.5)' : 'rgba(244, 67, 54, 0.3)',
          },
          standardSuccess: {
            border: '1px solid',
            borderColor: isDark ? 'rgba(76, 175, 80, 0.5)' : 'rgba(76, 175, 80, 0.3)',
          },
          standardWarning: {
            border: '1px solid',
            borderColor: isDark ? 'rgba(255, 152, 0, 0.5)' : 'rgba(255, 152, 0, 0.3)',
          },
          standardInfo: {
            border: '1px solid',
            borderColor: isDark ? 'rgba(33, 150, 243, 0.5)' : 'rgba(33, 150, 243, 0.3)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            color: 'inherit',
          },
        },
      },
    },
  });
}

export const theme = getTheme('light');
