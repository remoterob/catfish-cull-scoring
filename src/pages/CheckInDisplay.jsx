import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

const SNZ_LOGO = import.meta.env.VITE_SNZ_LOGO_URL || '/api/placeholder/200/80'

function DivisionBadges({ team }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Open</span>
      {team.is_junior && (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Juniors</span>
      )}
      {team.is_women && (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-800">Women</span>
      )}
    </div>
  )
}

function ShirtBadge({ size, label }) {
  if (!size) return null
  return (
    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
      {label}: {size}
    </span>
  )
}

function TeamCard({ team, variant }) {
  const names = [team.competitor1_name, team.competitor2_name, team.competitor3_name]
    .filter(Boolean)

  const partnerNote = team.notes?.match(/Specified partner: (.+) \(not registered\)/)
  const specifiedPartner = partnerNote ? partnerNote[1] : null

  const bgColor = {
    arrived: 'bg-green-50 border-green-200',
    waiting: 'bg-amber-50 border-amber-200',
    incomplete: 'bg-red-50 border-red-200',
  }[variant]

  const numberColor = {
    arrived: 'text-green-700',
    waiting: 'text-amber-700',
    incomplete: 'text-red-700',
  }[variant]

  return (
    <div className={`rounded-lg border-2 p-3 ${bgColor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className={`text-xl font-black ${numberColor}`}>#{team.team_number}</span>
          <div className="mt-0.5">
            {names.map((name, i) => (
              <p key={i} className="text-sm font-semibold text-gray-800 truncate leading-tight">{name}</p>
            ))}
            {variant === 'incomplete' && specifiedPartner && (
              <p className="text-xs text-red-600 mt-0.5 italic">Partner: {specifiedPartner}</p>
            )}
            {variant === 'incomplete' && !specifiedPartner && (
              <p className="text-xs text-red-500 mt-0.5 italic">No partner specified</p>
            )}
          </div>
          <DivisionBadges team={team} />
        </div>
      </div>
      {/* Shirt sizes - shown for all variants */}
      {(team.competitor1_shirt || team.competitor2_shirt) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {team.competitor1_shirt && <ShirtBadge size={team.competitor1_shirt} label="C1" />}
          {team.competitor2_shirt && <ShirtBadge size={team.competitor2_shirt} label="C2" />}
        </div>
      )}
    </div>
  )
}

export default function CheckInDisplay() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('team_number', { ascending: true })

      if (error) throw error
      setTeams(data || [])
      setLastUpdated(new Date())
      setLoading(false)
    } catch (error) {
      console.error('Error fetching teams:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
    const interval = setInterval(fetchTeams, 5000)
    return () => clearInterval(interval)
  }, [])

  const incomplete = teams.filter(
    t => !t.competitor2_name || t.competitor2_name.trim() === ''
  )

  const notYetArrived = teams.filter(
    t => !t.registered && t.competitor2_name && t.competitor2_name.trim() !== ''
  ).sort((a, b) => a.team_number - b.team_number)

  const checkedIn = teams
    .filter(t => t.registered)
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 20)

  const totalCheckedIn = teams.filter(t => t.registered).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Loading registration data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-xl p-5 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={SNZ_LOGO} alt="Spearfishing NZ" className="h-14 w-auto object-contain" />
              <div>
                <h1 className="text-3xl font-black text-blue-900">Rosemergy Catfish Cull 2026</h1>
                <p className="text-gray-500 font-medium">Registration Check-In</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-400">
              <div>Auto-updates every 5 seconds</div>
              <div>Last updated: {lastUpdated.toLocaleTimeString()}</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <Users className="w-6 h-6 mx-auto mb-1 text-blue-600" />
              <div className="text-3xl font-black text-blue-700">{teams.length}</div>
              <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total Teams</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <div className="text-3xl font-black text-green-700">{totalCheckedIn}</div>
              <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">Checked In</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <Clock className="w-6 h-6 mx-auto mb-1 text-amber-600" />
              <div className="text-3xl font-black text-amber-700">{notYetArrived.length}</div>
              <div className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Still to Arrive</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-red-500" />
              <div className="text-3xl font-black text-red-600">{incomplete.length}</div>
              <div className="text-xs text-red-500 font-semibold uppercase tracking-wide">Incomplete</div>
            </div>
          </div>
        </div>

        {/* SECTION 1: Needs Attention */}
        {(notYetArrived.length > 0 || incomplete.length > 0) && (
          <div className="bg-white rounded-xl shadow-xl p-5 mb-5">
            <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-500" />
              Needs Attention
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Not Yet Arrived */}
              {notYetArrived.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <h3 className="font-bold text-amber-700 uppercase tracking-wide text-sm">
                      Still to Arrive ({notYetArrived.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                    {notYetArrived.map(team => (
                      <TeamCard key={team.id} team={team} variant="waiting" />
                    ))}
                  </div>
                </div>
              )}

              {/* Incomplete */}
              {incomplete.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <h3 className="font-bold text-red-600 uppercase tracking-wide text-sm">
                      Incomplete Teams ({incomplete.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                    {incomplete.map(team => (
                      <TeamCard key={team.id} team={team} variant="incomplete" />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* SECTION 2: Checked In */}
        <div className="bg-white rounded-xl shadow-xl p-5 mb-4">
          <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            Checked In
            <span className="text-base font-normal text-gray-400 ml-1">
              {totalCheckedIn > 20 ? `(showing most recent 20 of ${totalCheckedIn})` : `(${totalCheckedIn})`}
            </span>
          </h2>

          {checkedIn.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No teams checked in yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {checkedIn.map(team => (
                <TeamCard key={team.id} team={team} variant="arrived" />
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-white text-sm pb-4 opacity-60">
          catfish-cull.netlify.app/checkin
        </p>

      </div>
    </div>
  )
}
