import { shortName } from '../hooks/useRoutes'
import { groupBy, loadGroups, loadShares, type UsageRow } from '../kpis'

interface LoadStackProps {
  rows: UsageRow[]
  routeIds: string[]
  routeNames: Map<string, string>
  selectedRoute: string | null
  onSelectRoute: (routeId: string) => void
}

// For each route, how its time in service splits between nearly empty, seats left, standing and crowded.
export function LoadStack({ rows, routeIds, routeNames, selectedRoute, onSelectRoute }: LoadStackProps) {
  const byRoute = groupBy(rows, (row) => row.routeId ?? '—')
  return (
    <div className="load-stack">
      <div className="load-rows" style={{ gridTemplateRows: `repeat(${routeIds.length}, minmax(0, 1fr))` }}>
        {routeIds.map((routeId) => {
          const shares = loadShares(byRoute.get(routeId) ?? [])
          const name = shortName(routeNames.get(routeId) ?? routeId)
          return (
            <button key={routeId} type="button" className={`load-row ${selectedRoute && selectedRoute !== routeId ? 'faded' : ''}`}
              onClick={() => onSelectRoute(routeId)}>
              <span className="load-name">{name}</span>
              <span className="load-bar">
                {shares.map((share, index) => (
                  <span key={loadGroups[index].label} style={{ flexGrow: share, background: loadGroups[index].color }}
                    title={`${name}: ${Math.round(share * 100)} % del tiempo ${loadGroups[index].label.toLowerCase()} (${loadGroups[index].range})`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
      <ul className="legend">
        {loadGroups.map((group) => (
          <li key={group.label}><i style={{ background: group.color }} />{group.label}</li>
        ))}
      </ul>
    </div>
  )
}
