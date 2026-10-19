import React, { useState } from 'react'
import { ChatMessage } from '../types'
import { processChatQuery } from '../api/client'
import { TabType } from './BottomNav'

interface ChatTabProps {
  onNavigateTab: (tab: TabType) => void
}

export const ChatTab: React.FC<ChatTabProps> = ({ onNavigateTab }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: '¡Hola! Soy tu asistente INNOVA GAM 5G. Preguntame si un bus viene lleno, cuánto cuesta el pasaje o el estado del tráfico.',
      timestamp: '09:41',
      actionSuggestions: [
        { label: '¿Viene lleno el próximo bus?', type: 'NAVIGATE', payload: { prompt: '¿Viene lleno el próximo bus?' } },
        { label: '¿Cuánto cuesta el pasaje?', type: 'SHOW_FARE', payload: { prompt: '¿Cuánto cuesta el pasaje?' } },
        { label: '¿Hay presas en Coronado?', type: 'NAVIGATE', payload: { prompt: '¿Hay presas en Coronado?' } },
      ],
    },
  ])

  const [input, setInput] = useState('')

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input
    if (!query.trim()) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
    }

    const botResponse = processChatQuery(query)

    setMessages(prev => [...prev, userMsg, botResponse])
    setInput('')
  }

  const handleActionClick = (action: any) => {
    if (action.type === 'NAVIGATE') {
      if (action.payload?.tab) {
        onNavigateTab(action.payload.tab)
      } else if (action.payload?.prompt) {
        handleSend(action.payload.prompt)
      }
    } else if (action.payload?.prompt) {
      handleSend(action.payload.prompt)
    }
  }

  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: 4 }}>
          Asistente INNOVA
        </h2>
        <p style={{ fontSize: '12px', color: '#8b949e' }}>
          Consultas en lenguaje natural de aforo, tarifas y rutas.
        </p>
      </div>

      {/* Messages stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          paddingRight: 4,
          marginBottom: 12,
        }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: msg.sender === 'user' ? '#1f6feb' : '#161b22',
              border: msg.sender === 'user' ? 'none' : '1px solid #30363d',
              borderRadius: 14,
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: '13px', lineHeight: 1.4, color: '#f0f6fc', whiteSpace: 'pre-wrap' }}>
              {msg.text}
            </div>

            <div
              style={{
                fontSize: '10px',
                color: msg.sender === 'user' ? '#c9d1d9' : '#8b949e',
                textAlign: 'right',
                marginTop: 4,
              }}
            >
              {msg.timestamp}
            </div>

            {/* Action suggestion chips inside assistant message */}
            {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {msg.actionSuggestions.map((act, aIdx) => (
                  <button
                    key={aIdx}
                    onClick={() => handleActionClick(act)}
                    style={{
                      background: '#21262d',
                      border: '1px solid #388bfd',
                      borderRadius: 8,
                      color: '#58a6ff',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    ↳ {act.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Escribí tu consulta..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          style={{
            flex: 1,
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 10,
            padding: '10px 12px',
            color: '#f0f6fc',
            fontSize: '13px',
          }}
        />
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 16px' }}
          onClick={() => handleSend()}
        >
          ➤
        </button>
      </div>
    </div>
  )
}
