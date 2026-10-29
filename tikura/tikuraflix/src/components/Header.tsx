import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { moonPhase } from "@/lib/util";
import { IconChevDown, IconLock, IconUser, MoonIcon } from "./Icons";
import ScrollHeader from "./ScrollHeader";
import { logout } from "@/app/actions";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Tikuraflix — início">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo2.png" alt="TikuraFlix" width={2140} height={735} />
    </Link>
  );
}

export default async function Header({ solid = false }: { solid?: boolean }) {
  const [user, settings] = await Promise.all([getUser(), getSettings()]);
  const moon = moonPhase();
  return (
    <ScrollHeader solid={solid}>
      <Brand />
      <nav className="nav" aria-label="Principal">
        <span className="moon-chip" title={`${moon.illum}% iluminada`}>
          <MoonIcon frac={moon.frac} size={18} />
          {moon.name} hoje
        </span>
        <Link href="/#acervo" className="link">Acervo</Link>
        <Link href="/#caminhos" className="link">Caminhos</Link>
        <Link href="/#assinatura" className="link">Assinatura</Link>
        {user ? (
          <>
            {user.role === "admin" && <Link href="/admin" className="link">Painel</Link>}
            <details className="account-menu">
              <summary className="account-trigger" aria-label="Menu da minha conta">
                <span className="account-avatar"><IconUser size={21} /></span>
                <IconChevDown />
              </summary>
              <div className="account-dropdown">
                <Link href="/minha-area">Minha área</Link>
                <form action={logout}><button type="submit">Sair</button></form>
              </div>
            </details>
          </>
        ) : (
          <>
            <Link href="/entrar" className="btn btn-ghost btn-sm header-login"><IconLock size={17} /> ENTRAR</Link>
            <a href={settings.checkout_url} className="btn btn-gold btn-sm" rel="noopener">Quero assinar</a>
          </>
        )}
      </nav>
    </ScrollHeader>
  );
}
