import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import logoImg from '../../images/logo.png';
// Mapa de Goiás (deve estar na raiz do projeto como GO-2500px.png)
import goiasMap from '../../GO-2500px.png';

const FRASES = [
  'O destino é a estrada, a alma é o motor.',
  'Respeito se conquista, lealdade se vive.',
  'Vento no rosto, o mundo no retrovisor.',
  'Irmandade acima de tudo, asfalto abaixo de nós.',
  'Mais que um clube, um estilo de vida.',
];

const PHRASE_INTERVAL_MS = 1200;

/** Roda de moto: pneu + aro + raios */
const RODA_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="52" fill="none" stroke="#2a2a2a" stroke-width="14"/>
  <circle cx="60" cy="60" r="38" fill="none" stroke="#1a1a1a" stroke-width="2"/>
  <circle cx="60" cy="60" r="18" fill="none" stroke="#333" stroke-width="4"/>
  <circle cx="60" cy="60" r="6" fill="#444"/>
  ${[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const x1 = 60 + 18 * Math.cos(rad);
    const y1 = 60 + 18 * Math.sin(rad);
    const x2 = 60 + 38 * Math.cos(rad);
    const y2 = 60 + 38 * Math.sin(rad);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2a2a2a" stroke-width="3"/>`;
  }).join('')}
</svg>`)}`;

const PROGRESS_BAR_BOTTOM = { xs: 42, sm: 62 };
const PROGRESS_BAR_HEIGHT = 24;

function SmokePuff({ delay, left, size }: { delay: number; left: string; size: number }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: '12%',
        left,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(160,160,160,0.1) 0%, transparent 70%)',
        filter: 'blur(20px)',
        animation: `smokeRise ${3 + Math.random() * 2}s ease-out infinite`,
        animationDelay: `${delay}s`,
        opacity: 0,
        '@keyframes smokeRise': {
          '0%': { opacity: 0, transform: 'translateY(0) scale(0.4)' },
          '20%': { opacity: 0.5 },
          '100%': { opacity: 0, transform: 'translateY(-200px) translateX(40px) scale(2.5)' },
        },
      }}
    />
  );
}

/** Aura de fumaça ao redor da logo */
function LogoSmokeAura({ delay, size }: { delay: number; size: number }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: size,
        height: size,
        marginTop: -size / 2,
        marginLeft: -size / 2,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(160,160,160,0.22) 0%, rgba(120,120,120,0.1) 35%, transparent 70%)',
        filter: 'blur(28px)',
        animation: 'logoSmoke 4s ease-in-out infinite',
        animationDelay: `${delay}s`,
        '@keyframes logoSmoke': {
          '0%, 100%': { opacity: 0.5, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.2)' },
        },
      }}
    />
  );
}

/** Faísca projetada para a esquerda — senso de velocidade forte */
function WheelSpark({ delay }: { delay: number }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: -2,
        left: '50%',
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #ffdd00 0%, #ff8800 35%, #ff6600 60%, transparent 75%)',
        boxShadow: '0 0 10px #ff9900, 0 0 20px #ff6600, 0 0 30px rgba(255,100,0,0.5)',
        transform: 'translateX(-50%)',
        animation: 'sparkBurst 0.22s cubic-bezier(0.2, 0.8, 0.4, 1) forwards',
        animationDelay: `${delay}s`,
        opacity: 0,
        '@keyframes sparkBurst': {
          '0%': { opacity: 1, transform: 'translateX(-50%) translateY(0) scale(1.2)' },
          '100%': {
            opacity: 0,
            transform: 'translateX(calc(-50% - 48px)) translateY(0) scale(0.4)',
          },
        },
      }}
    />
  );
}

interface LoadingScreenProps {
  /** Quando true, inicia a transição de saída (fade out) antes de desmontar */
  exiting?: boolean;
}

export default function LoadingScreen({ exiting = false }: LoadingScreenProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [rodaPass, setRodaPass] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % FRASES.length);
    }, PHRASE_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setRodaPass(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#c4d4c4',
        overflow: 'hidden',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(1.018)' : 'scale(1)',
        transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
    >
      {/* 1) Fundo sólido */}
      <Box sx={{ position: 'absolute', inset: 0, background: '#0a0a0a', zIndex: 0 }} />

      {/* 2) Mapa de Goiás — global (tela toda), 20% opacidade, zoom out ao longo do loading */}
      <Box
        component="img"
        src={goiasMap}
        alt=""
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: 0.2,
          zIndex: 1,
          pointerEvents: 'none',
          animation: 'mapZoomOut 5s ease-out forwards',
          '@keyframes mapZoomOut': {
            '0%': { transform: 'scale(1.35)' },
            '100%': { transform: 'scale(1)' },
          },
        }}
      />

      {/* 3) Overlay escuro leve para contraste do conteúdo */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(8,8,8,0.25) 0%, rgba(6,6,6,0.4) 50%, rgba(4,4,4,0.55) 100%)',
          zIndex: 2,
        }}
      />

      {/* Scanlines */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.08) 2px,
            rgba(0,0,0,0.08) 4px
          )`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Fumaça ambiente */}
      {[
        { delay: 0, left: '10%', size: 160 },
        { delay: 1.2, left: '30%', size: 200 },
        { delay: 0.5, left: '55%', size: 180 },
        { delay: 1.8, left: '75%', size: 150 },
        { delay: 0.8, left: '45%', size: 220 },
        { delay: 2.2, left: '20%', size: 170 },
        { delay: 1.5, left: '65%', size: 190 },
      ].map((p, i) => (
        <SmokePuff key={i} {...p} />
      ))}

      {/* Bloco RUA = barra de loading (asfalto) + roda apoiada em cima */}
      <Box
        sx={{
          position: 'absolute',
          left: '10%',
          right: '10%',
          bottom: PROGRESS_BAR_BOTTOM,
          height: PROGRESS_BAR_HEIGHT,
          zIndex: 8,
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          background: 'linear-gradient(180deg, #1e1e1e 0%, #151515 50%, #0d0d0d 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Fill da barra (progresso) + efeito "carregando" na ponta direita */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '100%',
            background: 'linear-gradient(90deg, #404850, #606870, #404850)',
            boxShadow: 'inset 0 0 12px rgba(100,110,120,0.3)',
            animation: 'progressFill 5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            transformOrigin: 'left',
            '@keyframes progressFill': {
              from: { transform: 'scaleX(0)' },
              to: { transform: 'scaleX(1)' },
            },
          }}
        >
          {/* Ponta da barra = faísca (mesmo padrão amarelo/laranja da roda) */}
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: '-25%',
              bottom: '-25%',
              width: 36,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,180,80,0.4) 15%, rgba(255,200,100,0.9) 40%, #ff9900 55%, #ff6600 70%, rgba(255,100,0,0.6) 85%, transparent 100%)',
              boxShadow: '0 0 16px #ff9900, 0 0 28px #ff6600, 0 0 40px rgba(255,100,0,0.4)',
              animation: 'edgeSparkPulse 0.35s ease-in-out infinite',
              '@keyframes edgeSparkPulse': {
                '0%, 100%': { opacity: 1, filter: 'brightness(1)' },
                '50%': { opacity: 0.9, filter: 'brightness(1.35)' },
              },
            }}
          />
        </Box>
      </Box>

      {/* Roda apoiada no bloco rua — só a arte da roda gira; faíscas ficam sempre na parte de baixo */}
      {rodaPass && (
        <Box
          sx={{
            position: 'absolute',
            bottom: { xs: 66, sm: 86 },
            left: '-10%',
            width: 38,
            height: 38,
            zIndex: 9,
            animation: 'rodaRide 3s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
            '@keyframes rodaRide': {
              '0%': { left: '-10%', opacity: 0 },
              '10%': { opacity: 1 },
              '90%': { opacity: 1 },
              '100%': { left: '108%', opacity: 0 },
            },
          }}
        >
          {/* Só a roda gira */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              animation: 'rodaSpin 3s linear infinite',
              '@keyframes rodaSpin': {
                from: { transform: 'rotate(0deg)' },
                to: { transform: 'rotate(360deg)' },
              },
            }}
          >
            <Box
              component="img"
              src={RODA_SVG}
              alt=""
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
              }}
            />
          </Box>
          {/* Faíscas fixas na parte de BAIXO da roda (não giram) */}
          {[0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8, 0.88, 0.96, 1.04, 1.12, 1.2, 1.28, 1.36, 1.44, 1.52, 1.6, 1.68, 1.76, 1.84, 1.92, 2.0, 2.08, 2.16, 2.24, 2.32].map((d, i) => (
            <WheelSpark key={i} delay={d} />
          ))}
        </Box>
      )}

      {/* Título acima da logo + Logo + aura de fumaça */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'logoReveal 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          opacity: 0,
          '@keyframes logoReveal': {
            '0%': { opacity: 0, transform: 'scale(0.6) translateY(20px)', filter: 'blur(12px)' },
            '60%': { opacity: 1, transform: 'scale(1.04) translateY(-2px)', filter: 'blur(0px)' },
            '100%': { opacity: 1, transform: 'scale(1) translateY(0)', filter: 'blur(0px)' },
          },
        }}
      >
        {/* Título na parte superior — Montserrat Bold/ExtraBold, padrão militar */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography
            sx={{
              fontFamily: '"Montserrat", sans-serif',
              fontSize: { xs: '1.5rem', sm: '1.9rem' },
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 1px rgba(0,0,0,0.8)',
              lineHeight: 1.25,
            }}
          >
            NACIONAES LEMC
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Montserrat", sans-serif',
              fontSize: { xs: '0.95rem', sm: '1.1rem' },
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'rgba(240,240,235,0.95)',
              textShadow: '0 1px 4px rgba(0,0,0,0.8), 0 0 1px rgba(0,0,0,0.6)',
              mt: 0.6,
            }}
          >
            1ª REGIONAL GOIÁS
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Montserrat", sans-serif',
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              fontWeight: 700,
              letterSpacing: '0.28em',
              color: 'rgba(220,218,210,0.9)',
              textShadow: '0 1px 3px rgba(0,0,0,0.7)',
              mt: 0.35,
            }}
          >
            SYSREG-GO
          </Typography>
        </Box>
        {/* Aura de fumaça atrás da logo */}
        {[0, 0.8, 1.6, 2.4].map((d, i) => (
          <LogoSmokeAura key={i} delay={d} size={180 + i * 50} />
        ))}
        <Box
          component="img"
          src={logoImg}
          alt="Nacionaes LEMC"
          sx={{
            position: 'relative',
            zIndex: 1,
            width: 'clamp(160px, 32vw, 260px)',
            height: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 24px rgba(80,80,80,0.2))',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '120%',
            height: '120%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(100,100,100,0.06) 0%, transparent 70%)',
            animation: 'logoPulse 2.5s ease-in-out infinite alternate',
            zIndex: 0,
            '@keyframes logoPulse': {
              from: { opacity: 0.3, transform: 'translate(-50%, -50%) scale(0.9)' },
              to: { opacity: 0.8, transform: 'translate(-50%, -50%) scale(1.1)' },
            },
          }}
        />
      </Box>

      {/* Frases */}
      <Box sx={{ minHeight: 64, px: 3, textAlign: 'center', maxWidth: 500, mt: 4, position: 'relative', zIndex: 6 }}>
        <Typography
          key={phraseIndex}
          variant="body1"
          sx={{
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: { xs: '0.95rem', sm: '1.1rem' },
            letterSpacing: '0.04em',
            lineHeight: 1.6,
            color: 'rgba(200,198,190,0.9)',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            animation: 'phraseFade 1.2s ease-in-out',
            '@keyframes phraseFade': {
              '0%': { opacity: 0, transform: 'translateY(10px)', filter: 'blur(4px)' },
              '20%': { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
              '80%': { opacity: 1 },
              '100%': { opacity: 0.9 },
            },
          }}
        >
          "{FRASES[phraseIndex]}"
        </Typography>
      </Box>

      {/* Vinheta */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
    </Box>
  );
}
