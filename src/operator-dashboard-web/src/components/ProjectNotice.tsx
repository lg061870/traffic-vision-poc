import { useEffect, useState } from 'react'
import './ProjectNotice.css'

// First-visit notice: BusLAB is a simulator under construction and we are looking for bus operators
// to shape it. A floating chip reopens it afterwards.

const SEEN_KEY = 'buslab_notice_seen'
const CONTACT_EMAIL = 'gjimenez@systematicalabs.com'
const WHATSAPP_NUMBER = '50671117015'

const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Hola, vi BusLAB y me interesa participar. Soy concesionario de la ruta ___.',
)}`
const emailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Quiero participar en BusLAB')}&body=${encodeURIComponent(
  'Hola, vi BusLAB y me interesa participar.\n\nEmpresa:\nRuta(s):\nTeléfono:\n',
)}`

function readSeen() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Private windows may block storage; the notice just shows again next visit.
  }
}

/** Touch-only screen, or a browser that says it is mobile: WhatsApp is the easier channel there. */
function isPhone() {
  const touchOnly = window.matchMedia('(pointer: coarse) and (hover: none)').matches
  const uaMobile = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile
  return touchOnly || (uaMobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent))
}

export function ProjectNotice() {
  const [open, setOpen] = useState(() => !readSeen())
  const [phone] = useState(isPhone)

  const close = () => {
    markSeen()
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const primary = phone
    ? { href: whatsappHref, label: 'Quiero participar · WhatsApp' }
    : { href: emailHref, label: 'Quiero participar · Correo' }
  const secondary = phone
    ? { href: emailHref, label: '¿Prefiere correo?' }
    : { href: whatsappHref, label: '¿Prefiere WhatsApp?' }

  return (
    <>
      <button type="button" className="pn-chip" onClick={() => setOpen(true)} title="Acerca de este simulador">
        Simulador · en construcción
      </button>

      {open && (
        <div className="pn-backdrop" onClick={close}>
          <div
            className="pn-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pn-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="pn-close" onClick={close} aria-label="Cerrar">
              ×
            </button>
            <span className="pn-badge">Simulador · en construcción</span>
            <h2 id="pn-title">
              BusLAB es un simulador para planificar y gestionar su operación como concesionario de buses.
            </h2>
            <p>
              Pruebe horarios, tamaño de flota, turnos y costos antes de llevarlos a la calle. Los datos son simulados:
              no corresponden a ningún operador real.
            </p>
            <p>
              <strong>Está en construcción.</strong> Buscamos al menos 3 empresarios autobuseros que nos ayuden a
              definir qué necesita realmente la industria.
            </p>
            <p>
              <strong>Habrá una versión gratuita para todos los autobuseros</strong> y opciones de pago con funciones
              avanzadas.
            </p>
            <div className="pn-actions">
              <a className="pn-cta" href={primary.href} target="_blank" rel="noopener noreferrer" onClick={markSeen}>
                {primary.label}
              </a>
              <button type="button" className="pn-explore" onClick={close}>
                Explorar el simulador
              </button>
            </div>
            {phone ? (
              <a className="pn-alt" href={secondary.href} target="_blank" rel="noopener noreferrer" onClick={markSeen}>
                {secondary.label}
              </a>
            ) : (
              // On a desk, most operators still answer from the phone: the QR opens the same WhatsApp chat there.
              <div className="pn-qr-row">
                <img className="pn-qr" src={`${import.meta.env.BASE_URL}whatsapp-qr.svg`} alt="Código QR para escribirnos por WhatsApp" />
                <div>
                  <strong>¿Prefiere WhatsApp?</strong>
                  <p>Escanee el código con su celular, o</p>
                  <a className="pn-alt" href={secondary.href} target="_blank" rel="noopener noreferrer" onClick={markSeen}>
                    ábralo en esta computadora
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
