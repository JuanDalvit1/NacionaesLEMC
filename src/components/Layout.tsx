import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Card,
  CardContent,
  Fab,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TableChartIcon from '@mui/icons-material/TableChart';
import PeopleIcon from '@mui/icons-material/People';
import CakeIcon from '@mui/icons-material/Cake';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import logoImg from '../../images/logo.png';
import { useTabelasHeader } from '../contexts/TabelasHeaderContext';
import { useThemeMode } from '../contexts/ThemeContext';

const DRAWER_WIDTH_EXPANDED = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/tabelas', label: 'Tabelas', icon: <TableChartIcon /> },
  { to: '/membros', label: 'Membros', icon: <PeopleIcon /> },
  { to: '/aniversariantes', label: 'Aniversariantes', icon: <CakeIcon /> },
];

export default function Layout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { header: tabelasHeader } = useTabelasHeader();
  const { mode, toggleMode } = useThemeMode();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const showHeader = !!tabelasHeader;

  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  const handleToggle = () => {
    setCollapsed((c) => !c);
    setMobileOpen(false);
  };

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        alignItems: collapsed ? 'center' : 'stretch',
        py: collapsed ? 1 : 2,
        px: collapsed ? 0 : 2,
      }}
    >
      <Box
        component={Link}
        to="/"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          textDecoration: 'none',
          mb: collapsed ? 0.5 : 2,
          px: collapsed ? 0 : 0,
        }}
      >
        <Box
          component="img"
          src={logoImg}
          alt="Nacionaes lemc"
          sx={{
            height: collapsed ? 52 : 44,
            width: 'auto',
            objectFit: 'contain',
          }}
        />
        {!collapsed && (
          <Typography
            variant="h6"
            component="span"
            noWrap
            sx={{ ml: 1.5, fontWeight: 700, color: 'text.primary' }}
          >
            NACIONAES LEMC
          </Typography>
        )}
      </Box>

      <Divider sx={{ width: collapsed ? 40 : '100%', mx: 'auto', mb: 1 }} />

      <IconButton
        onClick={handleToggle}
        aria-label={collapsed ? 'Expandir menu' : 'Retrair menu'}
        disableRipple
        sx={{
          mb: 1,
          borderRadius: 1,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
      </IconButton>

      <Divider sx={{ width: collapsed ? 40 : '100%', mx: 'auto', mb: 2 }} />

      <List sx={{ flex: 1, width: collapsed ? 'auto' : '100%', py: 0, overflow: 'auto' }}>
        {nav.map(({ to, label, icon }) => (
          <ListItem key={to} disablePadding sx={{ mb: 0.5, justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <ListItemButton
              selected={loc.pathname === to}
              onClick={() => {
                navigate(to);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 1,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1.5 : 1.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 'auto' : 40,
                  justifyContent: 'center',
                  color: loc.pathname === to ? 'primary.main' : 'inherit',
                }}
              >
                {icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={label} sx={{ ml: 0.5 }} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ width: collapsed ? 40 : '100%', mx: 'auto', my: 1 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch', gap: 0.5 }}>
        <ListItem disablePadding sx={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <ListItemButton
            onClick={toggleMode}
            sx={{
              borderRadius: 1,
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 1.5 : 1.5,
            }}
            aria-label={mode === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 40, justifyContent: 'center' }}>
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            {!collapsed && (
              <ListItemText primary={mode === 'dark' ? 'Tema claro' : 'Tema escuro'} sx={{ ml: 0.5 }} />
            )}
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding sx={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <ListItemButton
            component={Link}
            to="/admin"
            sx={{
              borderRadius: 1,
              color: 'text.secondary',
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 1.5 : 1.5,
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 40, justifyContent: 'center' }}>
              <SettingsIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Admin" sx={{ ml: 0.5 }} />}
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box
        component="nav"
        sx={{
          width: { sm: drawerWidth },
          flexShrink: { sm: 0 },
          transition: (theme) =>
            theme.transitions.create('width', {
              duration: theme.transitions.duration.enteringScreen,
              easing: theme.transitions.easing.sharp,
            }),
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH_EXPANDED,
              top: 0,
              height: '100%',
              borderRight: 1,
              borderColor: 'divider',
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              bgcolor: (t: { palette: { mode: string } }) =>
                t.palette.mode === 'dark' ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 2, px: 1, pb: 2 }}>
            <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', mb: 2, px: 1 }}>
              <Box component="img" src={logoImg} alt="Nacionaes" sx={{ height: 44, width: 'auto', objectFit: 'contain' }} />
              <Typography variant="h6" component="span" noWrap sx={{ ml: 1.5, fontWeight: 700, color: 'text.primary' }}>
                NACIONAES LEMC
              </Typography>
            </Box>
            <List sx={{ flex: 1, py: 0 }}>
              {nav.map(({ to, label, icon }) => (
                <ListItem key={to} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={loc.pathname === to}
                    onClick={() => { navigate(to); setMobileOpen(false); }}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
                    <ListItemText primary={label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
            <List sx={{ py: 0 }}>
              <ListItem disablePadding>
                <ListItemButton onClick={() => { toggleMode(); setMobileOpen(false); }} sx={{ borderRadius: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                  </ListItemIcon>
                  <ListItemText primary={mode === 'dark' ? 'Tema claro' : 'Tema escuro'} />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton component={Link} to="/admin" onClick={() => setMobileOpen(false)} sx={{ borderRadius: 1, color: 'text.secondary' }}>
                  <ListItemIcon sx={{ minWidth: 40 }}><SettingsIcon /></ListItemIcon>
                  <ListItemText primary="Admin" />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              top: 0,
              height: '100%',
              borderRight: 1,
              borderColor: 'divider',
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              bgcolor: (t: { palette: { mode: string } }) =>
                t.palette.mode === 'dark' ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              transition: (theme) =>
                theme.transitions.create('width', {
                  duration: theme.transitions.duration.enteringScreen,
                  easing: theme.transitions.easing.sharp,
                }),
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <AppBar
          position="static"
          elevation={0}
          sx={(theme) => ({
            bgcolor: theme.palette.background.default,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'text.primary',
            borderRadius: 0,
          })}
        >
          <Toolbar
            sx={{
              minHeight: { xs: 56, sm: 64 },
              gap: { xs: 1, sm: 2 },
              flexWrap: 'wrap',
              py: 1,
              px: { xs: 1.5, sm: 2 },
            }}
          >
            {showHeader ? (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, justifyContent: 'center' }}>
                  <Typography variant="h6" fontWeight={600} component="span" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    {tabelasHeader!.title}
                  </Typography>
                  {tabelasHeader!.subtitle ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>
                      {tabelasHeader!.subtitle}
                    </Typography>
                  ) : null}
                </Box>
                {tabelasHeader!.indicadores != null ? (
                  <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, flexWrap: 'wrap', alignItems: 'stretch' }}>
                    {[
                      { label: 'Total', value: tabelasHeader!.indicadores?.total ?? 0 },
                      { label: 'Membros 14', value: tabelasHeader!.indicadores?.membros14 ?? 0 },
                      { label: 'Membros PP', value: tabelasHeader!.indicadores?.pp ?? 0 },
                      { label: 'Membros Full', value: tabelasHeader!.indicadores?.full ?? 0 },
                    ].map(({ label, value }) => (
                      <Card
                        key={label}
                        variant="outlined"
                        sx={(theme) => ({
                          minWidth: 88,
                          flex: '1 1 0',
                          maxWidth: 120,
                          py: 0,
                          display: 'flex',
                          alignItems: 'stretch',
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.78)',
                          backdropFilter: 'blur(10px)',
                          border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.9)',
                          color: theme.palette.text.primary,
                          '& .MuiCardContent-root': { py: 0.5, px: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' },
                          '& .MuiCardContent-root:last-child': { pb: 0.5 },
                        })}
                      >
                        <CardContent sx={{ '&:last-child': { pb: 0.5 } }}>
                          <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                          <Typography variant="body2" fontWeight={600} color="inherit" sx={{ textAlign: 'center' }}>{value}</Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : null}
              </>
            ) : null}
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            p: { xs: 1.5, sm: 2, md: 3 },
            minHeight: 0,
            overflow: 'auto',
            background: theme.palette.mode === 'dark'
              ? 'radial-gradient(ellipse at 50% 0%, rgba(120,120,255,0.06) 0%, transparent 50%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 20%)'
              : 'radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.06) 0%, transparent 50%), linear-gradient(180deg, rgba(0,0,0,0.02) 0%, transparent 12%)',
            transition: (t) =>
              t.transitions.create('margin', {
                duration: t.transitions.duration.enteringScreen,
                easing: t.transitions.easing.sharp,
              }),
          })}
        >
        <Outlet />
          <Fab
            color="primary"
            aria-label="Abrir menu"
            onClick={handleDrawerToggle}
            sx={{
              position: 'fixed',
              bottom: 16,
              left: 16,
              display: { xs: 'flex', sm: 'none' },
              zIndex: (theme) => theme.zIndex.drawer - 1,
            }}
          >
            <MenuIcon />
          </Fab>
        </Box>
      </Box>
    </Box>
  );
}
