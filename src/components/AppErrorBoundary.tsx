import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('AppErrorBoundary:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
            bgcolor: '#121212',
            color: '#fff',
          }}
        >
          <Paper sx={{ p: 3, maxWidth: 600, bgcolor: '#1e1e1e' }}>
            <Typography variant="h6" color="error" gutterBottom>
              Erro na aplicação
            </Typography>
            <Typography component="pre" sx={{ fontSize: 12, overflow: 'auto', mb: 2, whiteSpace: 'pre-wrap' }}>
              {this.state.error.message}
            </Typography>
            {this.state.error.stack && (
              <Typography component="pre" sx={{ fontSize: 11, overflow: 'auto', maxHeight: 200, color: 'grey.400' }}>
                {this.state.error.stack}
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={() => this.setState({ hasError: false, error: null })}
              sx={{ mt: 2 }}
            >
              Tentar novamente
            </Button>
          </Paper>
        </Box>
      );
    }
    return this.props.children;
  }
}
