import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { CampaignsPage, CampaignLayout } from './App'
import { StorageGate } from './StorageGate'
import { MapsPage } from './features/maps/MapsPage'
import { CharactersPage } from './features/characters/CharactersPage'
import { NotesPage } from './features/notes/NotesPage'
import { ItemsPage } from './features/items/ItemsPage'
import { NpcsPage } from './features/npcs/NpcsPage'
import { MasterPage } from './features/master/MasterPage'
import { CombatPage } from './features/combat/CombatPage'
import { SessionsPage } from './features/sessions/SessionsPage'
import { RelationsPage } from './features/relations/RelationsPage'
import { ManualsPage } from './features/manuals/ManualsPage'
import { DialogHost } from './core/dialog'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><DialogHost /><StorageGate><BrowserRouter><Routes>
    <Route path="/" element={<CampaignsPage />} />
    <Route path="/c/:cid" element={<CampaignLayout />}>
      <Route index element={<Navigate to="schede" replace />} />
      <Route path="schede" element={<CharactersPage />} />
      <Route path="note" element={<NotesPage />} />
      <Route path="oggetti" element={<ItemsPage />} />
      <Route path="png" element={<NpcsPage />} />
      <Route path="mappe" element={<MapsPage />} />
      <Route path="master" element={<MasterPage />} />
      <Route path="combattimento" element={<CombatPage />} />
      <Route path="sessioni" element={<SessionsPage />} />
      <Route path="relazioni" element={<RelationsPage />} />
      <Route path="manuali" element={<ManualsPage />} />
    </Route>
  </Routes></BrowserRouter></StorageGate></React.StrictMode>
)
