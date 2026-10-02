import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Providers, { createQueryClient } from '../Providers'

/** Renders a page inside all app providers and a memory router. */
export function renderWithProviders(ui: ReactElement, { route = '/', path = '*' }: { route?: string; path?: string } = {}) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: Infinity } })
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Providers client={client}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="/__other" element={<div />} />
        </Routes>
      </Providers>
    </MemoryRouter>,
  )
}
