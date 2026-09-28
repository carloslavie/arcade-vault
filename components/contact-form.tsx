"use client";

import { useActionState, useState, type FormEvent } from "react";
import { sendContact } from "@/app/about/actions";
import { CONTACT_LIMITS, type ContactErrorCode, type ContactState } from "@/lib/contact";

const EMPTY = { name: "", email: "", msg: "" };

const ERROR_TEXT: Record<ContactErrorCode, string> = {
  invalid: "REVISA LOS DATOS DEL FORMULARIO.",
  send_failed: "INTÉNTALO DE NUEVO MÁS TARDE.",
};

function TermBar() {
  return (
    <div className="term-bar">
      <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
      <span className="term-title">VAULT-OS // TERMINAL</span>
    </div>
  );
}

export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [shake, setShake] = useState(false);
  const [state, formAction, pending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });
  // Last result the user closed; a new submit returns a new object and shows again
  const [dismissed, setDismissed] = useState<ContactState | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      e.preventDefault();
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  const result = state.status !== "idle" && state !== dismissed ? state : null;

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} action={formAction} onSubmit={onSubmit}>
      {!result ? (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name" name="name" value={form.name} maxLength={CONTACT_LIMITS.name} disabled={pending}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email" name="email" type="email" value={form.email} maxLength={CONTACT_LIMITS.email} disabled={pending}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-msg">MENSAJE</label>
            <textarea
              id="contact-msg" name="msg" rows={5} value={form.msg} maxLength={CONTACT_LIMITS.msg} disabled={pending}
              onChange={(e) => setForm({ ...form, msg: e.target.value })} placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>
          <div className="hp-field" aria-hidden="true">
            <input name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <button className="btn xl press" type="submit" disabled={pending} style={{ width: "100%" }}>
            {pending ? "▶  TRANSMITIENDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : result.status === "ok" ? (
        <div className="terminal-success">
          <TermBar />
          <div className="term-body">
            <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">&gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {result.name.toUpperCase()}.<span className="caret">_</span></div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={() => { setDismissed(state); setForm(EMPTY); }}>ENVIAR OTRO MENSAJE</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="terminal-success error" role="alert">
          <TermBar />
          <div className="term-body">
            <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim"><span className="err-tag">[ERR]</span> Transmisión interrumpida.</div>
            <div className="line error">&gt; ERROR DE TRANSMISIÓN. {ERROR_TEXT[result.code]}<span className="caret">_</span></div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={() => setDismissed(state)}>REINTENTAR</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
