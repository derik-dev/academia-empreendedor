import { useEffect } from 'react';
const ASSET = `${import.meta.env.BASE_URL}assets/`;
const GROUP_URL = import.meta.env.VITE_WHATSAPP_GROUP_URL
  || 'https://chat.whatsapp.com/Kl6s6AmpG9hLlUeZTR4T3b?s=cl&p=i&mlu=0&ilr=4';

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h13" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function Obrigado() {
  useEffect(() => {
    document.title = 'Obrigado | Turma Hécate';
  }, []);

  return (
    <main
      className="obrigado-page"
      style={{
        '--obrigado-desktop-bg': `url("${ASSET}hero-hecate.webp")`,
        '--obrigado-mobile-bg': `url("${ASSET}fundo-nevoa.webp")`,
      }}
    >
      <div className="grain" aria-hidden="true" />
      <div className="obrigado-stars" aria-hidden="true" />

      <nav className="obrigado-topbar shell" aria-label="Turma Hécate">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Voltar para a página da Turma Hécate">
          <span className="brand-moon">☾</span>
          <span><b>TURMA</b> HÉCATE</span>
        </a>
        <span className="obrigado-topbar__date">01 OUT 2026 · 19H</span>
      </nav>

      <section className="obrigado-content shell">
        <div className="obrigado-copy">
          <img className="obrigado-seal" src={`${ASSET}icone-5.webp`} alt="" width="92" height="92" />
          <p className="eyebrow">INSCRIÇÃO CONFIRMADA</p>
          <h1>Agora falta pouco!</h1>
          <p className="obrigado-lead">
            <span className="obrigado-lead__confirmed">Seu cadastro foi recebido com sucesso.</span>
            <span className="obrigado-lead__next">Agora, entre no Grupo VIP para receber o link da live e todas as informações em primeira mão.</span>
          </p>
          <div className="obrigado-event" aria-label="Data e horário da live">
            <strong>01 DE OUTUBRO DE 2026</strong>
            <i />
            <strong>19H</strong>
            <i />
            <span>AO VIVO NO YOUTUBE</span>
          </div>
          <a className="gold-button obrigado-button" href={GROUP_URL} target="_blank" rel="noreferrer">
            ENTRE NO GRUPO VIP DA TURMA HÉCATE
            <ArrowIcon />
          </a>
          <small>Toque no botão para concluir sua entrada.</small>
        </div>
      </section>
    </main>
  );
}

export default Obrigado;
