"use client";

import { useActionState, useState, useTransition } from "react";

import { signIn, signOut, signUp } from "@/app/login/actions";
import { AUTH_LIMITS, type AuthErrorCode, type AuthState } from "@/lib/auth";

type AuthTab = "in" | "up";

const IDLE: AuthState = { status: "idle" };

const ERROR_TEXT: Record<AuthErrorCode, string> = {
  invalid:
    "> REVISA LOS DATOS. USUARIO: 3–10 LETRAS, NÚMEROS O _. CONTRASEÑA: MÍN. 6.",
  invalid_credentials: "> CREDENCIALES INCORRECTAS.",
  username_taken: "> ESE NOMBRE DE USUARIO YA ESTÁ EN USO.",
  email_taken: "> ESE CORREO YA TIENE UNA CUENTA.",
  weak_password: "> CONTRASEÑA DEMASIADO DÉBIL.",
  unknown: "> ERROR DE CONEXIÓN. INTÉNTALO DE NUEVO MÁS TARDE.",
};

export function AuthForm({ initialTab = "in" }: { initialTab?: AuthTab }) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  // Controlled so the values survive an error and a tab switch
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const [inState, inAction, inPending] = useActionState(signIn, IDLE);
  const [upState, upAction, upPending] = useActionState(signUp, IDLE);
  const [guestPending, startGuest] = useTransition();
  const pending = inPending || upPending || guestPending;

  const state = tab === "in" ? inState : upState;
  const submitPending = tab === "in" ? inPending : upPending;

  const playAsGuest = () => startGuest(() => signOut("/games"));

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            onClick={() => setTab("in")}
            disabled={pending}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            onClick={() => setTab("up")}
            disabled={pending}
          >
            CREAR CUENTA
          </button>
        </div>

        {/* noValidate: every validation message comes from lib/auth, not the browser */}
        <form action={tab === "in" ? inAction : upAction} noValidate>
          {tab === "up" && (
            <div className="field slide-in">
              <label htmlFor="auth-username">Usuario</label>
              <input
                id="auth-username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                maxLength={AUTH_LIMITS.username.max}
                autoComplete="username"
                placeholder="PX_KAI"
                disabled={pending}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-email">Correo electrónico</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={AUTH_LIMITS.email}
              autoComplete="email"
              placeholder="jugador@vault.gg"
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              maxLength={AUTH_LIMITS.password.max}
              autoComplete={tab === "in" ? "current-password" : "new-password"}
              placeholder="••••••••"
              disabled={pending}
            />
          </div>

          {state.status === "error" && !pending && (
            <p className="auth-error" role="alert">
              {ERROR_TEXT[state.code]}
            </p>
          )}

          <button
            className={`btn lg${submitPending ? " pending" : ""}`}
            type="submit"
            style={{ width: "100%", marginTop: 8 }}
            disabled={pending}
          >
            {submitPending ? (
              <>
                <span className="caret" aria-hidden="true">
                  ▶
                </span>{" "}
                CONECTANDO…
              </>
            ) : tab === "in" ? (
              "ENTRAR AL VAULT"
            ) : (
              "CREAR Y JUGAR"
            )}
          </button>
        </form>

        <button
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={playAsGuest}
          disabled={pending}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            disabled
            title="Próximamente"
          >
            ◆ GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            disabled
            title="Próximamente"
          >
            ▣ GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
