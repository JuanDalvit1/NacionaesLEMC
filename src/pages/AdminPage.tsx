import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Tabs, Tab, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AdminFontes from './admin/AdminFontes';
import AdminSync from './admin/AdminSync';

type AdminView = 'fontes' | 'sync';

export default function AdminPage() {
  const [view, setView] = useState<AdminView>('fontes');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Tabs
          value={view}
          onChange={(_, v) => setView(v as AdminView)}
          sx={{
            width: { xs: '100%', sm: 'auto' },
            minHeight: 44,
            '& .MuiTab-root': { minHeight: 44 },
          }}
        >
          <Tab label="Fontes" value="fontes" />
          <Tab label="Sincronizar" value="sync" />
        </Tabs>
        <Button
          component={Link}
          to="/dashboard"
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{ color: 'text.secondary', minHeight: { xs: 44, sm: 36 } }}
        >
          Voltar ao app
        </Button>
      </Box>

      <Box sx={{ mt: 0 }}>
        {view === 'fontes' && <AdminFontes />}
        {view === 'sync' && <AdminSync />}
      </Box>
    </Box>
  );
}
