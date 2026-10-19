import React, { useState } from 'react'
import { Header } from './components/Header'
import { BottomNav, TabType } from './components/BottomNav'
import { PlannerTab } from './components/PlannerTab'
import { FleetTab } from './components/FleetTab'
import { AlertsTab } from './components/AlertsTab'
import { ChatTab } from './components/ChatTab'

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('planner')
  const [isOffline, setIsOffline] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleToggleOffline = () => {
    setIsOffline(prev => !prev)
  }

  const handleToggleFullscreen = () => {
    setIsFullscreen(prev => !prev)
  }

  return (
    <div className={`device-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <Header
        isOffline={isOffline}
        onToggleOffline={handleToggleOffline}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      <main className="app-content">
        {activeTab === 'planner' && <PlannerTab isOffline={isOffline} />}
        {activeTab === 'fleet' && <FleetTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'chat' && <ChatTab onNavigateTab={setActiveTab} />}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        alertCount={2}
      />
    </div>
  )
}
